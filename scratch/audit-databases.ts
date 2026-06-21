import { prisma } from '../src/lib/db';
import { supabaseAdmin } from '../src/lib/supabase-admin';

async function main() {
  console.log("=== DATABASE AUDIT: SQLITE VS SUPABASE ===");

  // 1. Audit SQLite
  console.log("\nAuditing SQLite...");
  const sqliteCounts: Record<string, number> = {};
  
  try {
    sqliteCounts['branches'] = await prisma.branch.count();
    sqliteCounts['tables'] = await prisma.table.count();
    sqliteCounts['reservations'] = await prisma.reservation.count();
    sqliteCounts['waitlist'] = await prisma.waitlist.count();
    sqliteCounts['customers'] = await prisma.customer.count();
    sqliteCounts['customer_favorites'] = await prisma.customerFavorite.count();
    sqliteCounts['coupons'] = await prisma.coupon.count();
    sqliteCounts['leads'] = await prisma.lead.count();
    sqliteCounts['staff'] = await prisma.staff.count();
    sqliteCounts['cms_config'] = await prisma.cMSConfig.count();
    sqliteCounts['blocked_dates'] = await prisma.blockedDate.count();
    sqliteCounts['orders'] = await prisma.order.count();
    sqliteCounts['order_items'] = await prisma.orderItem.count();
    sqliteCounts['payments'] = await prisma.payment.count();
    sqliteCounts['reward_redemptions'] = await prisma.rewardRedemption.count();
    sqliteCounts['qr_scan_logs'] = await prisma.qRScanLog.count();
    sqliteCounts['inventory_items'] = await prisma.inventoryItem.count();
    sqliteCounts['notifications'] = await prisma.notification.count();
    sqliteCounts['audit_logs'] = await prisma.auditLog.count();
    sqliteCounts['email_logs'] = await prisma.emailLog.count();
  } catch (err: any) {
    console.error("Error reading SQLite counts:", err.message);
  }

  console.log("SQLite Row Counts:");
  console.table(sqliteCounts);

  // 2. Audit Supabase
  console.log("\nAuditing Supabase...");
  const supabaseCounts: Record<string, any> = {};

  const tablesToCheck = [
    { name: 'branches', dbName: 'branches' },
    { name: 'tables', dbName: 'tables' },
    { name: 'reservations', dbName: 'reservations' },
    { name: 'waitlist', dbName: 'waitlist' },
    { name: 'customers', dbName: 'customers' },
    { name: 'customer_favorites', dbName: 'customer_favorites' },
    { name: 'coupons', dbName: 'coupons' },
    { name: 'leads', dbName: 'leads' },
    { name: 'staff', dbName: 'staff' },
    { name: 'cms_config', dbName: 'cms_config' },
    { name: 'blocked_dates', dbName: 'blocked_dates' },
    { name: 'orders', dbName: 'orders' },
    { name: 'order_items', dbName: 'order_items' },
    { name: 'payments', dbName: 'payments' },
    { name: 'reward_redemptions', dbName: 'reward_redemptions' },
    { name: 'qr_scan_logs', dbName: 'qr_scan_logs' },
    { name: 'inventory_items', dbName: 'inventory_items' },
    { name: 'notifications', dbName: 'inbox_notifications' }, // maps to inbox_notifications in pg
    { name: 'audit_logs', dbName: 'audit_logs' },
    { name: 'email_logs', dbName: 'email_logs' } // let's see if this table exists
  ];

  for (const t of tablesToCheck) {
    try {
      const { count, error } = await supabaseAdmin
        .from(t.dbName)
        .select('*', { count: 'exact', head: true });
        
      if (error) {
        supabaseCounts[t.name] = `Error: ${error.message}`;
      } else {
        supabaseCounts[t.name] = count;
      }
    } catch (err: any) {
      supabaseCounts[t.name] = `Exception: ${err.message}`;
    }
  }

  console.log("Supabase Row Counts:");
  console.table(supabaseCounts);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
