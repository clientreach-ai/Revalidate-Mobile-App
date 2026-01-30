/**
 * Migration Script: Add appraisal_type column
 * 
 * Run with: npx tsx src/scripts/add-appraisal-type.ts
 */

import { connectMySQL, getMySQLPool } from '../config/database';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

async function addAppraisalType() {
    try {
        console.log('\n🔧 Adding appraisal_type column...\n');

        await connectMySQL();
        const pool = getMySQLPool();
        const dbName = process.env.MYSQL_DATABASE;

        // Check if column exists
        const [columns] = await pool.execute(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'appraisal_records' AND COLUMN_NAME = 'appraisal_type'`,
            [dbName]
        ) as any[];

        if (columns.length > 0) {
            console.log('✅ appraisal_records.appraisal_type already exists');
        } else {
            console.log('⚠️  appraisal_records.appraisal_type not found. Adding it...');
            await pool.execute(
                `ALTER TABLE appraisal_records ADD COLUMN appraisal_type VARCHAR(50) DEFAULT 'Annual Appraisal' AFTER user_id`
            );
            console.log('✅ Added appraisal_records.appraisal_type');
        }

        console.log('\n✅ Migration complete!');
        process.exit(0);
    } catch (error: any) {
        console.error('\n❌ Fatal error:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    addAppraisalType();
}

export { addAppraisalType };
