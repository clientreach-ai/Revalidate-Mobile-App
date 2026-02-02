import { prisma } from '../lib/prisma';

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: npx tsx src/scripts/resolve-user-lookups.ts <email>');
    process.exit(2);
  }

  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, email, name, registration, work_settings, scope_practice, designation_id, description FROM users WHERE email = ? LIMIT 1`,
      email
    );

    if (!rows || rows.length === 0) {
      console.log('No user found for', email);
      return;
    }

    const u = rows[0];
    console.log('User:', { id: u.id, email: u.email, name: u.name });
    console.log('registration id:', u.registration);
    console.log('work_settings id:', u.work_settings);
    console.log('scope_practice id:', u.scope_practice);
    console.log('designation_id:', u.designation_id);
    console.log('description:', u.description);

    if (u.registration) {
      const p = await prisma.$queryRawUnsafe<any[]>(`SELECT id, name FROM portfolios WHERE id = ? LIMIT 1`, u.registration);
      console.log('portfolio:', p[0] || null);
    } else console.log('portfolio: none');

    if (u.work_settings) {
      const c = await prisma.$queryRawUnsafe<any[]>(`SELECT id, name FROM categories WHERE id = ? LIMIT 1`, u.work_settings);
      console.log('category (work_setting):', c[0] || null);
    } else console.log('category: none');

    if (u.scope_practice) {
      const b = await prisma.$queryRawUnsafe<any[]>(`SELECT id, name FROM brands WHERE id = ? LIMIT 1`, u.scope_practice);
      console.log('brand (scope_practice):', b[0] || null);
    } else console.log('brand: none');

    if (u.designation_id) {
      const d = await prisma.$queryRawUnsafe<any[]>(`SELECT id, designations FROM designations WHERE id = ? LIMIT 1`, u.designation_id);
      console.log('designation:', d[0] || null);
    } else console.log('designation: none');

  } catch (err) {
    console.error('Error:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main();
