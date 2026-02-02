import { prisma } from '../lib/prisma';

const ROLE_MAP: Array<[RegExp, string]> = [
  [/\bphysio|physiothe?rapist\b/i, 'physiotherapist'],
  [/\bpharmacist\b/i, 'pharmacist'],
  [/\bmidwife\b/i, 'midwife'],
  [/\bdentist\b/i, 'dentist'],
  [/\bdoctor\b|\bgp\b|\bmedical\b/i, 'doctor'],
  [/\bnursing associate\b|\bnursing-associate\b/i, 'nursing_associate'],
  [/\bnurse\b/i, 'nurse'],
  [/\bhealth visitor\b/i, 'health_visitor'],
  [/\bother\b|\bother healthcare\b/i, 'other_healthcare'],
];

async function findPortfolios() {
  const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT id, name FROM portfolios`);
  return rows.map(r => ({ id: r.id, name: String(r.name) }));
}

function inferRoleFromText(text: string | null) {
  if (!text) return null;
  const s = text.toLowerCase();
  for (const [re, label] of ROLE_MAP) {
    if (re.test(s)) return label;
  }
  return null;
}

async function main() {
  const apply = process.argv.includes('--apply');
  try {
    const portfolios = await findPortfolios();

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, email, description, reg_type, registration FROM users WHERE description IS NOT NULL AND description != '' AND JSON_VALID(description) = 0`);

    console.log(`Found ${rows.length} non-JSON description rows to inspect.`);

    const proposals: Array<{id:number, email:string, desc:string, inferredRole?:string, matchedPortfolioId?:number, sql?:string}> = [];

    for (const r of rows) {
      const desc = String(r.description || '');
      const inferred = inferRoleFromText(desc);
      let matchedPortfolioId: number | undefined = undefined;
      if (inferred) {
        // try to match portfolio by name
        const m = portfolios.find(p => p.name.toLowerCase().includes(inferred.replace(/_/g, ' ')));
        if (m) matchedPortfolioId = m.id;
      } else {
        // try heuristic: look for any portfolio name token inside desc
        for (const p of portfolios) {
          if (p.name && desc.toLowerCase().includes(p.name.toLowerCase())) {
            matchedPortfolioId = p.id; break;
          }
        }
      }

      const updates: string[] = [];
      if (inferred) updates.push(`SET reg_type='${inferred}'`);
      if (matchedPortfolioId) updates.push(`registration=${matchedPortfolioId}`);
      // also propose wrapping description as JSON professionalRole if not present
      if (inferred) updates.push(`description=JSON_OBJECT('professionalRole','${inferred}')`);

      const sql = updates.length ? `UPDATE users ${updates.join(', ')} WHERE id=${r.id};` : null;

      proposals.push({ id: r.id, email: r.email, desc, inferredRole: inferred || undefined, matchedPortfolioId, sql: sql || undefined });
    }

    const toShow = proposals.slice(0, 50);
    for (const p of toShow) {
      console.log('---');
      console.log(`id=${p.id} email=${p.email}`);
      console.log(`desc=${p.desc}`);
      console.log(`inferredRole=${p.inferredRole ?? '-'} matchedPortfolioId=${p.matchedPortfolioId ?? '-'}\nproposed: ${p.sql ?? '(no proposal)'}`);
    }

    const applicable = proposals.filter(p => p.sql);
    console.log(`\nProposals: ${applicable.length} rows have proposed updates.`);

    if (apply && applicable.length) {
      console.log('Applying updates...');
      let applied = 0;
      for (const p of applicable) {
        try {
          await prisma.$executeRawUnsafe(p.sql as string);
          applied++;
        } catch (err: any) {
          console.error('Failed to apply for id', p.id, err?.message || err);
        }
      }
      console.log(`Applied ${applied}/${applicable.length} updates.`);
    } else if (!apply) {
      console.log('Dry-run complete. Rerun with --apply to make changes.');
    }

  } catch (err: any) {
    console.error('Error:', err?.message || err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main();
