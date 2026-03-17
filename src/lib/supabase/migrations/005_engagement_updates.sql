-- =============================================
-- Migration 005: Engagement Updates
-- Lightweight note/update thread per engagement
-- =============================================

CREATE TABLE engagement_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID REFERENCES engagements(id) ON DELETE CASCADE NOT NULL,
  author_user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_engagement_updates_engagement ON engagement_updates(engagement_id, created_at);

ALTER TABLE engagement_updates ENABLE ROW LEVEL SECURITY;

-- Both planner and couple on the engagement can read updates
CREATE POLICY "Engagement participants can view updates" ON engagement_updates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM engagements
      WHERE engagements.id = engagement_updates.engagement_id
      AND (
        engagements.planner_user_id = (auth.jwt()->>'sub')
        OR engagements.couple_user_id = (auth.jwt()->>'sub')
      )
    )
  );

-- Both planner and couple on the engagement can post updates
CREATE POLICY "Engagement participants can insert updates" ON engagement_updates
  FOR INSERT WITH CHECK (
    (auth.jwt()->>'sub') = author_user_id
    AND EXISTS (
      SELECT 1 FROM engagements
      WHERE engagements.id = engagement_updates.engagement_id
      AND (
        engagements.planner_user_id = (auth.jwt()->>'sub')
        OR engagements.couple_user_id = (auth.jwt()->>'sub')
      )
    )
  );
