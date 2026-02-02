import { prisma } from '../lib/prisma';

async function main() {
  try {
    const email = 'va@example.com';
    console.log('Updating', email);
    const res = await prisma.$executeRawUnsafe(
      `UPDATE users SET description = ?, reg_type = ? WHERE email = ?`,
      'Pharmacist',
      'Pharmacist',
      email
    );
    console.log('Result:', res);
    const row = await prisma.$queryRawUnsafe<any[]>(`SELECT id, email, description, reg_type, registration FROM users WHERE email = ?`, email);
    console.log(row[0]);
  } catch (err: any) {
    console.error('Failed:', err?.message || err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main();
