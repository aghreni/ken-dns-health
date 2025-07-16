import { Repository } from "typeorm";
import { AppDataSource } from "../config/database";
import { Domain } from "../entities/Domain";
import { ExpectedDnsRecord } from "../entities/ExpectedDnsRecord";
import { DnsCheckHistory } from "../entities/DnsCheckHistory";
import { DnsChecker } from "./DnsChecker";

export class DnsValidationService {
    private domainRepository: Repository<Domain>;
    private expectedDnsRepository: Repository<ExpectedDnsRecord>;
    private dnsCheckHistoryRepository: Repository<DnsCheckHistory>;

    constructor() {
        this.domainRepository = AppDataSource.getRepository(Domain);
        this.expectedDnsRepository = AppDataSource.getRepository(ExpectedDnsRecord);
        this.dnsCheckHistoryRepository = AppDataSource.getRepository(DnsCheckHistory);
    }

    async validateAllDomains() {
        try {
            // Get all domains from database
            const domains = await this.domainRepository.find();
            const results = [];

            for (const domain of domains) {
                try {
                    const result = await this.validateDomain(domain);
                    results.push(result);
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

        if (expectedRecords.length === 0) {
            console.log(`No expected DNS records found for domain: ${domain.name}`);
            return {
                domain: domain.name,
                domain_id: domain.id,
                status: 'no_expectations',
                message: 'No expected DNS records configured'
            };
        }

        // Perform DNS check
        const dnsChecker = new DnsChecker(domain.name);
        const actualDnsResults = await dnsChecker.checkAll();

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
                    // For MX records, check if exchange matches
                    matched = actualValues.some(mx => mx.exchange === expectedValue);
                    break;
                case 'TXT':
                    actualValues = actualDnsResults.TXT || [];
                    // TXT records come as arrays, so flatten and check
                    const flatTxtRecords = actualValues.flat();
                    matched = flatTxtRecords.includes(expectedValue);
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
                actual_values: actualValues,
                matched
            });

            if (!matched) {
                allMatched = false;
            }
        }

        // Save to dns_check_history
        const historyRecord = new DnsCheckHistory();
        historyRecord.domain_id = domain.id;
        historyRecord.checked_at = new Date();
        historyRecord.status = allMatched;
        await this.dnsCheckHistoryRepository.save(historyRecord);

        return {
            domain: domain.name,
            domain_id: domain.id,
            status: allMatched ? 'success' : 'failed',
            overall_match: allMatched,
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
}
