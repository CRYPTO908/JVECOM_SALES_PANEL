-- ============================================================================
-- SalesOS PostgreSQL Functions — Migration 003
-- Server-side business logic functions (single source of truth)
-- ============================================================================

-- ============================================================================
-- Calculate total revenue for a user in a date range (qualifying sales only)
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_user_revenue(
  p_user_id UUID,
  p_org_id UUID,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
)
RETURNS NUMERIC AS $$
  SELECT COALESCE(SUM(total), 0)
  FROM sales
  WHERE organization_id = p_org_id
    AND user_id = p_user_id
    AND payment_status = 'PAID'
    AND (p_date_from IS NULL OR sale_date >= p_date_from)
    AND (p_date_to IS NULL OR sale_date <= p_date_to);
$$ LANGUAGE sql STABLE;

-- ============================================================================
-- Calculate total sales count for a user
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_user_sales_count(
  p_user_id UUID,
  p_org_id UUID,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM sales
  WHERE organization_id = p_org_id
    AND user_id = p_user_id
    AND payment_status = 'PAID'
    AND (p_date_from IS NULL OR sale_date >= p_date_from)
    AND (p_date_to IS NULL OR sale_date <= p_date_to);
$$ LANGUAGE sql STABLE;

-- ============================================================================
-- Calculate team revenue
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_team_revenue(
  p_team_id UUID,
  p_org_id UUID,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
)
RETURNS NUMERIC AS $$
  SELECT COALESCE(SUM(total), 0)
  FROM sales
  WHERE organization_id = p_org_id
    AND team_id = p_team_id
    AND payment_status = 'PAID'
    AND (p_date_from IS NULL OR sale_date >= p_date_from)
    AND (p_date_to IS NULL OR sale_date <= p_date_to);
$$ LANGUAGE sql STABLE;

-- ============================================================================
-- Calculate org-wide revenue
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_org_revenue(
  p_org_id UUID,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
)
RETURNS NUMERIC AS $$
  SELECT COALESCE(SUM(total), 0)
  FROM sales
  WHERE organization_id = p_org_id
    AND payment_status = 'PAID'
    AND (p_date_from IS NULL OR sale_date >= p_date_from)
    AND (p_date_to IS NULL OR sale_date <= p_date_to);
$$ LANGUAGE sql STABLE;

-- ============================================================================
-- Calculate org-wide sales count
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_org_sales_count(
  p_org_id UUID,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM sales
  WHERE organization_id = p_org_id
    AND payment_status = 'PAID'
    AND (p_date_from IS NULL OR sale_date >= p_date_from)
    AND (p_date_to IS NULL OR sale_date <= p_date_to);
$$ LANGUAGE sql STABLE;

-- ============================================================================
-- Calculate conversion rate (won leads / total leads excluding new)
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_conversion_rate(
  p_org_id UUID,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
)
RETURNS NUMERIC AS $$
DECLARE
  total_leads INTEGER;
  won_leads INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_leads
  FROM leads
  WHERE organization_id = p_org_id
    AND stage != 'NEW'
    AND (p_date_from IS NULL OR created_at::date >= p_date_from)
    AND (p_date_to IS NULL OR created_at::date <= p_date_to);

  SELECT COUNT(*) INTO won_leads
  FROM leads
  WHERE organization_id = p_org_id
    AND stage = 'WON'
    AND (p_date_from IS NULL OR created_at::date >= p_date_from)
    AND (p_date_to IS NULL OR created_at::date <= p_date_to);

  IF total_leads = 0 THEN RETURN 0; END IF;
  RETURN ROUND((won_leads::NUMERIC / total_leads::NUMERIC) * 100, 2);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- Calculate user XP (sum of non-reversed transactions)
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_user_xp(
  p_user_id UUID,
  p_org_id UUID
)
RETURNS INTEGER AS $$
  SELECT COALESCE(SUM(points), 0)::INTEGER
  FROM xp_transactions
  WHERE organization_id = p_org_id
    AND user_id = p_user_id
    AND reversed_at IS NULL;
$$ LANGUAGE sql STABLE;

-- ============================================================================
-- Get user level based on XP
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_level(
  p_user_id UUID,
  p_org_id UUID
)
RETURNS TABLE(level_id UUID, level_name TEXT, level_order INTEGER, min_xp INTEGER) AS $$
DECLARE
  user_xp INTEGER;
BEGIN
  user_xp := calculate_user_xp(p_user_id, p_org_id);
  RETURN QUERY
  SELECT l.id, l.name, l.level_order, l.min_xp
  FROM levels l
  WHERE l.organization_id = p_org_id AND l.min_xp <= user_xp
  ORDER BY l.min_xp DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- Get leaderboard
-- ============================================================================
CREATE OR REPLACE FUNCTION get_leaderboard(
  p_org_id UUID,
  p_metric TEXT DEFAULT 'revenue',
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL,
  p_limit INTEGER DEFAULT 25
)
RETURNS TABLE(
  rank BIGINT,
  user_id UUID,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  team_name TEXT,
  sales_count BIGINT,
  revenue NUMERIC,
  xp BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROW_NUMBER() OVER (
      ORDER BY
        CASE WHEN p_metric = 'revenue' THEN COALESCE(SUM(s.total), 0) ELSE 0 END DESC,
        CASE WHEN p_metric = 'sales_count' THEN COUNT(s.id) ELSE 0 END DESC,
        CASE WHEN p_metric = 'xp' THEN COALESCE((
          SELECT SUM(xp.points) FROM xp_transactions xp
          WHERE xp.user_id = p.id AND xp.reversed_at IS NULL AND xp.organization_id = p_org_id
        ), 0) ELSE 0 END DESC
    ) AS rank,
    p.id AS user_id,
    p.first_name,
    p.last_name,
    p.avatar_url,
    t.name AS team_name,
    COUNT(s.id) AS sales_count,
    COALESCE(SUM(s.total), 0) AS revenue,
    COALESCE((
      SELECT SUM(xp.points) FROM xp_transactions xp
      WHERE xp.user_id = p.id AND xp.reversed_at IS NULL AND xp.organization_id = p_org_id
    ), 0) AS xp
  FROM profiles p
  LEFT JOIN sales s ON s.user_id = p.id
    AND s.organization_id = p_org_id
    AND s.payment_status = 'PAID'
    AND (p_date_from IS NULL OR s.sale_date >= p_date_from)
    AND (p_date_to IS NULL OR s.sale_date <= p_date_to)
  LEFT JOIN teams t ON p.team_id = t.id
  WHERE p.organization_id = p_org_id
    AND p.role IN ('SALES_REP', 'MANAGER')
    AND p.status = 'ACTIVE'
  GROUP BY p.id, p.first_name, p.last_name, p.avatar_url, t.name
  ORDER BY
    CASE WHEN p_metric = 'revenue' THEN COALESCE(SUM(s.total), 0) ELSE 0 END DESC,
    CASE WHEN p_metric = 'sales_count' THEN COUNT(s.id) ELSE 0 END DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- Get admin dashboard KPIs
-- ============================================================================
CREATE OR REPLACE FUNCTION get_admin_dashboard_kpis(
  p_org_id UUID,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
)
RETURNS TABLE(
  total_revenue NUMERIC,
  total_sales BIGINT,
  active_employees BIGINT,
  active_leads BIGINT,
  conversion_rate NUMERIC,
  commission_payable NUMERIC,
  bonus_payable NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COALESCE(SUM(s.total), 0) FROM sales s
     WHERE s.organization_id = p_org_id AND s.payment_status = 'PAID'
     AND (p_date_from IS NULL OR s.sale_date >= p_date_from)
     AND (p_date_to IS NULL OR s.sale_date <= p_date_to)) AS total_revenue,

    (SELECT COUNT(*) FROM sales s
     WHERE s.organization_id = p_org_id AND s.payment_status = 'PAID'
     AND (p_date_from IS NULL OR s.sale_date >= p_date_from)
     AND (p_date_to IS NULL OR s.sale_date <= p_date_to)) AS total_sales,

    (SELECT COUNT(*) FROM profiles pr
     WHERE pr.organization_id = p_org_id AND pr.status = 'ACTIVE'
     AND pr.role IN ('SALES_REP', 'MANAGER')) AS active_employees,

    (SELECT COUNT(*) FROM leads l
     WHERE l.organization_id = p_org_id
     AND l.stage NOT IN ('WON', 'LOST')) AS active_leads,

    calculate_conversion_rate(p_org_id, p_date_from, p_date_to) AS conversion_rate,

    (SELECT COALESCE(SUM(cr.commission_amount), 0) FROM commission_records cr
     WHERE cr.organization_id = p_org_id AND cr.status = 'PENDING') AS commission_payable,

    (SELECT COALESCE(SUM(br.amount), 0) FROM bonus_records br
     WHERE br.organization_id = p_org_id AND br.status = 'PENDING') AS bonus_payable;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- Get sales rep dashboard KPIs
-- ============================================================================
CREATE OR REPLACE FUNCTION get_rep_dashboard_kpis(
  p_user_id UUID,
  p_org_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  today_sales BIGINT,
  today_revenue NUMERIC,
  week_sales BIGINT,
  week_revenue NUMERIC,
  month_sales BIGINT,
  month_revenue NUMERIC,
  total_xp BIGINT,
  total_commission NUMERIC,
  total_bonus NUMERIC,
  pending_leads BIGINT,
  today_follow_ups BIGINT,
  overdue_follow_ups BIGINT
) AS $$
DECLARE
  week_start DATE;
  month_start DATE;
BEGIN
  week_start := date_trunc('week', p_date)::date;
  month_start := date_trunc('month', p_date)::date;

  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM sales s WHERE s.user_id = p_user_id AND s.organization_id = p_org_id
     AND s.payment_status = 'PAID' AND s.sale_date = p_date) AS today_sales,

    (SELECT COALESCE(SUM(s.total), 0) FROM sales s WHERE s.user_id = p_user_id AND s.organization_id = p_org_id
     AND s.payment_status = 'PAID' AND s.sale_date = p_date) AS today_revenue,

    (SELECT COUNT(*) FROM sales s WHERE s.user_id = p_user_id AND s.organization_id = p_org_id
     AND s.payment_status = 'PAID' AND s.sale_date >= week_start AND s.sale_date <= p_date) AS week_sales,

    (SELECT COALESCE(SUM(s.total), 0) FROM sales s WHERE s.user_id = p_user_id AND s.organization_id = p_org_id
     AND s.payment_status = 'PAID' AND s.sale_date >= week_start AND s.sale_date <= p_date) AS week_revenue,

    (SELECT COUNT(*) FROM sales s WHERE s.user_id = p_user_id AND s.organization_id = p_org_id
     AND s.payment_status = 'PAID' AND s.sale_date >= month_start AND s.sale_date <= p_date) AS month_sales,

    (SELECT COALESCE(SUM(s.total), 0) FROM sales s WHERE s.user_id = p_user_id AND s.organization_id = p_org_id
     AND s.payment_status = 'PAID' AND s.sale_date >= month_start AND s.sale_date <= p_date) AS month_revenue,

    (SELECT COALESCE(SUM(xp.points), 0) FROM xp_transactions xp
     WHERE xp.user_id = p_user_id AND xp.organization_id = p_org_id AND xp.reversed_at IS NULL) AS total_xp,

    (SELECT COALESCE(SUM(cr.commission_amount), 0) FROM commission_records cr
     WHERE cr.user_id = p_user_id AND cr.organization_id = p_org_id
     AND cr.status IN ('PENDING', 'APPROVED')) AS total_commission,

    (SELECT COALESCE(SUM(br.amount), 0) FROM bonus_records br
     WHERE br.user_id = p_user_id AND br.organization_id = p_org_id
     AND br.status IN ('PENDING', 'APPROVED')) AS total_bonus,

    (SELECT COUNT(*) FROM leads l WHERE l.assigned_to = p_user_id AND l.organization_id = p_org_id
     AND l.stage NOT IN ('WON', 'LOST')) AS pending_leads,

    (SELECT COUNT(*) FROM follow_ups f WHERE f.user_id = p_user_id AND f.organization_id = p_org_id
     AND f.status = 'PENDING' AND f.due_date = p_date) AS today_follow_ups,

    (SELECT COUNT(*) FROM follow_ups f WHERE f.user_id = p_user_id AND f.organization_id = p_org_id
     AND f.status = 'PENDING' AND f.due_date < p_date) AS overdue_follow_ups;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- Revenue over time (for charts)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_revenue_over_time(
  p_org_id UUID,
  p_date_from DATE,
  p_date_to DATE,
  p_group_by TEXT DEFAULT 'day'
)
RETURNS TABLE(period TEXT, revenue NUMERIC, sales_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE
      WHEN p_group_by = 'day' THEN to_char(s.sale_date, 'YYYY-MM-DD')
      WHEN p_group_by = 'week' THEN to_char(date_trunc('week', s.sale_date), 'YYYY-MM-DD')
      WHEN p_group_by = 'month' THEN to_char(s.sale_date, 'YYYY-MM')
      ELSE to_char(s.sale_date, 'YYYY-MM-DD')
    END AS period,
    COALESCE(SUM(s.total), 0) AS revenue,
    COUNT(*) AS sales_count
  FROM sales s
  WHERE s.organization_id = p_org_id
    AND s.payment_status = 'PAID'
    AND s.sale_date >= p_date_from
    AND s.sale_date <= p_date_to
  GROUP BY 1
  ORDER BY 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- Product performance
-- ============================================================================
CREATE OR REPLACE FUNCTION get_product_performance(
  p_org_id UUID,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
)
RETURNS TABLE(
  product_id UUID,
  product_name TEXT,
  units_sold BIGINT,
  revenue NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pr.id AS product_id,
    pr.name AS product_name,
    COALESCE(SUM(si.quantity), 0) AS units_sold,
    COALESCE(SUM(si.total), 0) AS revenue
  FROM products pr
  LEFT JOIN sale_items si ON si.product_id = pr.id
    AND si.organization_id = p_org_id
  LEFT JOIN sales s ON s.id = si.sale_id
    AND s.payment_status = 'PAID'
    AND (p_date_from IS NULL OR s.sale_date >= p_date_from)
    AND (p_date_to IS NULL OR s.sale_date <= p_date_to)
  WHERE pr.organization_id = p_org_id
    AND pr.status = 'ACTIVE'
  GROUP BY pr.id, pr.name
  ORDER BY revenue DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- Lead funnel (count per stage)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_lead_funnel(
  p_org_id UUID
)
RETURNS TABLE(stage TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT l.stage, COUNT(*) AS count
  FROM leads l
  WHERE l.organization_id = p_org_id
  GROUP BY l.stage
  ORDER BY
    CASE l.stage
      WHEN 'NEW' THEN 1
      WHEN 'CONTACTED' THEN 2
      WHEN 'QUALIFIED' THEN 3
      WHEN 'DEMO' THEN 4
      WHEN 'NEGOTIATION' THEN 5
      WHEN 'WON' THEN 6
      WHEN 'LOST' THEN 7
    END;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- Process sale qualification — award XP, calculate commission
-- Call this after a sale's payment_status changes to 'PAID'
-- ============================================================================
CREATE OR REPLACE FUNCTION process_sale_qualification(p_sale_id UUID)
RETURNS void AS $$
DECLARE
  v_sale RECORD;
  v_rule RECORD;
  v_xp_rule RECORD;
  v_commission_amount NUMERIC;
  v_existing_xp UUID;
  v_existing_commission UUID;
BEGIN
  -- Get sale details
  SELECT * INTO v_sale FROM sales WHERE id = p_sale_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sale not found'; END IF;
  IF v_sale.payment_status != 'PAID' THEN RETURN; END IF;

  -- Award XP from rules
  FOR v_xp_rule IN
    SELECT * FROM xp_rules
    WHERE organization_id = v_sale.organization_id AND is_active = true AND action = 'SALE'
  LOOP
    -- Check if already awarded
    SELECT id INTO v_existing_xp FROM xp_transactions
    WHERE user_id = v_sale.user_id AND source_type = 'SALE' AND source_id = v_sale.id
    AND rule_id = v_xp_rule.id AND reversed_at IS NULL;

    IF NOT FOUND THEN
      INSERT INTO xp_transactions (organization_id, user_id, points, source_type, source_id, rule_id, description)
      VALUES (v_sale.organization_id, v_sale.user_id, v_xp_rule.reward_points, 'SALE', v_sale.id, v_xp_rule.id,
        'XP for sale #' || v_sale.id::text);
    END IF;
  END LOOP;

  -- Revenue-based XP
  FOR v_xp_rule IN
    SELECT * FROM xp_rules
    WHERE organization_id = v_sale.organization_id AND is_active = true AND action = 'REVENUE'
    AND (condition_value IS NULL OR v_sale.total >= condition_value::numeric)
  LOOP
    SELECT id INTO v_existing_xp FROM xp_transactions
    WHERE user_id = v_sale.user_id AND source_type = 'REVENUE' AND source_id = v_sale.id
    AND rule_id = v_xp_rule.id AND reversed_at IS NULL;

    IF NOT FOUND THEN
      INSERT INTO xp_transactions (organization_id, user_id, points, source_type, source_id, rule_id, description)
      VALUES (v_sale.organization_id, v_sale.user_id, v_xp_rule.reward_points, 'REVENUE', v_sale.id, v_xp_rule.id,
        'XP for revenue of ' || v_sale.total::text);
    END IF;
  END LOOP;

  -- Calculate commission from rules
  FOR v_rule IN
    SELECT * FROM commission_rules
    WHERE organization_id = v_sale.organization_id AND is_active = true
    AND (product_id IS NULL OR product_id IN (SELECT product_id FROM sale_items WHERE sale_id = v_sale.id))
    AND (user_id IS NULL OR user_id = v_sale.user_id)
    AND (team_id IS NULL OR team_id = v_sale.team_id)
    ORDER BY
      CASE WHEN user_id IS NOT NULL THEN 0 ELSE 1 END,
      CASE WHEN product_id IS NOT NULL THEN 0 ELSE 1 END
  LOOP
    -- Check if already calculated
    SELECT id INTO v_existing_commission FROM commission_records
    WHERE sale_id = v_sale.id AND rule_id = v_rule.id AND status != 'REVERSED';

    IF NOT FOUND THEN
      -- Calculate based on type
      IF v_rule.type = 'PERCENTAGE' THEN
        v_commission_amount := v_sale.total * (v_rule.rate / 100);
      ELSIF v_rule.type = 'FIXED' THEN
        v_commission_amount := v_rule.rate;
      ELSIF v_rule.type = 'TIERED' THEN
        -- For tiered, check if sale total falls in the tier
        IF (v_rule.tier_min IS NULL OR v_sale.total >= v_rule.tier_min)
           AND (v_rule.tier_max IS NULL OR v_sale.total <= v_rule.tier_max) THEN
          v_commission_amount := v_sale.total * (v_rule.rate / 100);
        ELSE
          CONTINUE;
        END IF;
      END IF;

      INSERT INTO commission_records (organization_id, user_id, sale_id, rule_id, base_amount, commission_rate, commission_amount, status)
      VALUES (v_sale.organization_id, v_sale.user_id, v_sale.id, v_rule.id, v_sale.total, v_rule.rate, v_commission_amount, 'PENDING');
    END IF;
  END LOOP;

  -- Update target progress
  UPDATE targets
  SET current_value = CASE
    WHEN type = 'SALES_COUNT' THEN current_value + 1
    WHEN type = 'REVENUE' THEN current_value + v_sale.total
    ELSE current_value
  END,
  updated_at = now()
  WHERE organization_id = v_sale.organization_id
    AND is_active = true
    AND v_sale.sale_date BETWEEN period_start AND period_end
    AND (
      (scope = 'INDIVIDUAL' AND user_id = v_sale.user_id)
      OR (scope = 'TEAM' AND team_id = v_sale.team_id)
      OR (scope = 'ORGANIZATION')
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Process sale refund — reverse XP, commission, update targets
-- ============================================================================
CREATE OR REPLACE FUNCTION process_sale_refund(p_sale_id UUID)
RETURNS void AS $$
DECLARE
  v_sale RECORD;
BEGIN
  SELECT * INTO v_sale FROM sales WHERE id = p_sale_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sale not found'; END IF;

  -- Reverse XP transactions
  UPDATE xp_transactions
  SET reversed_at = now()
  WHERE source_id = v_sale.id AND reversed_at IS NULL;

  -- Reverse commission records
  UPDATE commission_records
  SET status = 'REVERSED', updated_at = now()
  WHERE sale_id = v_sale.id AND status != 'REVERSED';

  -- Update target progress (subtract)
  UPDATE targets
  SET current_value = CASE
    WHEN type = 'SALES_COUNT' THEN GREATEST(current_value - 1, 0)
    WHEN type = 'REVENUE' THEN GREATEST(current_value - v_sale.total, 0)
    ELSE current_value
  END,
  updated_at = now()
  WHERE organization_id = v_sale.organization_id
    AND is_active = true
    AND v_sale.sale_date BETWEEN period_start AND period_end
    AND (
      (scope = 'INDIVIDUAL' AND user_id = v_sale.user_id)
      OR (scope = 'TEAM' AND team_id = v_sale.team_id)
      OR (scope = 'ORGANIZATION')
    );

  -- Update sale status
  UPDATE sales SET payment_status = 'REFUNDED', updated_at = now() WHERE id = p_sale_id;
END;
$$ LANGUAGE plpgsql;
