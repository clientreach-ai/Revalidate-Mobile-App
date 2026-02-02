import { prisma } from '../lib/prisma';
import { mapUserRow } from '../config/database-mapping';

async function main() {
  const emails = process.argv.slice(2);
  if (emails.length === 0) {
    console.error('Usage: tsx src/scripts/show-mapped-users.ts <email1> [email2 ...]');
    process.exit(2);
  }

  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, email, name, registration, due_date, reg_type, description, work_settings, scope_practice, subscription_tier, subscription_status, created_at, updated_at, firebase_uid
       FROM users WHERE email IN (${emails.map(() => '?').join(',')})`,
      ...emails
    );

    if (!rows || rows.length === 0) {
      console.log('No users found');
      return;
    }

    for (const r of rows) {
      const mapped = mapUserRow(r);
      console.log('---');
      console.log(`email=${r.email}`);
      console.log('db.reg_type=', r.reg_type);
      console.log('db.registration=', r.registration);
      console.log('db.description=', typeof r.description === 'string' ? r.description : JSON.stringify(r.description));
      console.log('mapped.professional_role=', mapped.professional_role);
    }
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main();
