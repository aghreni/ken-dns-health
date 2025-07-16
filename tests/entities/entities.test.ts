import { Domain } from '../../src/entities/Domain';
import { ExpectedDnsRecord } from '../../src/entities/ExpectedDnsRecord';
import { DnsCheckHistory } from '../../src/entities/DnsCheckHistory';
import { RetrievedDnsRecord } from '../../src/entities/RetrievedDnsRecord';

describe('Entity Tests', () => {
    describe('Domain Entity', () => {
        it('should create a domain instance', () => {
            const domain = new Domain();
            domain.id = 1;
            domain.name = 'example.com';
            domain.created_at = new Date();
            domain.updated_at = new Date();

            expect(domain.id).toBe(1);
            expect(domain.name).toBe('example.com');
            expect(domain.created_at).toBeInstanceOf(Date);
            expect(domain.updated_at).toBeInstanceOf(Date);
        });
    });

    describe('ExpectedDnsRecord Entity', () => {
        it('should create an expected DNS record instance', () => {
            const expectedRecord = new ExpectedDnsRecord();
            expectedRecord.id = 1;
            expectedRecord.domain_id = 1;
            expectedRecord.record_type = 'A';
            expectedRecord.record_value = '192.168.1.1';

            expect(expectedRecord.id).toBe(1);
            expect(expectedRecord.domain_id).toBe(1);
            expect(expectedRecord.record_type).toBe('A');
            expect(expectedRecord.record_value).toBe('192.168.1.1');
        });
    });

    describe('DnsCheckHistory Entity', () => {
        it('should create a DNS check history instance', () => {
            const history = new DnsCheckHistory();
            history.id = 1;
            history.domain_id = 1;
            history.checked_at = new Date();
            history.status = true;

            expect(history.id).toBe(1);
            expect(history.domain_id).toBe(1);
            expect(history.checked_at).toBeInstanceOf(Date);
            expect(history.status).toBe(true);
        });
    });

    describe('RetrievedDnsRecord Entity', () => {
        it('should create a retrieved DNS record instance', () => {
            const retrievedRecord = new RetrievedDnsRecord();
            retrievedRecord.id = 1;
            retrievedRecord.check_id = 1;
            retrievedRecord.domain_id = 1;
            retrievedRecord.record_type = 'A';
            retrievedRecord.record_value = '192.168.1.1';

            expect(retrievedRecord.id).toBe(1);
            expect(retrievedRecord.check_id).toBe(1);
            expect(retrievedRecord.domain_id).toBe(1);
            expect(retrievedRecord.record_type).toBe('A');
            expect(retrievedRecord.record_value).toBe('192.168.1.1');
        });
    });
});
