-- =============================================
-- WedLedger Supabase Schema
-- Full schema reference (non-migratory)
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

CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);

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

CREATE INDEX idx_couple_subscriptions_user_id ON couple_subscriptions(user_id);
CREATE INDEX idx_couple_subscriptions_status ON couple_subscriptions(status);

-- =============================================
-- PLANNER_PROFILES TABLE
-- =============================================

CREATE TABLE planner_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE REFERENCES user_profiles(user_id),
  bio TEXT,
  experience_years INTEGER DEFAULT 0,
  specialties TEXT[],
  city TEXT,
  state TEXT,
  consultation_rate_cents INTEGER,
  subscription_rate_cents INTEGER,
  accepting_clients BOOLEAN DEFAULT TRUE,
  weddings_completed INTEGER DEFAULT 0,
  profile_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_planner_profiles_user_id ON planner_profiles(user_id);
CREATE INDEX idx_planner_profiles_city_state ON planner_profiles(city, state);
CREATE INDEX idx_planner_profiles_published ON planner_profiles(profile_published) WHERE profile_published = true;

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

CREATE INDEX idx_engagements_planner ON engagements(planner_user_id, status);
CREATE INDEX idx_engagements_couple ON engagements(couple_user_id, status);
CREATE INDEX idx_engagements_client ON engagements(client_id);
