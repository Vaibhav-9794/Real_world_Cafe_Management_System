import { supabaseAdmin } from '../src/lib/supabase-admin';

async function main() {
  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) {
    console.error("Error listing auth users:", error);
  } else {
    console.log("Auth users:", users.map(u => ({ id: u.id, email: u.email })));
  }
}

main();
