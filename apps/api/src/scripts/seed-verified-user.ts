/**
 * Seed Verified User Script
 *
 * Creates (or updates) a single verified user in the MySQL `users` table.
 * In this codebase, "verified" is represented by `users.status = 'one'` (aka mapped to '1').
 *
 * Run with: pnpm seed:verified-user
 *
 * Optional env vars:
 * - SEED_USER_EMAIL
 * - SEED_USER_PASSWORD
 * - SEED_USER_NAME
 */

import { connectMySQL, getMySQLPool } from '../config/database';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const USER_EMAIL = process.env.SEED_USER_EMAIL || 'verified@example.com';
const USER_PASSWORD = process.env.SEED_USER_PASSWORD || 'Password123!';
const USER_NAME = process.env.SEED_USER_NAME || 'Verified User';

async function seedVerifiedUser() {
  try {
    console.log('\nSeeding verified user...\n');

    await connectMySQL();
    const pool = getMySQLPool();

    const [existingRows] = await pool.execute(
      'SELECT id, email, password, status, reg_type, user_type FROM users WHERE email = ? LIMIT 1',
      [USER_EMAIL]
    ) as any[];

    const passwordHash = await bcrypt.hash(USER_PASSWORD, 10);

    if (existingRows.length > 0) {
      const existing = existingRows[0];

      console.log('User already exists, updating verification/password if needed...');
      await pool.execute(
        `UPDATE users
         SET
           name = COALESCE(NULLIF(name, ''), ?),
           password = COALESCE(password, ?),
           reg_type = COALESCE(reg_type, 'email'),
           status = 'one',
           updated_at = NOW()
         WHERE id = ?`,
        [USER_NAME, passwordHash, existing.id]
      );

      console.log('\nVerified user is ready:');
      console.log(`- id: ${existing.id}`);
      console.log(`- email: ${USER_EMAIL}`);
      console.log(`- password: ${USER_PASSWORD}`);
      console.log(`- status: one (verified)`);
      process.exit(0);
    }

    const [result] = await pool.execute(
      `INSERT INTO users (
        email,
        password,
        name,
        reg_type,
        status,
        user_type,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, 'email', 'one', 'Customer', NOW(), NOW())`,
      [USER_EMAIL, passwordHash, USER_NAME]
    ) as any;

    const userId = result.insertId;

    console.log('\nVerified user created successfully:');
    console.log(`- id: ${userId}`);
    console.log(`- email: ${USER_EMAIL}`);
    console.log(`- password: ${USER_PASSWORD}`);
    console.log(`- status: one (verified)`);

    process.exit(0);
  } catch (error: any) {
    console.error('\nError seeding verified user:', error?.message || error);
    if (error?.code) console.error(`Error code: ${error.code}`);
    process.exit(1);
  }
}

if (require.main === module) {
  seedVerifiedUser();
}

export { seedVerifiedUser };
