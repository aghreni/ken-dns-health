# DNS Health Checker

## New DNS Validation Flow

### Overview

The application now includes functionality to validate DNS records against expected values stored in the database.

### Flow

1. **Get all domains** from the `domains` table
2. **Perform DNS checks** for each domain using the DnsChecker service
3. **Compare results** against expected records stored in `expected_dns_records` table
4. **Update history** in `dns_check_history` table with validation results

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

### Setup

1. **Run the migration:**

   ```sql
   -- Execute the SQL in migrations/create_dns_tables.sql
   ```

2. **Add expected DNS records:**

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
