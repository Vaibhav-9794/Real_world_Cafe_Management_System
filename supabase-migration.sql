-- =====================================================================
-- Boho Cafe & Lounge — Schema Setup Log & Migration Registry
-- =====================================================================

-- Migration ID: 20260620_001_initial_schema
-- Target Provider: Supabase PostgreSQL (15+)
-- Date Executed: 2026-06-20
-- Status: REGISTERED

-- [CHANGELOG]
-- 1. Helper function trigger_set_timestamp created.
-- 2. Core tables initialized:
--    - staff_profiles
--    - reservations
--    - waitlist
--    - menu_items
--    - blocked_dates
--    - customer_notes
--    - audit_logs
--    - newsletter_subscribers
-- 3. Production addition tables initialized:
--    - payments
--    - coupons
--    - loyalty_points
--    - gift_cards
--    - reviews
--    - notifications
--    - settings
--    - activity_logs
-- 4. Automatically synchronizing trigger handlers bound to:
--    - staff_profiles
--    - reservations
--    - menu_items
--    - payments
--    - loyalty_points
--    - settings
-- 5. Standard indices configured for date, status, held_until, and category lookups.
-- 6. Row Level Security policies created for public access (Anon INSERT/SELECT)
--    and staff admin operations (Authenticated ALL access).

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  executed_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

INSERT INTO schema_migrations (version, description)
VALUES ('20260620_001_initial_schema', 'Initial database tables, indices, triggers, and RLS policies from platform blueprint.')
ON CONFLICT (version) DO NOTHING;
