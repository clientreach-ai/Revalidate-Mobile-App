-- Migration: Add missing columns to work_hours table
-- This adds location, shift_type, hourly_rate, total_earnings, work_setting, and scope_of_practice

-- Add columns if they don't exist
-- Note: MySQL doesn't support IF NOT EXISTS in ALTER TABLE ADD COLUMN directly in all versions,
-- so we rely on the application migration runner or manual execution. 
-- However, since this is a known missing set, we will add them.

ALTER TABLE work_hours
ADD COLUMN location VARCHAR(255) NULL AFTER work_description,
ADD COLUMN shift_type VARCHAR(50) NULL AFTER location,
ADD COLUMN hourly_rate DECIMAL(10, 2) NULL AFTER shift_type,
ADD COLUMN total_earnings DECIMAL(10, 2) NULL AFTER hourly_rate,
ADD COLUMN work_setting VARCHAR(100) NULL AFTER total_earnings,
ADD COLUMN scope_of_practice VARCHAR(255) NULL AFTER work_setting;
