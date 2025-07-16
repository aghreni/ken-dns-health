# DNS Health Checker - Test Documentation

## Overview

This document describes the comprehensive test suite for the DNS Health Checker application using Jest.

## Test Structure

### 1. **Unit Tests**

- **Location**: `tests/services/`
- **Purpose**: Test individual service methods in isolation
- **Coverage**: All service classes and their methods

### 2. **Integration Tests**

- **Location**: `tests/app.test.ts`
- **Purpose**: Test API endpoints and their integration with services
- **Coverage**: All Express.js routes and error handling

### 3. **Entity Tests**

- **Location**: `tests/entities/`
- **Purpose**: Test TypeORM entity configurations
- **Coverage**: All database entities

## Test Files

### `tests/services/DnsChecker.test.ts`

Tests for the DNS checking functionality:

- ✅ A record resolution
- ✅ AAAA record resolution
- ✅ CNAME record resolution
- ✅ MX record resolution
- ✅ TXT record resolution
- ✅ NS record resolution
- ✅ SOA record resolution
- ✅ Error handling for failed DNS lookups
- ✅ Complete DNS check (`checkAll` method)

### `tests/services/DnsValidationService.test.ts`

Tests for DNS validation logic:

- ✅ Domain validation with matching records
- ✅ Domain validation with non-matching records
- ✅ Multiple record type validation
- ✅ Domains with no expected records
- ✅ Record type-specific validation (A vs A, TXT vs TXT, etc.)
- ✅ DNS check history management
- ✅ Retrieved DNS records storage
- ✅ Error handling

### `tests/services/DomainService.test.ts`

Tests for domain management:

- ✅ Fetch all domains
- ✅ Fetch domain by name
- ✅ Fetch domain names only
- ✅ Database error handling

### `tests/app.test.ts`

API endpoint integration tests:

- ✅ `GET /check-dns` - Single domain DNS check
- ✅ `GET /domains` - Fetch all domains
- ✅ `GET /domain-names` - Fetch domain names
- ✅ `GET /check-all-dns` - DNS check for all domains
- ✅ `GET /validate-all-dns` - DNS validation for all domains
- ✅ `GET /dns-check-history` - Fetch validation history
- ✅ `GET /retrieved-dns-records` - Fetch retrieved records
- ✅ Error handling for all endpoints

### `tests/entities/entities.test.ts`

Entity configuration tests:

- ✅ Domain entity creation
- ✅ ExpectedDnsRecord entity creation
- ✅ DnsCheckHistory entity creation
- ✅ RetrievedDnsRecord entity creation

## Running Tests

### Install Dependencies

```bash
npm install
```

### Run All Tests

```bash
npm test
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Test Script

```bash
chmod +x run-tests.sh
./run-tests.sh
```

## Test Configuration

### Jest Configuration (`jest.config.js`)

- **Preset**: `ts-jest` for TypeScript support
- **Environment**: Node.js
- **Coverage**: Collects coverage from all service files
- **Setup**: Loads test environment configuration

### Test Environment (`.env.test`)

- Test database configuration
- Isolated from production environment

## Key Test Scenarios

### 1. **DNS Record Type Validation**

```typescript
// Test ensures A records are only compared with A records
it("should validate domain with matching A record", async () => {
  const mockExpectedRecords = [
    { record_type: "A", record_value: "192.168.1.1" },
  ];
  const mockDnsResults = {
    A: ["192.168.1.1", "192.168.1.2"], // Only A records checked
    TXT: ["v=spf1 include:_spf.example.com ~all"], // Ignored
  };
  // ... test implementation
});
```

### 2. **Error Handling**

```typescript
// Test ensures graceful error handling
it("should handle DNS lookup failures", async () => {
  mockDnsChecker.prototype.checkAll.mockRejectedValue(
    new Error("DNS lookup failed")
  );
  const result = await dnsValidationService.validateDomain(mockDomain);
  expect(result.status).toBe("error");
});
```

### 3. **Multiple Record Types**

```typescript
// Test validates multiple record types correctly
it("should validate multiple record types correctly", async () => {
  const mockExpectedRecords = [
    { record_type: "A", record_value: "192.168.1.1" },
    {
      record_type: "TXT",
      record_value: "v=spf1 include:_spf.example.com ~all",
    },
    { record_type: "MX", record_value: "mail.example.com" },
  ];
  // ... test ensures all types are validated separately
});
```

## Mock Strategy

### Service Mocks

- **DnsChecker**: Mocked to return controlled DNS results
- **Database Repositories**: Mocked to return test data
- **AppDataSource**: Mocked to return mock repositories

### DNS Module Mock

- **dns/promises**: Mocked to simulate DNS resolution results
- **Error scenarios**: Mocked to test error handling

## Coverage Goals

- **Unit Tests**: 90%+ coverage for all service methods
- **Integration Tests**: 100% coverage for all API endpoints
- **Edge Cases**: Complete coverage of error scenarios
- **Record Types**: Coverage for all supported DNS record types

## Test Data

### Mock Domains

```typescript
const mockDomains = [
  { id: 1, name: "example.com" },
  { id: 2, name: "test.com" },
];
```

### Mock DNS Results

```typescript
const mockDnsResults = {
  A: ["192.168.1.1"],
  AAAA: ["2001:db8::1"],
  CNAME: ["www.example.com"],
  MX: [{ exchange: "mail.example.com", priority: 10 }],
  TXT: [["v=spf1 include:_spf.example.com ~all"]],
  NS: ["ns1.example.com"],
  // ... other record types
};
```

## Continuous Integration

The test suite is designed to run in CI/CD environments with:

- Fast execution times
- Reliable mocking
- Clear error messages
- Comprehensive coverage reporting

## Best Practices

1. **Isolation**: Each test runs in isolation with fresh mocks
2. **Deterministic**: Tests produce consistent results
3. **Comprehensive**: Cover both success and failure scenarios
4. **Maintainable**: Clear test structure and naming
5. **Fast**: Quick execution with proper mocking

## Running Individual Test Files

```bash
# Run specific test file
npm test -- tests/services/DnsChecker.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should validate domain"

# Run with verbose output
npm test -- --verbose
```
