-- Add user_id column to domains table
ALTER TABLE domains ADD COLUMN user_id INTEGER;

-- Add foreign key constraint
ALTER TABLE domains ADD CONSTRAINT fk_domains_user_id 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX idx_domains_user_id ON domains(user_id);

-- Update existing domains to have user_id = 1 (assuming admin user has id = 1)
-- You can change this to assign to a specific user
UPDATE domains SET user_id = 1 WHERE user_id IS NULL;

-- Make user_id NOT NULL after setting values
ALTER TABLE domains ALTER COLUMN user_id SET NOT NULL;
