-- =============================================
-- Migration 006: Fix client lookup for engagement acceptance
-- The clients SELECT policy needs an alternative path that
-- matches via couple_user_id so planners can look up the
-- couple's client record after accepting an engagement
-- (before client_id is set on the engagement).
-- =============================================

DROP POLICY IF EXISTS "Users can view own or engaged clients" ON clients;

CREATE POLICY "Users can view own or engaged clients" ON clients
  FOR SELECT USING (
    (auth.jwt()->>'sub') = user_id
    OR EXISTS (
      SELECT 1 FROM engagements
      WHERE engagements.client_id = clients.id
      AND engagements.planner_user_id = (auth.jwt()->>'sub')
      AND engagements.status IN ('accepted', 'active')
    )
    OR EXISTS (
      SELECT 1 FROM engagements
      WHERE engagements.couple_user_id = clients.user_id
      AND engagements.planner_user_id = (auth.jwt()->>'sub')
      AND engagements.status IN ('accepted', 'active')
    )
  );
