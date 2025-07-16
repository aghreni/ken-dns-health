import { DnsChecker } from '../../src/services/DnsChecker';
import dns from 'dns/promises';

// Mock the dns module
jest.mock('dns/promises');
const mockDns = dns as jest.Mocked<typeof dns>;

describe('DnsChecker', () => {
    let dnsChecker: DnsChecker;
    const testDomain = 'example.com';

    beforeEach(() => {
        dnsChecker = new DnsChecker(testDomain);
        jest.clearAllMocks();
    });

    describe('getA', () => {
        it('should return A records successfully', async () => {
            const mockARecords = ['192.168.1.1', '192.168.1.2'];
            mockDns.resolve4.mockResolvedValue(mockARecords);

            const result = await dnsChecker.getA();

            expect(result).toEqual(mockARecords);
            expect(mockDns.resolve4).toHaveBeenCalledWith(testDomain);
        });

        it('should return empty array on DNS resolution error', async () => {
            mockDns.resolve4.mockRejectedValue(new Error('DNS resolution failed'));

            const result = await dnsChecker.getA();

            expect(result).toEqual([]);
            expect(mockDns.resolve4).toHaveBeenCalledWith(testDomain);
        });
    });

    describe('getAAAA', () => {
        it('should return AAAA records successfully', async () => {
            const mockAAAARecords = ['2001:db8::1', '2001:db8::2'];
            mockDns.resolve6.mockResolvedValue(mockAAAARecords);

            const result = await dnsChecker.getAAAA();

            expect(result).toEqual(mockAAAARecords);
            expect(mockDns.resolve6).toHaveBeenCalledWith(testDomain);
        });

        it('should return empty array on DNS resolution error', async () => {
            mockDns.resolve6.mockRejectedValue(new Error('DNS resolution failed'));

            const result = await dnsChecker.getAAAA();

            expect(result).toEqual([]);
        });
    });

    describe('getCNAME', () => {
        it('should return CNAME records successfully', async () => {
            const mockCNAMERecords = ['www.example.com'];
            mockDns.resolveCname.mockResolvedValue(mockCNAMERecords);

            const result = await dnsChecker.getCNAME();

            expect(result).toEqual(mockCNAMERecords);
            expect(mockDns.resolveCname).toHaveBeenCalledWith(testDomain);
        });

        it('should return empty array on DNS resolution error', async () => {
            mockDns.resolveCname.mockRejectedValue(new Error('DNS resolution failed'));

            const result = await dnsChecker.getCNAME();

            expect(result).toEqual([]);
        });
    });

    describe('getMX', () => {
        it('should return MX records successfully', async () => {
            const mockMXRecords = [
                { exchange: 'mail.example.com', priority: 10 },
                { exchange: 'mail2.example.com', priority: 20 }
            ];
            mockDns.resolveMx.mockResolvedValue(mockMXRecords);

            const result = await dnsChecker.getMX();

            expect(result).toEqual(mockMXRecords);
            expect(mockDns.resolveMx).toHaveBeenCalledWith(testDomain);
        });

        it('should return empty array on DNS resolution error', async () => {
            mockDns.resolveMx.mockRejectedValue(new Error('DNS resolution failed'));

            const result = await dnsChecker.getMX();

            expect(result).toEqual([]);
        });
    });

    describe('getTXT', () => {
        it('should return TXT records successfully', async () => {
            const mockTXTRecords = [
                ['v=spf1 include:_spf.example.com ~all'],
                ['google-site-verification=abc123']
            ];
            mockDns.resolveTxt.mockResolvedValue(mockTXTRecords);

            const result = await dnsChecker.getTXT();

            expect(result).toEqual(mockTXTRecords);
            expect(mockDns.resolveTxt).toHaveBeenCalledWith(testDomain);
        });

        it('should return empty array on DNS resolution error', async () => {
            mockDns.resolveTxt.mockRejectedValue(new Error('DNS resolution failed'));

            const result = await dnsChecker.getTXT();

            expect(result).toEqual([]);
        });
    });

    describe('getNS', () => {
        it('should return NS records successfully', async () => {
            const mockNSRecords = ['ns1.example.com', 'ns2.example.com'];
            mockDns.resolveNs.mockResolvedValue(mockNSRecords);

            const result = await dnsChecker.getNS();

            expect(result).toEqual(mockNSRecords);
            expect(mockDns.resolveNs).toHaveBeenCalledWith(testDomain);
        });

        it('should return empty array on DNS resolution error', async () => {
            mockDns.resolveNs.mockRejectedValue(new Error('DNS resolution failed'));

            const result = await dnsChecker.getNS();

            expect(result).toEqual([]);
        });
    });

    describe('getSOA', () => {
        it('should return SOA record successfully', async () => {
            const mockSOARecord = {
                nsname: 'ns1.example.com',
                hostmaster: 'admin.example.com',
                serial: 2023071501,
                refresh: 7200,
                retry: 3600,
                expire: 1209600,
                minttl: 86400
            };
            mockDns.resolveSoa.mockResolvedValue(mockSOARecord);

            const result = await dnsChecker.getSOA();

            expect(result).toEqual(mockSOARecord);
            expect(mockDns.resolveSoa).toHaveBeenCalledWith(testDomain);
        });

        it('should return null on DNS resolution error', async () => {
            mockDns.resolveSoa.mockRejectedValue(new Error('DNS resolution failed'));

            const result = await dnsChecker.getSOA();

            expect(result).toBeNull();
        });
    });

    describe('checkAll', () => {
        it('should return all DNS record types', async () => {
            // Mock all DNS methods
            mockDns.resolve4.mockResolvedValue(['192.168.1.1']);
            mockDns.resolve6.mockResolvedValue(['2001:db8::1']);
            mockDns.resolveCname.mockResolvedValue(['www.example.com']);
            mockDns.resolveMx.mockResolvedValue([{ exchange: 'mail.example.com', priority: 10 }]);
            mockDns.resolveTxt.mockResolvedValue([['v=spf1 include:_spf.example.com ~all']]);
            mockDns.resolveNs.mockResolvedValue(['ns1.example.com']);
            mockDns.resolveSoa.mockResolvedValue({
                nsname: 'ns1.example.com',
                hostmaster: 'admin.example.com',
                serial: 2023071501,
                refresh: 7200,
                retry: 3600,
                expire: 1209600,
                minttl: 86400
            });

            const result = await dnsChecker.checkAll();

            expect(result).toHaveProperty('A');
            expect(result).toHaveProperty('AAAA');
            expect(result).toHaveProperty('CNAME');
            expect(result).toHaveProperty('MX');
            expect(result).toHaveProperty('TXT');
            expect(result).toHaveProperty('NS');
            expect(result).toHaveProperty('SOA');
            expect(result).toHaveProperty('SRV');
            expect(result).toHaveProperty('PTR');
            expect(result).toHaveProperty('SPF');
            expect(result).toHaveProperty('DKIM');
            expect(result).toHaveProperty('DMARC');

            expect(result.A).toEqual(['192.168.1.1']);
            expect(result.MX).toEqual([{ exchange: 'mail.example.com', priority: 10 }]);
        });
    });
});
