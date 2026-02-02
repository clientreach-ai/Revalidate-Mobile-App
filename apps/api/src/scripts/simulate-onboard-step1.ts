import { prisma } from '../lib/prisma';

async function main() {
  try {
    const userEmail = 'testuser11@example.com';
    const u = await prisma.$queryRawUnsafe<any[]>(`SELECT id FROM users WHERE email = ? LIMIT 1`, userEmail);
    if (!u || u.length === 0) {
      console.error('Test user not found:', userEmail);
      process.exit(1);
    }
    const userId = BigInt(u[0].id);
    console.log('Simulating onboarding step1 for user id', String(userId));

    const roleKey = 'nurse';
    const description = JSON.stringify({ professionalRole: 'Nurse' });

    await prisma.$executeRawUnsafe(
      `UPDATE users SET description = ?, reg_type = ?, registration = ?, updated_at = ? WHERE id = ?`,
      description,
      roleKey,
      4,
      new Date(),
      userId
    );

    const row = await prisma.$queryRawUnsafe<any[]>(`SELECT id, email, description, reg_type, registration FROM users WHERE id = ?`, userId);
    console.log('After update:', row[0]);
  } catch (err: any) {
    console.error(err?.message || err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main();
