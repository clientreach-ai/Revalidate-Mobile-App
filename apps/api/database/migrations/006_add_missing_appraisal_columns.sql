-- Migration 006: Add missing columns to appraisal_records and work_hours tables
-- This migration adds columns that are missing from the production database

-- Add discussion_with and hospital_id columns to appraisal_records
-- Using separate statements for better error handling

-- Add discussion_with column if it doesn't exist
SELECT COUNT(*) INTO @col_exists FROM information_schema.columns 
WHERE table_schema = DATABASE() AND table_name = 'appraisal_records' AND column_name = 'discussion_with';
SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE appraisal_records ADD COLUMN discussion_with VARCHAR(100) NULL AFTER notes', 
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add hospital_id column if it doesn't exist
SELECT COUNT(*) INTO @col_exists FROM information_schema.columns 
WHERE table_schema = DATABASE() AND table_name = 'appraisal_records' AND column_name = 'hospital_id';
SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE appraisal_records ADD COLUMN hospital_id BIGINT NULL AFTER discussion_with', 
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add work_setting column to work_hours if it doesn't exist
SELECT COUNT(*) INTO @col_exists FROM information_schema.columns 
WHERE table_schema = DATABASE() AND table_name = 'work_hours' AND column_name = 'work_setting';
SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE work_hours ADD COLUMN work_setting VARCHAR(100) NULL', 
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add scope_of_practice column to work_hours if it doesn't exist
SELECT COUNT(*) INTO @col_exists FROM information_schema.columns 
WHERE table_schema = DATABASE() AND table_name = 'work_hours' AND column_name = 'scope_of_practice';
SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE work_hours ADD COLUMN scope_of_practice VARCHAR(255) NULL', 
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add location column to work_hours if it doesn't exist
SELECT COUNT(*) INTO @col_exists FROM information_schema.columns 
WHERE table_schema = DATABASE() AND table_name = 'work_hours' AND column_name = 'location';
SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE work_hours ADD COLUMN location VARCHAR(255) NULL', 
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add shift_type column to work_hours if it doesn't exist
SELECT COUNT(*) INTO @col_exists FROM information_schema.columns 
WHERE table_schema = DATABASE() AND table_name = 'work_hours' AND column_name = 'shift_type';
SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE work_hours ADD COLUMN shift_type VARCHAR(50) NULL', 
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add hourly_rate column to work_hours if it doesn't exist
SELECT COUNT(*) INTO @col_exists FROM information_schema.columns 
WHERE table_schema = DATABASE() AND table_name = 'work_hours' AND column_name = 'hourly_rate';
SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE work_hours ADD COLUMN hourly_rate DECIMAL(10, 2) NULL', 
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add total_earnings column to work_hours if it doesn't exist
SELECT COUNT(*) INTO @col_exists FROM information_schema.columns 
WHERE table_schema = DATABASE() AND table_name = 'work_hours' AND column_name = 'total_earnings';
SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE work_hours ADD COLUMN total_earnings DECIMAL(10, 2) NULL', 
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
