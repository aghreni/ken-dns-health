# DNS Health Checker

## New DNS Validation Flow

### Overview

The application now includes functionality to validate DNS records against expected values stored in the database.

### Flow

1. **Get all domains** from the `domains` table
2. **Perform DNS checks** for each domain using the DnsChecker service
3. **Store retrieved DNS records** in `retrieved_dns_records` table
4. **Compare results** against expected records stored in `expected_dns_records` table
5. **Update history** in `dns_check_history` table with validation results

### Database Tables

#### expected_dns_records

- `id` (Primary Key)
- `domain_id` (Foreign Key to domains table)
- `record_type` (VARCHAR: A, AAAA, CNAME, MX, TXT, NS, etc.)
- `record_value` (TEXT: Expected value for the record)
- `created_at`, `updated_at` (Timestamps)

#### dns_check_history

- `id` (Primary Key)
- `domain_id` (Foreign Key to domains table)
- `checked_at` (Timestamp of when the check was performed)
- `status` (Boolean: true if all expected records matched, false otherwise)
- `details` (JSON text containing detailed validation results)

#### retrieved_dns_records

- `id` (Primary Key)
- `check_id` (Foreign Key to dns_check_history table)
- `domain_id` (Foreign Key to domains table)
- `record_type` (VARCHAR: A, AAAA, CNAME, MX, TXT, NS, SOA, SRV, PTR, SPF, DKIM, DMARC)
- `record_value` (TEXT: Actual DNS record value retrieved)

### API Endpoints

#### GET `/validate-all-dns`

Validates DNS records for all domains against their expected records.

**Response:**

```json
{
  "totalDomains": 5,
  "results": [
    {
      "domain": "example.com",
      "domain_id": 1,
      "status": "success",
      "overall_match": true,
      "validation_details": [
        {
          "record_type": "A",
          "expected_value": "192.168.1.1",
          "actual_values": ["192.168.1.1", "192.168.1.2"],
          "matched": true
        }
      ],
      "history_id": 123
    }
  ]
}
```

#### GET `/dns-check-history?domain_id=1`

Retrieves DNS check history. Optional `domain_id` parameter to filter by specific domain.

**Response:**

```json
{
  "history": [
    {
      "id": 123,
      "domain_id": 1,
      "checked_at": "2025-07-15T10:30:00Z",
      "status": true,
      "details": "...",
      "domain": {
        "id": 1,
        "name": "example.com"
      }
    }
  ],
  "count": 1
}
```

#### GET `/retrieved-dns-records?check_id=123`

Retrieves all DNS records that were retrieved during a specific validation check.

**Response:**

```json
{
  "records": [
    {
      "id": 1,
      "check_id": 123,
      "domain_id": 1,
      "record_type": "A",
      "record_value": "192.168.1.1"
    },
    {
      "id": 2,
      "check_id": 123,
      "domain_id": 1,
      "record_type": "MX",
      "record_value": "10 mail.example.com"
    }
  ],
  "count": 2
}
```

#### PUT `/domain-with-expected-record`

Adds a domain to the domains table and creates an expected DNS record for validation.

**Request Body:**

```json
{
  "domain": "example.com",
  "record_type": "A",
  "record_value": "192.168.1.1"
}
```

**Response:**

```json
{
  "message": "Domain and expected DNS record added successfully",
  "domain": {
    "id": 1,
    "name": "example.com",
    "created_at": "2025-07-16T10:30:00Z",
    "updated_at": "2025-07-16T10:30:00Z"
  },
  "expected_record": {
    "id": 1,
    "domain_id": 1,
    "record_type": "A",
    "record_value": "192.168.1.1"
  }
}
```

**Validation:**

- `domain`: Must be a valid domain name format
- `record_type`: Must be one of: A, AAAA, CNAME, MX, TXT, NS, SOA, SRV, PTR, SPF, DKIM, DMARC
- `record_value`: Required field, accepts any text value

**Behavior:**

- If domain already exists, it will be reused
- If the same expected record already exists, it will be returned without creating a duplicate
- Record type is automatically converted to uppercase

### Setup

1. **Run the migration:**

   ```sql
   -- Execute the SQL in migrations/create_dns_tables.sql
   ```

2. **Add expected DNS records using the API:**

   ```bash
   # Add a domain with A record expectation
   curl -X PUT http://localhost:3000/domain-with-expected-record \
     -H "Content-Type: application/json" \
     -d '{
       "domain": "example.com",
       "record_type": "A",
       "record_value": "192.168.1.1"
     }'

   # Add TXT record expectation for the same domain
   curl -X PUT http://localhost:3000/domain-with-expected-record \
     -H "Content-Type: application/json" \
     -d '{
       "domain": "example.com",
       "record_type": "TXT",
       "record_value": "v=spf1 include:_spf.example.com ~all"
     }'

   # Add MX record expectation
   curl -X PUT http://localhost:3000/domain-with-expected-record \
     -H "Content-Type: application/json" \
     -d '{
       "domain": "example.com",
       "record_type": "MX",
       "record_value": "mail.example.com"
     }'
   ```

   **Or manually insert into database:**

   ```sql
   INSERT INTO expected_dns_records (domain_id, record_type, record_value) VALUES
   (1, 'A', '192.168.1.1'),
   (1, 'MX', 'mail.example.com'),
   (1, 'TXT', 'v=spf1 include:_spf.example.com ~all');
   ```

3. **Start the validation:**
   ```bash
   curl http://localhost:3000/validate-all-dns
   ```

### Supported Record Types

- **A**: IPv4 addresses
- **AAAA**: IPv6 addresses
- **CNAME**: Canonical names
- **MX**: Mail exchange (compares exchange field)
- **TXT**: Text records (flattened array comparison)
- **NS**: Name servers

### Notes

- Records are compared exactly as stored in `expected_dns_records.record_value`
- For MX records, only the `exchange` field is compared
- TXT records are flattened before comparison
- All validation results are stored in `dns_check_history` for auditing
- Each validation run creates a new history entry with timestamp
