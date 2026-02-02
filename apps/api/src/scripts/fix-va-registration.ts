import { prisma } from '../lib/prisma';

async function main() {
  const email = 'va@example.com';
  console.log('Fixing registration/reg_type for', email);
  try {
    const res = await prisma.$executeRawUnsafe(
      `UPDATE users SET reg_type = ?, registration = ?, updated_at = NOW() WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))`,
      'pharmacist',
      13,
      email
    );
    console.log('Update result:', res);
    const row = await prisma.$queryRawUnsafe<any[]>(`SELECT id, email, reg_type, registration, description FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM(?)) LIMIT 1`, email);
    console.log('Row after update:', row[0]);
  } catch (err: any) {
    console.error('Failed to fix:', err?.message || err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main();
