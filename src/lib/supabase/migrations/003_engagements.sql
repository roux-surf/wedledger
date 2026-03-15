-- =============================================
-- Migration 003: Engagements
-- Planner-couple consultations and subscriptions
-- =============================================

-- =============================================
-- ENGAGEMENTS TABLE
-- =============================================

CREATE TABLE engagements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planner_user_id TEXT NOT NULL REFERENCES user_profiles(user_id),
  couple_user_id TEXT NOT NULL REFERENCES user_profiles(user_id),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('consultation', 'subscription')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'active', 'completed', 'cancelled')),
  rate_cents INTEGER NOT NULL,
  message TEXT,
  planner_notes TEXT,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_engagements_planner ON engagements(planner_user_id, status);
CREATE INDEX idx_engagements_couple ON engagements(couple_user_id, status);
CREATE INDEX idx_engagements_client ON engagements(client_id);

-- Enable RLS
ALTER TABLE engagements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Planners can view their engagements" ON engagements
  FOR SELECT USING ((auth.jwt()->>'sub') = planner_user_id);

CREATE POLICY "Couples can view their engagements" ON engagements
  FOR SELECT USING ((auth.jwt()->>'sub') = couple_user_id);

CREATE POLICY "Couples can request engagements" ON engagements
  FOR INSERT WITH CHECK ((auth.jwt()->>'sub') = couple_user_id);

CREATE POLICY "Planners can update their engagements" ON engagements
  FOR UPDATE USING ((auth.jwt()->>'sub') = planner_user_id);

CREATE POLICY "Couples can update their engagements" ON engagements
  FOR UPDATE USING ((auth.jwt()->>'sub') = couple_user_id);
