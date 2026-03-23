-- Migration: account_type column and admin_activity_log table
-- Run this in the Supabase SQL editor.

-- 1. Add account_type to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT 'standard';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'valid_account_type' AND conrelid = 'profiles'::regclass
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT valid_account_type
        CHECK (account_type IN ('standard', 'tester', 'admin'));
  END IF;
END $$;

-- 2. Set your own account to admin (replace with your actual email)
-- UPDATE profiles SET account_type = 'admin' WHERE email = 'YOUR_EMAIL_HERE';

-- 3. Create admin activity log table
CREATE TABLE IF NOT EXISTS admin_activity_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id),
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   UUID,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS but add no policies = only service role can access
ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;

-- 4. Optional: log user signups via a trigger on auth.users
-- This is a convenience trigger; you can also call logActivity() from API routes.
CREATE OR REPLACE FUNCTION log_user_signup()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO admin_activity_log (user_id, action, entity_type, entity_id)
  VALUES (NEW.id, 'user_signup', 'user', NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_user_signup ON auth.users;
CREATE TRIGGER on_user_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION log_user_signup();
