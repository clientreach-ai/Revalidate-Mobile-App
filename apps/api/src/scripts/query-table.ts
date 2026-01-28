import dotenv from 'dotenv';
import { resolve } from 'path';
import { connectMySQL, getMySQLPool } from '../config/database';
import { MYSQL_CONFIG } from '../config/env';
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'node:process';

dotenv.config({ path: resolve(process.cwd(), '.env') });

async function listTables(pool: any) {
  const [rows] = await pool.execute(
    `SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema = ? ORDER BY TABLE_NAME`,
    [MYSQL_CONFIG.database]
  ) as any;
  return rows.map((r: any) => r.TABLE_NAME);
}

async function getColumns(pool: any, table: string) {
  const [cols] = await pool.execute(
    `SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema = ? AND table_name = ? ORDER BY ORDINAL_POSITION`,
    [MYSQL_CONFIG.database, table]
  ) as any;
  return cols.map((c: any) => c.COLUMN_NAME);
}

function buildWhereClauseFromInput(inputStr: string, columns: string[]) {
  // input format: col=val[,col2=%val%]
  if (!inputStr) return { clause: '', values: [] };
  const parts = inputStr.split(',').map(p => p.trim()).filter(Boolean);
  const conds: string[] = [];
  const values: any[] = [];

  for (const p of parts) {
    const eq = p.indexOf('=');
    if (eq <= 0) continue;
    const col = p.slice(0, eq).trim();
    let val = p.slice(eq + 1).trim();
    if (!columns.includes(col)) throw new Error(`Column '${col}' not in table`);

    if (val.includes('%') || val.includes('*')) {
      val = val.replace(/\*/g, '%');
      conds.push(`${col} LIKE ?`);
      values.push(val);
    } else {
      conds.push(`${col} = ?`);
      values.push(val);
    }
  }

  const clause = conds.length > 0 ? `WHERE ${conds.join(' AND ')}` : '';
  return { clause, values };
}

async function runInteractive() {
  await connectMySQL();
  const pool = getMySQLPool();
  const rl = readline.createInterface({ input, output });

  try {
    const tables = await listTables(pool);
    console.log('\nAvailable tables:\n');
    tables.forEach((t: string, i: number) => console.log(`${i + 1}. ${t}`));

    const tableIdx = await rl.question('\nEnter table number or name: ');
    let table = tableIdx.trim();
    if (/^\d+$/.test(table)) {
      const idx = parseInt(table, 10) - 1;
      if (idx < 0 || idx >= tables.length) throw new Error('Invalid table number');
      table = tables[idx];
    }

    console.log(`\nSelected table: ${table}`);

    const columns = await getColumns(pool, table);
    console.log(`\nColumns: ${columns.join(', ')}`);

    const colsInput = await rl.question('\nEnter columns to select (comma separated) or * for all: ');
    let selectCols = colsInput.trim() || '*';
    if (selectCols !== '*') {
      const parts = selectCols.split(',').map(s => s.trim());
      for (const p of parts) {
        if (!columns.includes(p)) throw new Error(`Column '${p}' not found`);
      }
      selectCols = parts.join(', ');
    }

    const whereInput = await rl.question('\nEnter filters (format: col=val,col2=%val%) or leave blank: ');
    const { clause, values } = buildWhereClauseFromInput(whereInput.trim(), columns);

    const limitInput = await rl.question('\nEnter limit (default 100): ');
    const limit = limitInput.trim() ? parseInt(limitInput.trim(), 10) : 100;

    const sql = `SELECT ${selectCols} FROM \`${table}\` ${clause} LIMIT ${limit}`;
    console.log('\nExecuting:', sql);
    console.log('Values:', values);

    const [rows] = await pool.execute(sql, values) as any;
    console.log(`\nReturned ${rows.length} row(s):\n`);
    console.log(JSON.stringify(rows, null, 2));

    await rl.question('\nPress Enter to exit...');
    rl.close();
    process.exit(0);
  } catch (err: any) {
    console.error('\nError:', err.message || err);
    process.exit(2);
  }
}

async function runFromArgs() {
  const args = process.argv.slice(2);
  const parsed: any = {};
  for (const a of args) {
    if (!a.startsWith('--')) continue;
    const [k, ...rest] = a.slice(2).split('=');
    parsed[k] = rest.join('=') || 'true';
  }

  await connectMySQL();
  const pool = getMySQLPool();

  if (!parsed.table) throw new Error('--table is required when running with args');
  const table = parsed.table;
  const columns = await getColumns(pool, table);

  const selectCols = parsed.columns || '*';
  if (selectCols !== '*') {
    const parts = selectCols.split(',').map((s: string) => s.trim());
    for (const p of parts) if (!columns.includes(p)) throw new Error(`Column '${p}' not found`);
  }

  const where = parsed.where || '';
  const { clause, values } = buildWhereClauseFromInput(where, columns);
  const limit = parsed.limit ? parseInt(parsed.limit, 10) : 100;

  const sql = `SELECT ${selectCols} FROM \`${table}\` ${clause} LIMIT ${limit}`;
  console.log('\nExecuting:', sql);
  console.log('Values:', values);

  const [rows] = await pool.execute(sql, values) as any;
  console.log(`\nReturned ${rows.length} row(s):\n`);
  console.log(JSON.stringify(rows, null, 2));
}

if (require.main === module) {
  const hasArgs = process.argv.slice(2).some(a => a.startsWith('--'));
  if (hasArgs) runFromArgs().catch(e => { console.error('Error:', e); process.exit(2); });
  else runInteractive();
}

export { runInteractive, runFromArgs };
