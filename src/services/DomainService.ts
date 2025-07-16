import { Repository } from "typeorm";
import { AppDataSource } from "../config/database";
import { Domain } from "../entities/Domain";

export class DomainService {
    private domainRepository: Repository<Domain>;

    constructor() {
        this.domainRepository = AppDataSource.getRepository(Domain);
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
}
