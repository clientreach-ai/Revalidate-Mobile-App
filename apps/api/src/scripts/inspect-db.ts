/**
 * Script to inspect existing database structure
 * Helps identify current schema before migration
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
import { connectMySQL, getMySQLPool } from '../config/database';
import { MYSQL_CONFIG } from '../config/env';

dotenv.config({ path: resolve(process.cwd(), '.env') });

async function inspectDatabase() {
  try {
    await connectMySQL();
    const pool = getMySQLPool();
    const database = MYSQL_CONFIG.database;

    console.log('\n🔍 Inspecting database structure...\n');
    console.log(`Database: ${database}\n`);

    // Get all tables
    const [tables] = await pool.query(
      `SELECT TABLE_NAME 
       FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = ? 
       ORDER BY TABLE_NAME`,
      [database]
    );

    console.log(`Found ${(tables as any[]).length} tables:\n`);

    for (const table of tables as any[]) {
      const tableName = table.TABLE_NAME;
      console.log(`📋 Table: ${tableName}`);
      
      // Get columns
      const [columns] = await pool.query(
        `SELECT 
          COLUMN_NAME,
          DATA_TYPE,
          IS_NULLABLE,
          COLUMN_DEFAULT,
          COLUMN_KEY,
          EXTRA
         FROM information_schema.COLUMNS 
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
         ORDER BY ORDINAL_POSITION`,
        [database, tableName]
      );

      console.log('   Columns:');
      (columns as any[]).forEach((col: any) => {
        const nullable = col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
        const key = col.COLUMN_KEY ? ` [${col.COLUMN_KEY}]` : '';
        const defaultVal = col.COLUMN_DEFAULT !== null ? ` DEFAULT ${col.COLUMN_DEFAULT}` : '';
        console.log(`     - ${col.COLUMN_NAME}: ${col.DATA_TYPE}${nullable}${defaultVal}${key}`);
      });

      // Get row count
      const [count] = await pool.query(`SELECT COUNT(*) as count FROM ??`, [tableName]);
      const rowCount = (count as any[])[0]?.count || 0;
      console.log(`   Rows: ${rowCount}\n`);
    }

    // Check for foreign keys
    const [fks] = await pool.query(
      `SELECT 
        TABLE_NAME,
        COLUMN_NAME,
        CONSTRAINT_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
       FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = ? 
         AND REFERENCED_TABLE_NAME IS NOT NULL
       ORDER BY TABLE_NAME`,
      [database]
    );

    if ((fks as any[]).length > 0) {
      console.log('🔗 Foreign Keys:\n');
      (fks as any[]).forEach((fk: any) => {
        console.log(`   ${fk.TABLE_NAME}.${fk.COLUMN_NAME} -> ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME}`);
      });
      console.log('');
    }

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

inspectDatabase();
