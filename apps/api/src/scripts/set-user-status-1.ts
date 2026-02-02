import { prisma } from '../lib/prisma';

async function main() {
  const email = process.argv[2] || 'va@example.com';
  console.log('Setting status=1 for', email);
  try {
    const res = await prisma.$executeRawUnsafe(`UPDATE users SET status = 'one', updated_at = NOW() WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))`, email);
    console.log('Update result:', res);
    const row = await prisma.$queryRawUnsafe<any[]>(`SELECT id, email, status FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM(?)) LIMIT 1`, email);
    console.log('Row:', row[0]);
  } catch (err: any) {
    console.error('Failed to set status:', err?.message || err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main();
