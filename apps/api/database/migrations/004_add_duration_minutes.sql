-- Migration: Add duration_minutes column to work_hours table if it doesn't exist
-- This column stores the duration of work sessions in minutes

-- Check if work_hours table exists and add duration_minutes column
-- Note: This will fail if column already exists, which is fine
ALTER TABLE work_hours 
ADD COLUMN duration_minutes INT NULL AFTER end_time;
