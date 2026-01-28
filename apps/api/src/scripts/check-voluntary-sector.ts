import dotenv from 'dotenv';
import { resolve } from 'path';
import { connectMySQL, getMySQLPool } from '../config/database';
import { MYSQL_CONFIG as _MYSQL_CONFIG } from '../config/env';

dotenv.config({ path: resolve(process.cwd(), '.env') });

async function checkVoluntarySector() {
  try {
    await connectMySQL();
    const pool = getMySQLPool();

    console.log('\n🔎 Checking for "Voluntary or charity sector" in `categories` table...\n');

    const query = `
      SELECT id, name, status, created_at, updated_at
      FROM categories
      WHERE LOWER(name) = ?
         OR LOWER(name) LIKE ?
         OR LOWER(name) LIKE ?
      LIMIT 100
    `;

    const exact = 'voluntary or charity sector';
    const likeVoluntary = '%voluntary%';
    const likeCharity = '%charity%';

    const [rows] = await pool.execute(query, [exact, likeVoluntary, likeCharity]) as any;

    if (!rows || rows.length === 0) {
      console.log('❌ No matching category found.');
      process.exit(1);
    }

    console.log(`✅ Found ${rows.length} matching row(s):\n`);
    rows.forEach((r: any) => {
      console.log(`- id=${r.id} | name="${r.name}" | status=${r.status} | created_at=${r.created_at}`);
    });

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error checking categories:', error.message || error);
    process.exit(2);
  }
}

if (require.main === module) {
  checkVoluntarySector();
}

export { checkVoluntarySector };
