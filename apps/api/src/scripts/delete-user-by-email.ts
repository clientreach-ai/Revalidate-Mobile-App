import { prisma } from '../lib/prisma';

async function main() {
  const email = process.argv[2] || 'va@example.com';
  console.log('Deleting user with email:', email);
  try {
    const row = await prisma.$queryRawUnsafe<any[]>(`SELECT id, email FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM(?)) LIMIT 1`, email);
    if (!row || row.length === 0) {
      console.log('No user found with that email');
      return;
    }
    console.log('Found user:', row[0]);
    const res = await prisma.$executeRawUnsafe(`DELETE FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))`, email);
    console.log('Delete result:', res);
  } catch (err: any) {
    console.error('Failed to delete user:', err?.message || err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main();
