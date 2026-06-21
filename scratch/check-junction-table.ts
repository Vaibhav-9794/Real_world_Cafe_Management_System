import { supabaseAdmin } from '../src/lib/supabase-admin';

async function main() {
  console.log("Checking if _ReservationToTable junction table exists in Supabase...");
  const { data, error } = await supabaseAdmin.from('_ReservationToTable').select('*').limit(1);
  if (error) {
    console.log("Result error code:", error.code);
    console.log("Result error message:", error.message);
    console.log("Result error details:", error.details);
  } else {
    console.log("Table exists! Rows count:", data.length);
  }
}

main();
