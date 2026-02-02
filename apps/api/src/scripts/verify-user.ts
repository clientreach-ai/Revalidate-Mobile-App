import { prisma } from '../lib/prisma';

async function main() {
  const email = process.argv[2] || 'test23@gmail.com';
  console.log('Verifying user:', email);
  try {
    const res = await prisma.$executeRawUnsafe(
      `UPDATE users SET status = 'one', updated_at = NOW() WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))`,
      email
    );
    console.log('Update result:', res);
    const row = await prisma.$queryRawUnsafe<any[]>(`SELECT id, email, status, description, reg_type, registration, due_date FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM(?)) LIMIT 1`, email);
    console.log('Row after update:', row[0]);
  } catch (err: any) {
    console.error('Failed to verify user:', err?.message || err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main();
