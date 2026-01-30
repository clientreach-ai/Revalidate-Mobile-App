-- Add onboarding_status column to users table
-- 0: New / Incomplete
-- 1: Completed
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_status TINYINT NOT NULL DEFAULT 0;
