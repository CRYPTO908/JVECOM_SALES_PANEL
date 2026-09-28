-- ============================================================================
-- SalesOS Database Schema — Migration 004: Triggers
-- Automated business logic triggers and timestamp maintenance
-- ============================================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all relevant tables
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'organizations',
    'organization_settings',
    'profiles',
    'teams',
    'products',
    'customers',
    'leads',
    'follow_ups',
    'sales',
    'targets',
    'xp_rules',
    'levels',
    'achievements',
    'commission_rules',
    'commission_records',
    'bonus_rules',
    'bonus_records',
    'employee_invitations',
    'lead_sources'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trg_update_%I_updated_at ON %I;
      CREATE TRIGGER trg_update_%I_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    ', t, t, t, t);
  END LOOP;
END;
$$;

-- Trigger: Process sale qualification on payment status change to 'PAID'
CREATE OR REPLACE FUNCTION trg_handle_sale_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If payment status changed to PAID, qualify the sale
  IF NEW.payment_status = 'PAID' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'PAID') THEN
    PERFORM process_sale_qualification(NEW.id);
  END IF;

  -- If payment status changed to REFUNDED, process refund
  IF NEW.payment_status = 'REFUNDED' AND OLD.payment_status != 'REFUNDED' THEN
    PERFORM process_sale_refund(NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sale_status_change ON sales;
CREATE TRIGGER trg_sale_status_change
  AFTER UPDATE OF payment_status ON sales
  FOR EACH ROW
  EXECUTE FUNCTION trg_handle_sale_status_change();

-- Trigger: Automatically handle new auth.users signup/invitation into profiles
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id UUID;
  v_role TEXT;
  v_first_name TEXT;
  v_last_name TEXT;
BEGIN
  v_org_id := (NEW.raw_user_meta_data->>'organization_id')::UUID;
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'SALES_REP');
  v_first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', 'New');
  v_last_name := COALESCE(NEW.raw_user_meta_data->>'last_name', 'User');

  IF v_org_id IS NOT NULL THEN
    INSERT INTO profiles (
      id,
      organization_id,
      first_name,
      last_name,
      email,
      role,
      status
    ) VALUES (
      NEW.id,
      v_org_id,
      v_first_name,
      v_last_name,
      NEW.email,
      v_role,
      'ACTIVE'
    )
    ON CONFLICT (id) DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      role = EXCLUDED.role,
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
