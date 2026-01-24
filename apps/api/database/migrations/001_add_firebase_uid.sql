-- Migration: Add firebase_uid column to users table
-- This links Firebase authenticated users to MySQL user records

-- Add firebase_uid column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS firebase_uid VARCHAR(255) NULL AFTER id;

-- Add unique index on firebase_uid (each Firebase user should map to one MySQL user)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);

-- Add index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- For existing users without firebase_uid, you'll need to migrate them
-- This is a placeholder - actual migration depends on your existing data structure
-- Example migration script would:
-- 1. Export existing users
-- 2. Create Firebase accounts for them
-- 3. Update MySQL with firebase_uid

-- Ensure subscription columns exist (if not already present)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS subscription_tier ENUM('free', 'premium') DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_status ENUM('active', 'trial', 'expired', 'cancelled') DEFAULT 'active',
ADD COLUMN IF NOT EXISTS trial_ends_at DATETIME NULL;
