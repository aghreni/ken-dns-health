// import { Repository } from 'typeorm';
// import { DnsValidationService } from '../../src/services/DnsValidationService';
// import { Domain } from '../../src/entities/Domain';
// import { ExpectedDnsRecord } from '../../src/entities/ExpectedDnsRecord';
// import { DnsCheckHistory } from '../../src/entities/DnsCheckHistory';
// import { RetrievedDnsRecord } from '../../src/entities/RetrievedDnsRecord';
// import { DnsChecker } from '../../src/services/DnsChecker';
// import { AppDataSource } from '../../src/config/database';

// // Mock the dependencies
// jest.mock('../src/config/database');
// jest.mock('../src/services/DnsChecker');

// const mockDnsChecker = DnsChecker as jest.MockedClass<typeof DnsChecker>;
// const mockAppDataSource = AppDataSource as jest.Mocked<typeof AppDataSource>;

// describe('DnsValidationService', () => {
//     let dnsValidationService: DnsValidationService;
//     let mockDomainRepository: jest.Mocked<Repository<Domain>>;
//     let mockExpectedDnsRepository: jest.Mocked<Repository<ExpectedDnsRecord>>;
//     let mockDnsCheckHistoryRepository: jest.Mocked<Repository<DnsCheckHistory>>;
//     let mockRetrievedDnsRepository: jest.Mocked<Repository<RetrievedDnsRecord>>;

//     beforeEach(() => {
//         // Create mock repositories
//         mockDomainRepository = {
//             find: jest.fn(),
//             findOne: jest.fn(),
//             save: jest.fn(),
//             create: jest.fn(),
//             delete: jest.fn(),
//         } as any;

//         mockExpectedDnsRepository = {
//             find: jest.fn(),
//             findOne: jest.fn(),
//             save: jest.fn(),
//             create: jest.fn(),
//             delete: jest.fn(),
//         } as any;

//         mockDnsCheckHistoryRepository = {
//             find: jest.fn(),
//             findOne: jest.fn(),
//             save: jest.fn(),
//             create: jest.fn(),
//             delete: jest.fn(),
//         } as any;

//         mockRetrievedDnsRepository = {
//             find: jest.fn(),
//             findOne: jest.fn(),
//             save: jest.fn(),
//             create: jest.fn(),
//             delete: jest.fn(),
//         } as any;

//         // Mock AppDataSource.getRepository
//         mockAppDataSource.getRepository.mockImplementation((entity) => {
//             if (entity === Domain) return mockDomainRepository;
//             if (entity === ExpectedDnsRecord) return mockExpectedDnsRepository;
//             if (entity === DnsCheckHistory) return mockDnsCheckHistoryRepository;
//             if (entity === RetrievedDnsRecord) return mockRetrievedDnsRepository;
//             throw new Error(`Unknown entity: ${entity}`);
//         });

//         dnsValidationService = new DnsValidationService();
//         jest.clearAllMocks();
//     });

//     describe('validateAllDomains', () => {
//         it('should validate all domains successfully', async () => {
//             const mockDomains = [
//                 { id: 1, name: 'example.com', created_at: new Date(), updated_at: new Date() },
//                 { id: 2, name: 'test.com', created_at: new Date(), updated_at: new Date() }
//             ];

//             mockDomainRepository.find.mockResolvedValue(mockDomains);

//             // Mock validateDomain to return success for both domains
//             const mockValidateResult = {
//                 domain: 'example.com',
//                 domain_id: 1,
//                 status: 'success',
//                 overall_match: true,
//                 validation_details: [],
//                 history_id: 1
//             };

//             jest.spyOn(dnsValidationService, 'validateDomain').mockResolvedValue(mockValidateResult);

//             const result = await dnsValidationService.validateAllDomains();

//             expect(result.totalDomains).toBe(2);
//             expect(result.results).toHaveLength(2);
//             expect(mockDomainRepository.find).toHaveBeenCalledTimes(1);
//         });

//         it('should handle validation errors gracefully', async () => {
//             const mockDomains = [
//                 { id: 1, name: 'example.com', created_at: new Date(), updated_at: new Date() }
//             ];

//             mockDomainRepository.find.mockResolvedValue(mockDomains);
//             jest.spyOn(dnsValidationService, 'validateDomain').mockRejectedValue(new Error('DNS lookup failed'));

//             const result = await dnsValidationService.validateAllDomains();

//             expect(result.totalDomains).toBe(1);
//             expect(result.results[0].status).toBe('error');
//             expect(result.results[0].message).toBe('DNS lookup failed');
//         });
//     });

//     describe('validateDomain', () => {
//         const mockDomain = { id: 1, name: 'example.com', created_at: new Date(), updated_at: new Date() };
//         const mockHistoryRecord = { id: 1, domain_id: 1, checked_at: new Date(), status: false };

//         beforeEach(() => {
//             mockDnsCheckHistoryRepository.save.mockResolvedValue(mockHistoryRecord as any);
//         });

//         it('should validate domain with matching A record', async () => {
//             const mockExpectedRecords = [
//                 { id: 1, domain_id: 1, record_type: 'A', record_value: '192.168.1.1', created_at: new Date(), updated_at: new Date() }
//             ];

//             const mockDnsResults = {
//                 A: ['192.168.1.1', '192.168.1.2'],
//                 AAAA: [],
//                 CNAME: [],
//                 MX: [],
//                 TXT: [],
//                 NS: [],
//                 SOA: null,
//                 SRV: [],
//                 PTR: [],
//                 SPF: [],
//                 DKIM: [],
//                 DMARC: []
//             };

//             mockExpectedDnsRepository.find.mockResolvedValue(mockExpectedRecords);
//             mockDnsChecker.prototype.checkAll.mockResolvedValue(mockDnsResults);

//             const result = await dnsValidationService.validateDomain(mockDomain);

//             expect(result.status).toBe('success');
//             expect(result.overall_match).toBe(true);
//             expect(result.validation_details).toHaveLength(1);
//             expect(result.validation_details[0].matched).toBe(true);
//             expect(result.validation_details[0].record_type).toBe('A');
//             expect(result.validation_details[0].expected_value).toBe('192.168.1.1');
//         });

//         it('should validate domain with non-matching A record', async () => {
//             const mockExpectedRecords = [
//                 { id: 1, domain_id: 1, record_type: 'A', record_value: '192.168.1.100', created_at: new Date(), updated_at: new Date() }
//             ];

//             const mockDnsResults = {
//                 A: ['192.168.1.1', '192.168.1.2'],
//                 AAAA: [],
//                 CNAME: [],
//                 MX: [],
//                 TXT: [],
//                 NS: [],
//                 SOA: null,
//                 SRV: [],
//                 PTR: [],
//                 SPF: [],
//                 DKIM: [],
//                 DMARC: []
//             };

//             mockExpectedDnsRepository.find.mockResolvedValue(mockExpectedRecords);
//             mockDnsChecker.prototype.checkAll.mockResolvedValue(mockDnsResults);

//             const result = await dnsValidationService.validateDomain(mockDomain);

//             expect(result.status).toBe('failed');
//             expect(result.overall_match).toBe(false);
//             expect(result.validation_details[0].matched).toBe(false);
//         });

//         it('should validate domain with matching TXT record', async () => {
//             const mockExpectedRecords = [
//                 { id: 1, domain_id: 1, record_type: 'TXT', record_value: 'v=spf1 include:_spf.example.com ~all', created_at: new Date(), updated_at: new Date() }
//             ];

//             const mockDnsResults = {
//                 A: [],
//                 AAAA: [],
//                 CNAME: [],
//                 MX: [],
//                 TXT: [['v=spf1 include:_spf.example.com ~all'], ['google-site-verification=abc123']],
//                 NS: [],
//                 SOA: null,
//                 SRV: [],
//                 PTR: [],
//                 SPF: [],
//                 DKIM: [],
//                 DMARC: []
//             };

//             mockExpectedDnsRepository.find.mockResolvedValue(mockExpectedRecords);
//             mockDnsChecker.prototype.checkAll.mockResolvedValue(mockDnsResults);

//             const result = await dnsValidationService.validateDomain(mockDomain);

//             expect(result.status).toBe('success');
//             expect(result.overall_match).toBe(true);
//             expect(result.validation_details[0].matched).toBe(true);
//             expect(result.validation_details[0].record_type).toBe('TXT');
//         });

//         it('should validate domain with matching MX record', async () => {
//             const mockExpectedRecords = [
//                 { id: 1, domain_id: 1, record_type: 'MX', record_value: 'mail.example.com', created_at: new Date(), updated_at: new Date() }
//             ];

//             const mockDnsResults = {
//                 A: [],
//                 AAAA: [],
//                 CNAME: [],
//                 MX: [{ exchange: 'mail.example.com', priority: 10 }],
//                 TXT: [],
//                 NS: [],
//                 SOA: null,
//                 SRV: [],
//                 PTR: [],
//                 SPF: [],
//                 DKIM: [],
//                 DMARC: []
//             };

//             mockExpectedDnsRepository.find.mockResolvedValue(mockExpectedRecords);
//             mockDnsChecker.prototype.checkAll.mockResolvedValue(mockDnsResults);

//             const result = await dnsValidationService.validateDomain(mockDomain);

//             expect(result.status).toBe('success');
//             expect(result.overall_match).toBe(true);
//             expect(result.validation_details[0].matched).toBe(true);
//             expect(result.validation_details[0].record_type).toBe('MX');
//         });

//         it('should handle domain with no expected records', async () => {
//             mockExpectedDnsRepository.find.mockResolvedValue([]);
//             mockDnsChecker.prototype.checkAll.mockResolvedValue({
//                 A: ['192.168.1.1'],
//                 AAAA: [],
//                 CNAME: [],
//                 MX: [],
//                 TXT: [],
//                 NS: [],
//                 SOA: null,
//                 SRV: [],
//                 PTR: [],
//                 SPF: [],
//                 DKIM: [],
//                 DMARC: []
//             });

//             const result = await dnsValidationService.validateDomain(mockDomain);

//             expect(result.status).toBe('no_expectations');
//             expect(result.message).toBe('No expected DNS records configured');
//         });

//         it('should validate multiple record types correctly', async () => {
//             const mockExpectedRecords = [
//                 { id: 1, domain_id: 1, record_type: 'A', record_value: '192.168.1.1', created_at: new Date(), updated_at: new Date() },
//                 { id: 2, domain_id: 1, record_type: 'TXT', record_value: 'v=spf1 include:_spf.example.com ~all', created_at: new Date(), updated_at: new Date() },
//                 { id: 3, domain_id: 1, record_type: 'MX', record_value: 'mail.example.com', created_at: new Date(), updated_at: new Date() }
//             ];

//             const mockDnsResults = {
//                 A: ['192.168.1.1'],
//                 AAAA: [],
//                 CNAME: [],
//                 MX: [{ exchange: 'mail.example.com', priority: 10 }],
//                 TXT: [['v=spf1 include:_spf.example.com ~all']],
//                 NS: [],
//                 SOA: null,
//                 SRV: [],
//                 PTR: [],
//                 SPF: [],
//                 DKIM: [],
//                 DMARC: []
//             };

//             mockExpectedDnsRepository.find.mockResolvedValue(mockExpectedRecords);
//             mockDnsChecker.prototype.checkAll.mockResolvedValue(mockDnsResults);

//             const result = await dnsValidationService.validateDomain(mockDomain);

//             expect(result.status).toBe('success');
//             expect(result.overall_match).toBe(true);
//             expect(result.validation_details).toHaveLength(3);
//             expect(result.validation_details.every(detail => detail.matched)).toBe(true);
//         });
//     });

//     describe('getDnsCheckHistory', () => {
//         it('should get DNS check history for all domains', async () => {
//             const mockHistory = [
//                 { id: 1, domain_id: 1, checked_at: new Date(), status: true },
//                 { id: 2, domain_id: 2, checked_at: new Date(), status: false }
//             ];

//             mockDnsCheckHistoryRepository.find.mockResolvedValue(mockHistory);

//             const result = await dnsValidationService.getDnsCheckHistory();

//             expect(result).toEqual(mockHistory);
//             expect(mockDnsCheckHistoryRepository.find).toHaveBeenCalledWith({
//                 where: {},
//                 relations: ['domain'],
//                 order: { checked_at: 'DESC' }
//             });
//         });

//         it('should get DNS check history for specific domain', async () => {
//             const mockHistory = [
//                 { id: 1, domain_id: 1, checked_at: new Date(), status: true }
//             ];

//             mockDnsCheckHistoryRepository.find.mockResolvedValue(mockHistory);

//             const result = await dnsValidationService.getDnsCheckHistory(1);

//             expect(result).toEqual(mockHistory);
//             expect(mockDnsCheckHistoryRepository.find).toHaveBeenCalledWith({
//                 where: { domain_id: 1 },
//                 relations: ['domain'],
//                 order: { checked_at: 'DESC' }
//             });
//         });
//     });

//     describe('getRetrievedDnsRecords', () => {
//         it('should get retrieved DNS records for specific check', async () => {
//             const mockRecords = [
//                 { id: 1, check_id: 1, domain_id: 1, record_type: 'A', record_value: '192.168.1.1' },
//                 { id: 2, check_id: 1, domain_id: 1, record_type: 'MX', record_value: '10 mail.example.com' }
//             ];

//             mockRetrievedDnsRepository.find.mockResolvedValue(mockRecords);

//             const result = await dnsValidationService.getRetrievedDnsRecords(1);

//             expect(result).toEqual(mockRecords);
//             expect(mockRetrievedDnsRepository.find).toHaveBeenCalledWith({
//                 where: { check_id: 1 },
//                 order: { record_type: 'ASC' }
//             });
//         });
//     });
// });
