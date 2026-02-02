import { prisma } from '../lib/prisma';

async function main() {
  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT registration, work_settings, scope_practice, designation_id, description
       FROM users
       WHERE email = ? LIMIT 1`,
      'lisaedmunds3@gmail.com'
    );

    if (!rows || rows.length === 0) {
      console.log('No user found');
      return;
    }

    const u = rows[0];
    console.log('user row ids:', u);

    if (u.registration) {
      const reg = await prisma.$queryRawUnsafe<any[]>(`SELECT id, name FROM portfolios WHERE id = ? LIMIT 1`, u.registration);
      console.log('registration:', reg[0] || null);
    } else {
      console.log('registration: none');
    }

    if (u.work_settings) {
      const ws = await prisma.$queryRawUnsafe<any[]>(`SELECT id, name FROM categories WHERE id = ? LIMIT 1`, u.work_settings);
      console.log('work_settings:', ws[0] || null);
    } else {
      console.log('work_settings: none');
    }

    if (u.scope_practice) {
      const sc = await prisma.$queryRawUnsafe<any[]>(`SELECT id, name FROM brands WHERE id = ? LIMIT 1`, u.scope_practice);
      console.log('scope_practice:', sc[0] || null);
    } else {
      console.log('scope_practice: none');
    }

    if (u.designation_id) {
      const d = await prisma.$queryRawUnsafe<any[]>(`SELECT id, designations FROM designations WHERE id = ? LIMIT 1`, u.designation_id);
      console.log('designation:', d[0] || null);
    } else {
      console.log('designation: none');
    }

    // If description has professionalRegistrations, show them
    try {
      const desc = typeof u.description === 'string' ? JSON.parse(u.description) : u.description;
      if (desc && desc.professionalRegistrations) {
        console.log('description.professionalRegistrations:', desc.professionalRegistrations);
      }
    } catch (e) { /* ignore */ }

  } catch (err) {
    console.error('Error:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main();
