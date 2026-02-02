import { prisma } from '../lib/prisma';

async function main() {
  try {
    console.log('Backfilling users.reg_type from users.description.professionalRole...');

    // Only backfill rows where reg_type is missing/blank or still the legacy default 'email'.
    // Only apply when description contains a non-empty professionalRole.
    const result = await prisma.$executeRawUnsafe(
      `UPDATE users
       SET reg_type = JSON_UNQUOTE(JSON_EXTRACT(description, '$.professionalRole')),
           updated_at = NOW()
       WHERE (
         reg_type IS NULL OR TRIM(reg_type) = '' OR reg_type = 'email'
       )
       AND description IS NOT NULL
       AND JSON_VALID(description)
       AND TRIM(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(description, '$.professionalRole')), '')) <> ''`
    );

    console.log(`Updated ${Number(result)} user(s).`);
  } catch (err: any) {
    console.error('Backfill failed:', err?.message || err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main();
