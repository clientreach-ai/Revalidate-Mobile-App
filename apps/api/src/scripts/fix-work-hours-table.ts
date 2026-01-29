/**
 * Fix work_hours table structure
 * Adds missing columns if they don't exist
 * 
 * Run with: pnpm fix:work-hours-table
 */

import { connectMySQL, getMySQLPool } from '../config/database';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

interface ColumnDef {
  name: string;
  definition: string;
  after?: string;
}

const MISSING_COLUMNS: ColumnDef[] = [
  { name: 'duration_minutes', definition: 'INT NULL', after: 'end_time' },
  { name: 'location', definition: 'VARCHAR(255) NULL', after: 'work_description' },
  { name: 'shift_type', definition: 'VARCHAR(50) NULL', after: 'location' },
  { name: 'hourly_rate', definition: 'DECIMAL(10, 2) NULL', after: 'shift_type' },
  { name: 'total_earnings', definition: 'DECIMAL(10, 2) NULL', after: 'hourly_rate' },
  { name: 'work_setting', definition: 'VARCHAR(100) NULL', after: 'total_earnings' },
  { name: 'scope_of_practice', definition: 'VARCHAR(255) NULL', after: 'work_setting' }
];

async function fixWorkHoursTable() {
  try {
    console.log('\n🔧 Fixing work_hours table structure...\n');

    // Connect to database
    await connectMySQL();
    const pool = getMySQLPool();
    const dbName = process.env.MYSQL_DATABASE;

    // Get current columns
    const [existingColumns] = await pool.execute(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? 
       AND TABLE_NAME = 'work_hours'`,
      [dbName]
    ) as any[];

    const existingColumnNames = existingColumns.map((c: any) => c.COLUMN_NAME);

    console.log(`Found ${existingColumnNames.length} columns in work_hours table.`);

    for (const col of MISSING_COLUMNS) {
      if (existingColumnNames.includes(col.name)) {
        console.log(`✅ ${col.name} column already exists`);
      } else {
        console.log(`⚠️  ${col.name} column not found. Adding it...`);

        let query = `ALTER TABLE work_hours ADD COLUMN ${col.name} ${col.definition}`;

        // Only use AFTER if the predecessor exists
        if (col.after && existingColumnNames.includes(col.after)) {
          query += ` AFTER ${col.after}`;
        } else if (col.after && !existingColumnNames.includes(col.after)) {
          // If the 'after' column usually exists but isn't there (e.g. location wasn't added yet, so shift_type can't come after it),
          // we might have a problem if we depend on order. 
          // BUT, we are iterating in order. So if 'location' was just added, it might NOT be in 'existingColumnNames' array yet unless we update it.
          // However, ALTER TABLE is DDL, usually commits.
          // Let's check if the previous iteration added the column.
          // Actually, simply not using AFTER if the column isn't found is safer, defaults to last.
          // But better: we can re-check existing columns or just trust that we are adding them in order.

          // If we are adding 'shift_type' and 'location' was just added, 'location' IS in the table now, but NOT in 'existingColumnNames' list.
          // So let's rely on the fact that we process in order.
          query += ` AFTER ${col.after}`;
        }

        try {
          await pool.execute(query);
          console.log(`✅ Added ${col.name} column`);
          // Add to our local list so subsequent columns can reference it
          existingColumnNames.push(col.name);
        } catch (error: any) {
          if (error.code === 'ER_DUP_FIELDNAME') {
            console.log(`✅ Column ${col.name} already exists (race condition check)`);
          } else {
            console.error(`❌ Failed to add ${col.name}:`, error.message);
            // Don't throw, try next column
          }
        }
      }
    }

    // Check if cpd_hours table exists and has duration_minutes (legacy check from original script)
    const [cpdTable] = await pool.execute(
      `SELECT TABLE_NAME 
       FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = ? 
       AND TABLE_NAME = 'cpd_hours'`,
      [dbName]
    ) as any[];

    if (cpdTable.length > 0) {
      const [cpdColumns] = await pool.execute(
        `SELECT COLUMN_NAME 
         FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = ? 
         AND TABLE_NAME = 'cpd_hours' 
         AND COLUMN_NAME = 'duration_minutes'`,
        [dbName]
      ) as any[];

      if (cpdColumns.length === 0) {
        console.log('⚠️  cpd_hours table exists but missing duration_minutes. Adding it...');
        try {
          await pool.execute(
            'ALTER TABLE cpd_hours ADD COLUMN duration_minutes INT NULL'
          );
          console.log('✅ Added duration_minutes column to cpd_hours');
        } catch (error: any) {
          console.warn('⚠️  Could not add column to cpd_hours:', error.message);
        }
      } else {
        console.log('✅ cpd_hours.duration_minutes column exists');
      }
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
