import { prisma } from '../lib/prisma';

const KNOWN_ROLE_KEYWORDS = [
  'nurse', 'pharmacist', 'doctor', 'dentist', 'physio', 'physiotherapist', 'midwife', 'nursing associate'
];

function normalizeRoleKeyFromPortfolioId(id: number | string) {
  const i = Number(id);
  if ([3,4,5,6,7,8,9].includes(i)) return 'nurse';
  if ([10,12].includes(i)) return 'doctor';
  if ([13,14].includes(i)) return 'pharmacist';
  return 'other_healthcare';
}

async function findPortfolioIdForText(text: string): Promise<number | null> {
  const t = (text || '').trim();
  if (!t) return null;

  // 1) exact match
  const exact = await prisma.$queryRawUnsafe<any[]>(`SELECT id FROM portfolios WHERE LOWER(name) = LOWER(?) LIMIT 1`, t);
  if (exact && exact.length > 0) return Number(exact[0].id);

  // 2) like match
  const like = await prisma.$queryRawUnsafe<any[]>(`SELECT id FROM portfolios WHERE LOWER(name) LIKE LOWER(CONCAT('%', ?, '%')) LIMIT 1`, t);
  if (like && like.length > 0) return Number(like[0].id);

  // 3) keyword fallback
  for (const kw of KNOWN_ROLE_KEYWORDS) {
    if (t.toLowerCase().includes(kw)) {
      const kwMatch = await prisma.$queryRawUnsafe<any[]>(`SELECT id FROM portfolios WHERE LOWER(name) LIKE LOWER(CONCAT('%', ?, '%')) LIMIT 1`, kw);
      if (kwMatch && kwMatch.length > 0) return Number(kwMatch[0].id);
    }
  }

  return null;
}

async function main() {
  try {
    console.log('Scanning candidate users for loose backfill...');
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, email, description, reg_type, registration FROM users WHERE description IS NOT NULL AND TRIM(COALESCE(description, '')) <> '' AND (registration IS NULL OR registration = '' OR reg_type IS NULL OR TRIM(COALESCE(reg_type, '')) = '' OR reg_type = 'email')`
    );

    if (!rows || rows.length === 0) {
      console.log('No candidate rows found');
      return;
    }

    console.log(`Found ${rows.length} candidates, attempting loose matches...`);
    let updated = 0;

    for (const u of rows) {
      let roleText: string | null = null;

      // Try JSON parse first
      try {
        const parsed = typeof u.description === 'string' ? JSON.parse(u.description) : u.description;
        if (parsed && parsed.professionalRole) {
          roleText = String(parsed.professionalRole).trim();
        }
      } catch (e) {
        // not JSON, fall through
      }

      // If not JSON, use description text (shorten)
      if (!roleText && typeof u.description === 'string') {
        const s = u.description.trim();
        // If description is a JSON-like string '"pharmacist"' remove quotes
        const unquoted = s.replace(/^"|"$/g, '');
        roleText = unquoted.length > 0 ? (unquoted.length > 120 ? unquoted.slice(0, 120) : unquoted) : null;
      }

      if (!roleText) continue;

      const portfolioId = await findPortfolioIdForText(roleText);
      const inferredRoleKey = portfolioId ? normalizeRoleKeyFromPortfolioId(portfolioId) : null;

      const shouldUpdateRegistration = portfolioId && (!u.registration || String(u.registration).trim() === '');
      const shouldUpdateRegType = (!u.reg_type || String(u.reg_type).trim() === '' || u.reg_type === 'email') && inferredRoleKey;

      if (shouldUpdateRegistration || shouldUpdateRegType) {
        const updates: any[] = [];
        const setClauses: string[] = [];
        if (shouldUpdateRegistration) {
          setClauses.push('registration = ?');
          updates.push(String(portfolioId));
        }
        if (shouldUpdateRegType) {
          setClauses.push('reg_type = ?');
          updates.push(inferredRoleKey);
        }
        setClauses.push('updated_at = NOW()');

        updates.push(u.id);
        const sql = `UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`;
        await prisma.$executeRawUnsafe(sql, ...updates);
        console.log(`Updated user id=${u.id} email=${u.email} -> registration=${portfolioId} reg_type=${inferredRoleKey}`);
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
