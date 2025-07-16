import { DnsValidationService } from '../../src/services/DnsValidationService';

describe('DnsValidationService', () => {
    let dnsValidationService: DnsValidationService;

    beforeEach(() => {
        dnsValidationService = new DnsValidationService();
    });

    describe('construction', () => {
        it('should create an instance', () => {
            expect(dnsValidationService).toBeDefined();
        });
    });
});
