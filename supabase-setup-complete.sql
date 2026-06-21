-- =====================================================================
-- BOHO Cafe & Lounge — Unified PostgreSQL Database Architecture
-- Matches Prisma models exactly for production-ready Supabase migration
-- =====================================================================

-- 1. Helper function for updating timestamps automatically
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Branches Table
CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  email TEXT NOT NULL,
  opening_hours TEXT NOT NULL, -- JSON stringified array
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TRIGGER set_timestamp_branches
BEFORE UPDATE ON branches
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- 3. Seating Tables Table
CREATE TABLE IF NOT EXISTS tables (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'AVAILABLE', -- AVAILABLE, OCCUPIED, RESERVED
  x DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
  y DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
  branch_id TEXT REFERENCES branches(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TRIGGER set_timestamp_tables
BEFORE UPDATE ON tables
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- 4. Coupons Table
CREATE TABLE IF NOT EXISTS coupons (
  code TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- PERCENTAGE, FIXED, BOGO, WEEKEND, FESTIVAL
  value DOUBLE PRECISION NOT NULL,
  min_spend DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
  start_date TEXT NOT NULL, -- YYYY-MM-DD
  end_date TEXT NOT NULL, -- YYYY-MM-DD
  usage_limit INTEGER DEFAULT 100 NOT NULL,
  usage_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TRIGGER set_timestamp_coupons
BEFORE UPDATE ON coupons
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- 5. Reservations Table
CREATE TABLE IF NOT EXISTS reservations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  type TEXT NOT NULL, -- TABLE, BIRTHDAY, ANNIVERSARY, CORPORATE, FULL_CAFE
  booking_type TEXT DEFAULT 'TABLE' NOT NULL,
  table_number INTEGER,
  table_capacity INTEGER,
  guest_count INTEGER DEFAULT 0 NOT NULL,
  reservation_date TEXT NOT NULL, -- YYYY-MM-DD
  start_time TEXT NOT NULL, -- HH:MM
  end_time TEXT NOT NULL, -- HH:MM
  booking_status TEXT DEFAULT 'PENDING' NOT NULL, -- HELD, PENDING, CONFIRMED, ARRIVED, COMPLETED, REJECTED, CANCELLED, NO_SHOW
  special_requests TEXT,
  approval_status TEXT DEFAULT 'PENDING' NOT NULL, -- PENDING, APPROVED, REJECTED
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  is_full_cafe_booking BOOLEAN DEFAULT false NOT NULL,
  held_until TIMESTAMPTZ,
  session_id TEXT,
  
  -- Duplicate columns used by various legacy parts of the codebase
  date TEXT NOT NULL, -- YYYY-MM-DD
  time TEXT NOT NULL, -- HH:MM
  guests INTEGER NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'PENDING_APPROVAL' NOT NULL, -- PENDING_APPROVAL, APPROVED, REJECTED, ARRIVED, COMPLETED, CANCELLED
  payment_status TEXT DEFAULT 'PENDING' NOT NULL, -- PENDING, PAID
  payment_id TEXT,
  payment_amount DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
  payment_gateway TEXT, -- STRIPE, RAZORPAY, PAYTM, UPI
  
  branch_id TEXT REFERENCES branches(id) ON DELETE CASCADE NOT NULL,
  coupon_code TEXT REFERENCES coupons(code) ON DELETE SET NULL,
  points_awarded INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TRIGGER set_timestamp_reservations
BEFORE UPDATE ON reservations
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- 6. Waitlist Table
CREATE TABLE IF NOT EXISTS waitlist (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  guests INTEGER NOT NULL,
  date TEXT NOT NULL, -- YYYY-MM-DD
  time_slot TEXT NOT NULL, -- HH:MM
  status TEXT DEFAULT 'WAITING' NOT NULL, -- WAITING, NOTIFIED, CONVERTED, CANCELLED
  branch_id TEXT REFERENCES branches(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TRIGGER set_timestamp_waitlist
BEFORE UPDATE ON waitlist
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- 7. Customers Table
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  visit_count INTEGER DEFAULT 0 NOT NULL,
  total_spent DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
  points INTEGER DEFAULT 0 NOT NULL,
  vip_status BOOLEAN DEFAULT false NOT NULL,
  membership_tier TEXT DEFAULT 'Bronze' NOT NULL, -- Bronze, Silver, Gold, Platinum
  birthday TEXT, -- MM-DD format
  notes TEXT,
  preferred_table INTEGER,
  dietary_restrictions TEXT,
  average_group_size DOUBLE PRECISION DEFAULT 2.0 NOT NULL,
  last_visit_date TEXT,
  referred_by TEXT,
  referral_code TEXT UNIQUE,
  otp_code TEXT,
  otp_expires TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TRIGGER set_timestamp_customers
BEFORE UPDATE ON customers
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- 8. Customer Favorites Junction Table
CREATE TABLE IF NOT EXISTS customer_favorites (
  id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  item_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (customer_id, item_id)
);

-- 9. Staff Table (Aligns with Prisma Staff)
CREATE TABLE IF NOT EXISTS staff (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL, -- OWNER, MANAGER, STAFF
  pin TEXT NOT NULL, -- Hashed PIN or password
  login_method TEXT DEFAULT 'PIN' NOT NULL, -- PIN or PASSWORD
  status TEXT DEFAULT 'ACTIVE' NOT NULL, -- ACTIVE, INACTIVE, SUSPENDED
  branch_id TEXT REFERENCES branches(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TRIGGER set_timestamp_staff
BEFORE UPDATE ON staff
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- 10. Staff Profiles Table (Aligned with Supabase Auth schema. Mapped via user_id -> auth.users.id)
CREATE TABLE IF NOT EXISTS staff_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE, -- Mapped to Supabase auth.users.id
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('OWNER', 'MANAGER', 'STAFF')),
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')) DEFAULT 'ACTIVE',
  pin TEXT, -- Allows auth PIN mapping
  login_method TEXT DEFAULT 'PIN' NOT NULL,
  branch_id TEXT, -- Branch ID string
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TRIGGER set_timestamp_staff_profiles
BEFORE UPDATE ON staff_profiles
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- Role escalation and account tampering prevention trigger on staff_profiles
CREATE OR REPLACE FUNCTION check_staff_profile_update()
RETURNS TRIGGER AS $$
BEGIN
  IF CURRENT_SETTING('role') = 'authenticated' THEN
    IF NEW.role IS DISTINCT FROM OLD.role OR NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Unauthorized: You cannot modify staff roles or status fields.';
    END IF;
    IF NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.email IS DISTINCT FROM OLD.email THEN
      RAISE EXCEPTION 'Unauthorized: Identity mappings (email and user_id) cannot be modified.';
    END IF;
    IF OLD.user_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Unauthorized: You can only modify your own staff profile details.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_profile_security
BEFORE UPDATE ON staff_profiles
FOR EACH ROW EXECUTE FUNCTION check_staff_profile_update();

-- 11. CMS Settings Configuration Table
CREATE TABLE IF NOT EXISTS cms_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL -- JSON string
);

-- 12. Blocked Dates Table
CREATE TABLE IF NOT EXISTS blocked_dates (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL, -- YYYY-MM-DD
  start_time TEXT, -- HH:MM (null = full day)
  end_time TEXT, -- HH:MM (null = full day)
  reason TEXT,
  type TEXT DEFAULT 'HOLIDAY' NOT NULL, -- HOLIDAY, PRIVATE_EVENT, MAINTENANCE
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (date, start_time, end_time)
);

-- 13. Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  table_number INTEGER,
  status TEXT DEFAULT 'PENDING' NOT NULL, -- PENDING, PREPARING, READY, SERVED, COMPLETED, CANCELLED
  total_amount DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
  reservation_id TEXT REFERENCES reservations(id) ON DELETE SET NULL,
  branch_id TEXT DEFAULT 'downtown' NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TRIGGER set_timestamp_orders
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- 14. Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price DOUBLE PRECISION NOT NULL
);

-- 15. Payments Table
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  reservation_id TEXT REFERENCES reservations(id) ON DELETE SET NULL,
  amount DOUBLE PRECISION NOT NULL,
  status TEXT DEFAULT 'PENDING' NOT NULL, -- PENDING, SUCCESS, FAILED, REFUNDED
  gateway TEXT NOT NULL, -- STRIPE, RAZORPAY, PAYTM, UPI
  transaction_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TRIGGER set_timestamp_payments
BEFORE UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- 16. Reward Redemptions Table
CREATE TABLE IF NOT EXISTS reward_redemptions (
  id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  reward_name TEXT NOT NULL,
  points_burned INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 17. QR Scan Logs Table
CREATE TABLE IF NOT EXISTS qr_scan_logs (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL,
  table_number TEXT NOT NULL,
  scanned_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 18. Inventory Items Table
CREATE TABLE IF NOT EXISTS inventory_items (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL, -- BEVERAGE, INGREDIENT, DRY_GOODS
  quantity DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
  unit TEXT NOT NULL, -- KG, LITER, PCS, BOX
  min_threshold DOUBLE PRECISION DEFAULT 5.0 NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TRIGGER set_timestamp_inventory_items
BEFORE UPDATE ON inventory_items
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- 19. Inbox Notifications Table (Prisma Notification model)
CREATE TABLE IF NOT EXISTS inbox_notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL, -- staff email or role
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- INFO, WARNING, SUCCESS
  is_read BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 20. Audit Logs Table (Strictly INSERT-only, no updates or deletes)
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_email TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT NOT NULL,
  target_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 21. Leads Table
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  type TEXT NOT NULL, -- RESERVATION, EVENT, CORPORATE, CONTACT
  source TEXT NOT NULL, -- Website, WhatsApp, Direct
  notes TEXT,
  status TEXT DEFAULT 'NEW' NOT NULL, -- NEW, CONTACTED, RESERVED, LOST
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Prevent audit log modifications
CREATE OR REPLACE FUNCTION block_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit and activity logs are read-only. Updates and deletions are strictly forbidden.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER block_update_delete_audit_logs
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION block_audit_log_mutation();

-- =====================================================================
-- INDEX CONFIGURATIONS (Query Optimization)
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_reservations_date_status ON reservations(branch_id, reservation_date, booking_status);
CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(reservation_date);
CREATE INDEX IF NOT EXISTS idx_tables_branch ON tables(branch_id);
CREATE INDEX IF NOT EXISTS idx_orders_reservation ON orders(reservation_id);
CREATE INDEX IF NOT EXISTS idx_orders_branch ON orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_reservation ON payments(reservation_id);
CREATE INDEX IF NOT EXISTS idx_customer_favorites_cust ON customer_favorites(customer_id);

-- =====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================

-- Enable RLS on all tables
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_scan_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- 1. Public Access Policies (Anon access for customers)
CREATE POLICY "Allow public SELECT on branches" ON branches FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public SELECT on tables" ON tables FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public SELECT on coupons" ON coupons FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public INSERT on reservations" ON reservations FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow public INSERT on waitlist" ON waitlist FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow public SELECT on blocked dates" ON blocked_dates FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public INSERT on qr_scan_logs" ON qr_scan_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow public INSERT on leads" ON leads FOR INSERT TO anon, authenticated WITH CHECK (true);

-- 2. Staff Profiles (Authenticated Access)
CREATE POLICY "Allow staff SELECT on profiles" ON staff_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow staff UPDATE on own profile" ON staff_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 3. Administrative Access Policies (Full access to all operational data for staff)
CREATE POLICY "Allow staff CRUD on branches" ON branches FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow staff CRUD on tables" ON tables FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow staff CRUD on coupons" ON coupons FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow staff CRUD on reservations" ON reservations FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow staff CRUD on waitlist" ON waitlist FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow staff CRUD on customers" ON customers FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow staff CRUD on customer_favorites" ON customer_favorites FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow staff CRUD on staff" ON staff FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow staff CRUD on cms_config" ON cms_config FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow staff CRUD on blocked_dates" ON blocked_dates FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow staff CRUD on orders" ON orders FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow staff CRUD on order_items" ON order_items FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow staff CRUD on payments" ON payments FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow staff CRUD on reward_redemptions" ON reward_redemptions FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow staff CRUD on qr_scan_logs" ON qr_scan_logs FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow staff CRUD on inventory_items" ON inventory_items FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow staff CRUD on inbox_notifications" ON inbox_notifications FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow staff SELECT on audit_logs" ON audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow staff INSERT on audit_logs" ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow staff CRUD on leads" ON leads FOR ALL TO authenticated USING (true);
