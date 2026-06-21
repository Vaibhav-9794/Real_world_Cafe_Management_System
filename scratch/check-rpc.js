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
      return;
    }
    
    const spec = await response.json();
    const paths = Object.keys(spec.paths || {});
    const rpcs = paths.filter(p => p.startsWith('/rpc/'));
    
    console.log(`\n✅ PostgREST returned ${rpcs.length} RPC paths:`);
    if (rpcs.length === 0) {
      console.log('⚠️ NO RPC FUNCTIONS EXPOSED IN THE LIVE SUPABASE PROJECT.');
    } else {
      rpcs.forEach(p => console.log(` - ${p}`));
    }
  } catch (err) {
    console.error('❌ Failed to query Supabase OpenAPI spec:', err.message);
  }
}

run();
