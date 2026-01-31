import { getMySQLPool, connectMySQL } from '../config/database';

async function fixAppraisalTable() {
    console.log('🚀 Starting appraisal_records table fix...');

    try {
        await connectMySQL();
        const pool = getMySQLPool();

        // 1. Check current columns
        const [columns] = await pool.execute('DESCRIBE appraisal_records') as any[];
        const columnNames = columns.map((c: any) => c.Field);
        console.log('Current columns:', columnNames.join(', '));

        const missingColumns = [];
        if (!columnNames.includes('hospital_id')) missingColumns.push('ADD COLUMN hospital_id BigInt UNSIGNED NULL AFTER document_ids');
        if (!columnNames.includes('appraisal_type')) missingColumns.push('ADD COLUMN appraisal_type VARCHAR(255) NULL AFTER hospital_id');
        if (!columnNames.includes('discussion_with')) missingColumns.push('ADD COLUMN discussion_with VARCHAR(255) NULL AFTER appraisal_type');

        if (missingColumns.length > 0) {
            console.log(`Adding missing columns: ${missingColumns.length} found`);
            const alterQuery = `ALTER TABLE appraisal_records ${missingColumns.join(', ')}`;
            await pool.execute(alterQuery);
            console.log('✅ Successfully added missing columns.');
        } else {
            console.log('✅ No columns are missing from appraisal_records.');
        }

        // 2. Ensure indexes exist
        const [indexes] = await pool.execute('SHOW INDEX FROM appraisal_records') as any[];
        const indexNames = indexes.map((i: any) => i.Key_name);

        if (!indexNames.includes('idx_hospital_id')) {
            console.log('Adding index for hospital_id...');
            await pool.execute('CREATE INDEX idx_hospital_id ON appraisal_records(hospital_id)');
            console.log('✅ Added idx_hospital_id.');
        }

        // 3. Add foreign key if possible
        // Note: This might fail if the hospitals table or the data is inconsistent, but we try anyway
        try {
            console.log('Ensuring foreign key for hospital_id...');
            await pool.execute(`
        ALTER TABLE appraisal_records 
        ADD CONSTRAINT appraisal_records_hospital_id_foreign 
        FOREIGN KEY (hospital_id) REFERENCES hospitals(id) 
        ON DELETE SET NULL ON UPDATE RESTRICT
      `);
            console.log('✅ Added foreign key constraint.');
        } catch (fkError: any) {
            if (fkError.code === 'ER_DUP_CONSTRAINT_NAME' || fkError.errno === 1061) {
                console.log('ℹ️ Foreign key already exists.');
            } else {
                console.warn('⚠️ Could not add foreign key constraint:', fkError.message);
            }
        }

        console.log('✨ Fix complete!');
    } catch (error) {
        console.error('❌ Error fixing table:', error);
    } finally {
        process.exit(0);
    }
}

fixAppraisalTable();
