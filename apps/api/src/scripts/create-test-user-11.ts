import { prisma } from '../lib/prisma';

async function main() {
  try {
    const email = 'testuser11@example.com';
    const name = 'Test User 11';
    // Insert a fully populated row (conservative: only set commonly used columns)
    const sql = `
      INSERT INTO users (email, name, reg_type, registration, due_date, description, status, user_type, work_settings, scope_practice, designation_id, created_at, updated_at)
      VALUES (
        ?, ?, ?, ?, ?, JSON_OBJECT('professionalRole', ?), ?, ?, ?, ?, ?, NOW(), NOW()
      )
    `;

    const res = await prisma.$executeRawUnsafe(sql,
      email,
      name,
      'nurse',       // reg_type
      4,             // registration -> Registered Nurse
      '2027-01-01',  // due_date
      'Nurse',       // professionalRole value in JSON
      1,             // status
      'Customer',    // user_type
      8,             // work_settings (example id)
      3,             // scope_practice (example id)
      2              // designation_id (example id)
    );

    console.log('Inserted rows:', res);

    const row = await prisma.$queryRawUnsafe<any[]>(`SELECT id, email, name, reg_type, registration, due_date, description, work_settings, scope_practice, designation_id FROM users WHERE email = ?`, email);
    console.log('Created user:', row[0]);
  } catch (err: any) {
    console.error('Failed to create test user:', err?.message || err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main();
