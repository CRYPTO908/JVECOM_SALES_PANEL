-- ============================================================================
-- SalesOS Database Schema — Migration 001
-- Complete normalized PostgreSQL schema for multi-tenant SaaS
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. Organizations
-- ============================================================================
CREATE TABLE organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  industry TEXT,
  country TEXT NOT NULL DEFAULT 'India',
  currency TEXT NOT NULL DEFAULT 'INR',
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  address TEXT,
  website TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'TRIAL')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 2. Organization Settings
-- ============================================================================
CREATE TABLE organization_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  setting_key TEXT NOT NULL,
  setting_value JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, setting_key)
);

-- ============================================================================
-- 3. Profiles (linked to auth.users)
-- ============================================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  username TEXT,
  employee_id TEXT,
  role TEXT NOT NULL DEFAULT 'SALES_REP' CHECK (role IN ('SUPER_ADMIN', 'ORG_ADMIN', 'MANAGER', 'SALES_REP')),
  team_id UUID,
  manager_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  avatar_url TEXT,
  joining_date DATE,
  status TEXT NOT NULL DEFAULT 'INVITED' CHECK (status IN ('ACTIVE', 'INACTIVE', 'INVITED', 'SUSPENDED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_org ON profiles(organization_id);
CREATE INDEX idx_profiles_team ON profiles(team_id);
CREATE INDEX idx_profiles_manager ON profiles(manager_id);
CREATE INDEX idx_profiles_role ON profiles(organization_id, role);
CREATE INDEX idx_profiles_status ON profiles(organization_id, status);
CREATE UNIQUE INDEX idx_profiles_email ON profiles(email);
CREATE UNIQUE INDEX idx_profiles_employee_id ON profiles(organization_id, employee_id) WHERE employee_id IS NOT NULL;

-- ============================================================================
-- 4. Teams
-- ============================================================================
CREATE TABLE teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  manager_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

CREATE INDEX idx_teams_org ON teams(organization_id);
CREATE INDEX idx_teams_manager ON teams(manager_id);

-- Add FK from profiles to teams (deferred because of circular dep)
ALTER TABLE profiles ADD CONSTRAINT fk_profiles_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL;

-- ============================================================================
-- 5. Team Members (history tracking)
-- ============================================================================
CREATE TABLE team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_team_members_org ON team_members(organization_id);
CREATE INDEX idx_team_members_team ON team_members(team_id);
CREATE INDEX idx_team_members_user ON team_members(user_id);
CREATE INDEX idx_team_members_active ON team_members(team_id, user_id) WHERE left_at IS NULL;

-- ============================================================================
-- 6. Products
-- ============================================================================
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT,
  category TEXT,
  description TEXT,
  image_url TEXT,
  cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  selling_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED', 'DRAFT')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_org ON products(organization_id);
CREATE INDEX idx_products_status ON products(organization_id, status);
CREATE UNIQUE INDEX idx_products_sku ON products(organization_id, sku) WHERE sku IS NOT NULL;

-- ============================================================================
-- 7. Customers
-- ============================================================================
CREATE TABLE customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  lead_source TEXT,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'LEAD' CHECK (status IN ('LEAD', 'PROSPECT', 'CUSTOMER', 'LOST')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customers_org ON customers(organization_id);
CREATE INDEX idx_customers_status ON customers(organization_id, status);
CREATE INDEX idx_customers_assigned ON customers(assigned_to);
CREATE INDEX idx_customers_email ON customers(organization_id, email) WHERE email IS NOT NULL;

-- ============================================================================
-- 8. Lead Sources (configurable per org)
-- ============================================================================
CREATE TABLE lead_sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

CREATE INDEX idx_lead_sources_org ON lead_sources(organization_id);

-- ============================================================================
-- 9. Leads
-- ============================================================================
CREATE TABLE leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  lead_source_id UUID REFERENCES lead_sources(id) ON DELETE SET NULL,
  lead_source TEXT,
  expected_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  probability NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
  expected_close_date DATE,
  stage TEXT NOT NULL DEFAULT 'NEW' CHECK (stage IN ('NEW', 'CONTACTED', 'QUALIFIED', 'DEMO', 'NEGOTIATION', 'WON', 'LOST')),
  next_follow_up_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_org ON leads(organization_id);
CREATE INDEX idx_leads_stage ON leads(organization_id, stage);
CREATE INDEX idx_leads_assigned ON leads(assigned_to);
CREATE INDEX idx_leads_customer ON leads(customer_id);
CREATE INDEX idx_leads_product ON leads(product_id);
CREATE INDEX idx_leads_follow_up ON leads(next_follow_up_date) WHERE next_follow_up_date IS NOT NULL;

-- ============================================================================
-- 10. Lead Activities
-- ============================================================================
CREATE TABLE lead_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('CALL', 'EMAIL', 'WHATSAPP', 'MEETING', 'DEMO', 'NOTE', 'FOLLOW_UP')),
  description TEXT,
  outcome TEXT,
  activity_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_activities_org ON lead_activities(organization_id);
CREATE INDEX idx_lead_activities_lead ON lead_activities(lead_id);
CREATE INDEX idx_lead_activities_user ON lead_activities(user_id);

-- ============================================================================
-- 11. Follow-ups
-- ============================================================================
CREATE TABLE follow_ups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  due_date DATE NOT NULL,
  due_time TIME,
  reminder BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'RESCHEDULED', 'CANCELLED')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_follow_ups_org ON follow_ups(organization_id);
CREATE INDEX idx_follow_ups_user ON follow_ups(user_id);
CREATE INDEX idx_follow_ups_due ON follow_ups(user_id, due_date) WHERE status = 'PENDING';
CREATE INDEX idx_follow_ups_lead ON follow_ups(lead_id);

-- ============================================================================
-- 12. Sales
-- ============================================================================
CREATE TABLE sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax NUMERIC(14,2) NOT NULL DEFAULT 0,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PAID', 'REFUNDED', 'CANCELLED')),
  payment_method TEXT CHECK (payment_method IN ('CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'ONLINE_PAYMENT', 'OTHER')),
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sales_org ON sales(organization_id);
CREATE INDEX idx_sales_user ON sales(user_id);
CREATE INDEX idx_sales_customer ON sales(customer_id);
CREATE INDEX idx_sales_team ON sales(team_id);
CREATE INDEX idx_sales_date ON sales(organization_id, sale_date);
CREATE INDEX idx_sales_payment ON sales(organization_id, payment_status);
CREATE INDEX idx_sales_qualifying ON sales(organization_id, payment_status, sale_date) WHERE payment_status = 'PAID';

-- ============================================================================
-- 13. Sale Items
-- ============================================================================
CREATE TABLE sale_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sale_items_org ON sale_items(organization_id);
CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product ON sale_items(product_id);

-- ============================================================================
-- 14. Targets
-- ============================================================================
CREATE TABLE targets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('SALES_COUNT', 'REVENUE', 'PRODUCT_QUANTITY', 'PRODUCT_REVENUE')),
  scope TEXT NOT NULL CHECK (scope IN ('INDIVIDUAL', 'TEAM', 'ORGANIZATION')),
  period TEXT NOT NULL CHECK (period IN ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM')),
  target_value NUMERIC(14,2) NOT NULL CHECK (target_value > 0),
  current_value NUMERIC(14,2) NOT NULL DEFAULT 0,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (period_end >= period_start)
);

CREATE INDEX idx_targets_org ON targets(organization_id);
CREATE INDEX idx_targets_user ON targets(user_id);
CREATE INDEX idx_targets_team ON targets(team_id);
CREATE INDEX idx_targets_period ON targets(organization_id, period_start, period_end);
CREATE INDEX idx_targets_active ON targets(organization_id, is_active) WHERE is_active = true;

-- ============================================================================
-- 15. Target Milestones
-- ============================================================================
CREATE TABLE target_milestones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES targets(id) ON DELETE CASCADE,
  percentage INTEGER NOT NULL CHECK (percentage > 0),
  reached_at TIMESTAMPTZ,
  notified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (target_id, percentage)
);

CREATE INDEX idx_target_milestones_target ON target_milestones(target_id);

-- ============================================================================
-- 16. XP Rules
-- ============================================================================
CREATE TABLE xp_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  action TEXT NOT NULL,
  condition_type TEXT,
  condition_value TEXT,
  reward_points INTEGER NOT NULL CHECK (reward_points > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_xp_rules_org ON xp_rules(organization_id);
CREATE INDEX idx_xp_rules_action ON xp_rules(organization_id, action) WHERE is_active = true;

-- ============================================================================
-- 17. XP Transactions
-- ============================================================================
CREATE TABLE xp_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('SALE', 'REVENUE', 'TARGET_ACHIEVEMENT', 'ACHIEVEMENT', 'MILESTONE', 'MANUAL')),
  source_id UUID,
  rule_id UUID REFERENCES xp_rules(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  reversed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_xp_transactions_org ON xp_transactions(organization_id);
CREATE INDEX idx_xp_transactions_user ON xp_transactions(user_id);
CREATE INDEX idx_xp_transactions_source ON xp_transactions(source_type, source_id);
CREATE INDEX idx_xp_transactions_active ON xp_transactions(user_id) WHERE reversed_at IS NULL;

-- Prevent duplicate XP for same source event
CREATE UNIQUE INDEX idx_xp_transactions_unique_source ON xp_transactions(user_id, source_type, source_id, rule_id) 
  WHERE source_id IS NOT NULL AND reversed_at IS NULL;

-- ============================================================================
-- 18. Levels
-- ============================================================================
CREATE TABLE levels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  level_order INTEGER NOT NULL,
  min_xp INTEGER NOT NULL DEFAULT 0,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, level_order)
);

CREATE INDEX idx_levels_org ON levels(organization_id);

-- ============================================================================
-- 19. Achievements
-- ============================================================================
CREATE TABLE achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  xp_reward INTEGER NOT NULL DEFAULT 0,
  condition_type TEXT NOT NULL,
  condition_value NUMERIC(14,2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_achievements_org ON achievements(organization_id);

-- ============================================================================
-- 20. User Achievements
-- ============================================================================
CREATE TABLE user_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_org ON user_achievements(organization_id);
CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);

-- ============================================================================
-- 21. Commission Rules
-- ============================================================================
CREATE TABLE commission_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('PERCENTAGE', 'FIXED', 'TIERED')),
  rate NUMERIC(10,4) NOT NULL DEFAULT 0,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  tier_min NUMERIC(14,2),
  tier_max NUMERIC(14,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_commission_rules_org ON commission_rules(organization_id);
CREATE INDEX idx_commission_rules_product ON commission_rules(product_id);
CREATE INDEX idx_commission_rules_active ON commission_rules(organization_id) WHERE is_active = true;

-- ============================================================================
-- 22. Commission Records
-- ============================================================================
CREATE TABLE commission_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES commission_rules(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  base_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  commission_rate NUMERIC(10,4) NOT NULL DEFAULT 0,
  commission_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'PAID', 'REVERSED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_commission_records_org ON commission_records(organization_id);
CREATE INDEX idx_commission_records_user ON commission_records(user_id);
CREATE INDEX idx_commission_records_sale ON commission_records(sale_id);
CREATE INDEX idx_commission_records_status ON commission_records(organization_id, status);

-- Prevent duplicate commission for same sale+rule
CREATE UNIQUE INDEX idx_commission_unique ON commission_records(sale_id, rule_id) WHERE status != 'REVERSED';

-- ============================================================================
-- 23. Bonus Rules
-- ============================================================================
CREATE TABLE bonus_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  condition_type TEXT NOT NULL CHECK (condition_type IN ('SALES_COUNT', 'REVENUE', 'TARGET_ACHIEVEMENT', 'PRODUCT_SALES', 'TEAM_PERFORMANCE')),
  condition_value NUMERIC(14,2) NOT NULL,
  bonus_amount NUMERIC(14,2) NOT NULL CHECK (bonus_amount > 0),
  period TEXT NOT NULL DEFAULT 'MONTHLY' CHECK (period IN ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM')),
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bonus_rules_org ON bonus_rules(organization_id);
CREATE INDEX idx_bonus_rules_active ON bonus_rules(organization_id) WHERE is_active = true;

-- ============================================================================
-- 24. Bonus Records
-- ============================================================================
CREATE TABLE bonus_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES bonus_rules(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'PAID', 'REVERSED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bonus_records_org ON bonus_records(organization_id);
CREATE INDEX idx_bonus_records_user ON bonus_records(user_id);
CREATE INDEX idx_bonus_records_status ON bonus_records(organization_id, status);

-- Prevent duplicate bonus for same user+rule+period
CREATE UNIQUE INDEX idx_bonus_unique ON bonus_records(user_id, rule_id, period_start, period_end) WHERE status != 'REVERSED';

-- ============================================================================
-- 25. Notifications
-- ============================================================================
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  entity_type TEXT,
  entity_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE read = false;
CREATE INDEX idx_notifications_org ON notifications(organization_id);

-- ============================================================================
-- 26. Audit Logs
-- ============================================================================
CREATE TABLE audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_date ON audit_logs(organization_id, created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(organization_id, action);

-- ============================================================================
-- 27. Email Logs
-- ============================================================================
CREATE TABLE email_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  recipient TEXT NOT NULL,
  template TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_logs_org ON email_logs(organization_id);

-- ============================================================================
-- 28. Employee Invitations
-- ============================================================================
CREATE TABLE employee_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'SALES_REP' CHECK (role IN ('ORG_ADMIN', 'MANAGER', 'SALES_REP')),
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  manager_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  phone TEXT,
  employee_id_str TEXT,
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invitations_org ON employee_invitations(organization_id);
CREATE INDEX idx_invitations_token ON employee_invitations(token) WHERE status = 'PENDING';
CREATE INDEX idx_invitations_email ON employee_invitations(email);

-- ============================================================================
-- Auto-update updated_at trigger function
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT table_name FROM information_schema.columns
    WHERE column_name = 'updated_at' AND table_schema = 'public'
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trigger_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
      tbl
    );
  END LOOP;
END;
$$;
