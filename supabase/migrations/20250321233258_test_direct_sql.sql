-- Test direct SQL migration
-- This adds a simple comment to the users table and creates a helpful index

COMMENT ON TABLE auth.users IS 'User accounts for the application - updated March 21, 2025';

-- Add an index on user email for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_email ON auth.users(email);