import { prisma } from '../lib/prisma';

async function main() {
  try {
    const countRes = await prisma.$queryRawUnsafe<any[]>(
      `SELECT COUNT(*) as cnt FROM users WHERE description IS NOT NULL AND description != '' AND (JSON_VALID(description) = 0)`
    );
    const cnt = countRes?.[0]?.cnt ?? 0;
    console.log(`Found ${cnt} user(s) with non-JSON description.`);

    const samples = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, email, description, CHAR_LENGTH(description) as len
       FROM users
       WHERE description IS NOT NULL AND description != '' AND (JSON_VALID(description) = 0)
       ORDER BY id DESC
       LIMIT 20`
    );

    for (const s of samples) {
      console.log('---');
      console.log(`id=${s.id} email=${s.email} len=${s.len}`);
      console.log(s.description);
    }
  } catch (err: any) {
    console.error('Query failed:', err?.message || err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main();
