import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';

async function main() {
  const email = 'va@example.com';
  const name = 'Verified User';
  const rawPassword = process.argv[2] || 'Revalidate!234';

  console.log('Creating verified user:', email);
  try {
    const hash = await bcrypt.hash(rawPassword, 10);

    const sql = `
      INSERT INTO users (email, name, password, reg_type, status, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, JSON_OBJECT('professionalRole', ?), NOW(), NOW())
    `;

    const res = await prisma.$executeRawUnsafe(sql,
      email,
      name,
      hash,
      'email',
      1,
      'Pharmacist'
    );

    console.log('Inserted rows:', res);
    const row = await prisma.$queryRawUnsafe<any[]>(`SELECT id, email, name, reg_type, status, description FROM users WHERE email = ?`, email);
    console.log('Created user:', row[0]);
  } catch (err: any) {
    console.error('Failed to create verified user:', err?.message || err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main();
