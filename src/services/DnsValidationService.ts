import { Repository } from "typeorm";
import { AppDataSource } from "../config/database";
import { Domain } from "../entities/Domain";
import { ExpectedDnsRecord } from "../entities/ExpectedDnsRecord";
import { DnsCheckHistory } from "../entities/DnsCheckHistory";
import { RetrievedDnsRecord } from "../entities/RetrievedDnsRecord";
import { DnsChecker } from "./DnsChecker";
import { EmailService, ValidationFailure } from "./EmailService";

export class DnsValidationService {
    private domainRepository: Repository<Domain>;
    private expectedDnsRepository: Repository<ExpectedDnsRecord>;
    private dnsCheckHistoryRepository: Repository<DnsCheckHistory>;
    private retrievedDnsRepository: Repository<RetrievedDnsRecord>;
    private emailService: EmailService;

    constructor() {
        this.domainRepository = AppDataSource.getRepository(Domain);
        this.expectedDnsRepository = AppDataSource.getRepository(ExpectedDnsRecord);
        this.dnsCheckHistoryRepository = AppDataSource.getRepository(DnsCheckHistory);
        this.retrievedDnsRepository = AppDataSource.getRepository(RetrievedDnsRecord);
        this.emailService = new EmailService();
    }

    async validateAllDomains() {
        try {
            // Get all domains from database
            const domains = await this.domainRepository.find();
            const results = [];
            const validationFailures: ValidationFailure[] = [];

            for (const domain of domains) {
                try {
                    const result = await this.validateDomain(domain);
                    results.push(result);

                    // Collect validation failures for email alerts
                    if (result.status === 'failed' && result.validation_details) {
                        for (const detail of result.validation_details) {
                            if (!detail.matched) {
                                validationFailures.push({
                                    domain: result.domain,
                                    record_type: detail.record_type,
                                    expected_value: detail.expected_value,
                                    actual_values: detail.actual_values
                                });
                            }
                        }
                    }
                } catch (error) {
                    console.error(`Error validating domain ${domain.name}:`, error);
                    results.push({
                        domain: domain.name,
                        domain_id: domain.id,
                        status: 'error',
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            }

            // Send email alert if there are validation failures
            if (validationFailures.length > 0) {
                try {
                    console.log(`Sending email alert for ${validationFailures.length} DNS validation failures`);
                    await this.emailService.sendValidationFailureAlert(validationFailures);
                } catch (emailError) {
                    console.error('Failed to send email alert:', emailError);
                    // Don't throw - email failure shouldn't break the main validation process
                }
            }

            return {
                totalDomains: domains.length,
                results
            };
        } catch (error) {
            console.error('Error in validateAllDomains:', error);
            throw error;
        }
    }

    async validateDomain(domain: Domain) {
        // Get expected DNS records for this domain
        const expectedRecords = await this.expectedDnsRepository.find({
            where: { domain_id: domain.id }
        });

        // Perform DNS check
        const dnsChecker = new DnsChecker(domain.name);
        const actualDnsResults = await dnsChecker.checkAll();

        // First, create a DNS check history record
        const historyRecord = new DnsCheckHistory();
        historyRecord.domain_id = domain.id;
        historyRecord.checked_at = new Date();
        historyRecord.status = false; // Will update this after validation
        await this.dnsCheckHistoryRepository.save(historyRecord);

        // Store all retrieved DNS records in retrieved_dns_records table
        await this.storeRetrievedDnsRecords(historyRecord.id, domain.id, actualDnsResults);

        if (expectedRecords.length === 0) {
            console.log(`No expected DNS records found for domain: ${domain.name}`);
            return {
                domain: domain.name,
                domain_id: domain.id,
                status: 'no_expectations',
                message: 'No expected DNS records configured',
                history_id: historyRecord.id
            };
        }

        // Compare expected vs actual
        const validationResults = [];
        let allMatched = true;

        for (const expectedRecord of expectedRecords) {
            const recordType = expectedRecord.record_type.toUpperCase();
            const expectedValue = expectedRecord.record_value;

            let actualValues: any[] = [];
            let matched = false;

            // Get actual values based on record type
            switch (recordType) {
                case 'A':
                    actualValues = actualDnsResults.A || [];
                    matched = actualValues.includes(expectedValue);
                    break;
                case 'AAAA':
                    actualValues = actualDnsResults.AAAA || [];
                    matched = actualValues.includes(expectedValue);
                    break;
                case 'CNAME':
                    actualValues = actualDnsResults.CNAME || [];
                    matched = actualValues.includes(expectedValue);
                    break;
                case 'MX':
                    actualValues = actualDnsResults.MX || [];
                    // For MX records, check both exchange-only and full format matches
                    matched = actualValues.some(mx => {
                        // Check if expected value is just the exchange name
                        if (mx.exchange === expectedValue) {
                            return true;
                        }
                        // Check if expected value is in full format "exchange (Priority: priority)"
                        const fullFormat = `${mx.exchange} (Priority: ${mx.priority})`;
                        return fullFormat === expectedValue;
                    });
                    break;
                case 'TXT':
                    actualValues = actualDnsResults.TXT || [];
                    // TXT records are now returned as flattened strings from DnsChecker
                    let txtMatched = false;

                    const normalizedExpected = expectedValue.replace(/\s+/g, ' ').trim();

                    for (const txtRecord of actualValues) {
                        const normalizedActual = (typeof txtRecord === 'string' ? txtRecord : String(txtRecord))
                            .replace(/\s+/g, ' ')
                            .trim();

                        if (normalizedActual === normalizedExpected) {
                            txtMatched = true;
                            break;
                        }
                    }

                    matched = txtMatched;
                    break;
                case 'NS':
                    actualValues = actualDnsResults.NS || [];
                    matched = actualValues.includes(expectedValue);
                    break;
                default:
                    console.warn(`Unsupported record type: ${recordType}`);
                    break;
            }

            validationResults.push({
                record_type: recordType,
                expected_value: expectedValue,
                actual_values: matched && actualValues.length === 1 ? actualValues[0] : actualValues,
                matched
            });

            if (!matched) {
                allMatched = false;
            }
        }

        // Update the history record with final status
        historyRecord.status = allMatched;
        await this.dnsCheckHistoryRepository.save(historyRecord);

        return {
            domain: domain.name,
            domain_id: domain.id,
            status: allMatched ? 'success' : 'failed',
            overall_match: allMatched,
            validation_details: validationResults,
            history_id: historyRecord.id
        };
    }

    async getDnsCheckHistory(domainId?: number) {
        const whereCondition = domainId ? { domain_id: domainId } : {};

        return await this.dnsCheckHistoryRepository.find({
            where: whereCondition,
            relations: ['domain'],
            order: { checked_at: 'DESC' }
        });
    }

    private async storeRetrievedDnsRecords(checkId: number, domainId: number, dnsResults: any) {
        const retrievedRecords: RetrievedDnsRecord[] = [];

        // Store A records
        if (dnsResults.A && dnsResults.A.length > 0) {
            for (const value of dnsResults.A) {
                const record = new RetrievedDnsRecord();
                record.check_id = checkId;
                record.domain_id = domainId;
                record.record_type = 'A';
                record.record_value = value;
                retrievedRecords.push(record);
            }
        }

        // Store AAAA records
        if (dnsResults.AAAA && dnsResults.AAAA.length > 0) {
            for (const value of dnsResults.AAAA) {
                const record = new RetrievedDnsRecord();
                record.check_id = checkId;
                record.domain_id = domainId;
                record.record_type = 'AAAA';
                record.record_value = value;
                retrievedRecords.push(record);
            }
        }

        // Store CNAME records
        if (dnsResults.CNAME && dnsResults.CNAME.length > 0) {
            for (const value of dnsResults.CNAME) {
                const record = new RetrievedDnsRecord();
                record.check_id = checkId;
                record.domain_id = domainId;
                record.record_type = 'CNAME';
                record.record_value = value;
                retrievedRecords.push(record);
            }
        }

        // Store MX records
        if (dnsResults.MX && dnsResults.MX.length > 0) {
            for (const mx of dnsResults.MX) {
                const record = new RetrievedDnsRecord();
                record.check_id = checkId;
                record.domain_id = domainId;
                record.record_type = 'MX';
                record.record_value = `${mx.priority} ${mx.exchange}`;
                retrievedRecords.push(record);
            }
        }

        // Store TXT records
        if (dnsResults.TXT && dnsResults.TXT.length > 0) {
            for (const txtArray of dnsResults.TXT) {
                const record = new RetrievedDnsRecord();
                record.check_id = checkId;
                record.domain_id = domainId;
                record.record_type = 'TXT';
                record.record_value = Array.isArray(txtArray) ? txtArray.join(' ') : txtArray;
                retrievedRecords.push(record);
            }
        }

        // Store NS records
        if (dnsResults.NS && dnsResults.NS.length > 0) {
            for (const value of dnsResults.NS) {
                const record = new RetrievedDnsRecord();
                record.check_id = checkId;
                record.domain_id = domainId;
                record.record_type = 'NS';
                record.record_value = value;
                retrievedRecords.push(record);
            }
        }

        // Store SOA records
        if (dnsResults.SOA) {
            const record = new RetrievedDnsRecord();
            record.check_id = checkId;
            record.domain_id = domainId;
            record.record_type = 'SOA';
            record.record_value = JSON.stringify(dnsResults.SOA);
            retrievedRecords.push(record);
        }

        // Store SRV records
        if (dnsResults.SRV && dnsResults.SRV.length > 0) {
            for (const srv of dnsResults.SRV) {
                const record = new RetrievedDnsRecord();
                record.check_id = checkId;
                record.domain_id = domainId;
                record.record_type = 'SRV';
                record.record_value = `${srv.priority} ${srv.weight} ${srv.port} ${srv.name}`;
                retrievedRecords.push(record);
            }
        }

        // Store PTR records
        if (dnsResults.PTR && dnsResults.PTR.length > 0) {
            for (const value of dnsResults.PTR) {
                const record = new RetrievedDnsRecord();
                record.check_id = checkId;
                record.domain_id = domainId;
                record.record_type = 'PTR';
                record.record_value = value;
                retrievedRecords.push(record);
            }
        }

        // Store SPF records
        if (dnsResults.SPF && dnsResults.SPF.length > 0) {
            for (const value of dnsResults.SPF) {
                const record = new RetrievedDnsRecord();
                record.check_id = checkId;
                record.domain_id = domainId;
                record.record_type = 'SPF';
                record.record_value = value;
                retrievedRecords.push(record);
            }
        }

        // Store DKIM records
        if (dnsResults.DKIM && dnsResults.DKIM.length > 0) {
            for (const dkim of dnsResults.DKIM) {
                const record = new RetrievedDnsRecord();
                record.check_id = checkId;
                record.domain_id = domainId;
                record.record_type = 'DKIM';
                record.record_value = `${dkim.selector}: ${dkim.record.join(' ')}`;
                retrievedRecords.push(record);
            }
        }

        // Store DMARC records
        if (dnsResults.DMARC && dnsResults.DMARC.length > 0) {
            for (const value of dnsResults.DMARC) {
                const record = new RetrievedDnsRecord();
                record.check_id = checkId;
                record.domain_id = domainId;
                record.record_type = 'DMARC';
                record.record_value = value;
                retrievedRecords.push(record);
            }
        }

        // Save all retrieved records to database
        if (retrievedRecords.length > 0) {
            await this.retrievedDnsRepository.save(retrievedRecords);
        }
    }

    async getRetrievedDnsRecords(checkId: number) {
        return await this.retrievedDnsRepository.find({
            where: { check_id: checkId },
            order: { record_type: 'ASC' }
        });
    }

}
