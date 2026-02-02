-- Budget Categories Enhancement Migration
-- Run this SQL in your Supabase SQL Editor to add the new columns

-- Phase 2: Add booking status and vendor contact fields to line_items
ALTER TABLE line_items
  ADD COLUMN IF NOT EXISTS booking_status TEXT NOT NULL DEFAULT 'none'
  CHECK (booking_status IN ('none', 'inquired', 'booked', 'contracted', 'completed'));

ALTER TABLE line_items
  ADD COLUMN IF NOT EXISTS vendor_phone TEXT;

ALTER TABLE line_items
  ADD COLUMN IF NOT EXISTS vendor_email TEXT;

-- Phase 3: Add sort_order to line_items for drag-and-drop reordering
ALTER TABLE line_items
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Backfill sort_order from created_at ordering
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY created_at) AS rn
  FROM line_items
)
UPDATE line_items
SET sort_order = ordered.rn
FROM ordered
WHERE line_items.id = ordered.id;
