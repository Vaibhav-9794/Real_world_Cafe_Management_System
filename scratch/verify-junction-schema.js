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
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
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
      console.error(`❌ PostgREST query failed: ${response.status}`);
      return;
    }
    
    const spec = await response.json();
    const tableDef = spec.definitions ? spec.definitions['_ReservationToTable'] : null;
    if (tableDef) {
      console.log('✅ Found table definition in OpenAPI spec:');
      console.log(JSON.stringify(tableDef, null, 2));
    } else {
      console.log('⚠️ Could not find _ReservationToTable in OpenAPI spec definitions. Checking all keys:');
      console.log(Object.keys(spec.definitions || {}));
    }
  } catch (err) {
    console.error('❌ Error fetching OpenAPI spec:', err.message);
  }
}

run();
