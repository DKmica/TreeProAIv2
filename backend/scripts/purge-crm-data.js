const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .forEach((line) => {
      const [key, ...rest] = line.split('=');
      const value = rest.join('=').trim();
      if (key && !process.env[key]) {
        process.env[key] = value;
      }
    });
}

const { query, closePool, getPool } = require('../db');

const TABLES = [
  { name: 'invoices', label: 'invoices' },
  { name: 'jobs', label: 'jobs' },
  { name: 'quotes', label: 'quotes' },
  { name: 'leads', label: 'leads' },
  { name: 'clients', label: 'clients' },
  { name: 'customers', label: 'legacy customers' },
];

async function purgeCrmData() {
  console.log('🚧 Starting CRM data purge for leads, quotes, jobs, invoices, and customers...');
  const deletedSummaries = [];

  try {
    await query('BEGIN');

    for (const table of TABLES) {
      const countResult = await query(`SELECT COUNT(*)::int AS count FROM ${table.name}`);
      await query(`TRUNCATE TABLE ${table.name} CASCADE`);
      deletedSummaries.push(`${table.label}: ${countResult.rows[0].count}`);
    }

    await query('COMMIT');

    console.log('✅ Purge complete. Rows removed by table:');
    deletedSummaries.forEach((summary) => console.log(`   - ${summary}`));
  } catch (err) {
    console.error('❌ Failed to purge CRM data:', err.message);
    try {
      await query('ROLLBACK');
    } catch (rollbackErr) {
      console.error('⚠️  Unable to rollback purge transaction:', rollbackErr.message);
    }
    process.exitCode = 1;
  } finally {
    try {
      if (getPool && typeof getPool === 'function' && getPool()) {
        await closePool();
      }
    } catch (closeErr) {
      console.error('⚠️  Error closing database pool:', closeErr.message);
    }
  }
}

purgeCrmData();
