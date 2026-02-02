import { prisma } from '../lib/prisma';

async function main() {
  const emails = process.argv.slice(2).filter(Boolean);
  if (emails.length === 0) {
    console.error('Usage: npx tsx src/scripts/dump-user-full-row.ts <email1> [email2 ...]');
    process.exit(2);
  }

  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM users WHERE email IN (${emails.map(() => '?').join(',')}) ORDER BY id ASC`,
      ...emails
    );

    if (!rows || rows.length === 0) {
      console.log('No users found');
      return;
    }

    for (const r of rows) {
      // JSON.stringify fails on BigInt, convert BigInt values to strings
      const safe = JSON.parse(JSON.stringify(r, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)));
      console.log('---');
      console.log(JSON.stringify(safe, null, 2));
    }
  } catch (err) {
    console.error('Error:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main();
