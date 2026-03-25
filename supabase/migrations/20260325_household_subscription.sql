-- Add subscription fields to households table
ALTER TABLE public.households
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ;

-- Add constraint (drop first in case it already exists)
ALTER TABLE public.households
  DROP CONSTRAINT IF EXISTS valid_subscription_status;

ALTER TABLE public.households
  ADD CONSTRAINT valid_subscription_status
  CHECK (subscription_status IN ('free', 'trial', 'active', 'cancelled', 'past_due'));

-- Update create_household_with_owner to start a 14-day trial
CREATE OR REPLACE FUNCTION public.create_household_with_owner(household_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_household_id uuid;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.households (name, created_by, subscription_status, trial_ends_at)
  VALUES (household_name, v_user_id, 'trial', NOW() + INTERVAL '14 days')
  RETURNING id INTO v_household_id;

  INSERT INTO public.household_members (household_id, user_id, role, accepted_at)
  VALUES (v_household_id, v_user_id, 'owner', NOW());

  RETURN v_household_id;
END;
$$;
