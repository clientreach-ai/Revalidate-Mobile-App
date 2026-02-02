import { prisma } from '../lib/prisma';

function normalize(s: any) {
  if (s === null || s === undefined) return '';
  if (typeof s !== 'string') s = String(s);
  return s.trim();
}

function inferRoleKeyFromText(t: string) {
  const lower = (t || '').toLowerCase();
  if (!lower) return null;
  if (lower.includes('pharmacist')) return 'pharmacist';
  if (lower.includes('doctor') || lower.includes('gp') || lower.includes('physician')) return 'doctor';
  if (lower.includes('nurse') || lower.includes('nursing')) return 'nurse';
  if (lower.includes('dentist')) return 'dentist';
  if (lower.includes('physio') || lower.includes('physiotherapist')) return 'other_healthcare';
  return null;
}

async function main() {
  try {
    const candidates = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, email, description, registration, reg_type FROM users WHERE description IS NOT NULL AND TRIM(COALESCE(description, '')) <> '' AND (registration IS NULL OR registration = '' OR reg_type IS NULL OR TRIM(reg_type) = '') ORDER BY id LIMIT 1000`
    );

    if (!candidates || candidates.length === 0) {
      console.log('No candidate users found');
      return;
    }

    let updated = 0;

    for (const u of candidates) {
      const raw = normalize(u.description);
      if (!raw) continue;

      // Try JSON first
      let parsedRole: string | null = null;
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          if (parsed.professionalRole) parsedRole = normalize(parsed.professionalRole);
          else if (parsed.professionalRegistrations) parsedRole = normalize(parsed.professionalRegistrations?.[0]);
        }
      } catch (e) {
        // not JSON - fallthrough
      }

      // If not JSON, treat description as free text role hint
      if (!parsedRole) parsedRole = raw.split(/[\n\.]/)[0].trim();
      if (!parsedRole) continue;

      // Try exact portfolio match first, then LIKE
      let portfolioId: number | null = null;
      try {
        const exact = await prisma.$queryRawUnsafe<any[]>(`SELECT id FROM portfolios WHERE LOWER(name) = LOWER(?) LIMIT 1`, parsedRole);
        if (exact && exact.length > 0) portfolioId = exact[0].id;
        else {
          const like = await prisma.$queryRawUnsafe<any[]>(`SELECT id FROM portfolios WHERE LOWER(name) LIKE LOWER(CONCAT('%', ?, '%')) LIMIT 1`, parsedRole);
          if (like && like.length > 0) portfolioId = like[0].id;
        }
      } catch (e) {
        // ignore lookup failures
        portfolioId = null;
      }

      const roleKey = inferRoleKeyFromText(parsedRole);

      const toUpdate: any = {};
      if (portfolioId) toUpdate.registration = String(portfolioId);
      if (roleKey) toUpdate.reg_type = roleKey;

      if (Object.keys(toUpdate).length > 0) {
        const setClauses: string[] = [];
        const params: any[] = [];
        Object.entries(toUpdate).forEach(([k, v]) => { setClauses.push(`${k} = ?`); params.push(v); });
        params.push(u.id);
        await prisma.$executeRawUnsafe(`UPDATE users SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = ?`, ...params);
        console.log(`Updated user id=${u.id} email=${u.email} -> ${JSON.stringify(toUpdate)}`);
        updated++;
      } else if (!u.reg_type) {
        // no portfolio but we may be able to set reg_type from keywords
        if (roleKey) {
          await prisma.$executeRawUnsafe(`UPDATE users SET reg_type = ?, updated_at = NOW() WHERE id = ?`, roleKey, u.id);
          console.log(`Set reg_type for user id=${u.id} email=${u.email} -> ${roleKey}`);
          updated++;
        }
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
