import { prisma } from '../lib/prisma';

async function main() {
  const emails = process.argv.slice(2);
  if (emails.length === 0) {
    console.error('Usage: npx tsx src/scripts/admin-preview-users.ts <email1> [email2 ...]');
    process.exit(2);
  }

  try {
    const sql = `SELECT u.id, u.email, u.name, u.registration, u.due_date, u.reg_type, u.description,
      u.work_settings, u.scope_practice, u.subscription_tier, u.subscription_status,
      u.status, u.user_type, u.created_at, u.updated_at, u.firebase_uid,
      p.name AS registration_name,
      c.name AS work_setting_name,
      b.name AS scope_practice_name,
      COALESCE(
        NULLIF(JSON_UNQUOTE(JSON_EXTRACT(u.description, '$.professionalRole')), ''),
        NULLIF(u.reg_type, ''),
        CASE
          WHEN u.registration IN (3,4,5,6,7,8,9) THEN 'Nurse'
          WHEN u.registration IN (10,12) THEN 'Doctor'
          WHEN u.registration IN (13,14) THEN 'Pharmacist'
          ELSE NULL
        END
      ) AS professional_role
      FROM users u
      LEFT JOIN portfolios p ON CAST(u.registration AS CHAR) = CAST(p.id AS CHAR)
      LEFT JOIN categories c ON u.work_settings = c.id
      LEFT JOIN brands b ON u.scope_practice = b.id
      WHERE u.email IN (${emails.map(() => '?').join(',')})
      ORDER BY u.id ASC`;

    const rows = await prisma.$queryRawUnsafe<any[]>(sql, ...emails);
    if (!rows || rows.length === 0) {
      console.log('No users found');
      return;
    }

    for (const r of rows) {
      console.log('---');
      console.log(`email=${r.email}`);
      console.log('registration=', r.registration_name || r.registration);
      console.log('due_date=', r.due_date);
      console.log('reg_type=', r.reg_type);
      console.log('description=', r.description);
      console.log('professional_role (computed)=', r.professional_role);
    }
  } catch (err) {
    console.error('Error:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main();
