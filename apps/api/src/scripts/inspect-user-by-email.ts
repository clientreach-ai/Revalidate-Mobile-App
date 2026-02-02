import { prisma } from '../lib/prisma';

async function main() {
  const emails = process.argv.slice(2).filter(Boolean);
  if (emails.length === 0) {
    console.error('Usage: pnpm tsx src/scripts/inspect-user-by-email.ts <email1> [email2 ...]');
    process.exit(2);
  }

  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, email, name, reg_type, registration, due_date, description, status, user_type, created_at, updated_at
       FROM users
       WHERE email IN (${emails.map(() => '?').join(',')})
       ORDER BY id ASC`,
      ...emails
    );

    if (!rows || rows.length === 0) {
      console.log('No users found for:', emails.join(', '));
      return;
    }

    for (const u of rows) {
      console.log('---');
      console.log(`id=${u.id} email=${u.email}`);
      console.log(`name=${u.name}`);
      console.log(`reg_type=${u.reg_type}`);
      console.log(`registration=${u.registration}`);
      console.log(`due_date=${u.due_date}`);
      console.log(`status=${u.status} user_type=${u.user_type}`);
      console.log(`created_at=${u.created_at} updated_at=${u.updated_at}`);
      console.log(`description=${typeof u.description === 'string' ? u.description : JSON.stringify(u.description)}`);
    }
  } catch (err: any) {
    console.error('Failed to inspect user:', err?.message || err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main();
