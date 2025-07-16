import request from 'supertest';
import app from '../src/app';
import { DnsChecker } from '../src/services/DnsChecker';
import { DomainService } from '../src/services/DomainService';
import { DnsValidationService } from '../src/services/DnsValidationService';

// Mock the services
jest.mock('../src/services/DnsChecker');
jest.mock('../src/services/DomainService');
jest.mock('../src/services/DnsValidationService');

const mockDnsChecker = DnsChecker as jest.MockedClass<typeof DnsChecker>;
const mockDomainService = DomainService as jest.MockedClass<typeof DomainService>;
const mockDnsValidationService = DnsValidationService as jest.MockedClass<typeof DnsValidationService>;

describe('App Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /check-dns', () => {
        it('should return DNS check results for valid domain', async () => {
            const mockDnsResults = {
                A: ['192.168.1.1'],
                AAAA: [],
                CNAME: [],
                MX: [{ exchange: 'mail.example.com', priority: 10 }],
                TXT: [['v=spf1 include:_spf.example.com ~all']],
                NS: ['ns1.example.com'],
                SOA: null,
                SRV: [],
                PTR: [],
                SPF: [],
                DKIM: [],
                DMARC: []
            };

            mockDnsChecker.prototype.checkAll.mockResolvedValue(mockDnsResults);

            const response = await request(app)
                .get('/check-dns')
                .query({ domain: 'example.com' });

            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockDnsResults);
            expect(mockDnsChecker).toHaveBeenCalledWith('example.com');
        });

        it('should return 400 error when domain is not provided', async () => {
            const response = await request(app)
                .get('/check-dns');

            expect(response.status).toBe(400);
            expect(response.body).toEqual({ error: 'No domain provided' });
        });
    });

    describe('GET /domains', () => {
        it('should return all domains successfully', async () => {
            const mockDomains = [
                { id: 1, name: 'example.com', created_at: new Date(), updated_at: new Date() },
                { id: 2, name: 'test.com', created_at: new Date(), updated_at: new Date() }
            ];

            mockDomainService.prototype.getAllDomains.mockResolvedValue(mockDomains);

            const response = await request(app)
                .get('/domains');

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                domains: mockDomains,
                count: 2
            });
        });

        it('should handle service errors', async () => {
            mockDomainService.prototype.getAllDomains.mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .get('/domains');

            expect(response.status).toBe(500);
            expect(response.body).toEqual({ error: 'Failed to fetch domains' });
        });
    });

    describe('GET /domain-names', () => {
        it('should return domain names successfully', async () => {
            const mockDomainNames = ['example.com', 'test.com'];

            mockDomainService.prototype.getDomainNames.mockResolvedValue(mockDomainNames);

            const response = await request(app)
                .get('/domain-names');

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                domainNames: mockDomainNames,
                count: 2
            });
        });

        it('should handle service errors', async () => {
            mockDomainService.prototype.getDomainNames.mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .get('/domain-names');

            expect(response.status).toBe(500);
            expect(response.body).toEqual({ error: 'Failed to fetch domain names' });
        });
    });

    describe('GET /check-all-dns', () => {
        it('should check DNS for all domains successfully', async () => {
            const mockDomainNames = ['example.com', 'test.com'];
            const mockDnsResults = {
                A: ['192.168.1.1'],
                AAAA: [],
                CNAME: [],
                MX: [],
                TXT: [],
                NS: [],
                SOA: null,
                SRV: [],
                PTR: [],
                SPF: [],
                DKIM: [],
                DMARC: []
            };

            mockDomainService.prototype.getDomainNames.mockResolvedValue(mockDomainNames);
            mockDnsChecker.prototype.checkAll.mockResolvedValue(mockDnsResults);

            const response = await request(app)
                .get('/check-all-dns');

            expect(response.status).toBe(200);
            expect(response.body.totalDomains).toBe(2);
            expect(response.body.results).toHaveLength(2);
            expect(response.body.results[0].domain).toBe('example.com');
            expect(response.body.results[0].status).toBe('success');
        });

        it('should handle DNS check errors gracefully', async () => {
            const mockDomainNames = ['example.com'];

            mockDomainService.prototype.getDomainNames.mockResolvedValue(mockDomainNames);
            mockDnsChecker.prototype.checkAll.mockRejectedValue(new Error('DNS lookup failed'));

            const response = await request(app)
                .get('/check-all-dns');

            expect(response.status).toBe(200);
            expect(response.body.results[0].status).toBe('error');
            expect(response.body.results[0].error).toBe('DNS lookup failed');
        });
    });

    describe('GET /validate-all-dns', () => {
        it('should validate DNS for all domains successfully', async () => {
            const mockValidationResults = {
                totalDomains: 2,
                results: [
                    {
                        domain: 'example.com',
                        domain_id: 1,
                        status: 'success',
                        overall_match: true,
                        validation_details: [
                            {
                                record_type: 'A',
                                expected_value: '192.168.1.1',
                                actual_values: ['192.168.1.1'],
                                matched: true
                            }
                        ],
                        history_id: 1
                    }
                ]
            };

            mockDnsValidationService.prototype.validateAllDomains.mockResolvedValue(mockValidationResults);

            const response = await request(app)
                .get('/validate-all-dns');

            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockValidationResults);
        });

        it('should handle validation service errors', async () => {
            mockDnsValidationService.prototype.validateAllDomains.mockRejectedValue(new Error('Validation failed'));

            const response = await request(app)
                .get('/validate-all-dns');

            expect(response.status).toBe(500);
            expect(response.body).toEqual({ error: 'Failed to validate DNS for all domains' });
        });
    });

    describe('GET /dns-check-history', () => {
        it('should return DNS check history successfully', async () => {
            const mockHistory = [
                { id: 1, domain_id: 1, checked_at: new Date(), status: true },
                { id: 2, domain_id: 2, checked_at: new Date(), status: false }
            ];

            mockDnsValidationService.prototype.getDnsCheckHistory.mockResolvedValue(mockHistory);

            const response = await request(app)
                .get('/dns-check-history');

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                history: mockHistory,
                count: 2
            });
        });

        it('should return history for specific domain', async () => {
            const mockHistory = [
                { id: 1, domain_id: 1, checked_at: new Date(), status: true }
            ];

            mockDnsValidationService.prototype.getDnsCheckHistory.mockResolvedValue(mockHistory);

            const response = await request(app)
                .get('/dns-check-history')
                .query({ domain_id: '1' });

            expect(response.status).toBe(200);
            expect(response.body.count).toBe(1);
            expect(mockDnsValidationService.prototype.getDnsCheckHistory).toHaveBeenCalledWith(1);
        });
    });

    describe('GET /retrieved-dns-records', () => {
        it('should return retrieved DNS records successfully', async () => {
            const mockRecords = [
                { id: 1, check_id: 1, domain_id: 1, record_type: 'A', record_value: '192.168.1.1' },
                { id: 2, check_id: 1, domain_id: 1, record_type: 'MX', record_value: '10 mail.example.com' }
            ];

            mockDnsValidationService.prototype.getRetrievedDnsRecords.mockResolvedValue(mockRecords);

            const response = await request(app)
                .get('/retrieved-dns-records')
                .query({ check_id: '1' });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                records: mockRecords,
                count: 2
            });
        });

        it('should return 400 error when check_id is not provided', async () => {
            const response = await request(app)
                .get('/retrieved-dns-records');

            expect(response.status).toBe(400);
            expect(response.body).toEqual({ error: 'check_id parameter is required' });
        });

        it('should handle service errors', async () => {
            mockDnsValidationService.prototype.getRetrievedDnsRecords.mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .get('/retrieved-dns-records')
                .query({ check_id: '1' });

            expect(response.status).toBe(500);
            expect(response.body).toEqual({ error: 'Failed to fetch retrieved DNS records' });
        });
    });

    describe('PUT /domain-with-expected-record', () => {
        it('should add domain with expected record successfully', async () => {
            const mockResult = {
                domain: { id: 1, name: 'example.com', created_at: new Date(), updated_at: new Date() },
                expectedRecord: { id: 1, domain_id: 1, record_type: 'A', record_value: '192.168.1.1' }
            };

            mockDomainService.prototype.addDomainWithExpectedRecord.mockResolvedValue(mockResult);

            const response = await request(app)
                .put('/domain-with-expected-record')
                .send({
                    domain: 'example.com',
                    record_type: 'A',
                    record_value: '192.168.1.1'
                });

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Domain and expected DNS record added successfully');
            expect(response.body.domain.name).toBe('example.com');
            expect(response.body.expected_record.record_type).toBe('A');
            expect(response.body.expected_record.record_value).toBe('192.168.1.1');
        });

        it('should return 400 error when domain is missing', async () => {
            const response = await request(app)
                .put('/domain-with-expected-record')
                .send({
                    record_type: 'A',
                    record_value: '192.168.1.1'
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Missing required fields: domain, record_type, and record_value are required');
        });

        it('should return 400 error when record_type is missing', async () => {
            const response = await request(app)
                .put('/domain-with-expected-record')
                .send({
                    domain: 'example.com',
                    record_value: '192.168.1.1'
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Missing required fields: domain, record_type, and record_value are required');
        });

        it('should return 400 error when record_value is missing', async () => {
            const response = await request(app)
                .put('/domain-with-expected-record')
                .send({
                    domain: 'example.com',
                    record_type: 'A'
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Missing required fields: domain, record_type, and record_value are required');
        });

        it('should return 400 error for invalid record_type', async () => {
            const response = await request(app)
                .put('/domain-with-expected-record')
                .send({
                    domain: 'example.com',
                    record_type: 'INVALID',
                    record_value: '192.168.1.1'
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Invalid record_type');
        });

        it('should return 400 error for invalid domain format', async () => {
            const response = await request(app)
                .put('/domain-with-expected-record')
                .send({
                    domain: 'invalid..domain',
                    record_type: 'A',
                    record_value: '192.168.1.1'
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Invalid domain name format');
        });

        it('should accept different record types', async () => {
            const validRecordTypes = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS'];

            for (const recordType of validRecordTypes) {
                const mockResult = {
                    domain: { id: 1, name: 'example.com', created_at: new Date(), updated_at: new Date() },
                    expectedRecord: { id: 1, domain_id: 1, record_type: recordType, record_value: 'test-value' }
                };

                mockDomainService.prototype.addDomainWithExpectedRecord.mockResolvedValue(mockResult);

                const response = await request(app)
                    .put('/domain-with-expected-record')
                    .send({
                        domain: 'example.com',
                        record_type: recordType,
                        record_value: 'test-value'
                    });

                expect(response.status).toBe(200);
                expect(response.body.expected_record.record_type).toBe(recordType);
            }
        });

        it('should handle service errors', async () => {
            mockDomainService.prototype.addDomainWithExpectedRecord.mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .put('/domain-with-expected-record')
                .send({
                    domain: 'example.com',
                    record_type: 'A',
                    record_value: '192.168.1.1'
                });

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Failed to add domain with expected record');
        });
    });
});
