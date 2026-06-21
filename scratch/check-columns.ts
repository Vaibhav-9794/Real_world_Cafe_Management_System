import { supabaseAdmin } from '../src/lib/supabase-admin';

async function main() {
  const { data: resData, error } = await supabaseAdmin.from('reservations').select('*').limit(1);
  if (error) {
    console.error("Error fetching reservation:", error);
  } else {
    console.log("Reservation columns:", resData.length > 0 ? Object.keys(resData[0]) : "No rows");
    console.log("Reservation row:", resData);
  }
}

main();
