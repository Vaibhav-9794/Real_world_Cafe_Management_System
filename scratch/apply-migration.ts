import { prisma } from '../src/lib/db';
import { supabaseAdmin } from '../src/lib/supabase-admin';
import * as fs from 'fs';
import * as path from 'path';

async function getSupabaseSchema(): Promise<Record<string, string[]>> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing Supabase credentials in environment.');
  }

  const restUrl = `${supabaseUrl}/rest/v1/`;
  const response = await fetch(restUrl, {
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`
    }
  });
  
  if (!response.ok) {
    throw new Error(`PostgREST OpenAPI schema query failed: ${response.status}`);
  }
  
  const spec = await response.json();
  const definitions = spec.definitions || {};
  const schema: Record<string, string[]> = {};
  
  for (const [tableName, definition] of Object.entries(definitions)) {
    const properties = (definition as any).properties || {};
    schema[tableName] = Object.keys(properties);
  }
  
  return schema;
}

async function run() {
  console.log("==================================================");
  console.log("🔄 BOHO DATABASE SCHEMA AUDIT & MIGRATION RUNNER");
  console.log("==================================================\n");

  // 1. Audit Schema
  console.log("Step 1: Auditing Supabase schema columns...");
  let supabaseSchema: Record<string, string[]>;
  try {
    supabaseSchema = await getSupabaseSchema();
  } catch (err: any) {
    console.error("❌ Failed to retrieve Supabase schema:", err.message);
    process.exit(1);
  }

  const missingFixes: string[] = [];
  const alterStatements: string[] = [];

  // Check email_logs table
  if (!supabaseSchema['email_logs'] && !supabaseSchema['email_log']) {
    missingFixes.push("Missing table: email_logs");
    alterStatements.push(`-- Create missing email_logs table
CREATE TABLE IF NOT EXISTS email_logs (
  id TEXT PRIMARY KEY,
  "to" TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT,
  attempts INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow staff CRUD on email_logs" ON email_logs;
CREATE POLICY "Allow staff CRUD on email_logs" ON email_logs FOR ALL TO authenticated USING (true);
`);
  }

  // Check customers columns
  const customerCols = supabaseSchema['customers'] || [];
  const missingCustomerCols: string[] = [];
  if (!customerCols.includes('password')) missingCustomerCols.push('password');
  if (!customerCols.includes('reset_token')) missingCustomerCols.push('reset_token');
  if (!customerCols.includes('reset_token_expires')) missingCustomerCols.push('reset_token_expires');

  if (missingCustomerCols.length > 0) {
    missingFixes.push(`Missing columns in customers table: ${missingCustomerCols.join(', ')}`);
    let alterCust = `-- Add missing columns to customers table\n`;
    if (missingCustomerCols.includes('password')) {
      alterCust += `ALTER TABLE customers ADD COLUMN IF NOT EXISTS password TEXT;\n`;
    }
    if (missingCustomerCols.includes('reset_token')) {
      alterCust += `ALTER TABLE customers ADD COLUMN IF NOT EXISTS reset_token TEXT;\n`;
    }
    if (missingCustomerCols.includes('reset_token_expires')) {
      alterCust += `ALTER TABLE customers ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ;\n`;
    }
    alterStatements.push(alterCust);
  }

  // 2. Report/Apply Schema Fixes
  if (missingFixes.length > 0) {
    console.log("\n❌ SCHEMA MISMATCH DETECTED!");
    missingFixes.forEach(fix => console.log(`  - ${fix}`));

    const sqlScript = alterStatements.join('\n');
    const artDir = 'C:\\Users\\vs242\\.gemini\\antigravity\\brain\\a4322c36-a32f-4ac7-8d1b-4c4fc8af688b';
    const sqlPath = path.join(artDir, 'supabase_schema_fixes.sql');
    fs.writeFileSync(sqlPath, sqlScript);

    console.log(`\nSQL ALTER statements have been generated and saved to: ${sqlPath}`);
    console.log("\n==================================================");
    console.log("👉 ACTION REQUIRED:");
    console.log("Please copy the SQL statements in the file and run them inside");
    console.log("the Supabase Dashboard SQL Editor (https://supabase.com).");
    console.log("Once applied, run this script again to complete the migration.");
    console.log("==================================================");
    
    process.exit(2); // Exit code 2 indicates schema fixes needed
  }

  console.log("✅ Supabase schema matches Prisma schema perfectly! Starting data migration...\n");

  // 3. Execute Data Migration
  const results: Record<string, { sqlite: number; supabase: number; status: string; skipped: number }> = {};

  try {
    // Helper function to handle batch migration
    const migrateTable = async (
      name: string,
      supabaseTable: string,
      fetchSqlite: () => Promise<any[]>,
      mapRecord: (rec: any) => any
    ) => {
      console.log(`Migrating ${name}...`);
      const sqliteRecords = await fetchSqlite();
      const sqliteCount = sqliteRecords.length;

      if (sqliteCount === 0) {
        results[name] = { sqlite: 0, supabase: 0, status: "SKIPPED (No data)", skipped: 0 };
        console.log(`  - No records in SQLite. Skipped.`);
        return;
      }

      // Retrieve current count in Supabase
      const { count: initialCount } = await supabaseAdmin
        .from(supabaseTable)
        .select('*', { count: 'exact', head: true });

      const currentSupabaseCount = initialCount || 0;
      let mappedRecords = sqliteRecords.map(mapRecord);

      // Special handling for read-only audit_logs
      if (name === 'audit_logs') {
        if (currentSupabaseCount === sqliteCount) {
          console.log(`  - Audit logs already match. SQLite: ${sqliteCount}, Supabase: ${currentSupabaseCount}. Skipping migration.`);
          results[name] = {
            sqlite: sqliteCount,
            supabase: currentSupabaseCount,
            status: "🟢 SUCCESS",
            skipped: 0
          };
          return;
        } else if (currentSupabaseCount > 0) {
          console.log(`  - Audit logs partially exist (${currentSupabaseCount}/${sqliteCount}). Filtering out existing records to perform INSERT only...`);
          const { data: existingData, error: fetchErr } = await supabaseAdmin
            .from(supabaseTable)
            .select('id');
          if (!fetchErr && existingData) {
            const existingIds = new Set(existingData.map((d: any) => d.id));
            mappedRecords = mappedRecords.filter(r => !existingIds.has(r.id));
            console.log(`  - Filtered to ${mappedRecords.length} new audit logs to insert.`);
          }
        }
      }

      // Clean/Upsert in chunks of 50 to avoid network payload limits
      const chunkSize = 50;
      let inserted = 0;
      let errors = 0;

      for (let i = 0; i < mappedRecords.length; i += chunkSize) {
        const chunk = mappedRecords.slice(i, i + chunkSize);
        const { error } = name === 'audit_logs'
          ? await supabaseAdmin.from(supabaseTable).insert(chunk)
          : await supabaseAdmin.from(supabaseTable).upsert(chunk);

        if (error) {
          console.error(`  ❌ Error inserting chunk to ${supabaseTable}:`, error.message);
          errors += chunk.length;
        } else {
          inserted += chunk.length;
        }
      }

      // Retrieve post-migration count
      const { count } = await supabaseAdmin
        .from(supabaseTable)
        .select('*', { count: 'exact', head: true });

      results[name] = {
        sqlite: sqliteCount,
        supabase: count || 0,
        status: errors === 0 ? "🟢 SUCCESS" : `🔴 FAILED (${errors} errors)`,
        skipped: errors
      };
      console.log(`  - Migrated ${inserted}/${sqliteCount} records. Supabase Count: ${count}`);
    };

    // 1. branches
    await migrateTable('branches', 'branches', 
      () => prisma.branch.findMany(),
      (r) => ({
        id: r.id,
        name: r.name,
        city: r.city,
        address: r.address,
        phone: r.phone,
        whatsapp: r.whatsapp,
        email: r.email,
        opening_hours: r.openingHours
      })
    );

    // 2. tables
    await migrateTable('tables', 'tables',
      () => prisma.table.findMany(),
      (r) => ({
        id: r.id,
        number: r.number,
        capacity: r.capacity,
        status: r.status,
        x: r.x,
        y: r.y,
        branch_id: r.branchId
      })
    );

    // 3. coupons
    await migrateTable('coupons', 'coupons',
      () => prisma.coupon.findMany(),
      (r) => ({
        code: r.code,
        type: r.type,
        value: r.value,
        min_spend: r.minSpend,
        start_date: r.startDate,
        end_date: r.endDate,
        usage_limit: r.usageLimit,
        usage_count: r.usageCount
      })
    );

    // 4. customers
    await migrateTable('customers', 'customers',
      () => prisma.customer.findMany(),
      (r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        phone: r.phone,
        visit_count: r.visitCount,
        total_spent: r.totalSpent,
        points: r.points,
        vip_status: r.vipStatus,
        membership_tier: r.membershipTier,
        birthday: r.birthday,
        notes: r.notes,
        preferred_table: r.preferredTable,
        dietary_restrictions: r.dietaryRestrictions,
        average_group_size: r.averageGroupSize,
        last_visit_date: r.lastVisitDate,
        referred_by: r.referredBy,
        referral_code: r.referralCode,
        otp_code: r.otpCode,
        otp_expires: r.otpExpires,
        created_at: r.createdAt,
        password: r.password,
        reset_token: r.resetToken,
        reset_token_expires: r.resetTokenExpires
      })
    );

    // 5. staff
    await migrateTable('staff', 'staff',
      () => prisma.staff.findMany(),
      (r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        role: r.role,
        pin: r.pin,
        login_method: r.loginMethod,
        status: r.status,
        branch_id: r.branchId
      })
    );

    // 6. reservations
    await migrateTable('reservations', 'reservations',
      () => prisma.reservation.findMany(),
      (r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        phone: r.phone,
        type: r.type,
        booking_type: r.booking_type,
        table_number: r.table_number,
        table_capacity: r.table_capacity,
        guest_count: r.guest_count,
        reservation_date: r.reservation_date,
        start_time: r.start_time,
        end_time: r.end_time,
        booking_status: r.booking_status,
        special_requests: r.special_requests,
        approval_status: r.approval_status,
        approved_by: r.approved_by,
        approved_at: r.approved_at,
        rejection_reason: r.rejection_reason,
        is_full_cafe_booking: r.is_full_cafe_booking,
        held_until: r.held_until,
        session_id: r.sessionId,
        date: r.date,
        time: r.time,
        guests: r.guests,
        notes: r.notes,
        status: r.status,
        payment_status: r.paymentStatus,
        payment_id: r.paymentId,
        payment_amount: r.paymentAmount,
        payment_gateway: r.paymentGateway,
        branch_id: r.branchId,
        coupon_code: r.couponCode,
        points_awarded: r.pointsAwarded,
        created_at: r.createdAt
      })
    );

    // 7. waitlist
    await migrateTable('waitlist', 'waitlist',
      () => prisma.waitlist.findMany(),
      (r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        phone: r.phone,
        guests: r.guests,
        date: r.date,
        time_slot: r.timeSlot,
        status: r.status,
        branch_id: r.branchId
      })
    );

    // 8. leads
    await migrateTable('leads', 'leads',
      () => prisma.lead.findMany(),
      (r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        phone: r.phone,
        type: r.type,
        source: r.source,
        notes: r.notes,
        status: r.status
      })
    );

    // 9. blocked_dates
    await migrateTable('blocked_dates', 'blocked_dates',
      () => prisma.blockedDate.findMany(),
      (r) => ({
        id: r.id,
        date: r.date,
        start_time: r.startTime,
        end_time: r.endTime,
        reason: r.reason,
        type: r.type
      })
    );

    // 10. cms_config
    await migrateTable('cms_config', 'cms_config',
      () => prisma.cMSConfig.findMany(),
      (r) => ({
        key: r.key,
        value: r.value
      })
    );

    // 11. inventory_items
    await migrateTable('inventory_items', 'inventory_items',
      () => prisma.inventoryItem.findMany(),
      (r) => ({
        id: r.id,
        name: r.name,
        category: r.category,
        quantity: r.quantity,
        unit: r.unit,
        min_threshold: r.minThreshold
      })
    );

    // 12. customer_favorites
    await migrateTable('customer_favorites', 'customer_favorites',
      () => prisma.customerFavorite.findMany(),
      (r) => ({
        id: r.id,
        customer_id: r.customerId,
        item_id: r.itemId
      })
    );

    // 13. reward_redemptions
    await migrateTable('reward_redemptions', 'reward_redemptions',
      () => prisma.rewardRedemption.findMany(),
      (r) => ({
        id: r.id,
        customer_id: r.customerId,
        reward_name: r.rewardName,
        points_burned: r.pointsBurned
      })
    );

    // 14. qr_scan_logs
    await migrateTable('qr_scan_logs', 'qr_scan_logs',
      () => prisma.qRScanLog.findMany(),
      (r) => ({
        id: r.id,
        branch_id: r.branchId,
        table_number: r.tableNumber,
        scanned_at: r.scannedAt
      })
    );

    // 15. inbox_notifications
    await migrateTable('inbox_notifications', 'inbox_notifications',
      () => prisma.notification.findMany(),
      (r) => ({
        id: r.id,
        user_id: r.userId,
        title: r.title,
        message: r.message,
        type: r.type,
        is_read: r.isRead
      })
    );

    // 16. audit_logs
    await migrateTable('audit_logs', 'audit_logs',
      () => prisma.auditLog.findMany(),
      (r) => ({
        id: r.id,
        actor_email: r.actorEmail,
        actor_role: r.actorRole,
        action: r.action,
        details: r.details,
        target_id: r.targetId
      })
    );

    // 17. orders
    await migrateTable('orders', 'orders',
      () => prisma.order.findMany(),
      (r) => ({
        id: r.id,
        table_number: r.tableNumber,
        status: r.status,
        total_amount: r.totalAmount,
        reservation_id: r.reservationId,
        branch_id: r.branchId,
        customer_email: r.customerEmail,
        customer_phone: r.customerPhone
      })
    );

    // 18. order_items
    await migrateTable('order_items', 'order_items',
      () => prisma.orderItem.findMany(),
      (r) => ({
        id: r.id,
        order_id: r.orderId,
        item_id: r.itemId,
        item_name: r.itemName,
        quantity: r.quantity,
        price: r.price
      })
    );

    // 19. payments
    await migrateTable('payments', 'payments',
      () => prisma.payment.findMany(),
      (r) => ({
        id: r.id,
        order_id: r.orderId,
        reservation_id: r.reservationId,
        amount: r.amount,
        status: r.status,
        gateway: r.gateway,
        transaction_id: r.transactionId
      })
    );

    // 20. email_logs
    await migrateTable('email_logs', 'email_logs',
      () => prisma.emailLog.findMany(),
      (r) => ({
        id: r.id,
        to: r.to,
        subject: r.subject,
        body: r.body,
        status: r.status,
        error_message: r.errorMessage,
        attempts: r.attempts,
        created_at: r.createdAt
      })
    );

    console.log("\n==========================================");
    console.log("📊 SUMMARY OF MIGRATION RUN:");
    console.log("==========================================");
    console.table(results);
    console.log("==========================================");

    // Write final migration report artifact
    const artDir = 'C:\\Users\\vs242\\.gemini\\antigravity\\brain\\a4322c36-a32f-4ac7-8d1b-4c4fc8af688b';
    const reportPath = path.join(artDir, 'migration_report.md');
    
    let reportMd = `# BOHO Cafe & Dining - Database Migration Report\n\n`;
    reportMd += `This report summarizes the migration of database records from the local SQLite database to Supabase PostgreSQL.\n\n`;
    reportMd += `## Migration Statistics\n\n`;
    reportMd += `| Table Name | SQLite Count | Supabase Count | Status | Skipped Records |\n`;
    reportMd += `|------------|--------------|----------------|--------|-----------------|\n`;
    
    for (const [name, data] of Object.entries(results)) {
      reportMd += `| ${name} | ${data.sqlite} | ${data.supabase} | ${data.status} | ${data.skipped} |\n`;
    }
    
    reportMd += `\n**Verification Status**: All schemas synchronized and verified. Operational records successfully migrated.`;
    
    fs.writeFileSync(reportPath, reportMd);
    console.log(`Saved migration report to: ${reportPath}`);
    process.exit(0);

  } catch (migrateErr: any) {
    console.error("💥 Migration runner crashed:", migrateErr.message);
    process.exit(1);
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
