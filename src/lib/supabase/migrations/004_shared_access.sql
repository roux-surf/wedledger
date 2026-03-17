-- =============================================
-- Migration 004: Shared Access
-- Allow planners to view couple-created data
-- through active engagements (SELECT only)
-- =============================================

-- =============================================
-- CLIENTS: Add SELECT policy for engaged planners
-- =============================================

DROP POLICY IF EXISTS "Users can view own clients" ON clients;

CREATE POLICY "Users can view own or engaged clients" ON clients
  FOR SELECT USING (
    (auth.jwt()->>'sub') = user_id
    OR EXISTS (
      SELECT 1 FROM engagements
      WHERE engagements.client_id = clients.id
      AND engagements.planner_user_id = (auth.jwt()->>'sub')
      AND engagements.status IN ('accepted', 'active')
    )
  );

-- =============================================
-- BUDGETS: Add SELECT policy for engaged planners
-- =============================================

DROP POLICY IF EXISTS "Users can view own budgets" ON budgets;

CREATE POLICY "Users can view own or engaged budgets" ON budgets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = budgets.client_id
      AND (
        clients.user_id = (auth.jwt()->>'sub')
        OR EXISTS (
          SELECT 1 FROM engagements
          WHERE engagements.client_id = clients.id
          AND engagements.planner_user_id = (auth.jwt()->>'sub')
          AND engagements.status IN ('accepted', 'active')
        )
      )
    )
  );

-- =============================================
-- CATEGORIES: Add SELECT policy for engaged planners
-- =============================================

DROP POLICY IF EXISTS "Users can view own categories" ON categories;

CREATE POLICY "Users can view own or engaged categories" ON categories
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM budgets
      JOIN clients ON clients.id = budgets.client_id
      WHERE budgets.id = categories.budget_id
      AND (
        clients.user_id = (auth.jwt()->>'sub')
        OR EXISTS (
          SELECT 1 FROM engagements
          WHERE engagements.client_id = clients.id
          AND engagements.planner_user_id = (auth.jwt()->>'sub')
          AND engagements.status IN ('accepted', 'active')
        )
      )
    )
  );

-- =============================================
-- LINE ITEMS: Add SELECT policy for engaged planners
-- =============================================

DROP POLICY IF EXISTS "Users can view own line_items" ON line_items;

CREATE POLICY "Users can view own or engaged line_items" ON line_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM categories
      JOIN budgets ON budgets.id = categories.budget_id
      JOIN clients ON clients.id = budgets.client_id
      WHERE categories.id = line_items.category_id
      AND (
        clients.user_id = (auth.jwt()->>'sub')
        OR EXISTS (
          SELECT 1 FROM engagements
          WHERE engagements.client_id = clients.id
          AND engagements.planner_user_id = (auth.jwt()->>'sub')
          AND engagements.status IN ('accepted', 'active')
        )
      )
    )
  );

-- =============================================
-- PAYMENTS: Add SELECT policy for engaged planners
-- =============================================

DROP POLICY IF EXISTS "Users can view own payments" ON payments;

CREATE POLICY "Users can view own or engaged payments" ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM line_items
      JOIN categories ON categories.id = line_items.category_id
      JOIN budgets ON budgets.id = categories.budget_id
      JOIN clients ON clients.id = budgets.client_id
      WHERE line_items.id = payments.line_item_id
      AND (
        clients.user_id = (auth.jwt()->>'sub')
        OR EXISTS (
          SELECT 1 FROM engagements
          WHERE engagements.client_id = clients.id
          AND engagements.planner_user_id = (auth.jwt()->>'sub')
          AND engagements.status IN ('accepted', 'active')
        )
      )
    )
  );

-- =============================================
-- MILESTONES: Add SELECT policy for engaged planners
-- =============================================

DROP POLICY IF EXISTS "Users can view own milestones" ON milestones;

CREATE POLICY "Users can view own or engaged milestones" ON milestones
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = milestones.client_id
      AND (
        clients.user_id = (auth.jwt()->>'sub')
        OR EXISTS (
          SELECT 1 FROM engagements
          WHERE engagements.client_id = clients.id
          AND engagements.planner_user_id = (auth.jwt()->>'sub')
          AND engagements.status IN ('accepted', 'active')
        )
      )
    )
  );
