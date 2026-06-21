import { prisma } from '../src/lib/db';
import { supabaseAdmin } from '../src/lib/supabase-admin';

async function run() {
  console.log("==================================================");
  console.log("🔍 DETAILED RECORD VERIFICATION (SQLITE VS SUPABASE)");
  console.log("==================================================\n");

  // 1. Staff (Owner & Manager)
  console.log("--- 1. STAFF (OWNER & MANAGER) ---");
  const sqliteStaff = await prisma.staff.findMany();
  const { data: supabaseStaff, error: staffErr } = await supabaseAdmin.from('staff').select('*');
  if (staffErr) {
    console.error("Error fetching staff from Supabase:", staffErr.message);
  } else {
    console.log(`SQLite staff count: ${sqliteStaff.length}, Supabase staff count: ${supabaseStaff.length}`);
    sqliteStaff.forEach(s => {
      const sbMatch = supabaseStaff.find((sb: any) => sb.id === s.id);
      console.log(`- [${s.role}] Name: "${s.name}", Email: "${s.email}"`);
      if (sbMatch) {
        console.log(`  Supabase Match: Yes (Role: ${sbMatch.role}, Status: ${sbMatch.status})`);
      } else {
        console.log(`  Supabase Match: ❌ NOT FOUND`);
      }
    });
  }
  console.log("");

  // 2. Customers
  console.log("--- 2. CUSTOMERS ---");
  const sqliteCustomers = await prisma.customer.findMany();
  const { data: supabaseCustomers, error: custErr } = await supabaseAdmin.from('customers').select('*');
  if (custErr) {
    console.error("Error fetching customers from Supabase:", custErr.message);
  } else {
    console.log(`SQLite customer count: ${sqliteCustomers.length}, Supabase customer count: ${supabaseCustomers.length}`);
    sqliteCustomers.forEach(c => {
      const sbMatch = supabaseCustomers.find((sb: any) => sb.id === c.id);
      console.log(`- Customer: "${c.name}", Email: "${c.email}"`);
      if (sbMatch) {
        const hasPwd = sbMatch.password ? "Yes (hashed)" : "No";
        const hasToken = sbMatch.reset_token ? "Yes" : "No";
        console.log(`  Supabase Match: Yes | Password: ${hasPwd} | Reset Token: ${hasToken} | Tier: ${sbMatch.membership_tier}`);
      } else {
        console.log(`  Supabase Match: ❌ NOT FOUND`);
      }
    });
  }
  console.log("");

  // 3. Reservations
  console.log("--- 3. RESERVATIONS ---");
  const sqliteReservations = await prisma.reservation.findMany();
  const { data: supabaseReservations, error: resErr } = await supabaseAdmin.from('reservations').select('*');
  if (resErr) {
    console.error("Error fetching reservations from Supabase:", resErr.message);
  } else {
    console.log(`SQLite reservations count: ${sqliteReservations.length}, Supabase reservations count: ${supabaseReservations.length}`);
    sqliteReservations.slice(0, 5).forEach(r => {
      const sbMatch = supabaseReservations.find((sb: any) => sb.id === r.id);
      console.log(`- Reservation [ID: ${r.id}] Name: "${r.name}", Date: ${r.date}, Status: ${r.status}`);
      if (sbMatch) {
        console.log(`  Supabase Match: Yes | Status: ${sbMatch.status} | Guest Count: ${sbMatch.guests || sbMatch.guest_count}`);
      } else {
        console.log(`  Supabase Match: ❌ NOT FOUND`);
      }
    });
    if (sqliteReservations.length > 5) {
      console.log(`... and ${sqliteReservations.length - 5} more reservations.`);
    }
  }
  console.log("");

  // 4. Orders
  console.log("--- 4. ORDERS ---");
  const sqliteOrders = await prisma.order.findMany();
  const { data: supabaseOrders, error: orderErr } = await supabaseAdmin.from('orders').select('*');
  if (orderErr) {
    console.error("Error fetching orders from Supabase:", orderErr.message);
  } else {
    console.log(`SQLite orders count: ${sqliteOrders.length}, Supabase orders count: ${supabaseOrders.length}`);
    sqliteOrders.slice(0, 5).forEach(o => {
      const sbMatch = supabaseOrders.find((sb: any) => sb.id === o.id);
      console.log(`- Order [ID: ${o.id}] Table: ${o.tableNumber}, Total: $${o.totalAmount}, Status: ${o.status}`);
      if (sbMatch) {
        console.log(`  Supabase Match: Yes | Status: ${sbMatch.status} | Total Amount: $${sbMatch.total_amount}`);
      } else {
        console.log(`  Supabase Match: ❌ NOT FOUND`);
      }
    });
    if (sqliteOrders.length > 5) {
      console.log(`... and ${sqliteOrders.length - 5} more orders.`);
    }
  }
  console.log("");

  // 5. Email Logs
  console.log("--- 5. EMAIL LOGS ---");
  const sqliteEmails = await prisma.emailLog.findMany();
  const { data: supabaseEmails, error: emailErr } = await supabaseAdmin.from('email_logs').select('*');
  if (emailErr) {
    console.error("Error fetching email logs from Supabase:", emailErr.message);
  } else {
    console.log(`SQLite email logs count: ${sqliteEmails.length}, Supabase email logs count: ${supabaseEmails.length}`);
    sqliteEmails.slice(0, 5).forEach(e => {
      const sbMatch = supabaseEmails.find((sb: any) => sb.id === e.id);
      console.log(`- Email Log [ID: ${e.id}] To: "${e.to}", Subject: "${e.subject}", Status: ${e.status}`);
      if (sbMatch) {
        console.log(`  Supabase Match: Yes | Status: ${sbMatch.status} | Subject: "${sbMatch.subject}"`);
      } else {
        console.log(`  Supabase Match: ❌ NOT FOUND`);
      }
    });
    if (sqliteEmails.length > 5) {
      console.log(`... and ${sqliteEmails.length - 5} more email logs.`);
    }
  }
  console.log("");

  console.log("==================================================");
  console.log("🏁 VERIFICATION COMPLETED");
  console.log("==================================================");
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
