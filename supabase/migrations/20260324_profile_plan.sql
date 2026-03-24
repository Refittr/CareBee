-- Add plan column to profiles for AI feature access gating
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS is_subscribed BOOLEAN NOT NULL DEFAULT FALSE;

-- Admins and testers get family plan treatment by default
-- (access gating logic lives in application code, not DB)
