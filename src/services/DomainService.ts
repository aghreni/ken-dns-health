import { Repository } from "typeorm";
import { AppDataSource } from "../config/database";
import { Domain } from "../entities/Domain";
import { ExpectedDnsRecord } from "../entities/ExpectedDnsRecord";

export class DomainService {
    private domainRepository: Repository<Domain>;
    private expectedDnsRepository: Repository<ExpectedDnsRecord>;

    constructor() {
        this.domainRepository = AppDataSource.getRepository(Domain);
        this.expectedDnsRepository = AppDataSource.getRepository(ExpectedDnsRecord);
    }

    async getAllDomains(): Promise<Domain[]> {
        try {
            return await this.domainRepository.find({
                select: ['id', 'name'],
                order: { name: 'ASC' }
            });
        } catch (error) {
            console.error('Error fetching domains:', error);
            throw new Error('Failed to fetch domains from database');
        }
    }

    async getDomainByName(name: string): Promise<Domain | null> {
        try {
            return await this.domainRepository.findOne({
                where: { name }
            });
        } catch (error) {
            console.error('Error fetching domain by name:', error);
            throw new Error('Failed to fetch domain from database');
        }
    }

    async getDomainNames(): Promise<string[]> {
        try {
            const domains = await this.domainRepository.find({
                select: ['name']
            });
            return domains.map(domain => domain.name);
        } catch (error) {
            console.error('Error fetching domain names:', error);
            throw new Error('Failed to fetch domain names from database');
        }
    }

    async createDomain(name: string): Promise<Domain> {
        try {
            // Check if domain already exists
            const existingDomain = await this.getDomainByName(name);
            if (existingDomain) {
                return existingDomain;
            }

            // Create new domain
            const domain = new Domain();
            domain.name = name;
            domain.created_at = new Date();
            domain.updated_at = new Date();

            return await this.domainRepository.save(domain);
        } catch (error) {
            console.error('Error creating domain:', error);
            throw new Error('Failed to create domain in database');
        }
    }

    async createExpectedDnsRecord(domainId: number, recordType: string, recordValue: string): Promise<ExpectedDnsRecord> {
        try {
            // Check if the same record already exists
            const existingRecord = await this.expectedDnsRepository.findOne({
                where: {
                    domain_id: domainId,
                    record_type: recordType.toUpperCase(),
                    record_value: recordValue
                }
            });

            if (existingRecord) {
                return existingRecord;
            }

            // Create new expected DNS record
            const expectedRecord = new ExpectedDnsRecord();
            expectedRecord.domain_id = domainId;
            expectedRecord.record_type = recordType.toUpperCase();
            expectedRecord.record_value = recordValue;

            return await this.expectedDnsRepository.save(expectedRecord);
        } catch (error) {
            console.error('Error creating expected DNS record:', error);
            throw new Error('Failed to create expected DNS record in database');
        }
    }

    async addDomainWithExpectedRecord(domainName: string, recordType: string, recordValue: string): Promise<{ domain: Domain, expectedRecord: ExpectedDnsRecord }> {
        try {
            // Create or get domain
            const domain = await this.createDomain(domainName);

            // Create expected DNS record
            const expectedRecord = await this.createExpectedDnsRecord(domain.id, recordType, recordValue);

            return { domain, expectedRecord };
        } catch (error) {
            console.error('Error adding domain with expected record:', error);
            throw new Error('Failed to add domain with expected record');
        }
    }
}
