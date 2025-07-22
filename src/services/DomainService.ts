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

    async getAllDomains(userId?: number): Promise<Domain[]> {
        try {
            const whereClause = userId ? { user_id: userId } : {};
            return await this.domainRepository.find({
                where: whereClause,
                select: ['id', 'name', 'user_id', 'created_at', 'updated_at'],
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

    async getDomainNames(userId?: number): Promise<string[]> {
        try {
            const whereClause = userId ? { user_id: userId } : {};
            const domains = await this.domainRepository.find({
                where: whereClause,
                select: ['name']
            });
            return domains.map(domain => domain.name);
        } catch (error) {
            console.error('Error fetching domain names:', error);
            throw new Error('Failed to fetch domain names from database');
        }
    }

    async createDomain(name: string, userId: number): Promise<Domain> {
        try {
            // Check if domain already exists globally (due to unique constraint)
            const existingDomain = await this.domainRepository.findOne({
                where: { name }
            });
            if (existingDomain) {
                // If domain exists but belongs to another user, throw specific error
                if (existingDomain.user_id !== userId) {
                    throw new Error('Domain already exists');
                }
                // If domain belongs to the same user, return it
                return existingDomain;
            }

            // Create new domain
            const domain = new Domain();
            domain.name = name;
            domain.user_id = userId;
            domain.created_at = new Date();
            domain.updated_at = new Date();

            return await this.domainRepository.save(domain);
        } catch (error) {
            console.error('Error creating domain:', error);
            if (error instanceof Error && error.message === 'Domain already exists') {
                throw error;
            }
            // Handle database constraint violation
            if (error instanceof Error && error.message.includes('duplicate key value violates unique constraint')) {
                throw new Error('Domain already exists');
            }
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

    async addDomainWithExpectedRecord(domainName: string, recordType: string, recordValue: string, userId: number): Promise<{ domain: Domain, expectedRecord: ExpectedDnsRecord }> {
        try {
            // Create or get domain
            const domain = await this.createDomain(domainName, userId);

            // Create expected DNS record
            const expectedRecord = await this.createExpectedDnsRecord(domain.id, recordType, recordValue);

            return { domain, expectedRecord };
        } catch (error) {
            console.error('Error adding domain with expected record:', error);
            if (error instanceof Error && error.message === 'Domain already exists') {
                throw error; // Propagate the specific error
            }
            throw new Error('Failed to add domain with expected record');
        }
    }
}
