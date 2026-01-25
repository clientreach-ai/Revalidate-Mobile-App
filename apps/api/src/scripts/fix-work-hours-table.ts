/**
 * Fix work_hours table structure
 * Adds missing duration_minutes column if it doesn't exist
 * 
 * Run with: pnpm fix:work-hours-table
 */

import { connectMySQL, getMySQLPool } from '../config/database';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

async function fixWorkHoursTable() {
  try {
    console.log('\n🔧 Fixing work_hours table structure...\n');

    // Connect to database
    await connectMySQL();
    const pool = getMySQLPool();

    // Check if duration_minutes column exists
    const [columns] = await pool.execute(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? 
       AND TABLE_NAME = 'work_hours' 
       AND COLUMN_NAME = 'duration_minutes'`,
      [process.env.MYSQL_DATABASE]
    ) as any[];

    if (columns.length > 0) {
      console.log('✅ duration_minutes column already exists');
    } else {
      console.log('⚠️  duration_minutes column not found. Adding it...');
      
      try {
        await pool.execute(
          'ALTER TABLE work_hours ADD COLUMN duration_minutes INT NULL AFTER end_time'
        );
        console.log('✅ Added duration_minutes column');
      } catch (error: any) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log('✅ Column already exists (checked via different method)');
        } else {
          throw error;
        }
      }
    }

    // Check if cpd_hours table exists and has duration_minutes
    const [cpdTable] = await pool.execute(
      `SELECT TABLE_NAME 
       FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = ? 
       AND TABLE_NAME = 'cpd_hours'`,
      [process.env.MYSQL_DATABASE]
    ) as any[];

    if (cpdTable.length > 0) {
      const [cpdColumns] = await pool.execute(
        `SELECT COLUMN_NAME 
         FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = ? 
         AND TABLE_NAME = 'cpd_hours' 
         AND COLUMN_NAME = 'duration_minutes'`,
        [process.env.MYSQL_DATABASE]
      ) as any[];

      if (cpdColumns.length === 0) {
        console.log('⚠️  cpd_hours table exists but missing duration_minutes. Adding it...');
        try {
          await pool.execute(
            'ALTER TABLE cpd_hours ADD COLUMN duration_minutes INT NULL'
          );
          console.log('✅ Added duration_minutes column to cpd_hours');
        } catch (error: any) {
          if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('✅ Column already exists');
          } else {
            console.warn('⚠️  Could not add column to cpd_hours:', error.message);
          }
        }
      } else {
        console.log('✅ cpd_hours.duration_minutes column exists');
      }
    } else {
      console.log('ℹ️  cpd_hours table does not exist (will be created when needed)');
    }

    console.log('\n✅ Table structure fixed!');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Error fixing table structure:', error.message);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  fixWorkHoursTable();
}

export { fixWorkHoursTable };
