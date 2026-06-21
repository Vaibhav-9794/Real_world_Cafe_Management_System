const { Client } = require('pg');

const connectionString = 'postgresql://postgres.rydhevznuplohmfpzgng:Demo-Password-For-Cafe-system@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?sslmode=require';

async function main() {
  console.log('Connecting to Supabase PostgreSQL...');
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 5000,
  });

  try {
    await client.connect();
    console.log('✅ SUCCESS: Connected to Supabase PostgreSQL successfully!');
    const res = await client.query('SELECT NOW()');
    console.log('Result:', res.rows[0]);
    await client.end();
  } catch (err) {
    console.error('❌ CONNECTION FAILED:', err.stack || err.message || err);
  }
}

main();
