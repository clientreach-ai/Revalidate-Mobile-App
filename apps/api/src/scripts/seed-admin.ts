/**
 * Seed Admin User Script
 * 
 * Creates an admin user in the database with password hashing
 * 
 * Run with: pnpm seed:admin
 */

import { connectMySQL, getMySQLPool } from '../config/database';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const ADMIN_EMAIL = 'admin1@gmail.com';
const ADMIN_PASSWORD = 'password123';

async function seedAdmin() {
  try {
    console.log('\n🌱 Seeding admin user...\n');

    // Connect to database
    await connectMySQL();
    const pool = getMySQLPool();

    // Check if admin already exists
    const [existingAdmins] = await pool.execute(
      'SELECT id, email, password, status FROM users WHERE email = ?',
      [ADMIN_EMAIL]
    ) as any[];

    if (existingAdmins.length > 0) {
      const admin = existingAdmins[0];
      console.log('⚠️  Admin user already exists:');
      console.log(`   ID: ${admin.id}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   Password: ${admin.password ? 'Set' : 'Not set'}`);
      console.log(`   Status: ${admin.status === '1' ? 'Active' : 'Inactive'}`);
      
      // Update password if it's not set
      if (!admin.password) {
        console.log('\n🔐 Setting password for existing admin...');
        const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
        await pool.execute(
          'UPDATE users SET password = ?, status = ?, updated_at = NOW() WHERE id = ?',
          [passwordHash, '1', admin.id]
        );
        console.log('✅ Password set successfully!');
      }
      
      console.log('\n✅ Admin user is ready to use!');
      console.log(`   Login with: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

    // Create admin user in MySQL (using existing table structure)
    const [result] = await pool.execute(
      `INSERT INTO users (
        email, password, name, registration, due_date, 
        reg_type, subscription_tier, subscription_status,
        user_type, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        ADMIN_EMAIL,
        passwordHash,
        'Admin User',
        'ADMIN001',
        '2099-12-31', // Far future date
        'admin', // reg_type - using 'admin' from enum
        'premium',
        'active',
        'Admin', // user_type
        '1', // status = active
      ]
    ) as any;

    const adminId = result.insertId;

    console.log('\n✅ Admin user created successfully!');
    console.log(`   ID: ${adminId}`);
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log('\n📝 You can now login with these credentials.');

    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Error seeding admin:', error.message);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  seedAdmin();
}

export { seedAdmin };
