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
  
  console.log(`Checking Supabase at URL: ${supabaseUrl}`);
  
  try {
    const restUrl = `${supabaseUrl}/rest/v1/`;
    const response = await fetch(restUrl, {
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`
      }
    });
    
    if (!response.ok) {
      console.error(`❌ PostgREST query failed: ${response.status} ${response.statusText}`);
      console.log(await response.text());
      return;
    }
    
    const spec = await response.json();
    const tables = Object.keys(spec.definitions || {});
    console.log(`\n✅ PostgREST returned definitions for ${tables.length} tables:`);
    if (tables.length === 0) {
      console.log('⚠️ NO TABLES EXIST IN THE LIVE SUPABASE PROJECT.');
    } else {
      tables.forEach(t => console.log(` - ${t}`));
    }
  } catch (err) {
    console.error('❌ Failed to connect/query Supabase PostgREST:', err.message);
  }
}

run();
