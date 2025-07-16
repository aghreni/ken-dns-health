-- Create expected_dns_records table
CREATE TABLE IF NOT EXISTS expected_dns_records (
    id SERIAL PRIMARY KEY,
    domain_id INTEGER NOT NULL,
    record_type VARCHAR(10) NOT NULL,
    record_value TEXT NOT NULL,
    FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE
);

-- Create dns_check_history table  
CREATE TABLE IF NOT EXISTS dns_check_history (
    id SERIAL PRIMARY KEY,
    domain_id INTEGER NOT NULL,
    checked_at TIMESTAMP NOT NULL,
    status BOOLEAN NOT NULL,
    FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE
);

-- Create retrieved_dns_records table
CREATE TABLE IF NOT EXISTS retrieved_dns_records (
    id SERIAL PRIMARY KEY,
    check_id INTEGER NOT NULL,
    domain_id INTEGER NOT NULL,
    record_type VARCHAR(10) NOT NULL,
    record_value TEXT NOT NULL,
    FOREIGN KEY (check_id) REFERENCES dns_check_history(id) ON DELETE CASCADE,
    FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_expected_dns_records_domain_id ON expected_dns_records(domain_id);
CREATE INDEX IF NOT EXISTS idx_expected_dns_records_record_type ON expected_dns_records(record_type);
CREATE INDEX IF NOT EXISTS idx_dns_check_history_domain_id ON dns_check_history(domain_id);
CREATE INDEX IF NOT EXISTS idx_dns_check_history_checked_at ON dns_check_history(checked_at);
CREATE INDEX IF NOT EXISTS idx_retrieved_dns_records_check_id ON retrieved_dns_records(check_id);
CREATE INDEX IF NOT EXISTS idx_retrieved_dns_records_domain_id ON retrieved_dns_records(domain_id);
CREATE INDEX IF NOT EXISTS idx_retrieved_dns_records_record_type ON retrieved_dns_records(record_type);

-- Sample data for testing (optional - you can remove this)
-- INSERT INTO expected_dns_records (domain_id, record_type, record_value) VALUES 
-- (1, 'A', '192.168.1.1'),
-- (1, 'MX', 'mail.example.com'),
-- (1, 'TXT', 'v=spf1 include:_spf.example.com ~all');
