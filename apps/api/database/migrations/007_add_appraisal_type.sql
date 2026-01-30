-- Migration 007: Add appraisal_type column to appraisal_records
-- Adds a column to distinguish between Annual Appraisal and Other

SELECT COUNT(*) INTO @col_exists FROM information_schema.columns 
WHERE table_schema = DATABASE() AND table_name = 'appraisal_records' AND column_name = 'appraisal_type';

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE appraisal_records ADD COLUMN appraisal_type VARCHAR(50) DEFAULT "Annual Appraisal" AFTER user_id', 
    'SELECT 1');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
