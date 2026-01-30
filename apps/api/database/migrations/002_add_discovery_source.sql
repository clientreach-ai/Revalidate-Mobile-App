-- Migration: Add discovery_source column to users table
-- This stores how users heard about the app for analytics

ALTER TABLE users ADD COLUMN IF NOT EXISTS discovery_source VARCHAR(50) DEFAULT NULL;

-- Add index for analytics queries
CREATE INDEX IF NOT EXISTS idx_users_discovery_source ON users(discovery_source);
