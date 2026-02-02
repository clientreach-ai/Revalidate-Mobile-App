import { prisma } from '../lib/prisma';

async function main() {
  try {
    console.log('Creating or replacing view admin_user_view...');
    const sql = `
      CREATE OR REPLACE VIEW admin_user_view AS
      SELECT
        u.id,
        u.email,
        u.name,
        u.due_date,
        u.registration,
        p.name AS registration_name,
        u.reg_type,
        u.description,
        CASE WHEN JSON_VALID(u.description) THEN NULLIF(JSON_UNQUOTE(JSON_EXTRACT(u.description, '$.professionalRole')), '') ELSE NULL END AS json_professional_role,
        COALESCE(
          CASE WHEN JSON_VALID(u.description) THEN NULLIF(JSON_UNQUOTE(JSON_EXTRACT(u.description, '$.professionalRole')), '') ELSE NULL END,
          CASE
            WHEN u.registration IN (4,5,6,7,8,11) THEN 'Nurse'
            WHEN u.registration IN (13) THEN 'Pharmacist'
            WHEN u.registration IN (2,3) THEN 'Doctor'
            ELSE NULL
          END,
          u.reg_type,
          NULLIF(u.description, '')
        ) AS professional_role
      FROM users u
      LEFT JOIN portfolios p ON p.id = u.registration;
    `;

    await prisma.$executeRawUnsafe(sql);
    console.log('View created.');

    // Quick verification samples
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, email, registration_name, professional_role FROM admin_user_view WHERE email IN (?, ?)`,
      'va@example.com',
      'andrew.oreilly1979@gmail.com'
    );
    console.log('Verification results:');
    for (const r of rows) console.log(r);
  } catch (err: any) {
    console.error('Failed to create view:', err?.message || err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main();
