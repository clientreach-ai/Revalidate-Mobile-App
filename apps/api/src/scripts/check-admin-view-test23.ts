import { prisma } from '../lib/prisma';

async function main() {
  try {
    const email = 'test23@gmail.com';
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, email, registration_name, professional_role, registration, description, reg_type, due_date FROM admin_user_view WHERE LOWER(TRIM(email)) = LOWER(TRIM(?)) LIMIT 1`,
      email
    );
    if (!rows || rows.length === 0) {
      console.log('No row in admin_user_view for', email);
      return;
    }
    console.log('admin_user_view row:', rows[0]);
  } catch (err: any) {
    console.error('Failed to query admin_user_view:', err?.message || err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main();
