-- =============================================
-- Migration 002: Planner Profiles
-- Marketplace infrastructure for wedding planners
-- =============================================

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

-- Indexes
CREATE INDEX idx_planner_profiles_user_id ON planner_profiles(user_id);
CREATE INDEX idx_planner_profiles_city_state ON planner_profiles(city, state);
CREATE INDEX idx_planner_profiles_published ON planner_profiles(profile_published) WHERE profile_published = true;

-- Enable RLS
ALTER TABLE planner_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view published planner profiles" ON planner_profiles
  FOR SELECT USING (profile_published = true OR (auth.jwt()->>'sub') = user_id);

CREATE POLICY "Users can insert own planner profile" ON planner_profiles
  FOR INSERT WITH CHECK ((auth.jwt()->>'sub') = user_id);

CREATE POLICY "Users can update own planner profile" ON planner_profiles
  FOR UPDATE USING ((auth.jwt()->>'sub') = user_id);

CREATE POLICY "Users can delete own planner profile" ON planner_profiles
  FOR DELETE USING ((auth.jwt()->>'sub') = user_id);
