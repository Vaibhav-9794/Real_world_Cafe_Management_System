const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    content.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = match[2] || '';
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.substring(1, val.length - 1);
        } else if (val.startsWith("'") && val.endsWith("'")) {
          val = val.substring(1, val.length - 1);
        }
        process.env[key] = val;
      }
    });
  }
}

async function run() {
  loadEnv();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceKey) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    return;
  }
  
  console.log(`Checking branch 'downtown' on Supabase at: ${supabaseUrl}`);
  
  try {
    const branchUrl = `${supabaseUrl}/rest/v1/branches?id=eq.downtown`;
    const response = await fetch(branchUrl, {
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Range': '0-9'
      }
    });
    
    if (!response.ok) {
      console.error(`❌ Query failed: ${response.status} ${response.statusText}`);
      console.log(await response.text());
      return;
    }
    
    const branches = await response.json();
    console.log(`\nQuery result:`, JSON.stringify(branches, null, 2));
    if (branches.length > 0) {
      console.log(`\n✅ SUCCESS: Branch 'downtown' exists!`);
    } else {
      console.log(`\n❌ ERROR: Branch 'downtown' does not exist in the database!`);
    }
  } catch (err) {
    console.error('❌ Failed to connect/query Supabase PostgREST:', err.message);
  }
}

run();
