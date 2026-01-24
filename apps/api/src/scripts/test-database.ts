/**
 * Database Connection and Schema Test Script
 * 
 * This script tests:
 * 1. Database connectivity
 * 2. Required tables existence
 * 3. Table structure (columns)
 * 4. Basic CRUD operations
 * 
 * Run with: pnpm test:db
 */

import { connectMySQL, getMySQLPool } from '../config/database';
import { MYSQL_CONFIG } from '../config/env';

interface TableInfo {
  name: string;
  exists: boolean;
  columns?: string[];
  rowCount?: number;
}

const REQUIRED_TABLES = [
  'users',
  'work_hours',
  'cpd_hours',
  'feedback_log',
  'reflective_accounts',
  'appraisal_records',
  // Optional tables (will warn if missing)
  'calendar_events',
  'documents',
  'subscriptions',
];

const OPTIONAL_TABLES = ['calendar_events', 'documents', 'subscriptions'];

async function testDatabaseConnection() {
  console.log('\n🔌 Testing Database Connection...\n');
  
  try {
    await connectMySQL();
    const pool = getMySQLPool();
    
    // Test connection with a simple query
    const [result] = await pool.execute('SELECT 1 as test') as any[];
    
    if (result[0].test === 1) {
      console.log('✅ Database connection successful');
      console.log(`   Host: ${MYSQL_CONFIG.host}:${MYSQL_CONFIG.port}`);
      console.log(`   Database: ${MYSQL_CONFIG.database}`);
      return true;
    }
  } catch (error: any) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

async function checkTableExists(pool: any, tableName: string): Promise<boolean> {
  try {
    const [result] = await pool.execute(
      `SELECT COUNT(*) as count 
       FROM information_schema.tables 
       WHERE table_schema = ? AND table_name = ?`,
      [MYSQL_CONFIG.database, tableName]
    ) as any[];
    
    return result[0].count > 0;
  } catch (error) {
    return false;
  }
}

async function columnExists(pool: any, tableName: string, columnName: string): Promise<boolean> {
  try {
    const [result] = await pool.execute(
      `SELECT COUNT(*) as count 
       FROM information_schema.columns 
       WHERE table_schema = ? AND table_name = ? AND column_name = ?`,
      [MYSQL_CONFIG.database, tableName, columnName]
    ) as any[];
    
    return result[0].count > 0;
  } catch (error) {
    return false;
  }
}

async function getTableColumns(pool: any, tableName: string): Promise<string[]> {
  try {
    const [columns] = await pool.execute(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_schema = ? AND table_name = ? 
       ORDER BY ordinal_position`,
      [MYSQL_CONFIG.database, tableName]
    ) as any[];
    
    return columns.map((col: any) => col.column_name);
  } catch (error) {
    return [];
  }
}

async function getTableRowCount(pool: any, tableName: string): Promise<number> {
  try {
    const [result] = await pool.execute(`SELECT COUNT(*) as count FROM ${tableName}`) as any[];
    return result[0].count;
  } catch (error) {
    return -1;
  }
}

async function checkTables() {
  console.log('\n📊 Checking Database Tables...\n');
  
  const pool = getMySQLPool();
  const tableInfo: TableInfo[] = [];
  
  for (const tableName of REQUIRED_TABLES) {
    const exists = await checkTableExists(pool, tableName);
    const isOptional = OPTIONAL_TABLES.includes(tableName);
    
    const info: TableInfo = {
      name: tableName,
      exists,
    };
    
    if (exists) {
      info.columns = await getTableColumns(pool, tableName);
      info.rowCount = await getTableRowCount(pool, tableName);
      
      console.log(`✅ ${tableName}`);
      console.log(`   Columns: ${info.columns.length}`);
      console.log(`   Rows: ${info.rowCount}`);
      
      // Check for critical columns
      if (tableName === 'users') {
        const hasFirebaseUid = await columnExists(pool, tableName, 'firebase_uid');
        if (!hasFirebaseUid) {
          console.log(`   ⚠️  WARNING: Missing 'firebase_uid' column. Run migration: 001_add_firebase_uid.sql`);
        } else {
          console.log(`   ✅ Has firebase_uid column`);
        }
      }
      
      if (['work_hours', 'cpd_hours', 'feedback_log', 'reflective_accounts', 'appraisal_records'].includes(tableName)) {
        const hasUserId = info.columns.includes('user_id');
        const hasCreatedAt = info.columns.includes('created_at');
        const hasUpdatedAt = info.columns.includes('updated_at');
        
        if (!hasUserId) console.log(`   ⚠️  WARNING: Missing 'user_id' column`);
        if (!hasCreatedAt) console.log(`   ⚠️  WARNING: Missing 'created_at' column`);
        if (!hasUpdatedAt) console.log(`   ⚠️  WARNING: Missing 'updated_at' column`);
        
        if (hasUserId && hasCreatedAt && hasUpdatedAt) {
          console.log(`   ✅ Has required columns (user_id, created_at, updated_at)`);
        }
      }
    } else {
      if (isOptional) {
        console.log(`⚠️  ${tableName} (optional - not required yet)`);
      } else {
        console.log(`❌ ${tableName} - MISSING (required table)`);
      }
    }
    
    tableInfo.push(info);
  }
  
  return tableInfo;
}

async function testBasicOperations() {
  console.log('\n🧪 Testing Basic Database Operations...\n');
  
  const pool = getMySQLPool();
  
  try {
    // Test SELECT
    console.log('Testing SELECT...');
    const [selectResult] = await pool.execute('SELECT 1 as test') as any[];
    if (selectResult[0].test === 1) {
      console.log('✅ SELECT works');
    }
    
    // Test INSERT (if users table exists)
    const usersExists = await checkTableExists(pool, 'users');
    if (usersExists) {
      console.log('Testing INSERT (test user)...');
      // Check if test user already exists
      const [existing] = await pool.execute(
        "SELECT id FROM users WHERE email = 'test@example.com'"
      ) as any[];
      
      if (existing.length === 0) {
        const [insertResult] = await pool.execute(
          `INSERT INTO users (
            firebase_uid, email, registration, due_date, 
            reg_type, subscription_tier, subscription_status, 
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          ['test-firebase-uid-123', 'test@example.com', 'TEST123', '2025-12-31', 'nurse', 'free', 'active']
        ) as any[];
        
        console.log(`✅ INSERT works (created test user with ID: ${insertResult.insertId})`);
        
        // Test UPDATE
        console.log('Testing UPDATE...');
        await pool.execute(
          'UPDATE users SET updated_at = NOW() WHERE email = ?',
          ['test@example.com']
        );
        console.log('✅ UPDATE works');
        
        // Test DELETE
        console.log('Testing DELETE...');
        await pool.execute('DELETE FROM users WHERE email = ?', ['test@example.com']);
        console.log('✅ DELETE works');
      } else {
        console.log('⚠️  Test user already exists, skipping INSERT/DELETE test');
      }
    } else {
      console.log('⚠️  Users table not found, skipping INSERT/UPDATE/DELETE tests');
    }
    
    return true;
  } catch (error: any) {
    console.error('❌ Basic operations test failed:', error.message);
    return false;
  }
}

async function generateSchemaReport(tableInfo: TableInfo[]) {
  console.log('\n📋 Database Schema Report\n');
  
  const missingTables = tableInfo.filter(t => !t.exists && !OPTIONAL_TABLES.includes(t.name));
  const existingTables = tableInfo.filter(t => t.exists);
  
  console.log(`Total tables checked: ${REQUIRED_TABLES.length}`);
  console.log(`✅ Existing tables: ${existingTables.length}`);
  console.log(`❌ Missing required tables: ${missingTables.length}`);
  
  if (missingTables.length > 0) {
    console.log('\n⚠️  Missing Required Tables:');
    missingTables.forEach(t => console.log(`   - ${t.name}`));
  }
  
  if (existingTables.length > 0) {
    console.log('\n✅ Existing Tables:');
    existingTables.forEach(t => {
      console.log(`   - ${t.name} (${t.columns?.length || 0} columns, ${t.rowCount || 0} rows)`);
    });
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('   Revalidation Tracker - Database Test Suite');
  console.log('═══════════════════════════════════════════════════════');
  
  try {
    // Test connection
    const connected = await testDatabaseConnection();
    if (!connected) {
      console.error('\n❌ Cannot proceed without database connection');
      process.exit(1);
    }
    
    // Check tables
    const tableInfo = await checkTables();
    
    // Test basic operations
    await testBasicOperations();
    
    // Generate report
    await generateSchemaReport(tableInfo);
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ Database test completed!');
    console.log('═══════════════════════════════════════════════════════\n');
    
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { main as testDatabase };
