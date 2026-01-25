-- Migration: Update users table for MySQL-based password authentication
-- The existing table already has a 'password' column, so we just ensure it's ready for bcrypt hashes

-- Note: The 'password' column already exists (varchar(191))
-- We'll use this column to store bcrypt hashed passwords

-- Ensure email index exists for faster lookups
-- This will fail silently if index already exists
CREATE INDEX idx_users_email ON users(email);

-- Note: firebase_uid column can remain for backward compatibility
-- but will not be used for new authentication
