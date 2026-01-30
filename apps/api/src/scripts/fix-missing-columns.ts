/**
 * Fix database schema - Add missing columns
 * 
 * Run with: npx tsx src/scripts/fix-missing-columns.ts
 */

import { connectMySQL, getMySQLPool } from '../config/database';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

interface ColumnDef {
    table: string;
    name: string;
    definition: string;
    after?: string;
}

const MISSING_COLUMNS: ColumnDef[] = [
    // Appraisal Records
    { table: 'appraisal_records', name: 'discussion_with', definition: 'VARCHAR(100) NULL', after: 'notes' },
    { table: 'appraisal_records', name: 'hospital_id', definition: 'BIGINT NULL', after: 'discussion_with' },

    // Work Hours (just in case they are missing)
    { table: 'work_hours', name: 'location', definition: 'VARCHAR(255) NULL', after: 'work_description' },
    { table: 'work_hours', name: 'shift_type', definition: 'VARCHAR(50) NULL', after: 'location' },
    { table: 'work_hours', name: 'hourly_rate', definition: 'DECIMAL(10, 2) NULL', after: 'shift_type' },
    { table: 'work_hours', name: 'total_earnings', definition: 'DECIMAL(10, 2) NULL', after: 'hourly_rate' },
    { table: 'work_hours', name: 'work_setting', definition: 'VARCHAR(100) NULL', after: 'total_earnings' },
    { table: 'work_hours', name: 'scope_of_practice', definition: 'VARCHAR(255) NULL', after: 'work_setting' }
];

async function fixMissingColumns() {
    try {
        console.log('\n🔧 Fixing database schema (missing columns)...\n');

        // Connect to database
        await connectMySQL();
        const pool = getMySQLPool();
        const dbName = process.env.MYSQL_DATABASE;

        for (const col of MISSING_COLUMNS) {
            try {
                // Check if table exists
                const [tables] = await pool.execute(
                    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
                    [dbName, col.table]
                ) as any[];

                if (tables.length === 0) {
                    console.warn(`⚠️  Table ${col.table} does not exist. Skipping column ${col.name}.`);
                    continue;
                }

                // Check if column exists
                const [columns] = await pool.execute(
                    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
                    [dbName, col.table, col.name]
                ) as any[];

                if (columns.length > 0) {
                    console.log(`✅ ${col.table}.${col.name} already exists`);
                    continue;
                }

                console.log(`⚠️  ${col.table}.${col.name} not found. Adding it...`);

                let query = `ALTER TABLE ${col.table} ADD COLUMN ${col.name} ${col.definition}`;

                // Check if predecessor exists before adding AFTER clause
                if (col.after) {
                    const [afterCols] = await pool.execute(
                        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
                        [dbName, col.table, col.after]
                    ) as any[];

                    if (afterCols.length > 0) {
                        query += ` AFTER ${col.after}`;
                    }
                }

                await pool.execute(query);
                console.log(`✅ Added ${col.table}.${col.name}`);

            } catch (error: any) {
                console.error(`❌ Error verifying/adding ${col.table}.${col.name}:`, error.message);
            }
        }

        console.log('\n✅ Database schema fixed!');
        process.exit(0);
    } catch (error: any) {
        console.error('\n❌ Fatal error:', error.message);
        process.exit(1);
    }
}

// Run if executed directly
if (require.main === module) {
    fixMissingColumns();
}

export { fixMissingColumns };
