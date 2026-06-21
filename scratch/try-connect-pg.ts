import { Client } from 'pg';

const host = "aws-0-ap-south-1.pooler.supabase.com";
const user = "postgres.rydhevznuplohmfpzgng";
const database = "postgres";

const passwords = [
  "Demo_for_cafe_management",
  "rydhevznuplohmfpzgng",
  "local_secret_key_1234",
  "6f5cc8fa-16e7-403b-9c78-aa527fd26fa3",
  "admin@123",
  "postgres",
  "postgres1234",
  "Antigravity123!",
  "BohoCafe2026!",
  "BohoCafe123!",
  "elmoxruljsaglzbcdcce"
];

async function testPassword(password: string, port: number): Promise<boolean> {
  console.log(`Testing password: "${password}" on port ${port}...`);
  const client = new Client({
    host,
    port,
    user,
    password,
    database,
    connectionTimeoutMillis: 5000,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log(`\n🎉 SUCCESS! Password is "${password}" on port ${port}!\n`);
    await client.end();
    return true;
  } catch (err: any) {
    console.log(`❌ Failed: ${err.message}`);
    return false;
  }
}

async function main() {
  // Test port 6543 (transaction pooler) first, then 5432
  const ports = [443, 6543, 5432];
  
  for (const port of ports) {
    for (const pw of passwords) {
      const success = await testPassword(pw, port);
      if (success) {
        process.exit(0);
      }
    }
  }

  console.log("\n❌ All password attempts failed.");
  process.exit(1);
}

main().catch(console.error);
