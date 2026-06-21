-- =====================================================================
-- Boho Cafe & Lounge — Complete PostgreSQL Database Architecture
-- =====================================================================

-- 1. Helper function for updating modtime columns automatically
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Staff Profiles Table
CREATE TABLE IF NOT EXISTS staff_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE, -- Mapped to Supabase auth.users.id
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('OWNER', 'MANAGER')),
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')) DEFAULT 'ACTIVE',
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TRIGGER set_timestamp_staff_profiles
BEFORE UPDATE ON staff_profiles
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- Role escalation and account tampering prevention trigger
CREATE OR REPLACE FUNCTION check_staff_profile_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if updated by a regular authenticated public user (not service_role)
  IF CURRENT_SETTING('role') = 'authenticated' THEN
    -- Prevent modification of role or status
    IF NEW.role IS DISTINCT FROM OLD.role OR NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Unauthorized: You cannot modify staff roles or status fields.';
    END IF;
    
    -- Prevent changing identity email or user_id mapping
    IF NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.email IS DISTINCT FROM OLD.email THEN
      RAISE EXCEPTION 'Unauthorized: Identity mappings (email and user_id) cannot be modified.';
    END IF;
    
    -- Ensure user can only update their own profile
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

-- 3. Reservations Table
CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  date TEXT NOT NULL, -- YYYY-MM-DD
  time TEXT NOT NULL, -- HH:MM
  guest_count INTEGER NOT NULL,
  occasion TEXT,
  special_requests TEXT,
  status TEXT NOT NULL CHECK (status IN ('HELD', 'PENDING', 'CONFIRMED', 'ARRIVED', 'COMPLETED', 'REJECTED', 'CANCELLED', 'NO_SHOW')) DEFAULT 'PENDING',
  booking_type TEXT NOT NULL CHECK (booking_type IN ('TABLE', 'EVENT')) DEFAULT 'TABLE',
  table_number INTEGER,
  table_capacity INTEGER,
  reservation_date TEXT NOT NULL, -- YYYY-MM-DD
  start_time TEXT NOT NULL, -- HH:MM
  end_time TEXT NOT NULL, -- HH:MM
  booking_status TEXT NOT NULL CHECK (booking_status IN ('HELD', 'PENDING', 'CONFIRMED', 'ARRIVED', 'COMPLETED', 'REJECTED', 'CANCELLED', 'NO_SHOW')) DEFAULT 'PENDING',
  approval_status TEXT NOT NULL CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED')) DEFAULT 'PENDING',
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  is_full_cafe BOOLEAN DEFAULT false NOT NULL,
  is_full_cafe_booking BOOLEAN DEFAULT false NOT NULL,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  event_type TEXT,
  event_details JSONB,
  reminder_24h_sent BOOLEAN DEFAULT false NOT NULL,
  reminder_2h_sent BOOLEAN DEFAULT false NOT NULL,
  held_until TIMESTAMPTZ,
  session_id TEXT,
  arrived_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  no_show_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TRIGGER set_timestamp_reservations
BEFORE UPDATE ON reservations
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- 4. Waitlist Table
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  notified BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 5. Menu Items Table
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  description TEXT,
  is_available BOOLEAN DEFAULT true NOT NULL,
  is_veg BOOLEAN DEFAULT false NOT NULL,
  is_popular BOOLEAN DEFAULT false NOT NULL,
  image_url TEXT,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  is_deleted BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TRIGGER set_timestamp_menu_items
BEFORE UPDATE ON menu_items
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- 6. Blocked Dates Table
CREATE TABLE IF NOT EXISTS blocked_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date TEXT NOT NULL, -- YYYY-MM-DD
  start_time TEXT, -- HH:MM (null = full day)
  end_time TEXT, -- HH:MM (null = full day)
  reason TEXT,
  type TEXT CHECK (type IN ('HOLIDAY', 'PRIVATE_EVENT', 'MAINTENANCE')) DEFAULT 'HOLIDAY',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (date, start_time, end_time)
);

-- 7. Customer Notes Table
CREATE TABLE IF NOT EXISTS customer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_email TEXT NOT NULL,
  note TEXT NOT NULL,
  is_vip_flag BOOLEAN DEFAULT false NOT NULL,
  staff_name TEXT NOT NULL,
  staff_role TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 8. Audit Logs Table (Strictly INSERT-only, no updates or deletes)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_email TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT,
  target_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 9. Newsletter Subscribers Table
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('SUBSCRIBED', 'UNSUBSCRIBED')) DEFAULT 'SUBSCRIBED',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 10a. Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_number INTEGER,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'PREPARING', 'SERVED', 'COMPLETED', 'CANCELLED')) DEFAULT 'PENDING',
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 10b. Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL
);

-- 10. Payments Table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'INR' NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED')) DEFAULT 'PENDING',
  payment_gateway TEXT NOT NULL CHECK (payment_gateway IN ('STRIPE', 'RAZORPAY', 'UPI', 'PAYTM')),
  gateway_transaction_id TEXT,
  refunded_amount DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TRIGGER set_timestamp_payments
BEFORE UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- 11. Coupons Table
CREATE TABLE IF NOT EXISTS coupons (
  code TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('PERCENTAGE', 'FIXED', 'BOGO', 'WEEKEND', 'FESTIVAL')),
  value DECIMAL(10, 2) NOT NULL,
  min_spend DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  usage_limit INTEGER DEFAULT 100 NOT NULL,
  usage_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 12. Loyalty Points Table
CREATE TABLE IF NOT EXISTS loyalty_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_email TEXT UNIQUE NOT NULL,
  points_balance INTEGER DEFAULT 0 NOT NULL,
  total_earned INTEGER DEFAULT 0 NOT NULL,
  total_redeemed INTEGER DEFAULT 0 NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TRIGGER set_timestamp_loyalty_points
BEFORE UPDATE ON loyalty_points
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- 13. Gift Cards Table
CREATE TABLE IF NOT EXISTS gift_cards (
  code TEXT PRIMARY KEY,
  balance DECIMAL(10, 2) NOT NULL,
  original_value DECIMAL(10, 2) NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  expiry_date TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 14. Reviews Table
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  text TEXT,
  sentiment TEXT CHECK (sentiment IN ('POSITIVE', 'NEUTRAL', 'NEGATIVE')),
  is_google_review BOOLEAN DEFAULT false NOT NULL,
  google_author_avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 15. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('EMAIL', 'WHATSAPP')),
  template TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'SENT', 'FAILED')) DEFAULT 'PENDING',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 16. Settings Table
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TRIGGER set_timestamp_settings
BEFORE UPDATE ON settings
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- 17. Activity Logs Table (Strictly INSERT-only, no updates or deletes)
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 19. Customers Table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  visit_count INTEGER DEFAULT 0 NOT NULL,
  total_spent DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
  points INTEGER DEFAULT 0 NOT NULL,
  vip_status BOOLEAN DEFAULT false NOT NULL,
  membership_tier TEXT DEFAULT 'Bronze' CHECK (membership_tier IN ('Bronze', 'Silver', 'Gold', 'Platinum')),
  birthday TEXT, -- MM-DD
  notes TEXT,
  preferred_table INTEGER,
  dietary_restrictions TEXT,
  average_group_size DECIMAL(4, 2) DEFAULT 2.00,
  last_visit_date TEXT,
  referred_by TEXT,
  referral_code TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 20. Reward Redemptions Table
CREATE TABLE IF NOT EXISTS reward_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  reward_name TEXT NOT NULL,
  points_burned INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 21. QR Scan Logs Table
CREATE TABLE IF NOT EXISTS qr_scan_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id TEXT NOT NULL,
  table_number TEXT NOT NULL,
  scanned_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 22. Inventory Items Table
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('BEVERAGE', 'INGREDIENT', 'DRY_GOODS')),
  quantity DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
  unit TEXT NOT NULL, -- KG, LITER, PCS, BOX
  min_threshold DECIMAL(10, 2) DEFAULT 5.00 NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 23. Inbox Notifications Table
CREATE TABLE IF NOT EXISTS inbox_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL, -- staff email or role
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('INFO', 'WARNING', 'SUCCESS')),
  is_read BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 18. Audit log modification prevention
CREATE OR REPLACE FUNCTION block_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit and activity logs are read-only. Updates and deletions are strictly forbidden.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS block_update_delete_audit_logs ON audit_logs;
CREATE TRIGGER block_update_delete_audit_logs
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION block_audit_log_mutation();

DROP TRIGGER IF EXISTS block_update_delete_activity_logs ON activity_logs;
CREATE TRIGGER block_update_delete_activity_logs
BEFORE UPDATE OR DELETE ON activity_logs
FOR EACH ROW EXECUTE FUNCTION block_audit_log_mutation();

-- =====================================================================
-- INDEX CONFIGURATIONS (Query Optimization)
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(date);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_held_until ON reservations(held_until);
CREATE INDEX IF NOT EXISTS idx_reservations_reservation_date ON reservations(reservation_date);
CREATE INDEX IF NOT EXISTS idx_reservations_booking_status ON reservations(booking_status);
CREATE INDEX IF NOT EXISTS idx_reservations_table_number ON reservations(table_number);
CREATE INDEX IF NOT EXISTS idx_reservations_approval_status ON reservations(approval_status);
CREATE INDEX IF NOT EXISTS idx_waitlist_date ON waitlist(date);
CREATE INDEX IF NOT EXISTS idx_customer_notes_email ON customer_notes(customer_email);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_email);
CREATE INDEX IF NOT EXISTS idx_activity_logs_category ON activity_logs(category);

-- =====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================

-- Enable RLS on all tables
ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_scan_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_notifications ENABLE ROW LEVEL SECURITY;

-- 1. Policies for public tables (Anon select/insert access - NO PII exposure)
CREATE POLICY "Allow public SELECT on menu" ON menu_items FOR SELECT TO anon, authenticated USING (is_deleted = false);
CREATE POLICY "Allow public SELECT on blocked dates" ON blocked_dates FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public INSERT on reservations" ON reservations FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow public INSERT on waitlist" ON waitlist FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow public INSERT on newsletter" ON newsletter_subscribers FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow public SELECT on reviews" ON reviews FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public SELECT on settings" ON settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public INSERT on qr_scan_logs" ON qr_scan_logs FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Note: Customer PII is protected. Anon visitors cannot directly SELECT reservations.
-- Any status tracking query must be routed via a secure backend Route API.

-- 2. Policies for administrative tables (Authenticated staff access)
CREATE POLICY "Allow staff SELECT on reservations" ON reservations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow staff CRUD on reservations" ON reservations FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow staff SELECT on profiles" ON staff_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow staff UPDATE on own profile" ON staff_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Allow staff SELECT on customer_notes" ON customer_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow staff WRITE on customer_notes" ON customer_notes FOR INSERT, UPDATE TO authenticated WITH CHECK (true);

CREATE POLICY "Allow staff SELECT on audit_logs" ON audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow staff INSERT on audit_logs" ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow staff SELECT on activity_logs" ON activity_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow staff INSERT on activity_logs" ON activity_logs FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow staff SELECT on newsletter" ON newsletter_subscribers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow staff SELECT on payments" ON payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow staff SELECT on coupons" ON coupons FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow staff SELECT on loyalty" ON loyalty_points FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow staff SELECT on gift_cards" ON gift_cards FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow staff SELECT on notifications" ON notifications FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow staff CRUD on customers" ON customers FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow staff CRUD on orders" ON orders FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow staff CRUD on order_items" ON order_items FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow staff CRUD on reward_redemptions" ON reward_redemptions FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow staff CRUD on qr_scan_logs" ON qr_scan_logs FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow staff CRUD on inventory_items" ON inventory_items FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow staff CRUD on inbox_notifications" ON inbox_notifications FOR ALL TO authenticated USING (true);

-- Operations that mutate sensitive financial configurations (coupons, settings, payments)
-- do not have public or authenticated write policies. They must run securely server-side
-- via the service-role client (supabaseAdmin) to prevent client-side overrides.
