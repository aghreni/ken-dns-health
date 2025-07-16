import { Repository } from 'typeorm';
import { DomainService } from '../../src/services/DomainService';
import { Domain } from '../../src/entities/Domain';
import { ExpectedDnsRecord } from '../../src/entities/ExpectedDnsRecord';
import { AppDataSource } from '../../src/config/database';

// Mock the database connection
jest.mock('../src/config/database');

const mockAppDataSource = AppDataSource as jest.Mocked<typeof AppDataSource>;

describe('DomainService', () => {
    let domainService: DomainService;
    let mockDomainRepository: jest.Mocked<Repository<Domain>>;
    let mockExpectedDnsRepository: jest.Mocked<Repository<ExpectedDnsRecord>>;

    beforeEach(() => {
        mockDomainRepository = {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
            delete: jest.fn(),
        } as any;

        mockExpectedDnsRepository = {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
            delete: jest.fn(),
        } as any;

        mockAppDataSource.getRepository.mockImplementation((entity) => {
            if (entity === Domain) return mockDomainRepository;
            if (entity === ExpectedDnsRecord) return mockExpectedDnsRepository;
            throw new Error(`Unknown entity: ${entity}`);
        });

        domainService = new DomainService();
        jest.clearAllMocks();
    });

    describe('getAllDomains', () => {
        it('should return all domains successfully', async () => {
            const mockDomains = [
                { id: 1, name: 'example.com', created_at: new Date(), updated_at: new Date() },
                { id: 2, name: 'test.com', created_at: new Date(), updated_at: new Date() }
            ];

            mockDomainRepository.find.mockResolvedValue(mockDomains);

            const result = await domainService.getAllDomains();

            expect(result).toEqual(mockDomains);
            expect(mockDomainRepository.find).toHaveBeenCalledWith({
                select: ['id', 'name'],
                order: { name: 'ASC' }
            });
        });

        it('should handle database errors', async () => {
            mockDomainRepository.find.mockRejectedValue(new Error('Database connection failed'));

            await expect(domainService.getAllDomains()).rejects.toThrow('Failed to fetch domains from database');
        });
    });

    describe('getDomainByName', () => {
        it('should return domain by name successfully', async () => {
            const mockDomain = { id: 1, name: 'example.com', created_at: new Date(), updated_at: new Date() };

            mockDomainRepository.findOne.mockResolvedValue(mockDomain);

            const result = await domainService.getDomainByName('example.com');

            expect(result).toEqual(mockDomain);
            expect(mockDomainRepository.findOne).toHaveBeenCalledWith({
                where: { name: 'example.com' }
            });
        });

        it('should return null when domain not found', async () => {
            mockDomainRepository.findOne.mockResolvedValue(null);

            const result = await domainService.getDomainByName('nonexistent.com');

            expect(result).toBeNull();
        });

        it('should handle database errors', async () => {
            mockDomainRepository.findOne.mockRejectedValue(new Error('Database connection failed'));

            await expect(domainService.getDomainByName('example.com')).rejects.toThrow('Failed to fetch domain from database');
        });
    });

    describe('getDomainNames', () => {
        it('should return domain names successfully', async () => {
            const mockDomains = [
                { id: 1, name: 'example.com', created_at: new Date(), updated_at: new Date() },
                { id: 2, name: 'test.com', created_at: new Date(), updated_at: new Date() }
            ];

            mockDomainRepository.find.mockResolvedValue(mockDomains);

            const result = await domainService.getDomainNames();

            expect(result).toEqual(['example.com', 'test.com']);
            expect(mockDomainRepository.find).toHaveBeenCalledWith({
                select: ['name']
            });
        });

        it('should handle database errors', async () => {
            mockDomainRepository.find.mockRejectedValue(new Error('Database connection failed'));

            await expect(domainService.getDomainNames()).rejects.toThrow('Failed to fetch domain names from database');
        });
    });

    describe('createDomain', () => {
        it('should create a new domain successfully', async () => {
            const mockDomain = { id: 1, name: 'example.com', created_at: new Date(), updated_at: new Date() };

            mockDomainRepository.findOne.mockResolvedValue(null); // Domain doesn't exist
            mockDomainRepository.save.mockResolvedValue(mockDomain);

            const result = await domainService.createDomain('example.com');

            expect(result).toEqual(mockDomain);
            expect(mockDomainRepository.findOne).toHaveBeenCalledWith({
                where: { name: 'example.com' }
            });
            expect(mockDomainRepository.save).toHaveBeenCalled();
        });

        it('should return existing domain if already exists', async () => {
            const mockExistingDomain = { id: 1, name: 'example.com', created_at: new Date(), updated_at: new Date() };

            mockDomainRepository.findOne.mockResolvedValue(mockExistingDomain);

            const result = await domainService.createDomain('example.com');

            expect(result).toEqual(mockExistingDomain);
            expect(mockDomainRepository.save).not.toHaveBeenCalled();
        });

        it('should handle database errors', async () => {
            mockDomainRepository.findOne.mockRejectedValue(new Error('Database connection failed'));

            await expect(domainService.createDomain('example.com')).rejects.toThrow('Failed to create domain in database');
        });
    });

    describe('createExpectedDnsRecord', () => {
        it('should create a new expected DNS record successfully', async () => {
            const mockExpectedRecord = { id: 1, domain_id: 1, record_type: 'A', record_value: '192.168.1.1' };

            mockExpectedDnsRepository.findOne.mockResolvedValue(null); // Record doesn't exist
            mockExpectedDnsRepository.save.mockResolvedValue(mockExpectedRecord);

            const result = await domainService.createExpectedDnsRecord(1, 'A', '192.168.1.1');

            expect(result).toEqual(mockExpectedRecord);
            expect(mockExpectedDnsRepository.findOne).toHaveBeenCalledWith({
                where: {
                    domain_id: 1,
                    record_type: 'A',
                    record_value: '192.168.1.1'
                }
            });
            expect(mockExpectedDnsRepository.save).toHaveBeenCalled();
        });

        it('should return existing record if already exists', async () => {
            const mockExistingRecord = { id: 1, domain_id: 1, record_type: 'A', record_value: '192.168.1.1' };

            mockExpectedDnsRepository.findOne.mockResolvedValue(mockExistingRecord);

            const result = await domainService.createExpectedDnsRecord(1, 'A', '192.168.1.1');

            expect(result).toEqual(mockExistingRecord);
            expect(mockExpectedDnsRepository.save).not.toHaveBeenCalled();
        });

        it('should convert record type to uppercase', async () => {
            const mockExpectedRecord = { id: 1, domain_id: 1, record_type: 'A', record_value: '192.168.1.1' };

            mockExpectedDnsRepository.findOne.mockResolvedValue(null);
            mockExpectedDnsRepository.save.mockResolvedValue(mockExpectedRecord);

            await domainService.createExpectedDnsRecord(1, 'a', '192.168.1.1');

            expect(mockExpectedDnsRepository.findOne).toHaveBeenCalledWith({
                where: {
                    domain_id: 1,
                    record_type: 'A',
                    record_value: '192.168.1.1'
                }
            });
        });

        it('should handle database errors', async () => {
            mockExpectedDnsRepository.findOne.mockRejectedValue(new Error('Database connection failed'));

            await expect(domainService.createExpectedDnsRecord(1, 'A', '192.168.1.1')).rejects.toThrow('Failed to create expected DNS record in database');
        });
    });

    describe('addDomainWithExpectedRecord', () => {
        it('should add domain with expected record successfully', async () => {
            const mockDomain = { id: 1, name: 'example.com', created_at: new Date(), updated_at: new Date() };
            const mockExpectedRecord = { id: 1, domain_id: 1, record_type: 'A', record_value: '192.168.1.1' };

            // Mock domain creation
            mockDomainRepository.findOne.mockResolvedValue(null);
            mockDomainRepository.save.mockResolvedValue(mockDomain);

            // Mock expected record creation
            mockExpectedDnsRepository.findOne.mockResolvedValue(null);
            mockExpectedDnsRepository.save.mockResolvedValue(mockExpectedRecord);

            const result = await domainService.addDomainWithExpectedRecord('example.com', 'A', '192.168.1.1');

            expect(result.domain).toEqual(mockDomain);
            expect(result.expectedRecord).toEqual(mockExpectedRecord);
        });

        it('should use existing domain if it already exists', async () => {
            const mockExistingDomain = { id: 1, name: 'example.com', created_at: new Date(), updated_at: new Date() };
            const mockExpectedRecord = { id: 1, domain_id: 1, record_type: 'A', record_value: '192.168.1.1' };

            // Mock existing domain
            mockDomainRepository.findOne.mockResolvedValue(mockExistingDomain);

            // Mock expected record creation
            mockExpectedDnsRepository.findOne.mockResolvedValue(null);
            mockExpectedDnsRepository.save.mockResolvedValue(mockExpectedRecord);

            const result = await domainService.addDomainWithExpectedRecord('example.com', 'A', '192.168.1.1');

            expect(result.domain).toEqual(mockExistingDomain);
            expect(result.expectedRecord).toEqual(mockExpectedRecord);
            expect(mockDomainRepository.save).not.toHaveBeenCalled(); // Should not save if domain exists
        });

        it('should handle errors gracefully', async () => {
            mockDomainRepository.findOne.mockRejectedValue(new Error('Database connection failed'));

            await expect(domainService.addDomainWithExpectedRecord('example.com', 'A', '192.168.1.1')).rejects.toThrow('Failed to add domain with expected record');
        });
    });
});
