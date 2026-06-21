import fs from 'fs';
import path from 'path';

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
loadEnv();

async function run() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceKey) {
    console.error('❌ Missing credentials');
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
    const definitions = spec.definitions || {};
    
    console.log("=== SUPABASE TABLE COLUMNS ===");
    for (const [tableName, definition] of Object.entries(definitions)) {
      const properties = (definition as any).properties || {};
      const columns = Object.keys(properties);
      console.log(`\nTable: ${tableName}`);
      console.log(`Columns: ${columns.join(', ')}`);
    }
  } catch (err: any) {
    console.error('❌ Failed:', err.message);
  }
}

run();
