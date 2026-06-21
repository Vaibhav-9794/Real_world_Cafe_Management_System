import { supabaseAdmin } from '../src/lib/supabase-admin';

async function main() {
  const { data: staff, error } = await supabaseAdmin.from('staff').select('*');
  if (error) {
    console.error("Error fetching staff:", error);
  } else {
    console.log("Staff in Supabase:", staff);
  }
}

main();
