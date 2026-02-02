import { prisma } from '../lib/prisma';

async function main() {
  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, email, description FROM users WHERE (registration IS NULL OR registration = '') AND description IS NOT NULL`
    );

    if (!rows || rows.length === 0) {
      console.log('No candidate users found');
      return;
    }

    let updated = 0;

    for (const u of rows) {
      let desc: any = null;
      try {
        desc = typeof u.description === 'string' ? JSON.parse(u.description) : u.description;
      } catch (e) {
        continue;
      }
      if (!desc || !desc.professionalRole) continue;

      const roleText = String(desc.professionalRole).trim();
      if (!roleText) continue;

      // Try to find matching portfolio
      const exact = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id FROM portfolios WHERE LOWER(name) = LOWER(?) LIMIT 1`,
        roleText
      );
      let portfolioId: number | null = null;
      if (exact && exact.length > 0) portfolioId = exact[0].id;
      else {
        const like = await prisma.$queryRawUnsafe<any[]>(
          `SELECT id FROM portfolios WHERE LOWER(name) LIKE LOWER(CONCAT('%', ?, '%')) LIMIT 1`,
          roleText
        );
        if (like && like.length > 0) portfolioId = like[0].id;
      }

      if (portfolioId) {
        await prisma.$executeRawUnsafe(`UPDATE users SET registration = ? WHERE id = ?`, String(portfolioId), u.id);
        console.log(`Updated user id=${u.id} email=${u.email} -> registration=${portfolioId}`);
        updated++;
      }
    }

    console.log(`Done. Updated ${updated} user(s).`);
  } catch (err) {
    console.error('Error:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main();
