-- =============================================
-- Migration 001: User Profiles & Couple Subscriptions
-- Foundation for two-sided platform (planners + couples)
-- =============================================

-- =============================================
-- USER_PROFILES TABLE
-- =============================================

CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('planner', 'couple')),
  display_name TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  onboarding_completed BOOLEAN DEFAULT FALSE
);

-- Indexes
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies (no delete)
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING ((auth.jwt()->>'sub') = user_id);

CREATE POLICY "Authenticated users can view planners" ON user_profiles
  FOR SELECT USING (role = 'planner');

CREATE POLICY "Users can view engaged counterparts" ON user_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM engagements
      WHERE (engagements.planner_user_id = (auth.jwt()->>'sub') AND engagements.couple_user_id = user_profiles.user_id)
         OR (engagements.couple_user_id = (auth.jwt()->>'sub') AND engagements.planner_user_id = user_profiles.user_id)
    )
  );

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK ((auth.jwt()->>'sub') = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING ((auth.jwt()->>'sub') = user_id);

-- =============================================
-- COUPLE_SUBSCRIPTIONS TABLE
-- =============================================

CREATE TABLE couple_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES user_profiles(user_id),
  plan_type TEXT NOT NULL CHECK (plan_type IN ('12_month', '18_month')),
  price_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_couple_subscriptions_user_id ON couple_subscriptions(user_id);
CREATE INDEX idx_couple_subscriptions_status ON couple_subscriptions(status);

-- Enable RLS
ALTER TABLE couple_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (no delete)
CREATE POLICY "Users can view own subscription" ON couple_subscriptions
  FOR SELECT USING ((auth.jwt()->>'sub') = user_id);

CREATE POLICY "Users can insert own subscription" ON couple_subscriptions
  FOR INSERT WITH CHECK ((auth.jwt()->>'sub') = user_id);

CREATE POLICY "Users can update own subscription" ON couple_subscriptions
  FOR UPDATE USING ((auth.jwt()->>'sub') = user_id);
