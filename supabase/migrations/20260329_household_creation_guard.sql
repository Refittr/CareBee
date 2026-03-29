-- Add plan enforcement to create_household_with_owner.
-- Free users (not subscribed, no paid plan, no active household trial) are
-- limited to one owned care record. The check happens inside the SECURITY DEFINER
-- function so it cannot be bypassed by a direct RPC call.

CREATE OR REPLACE FUNCTION public.create_household_with_owner(household_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_household_id       uuid;
  v_user_id            uuid;
  v_plan               text;
  v_is_subscribed      boolean;
  v_active_trial       boolean;
  v_household_count    int;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Read the user's current plan and subscription state
  SELECT plan, is_subscribed
    INTO v_plan, v_is_subscribed
    FROM public.profiles
   WHERE id = v_user_id;

  -- Check whether the user owns a household that is still in active trial
  SELECT EXISTS (
    SELECT 1
      FROM public.households h
      JOIN public.household_members hm ON hm.household_id = h.id
     WHERE hm.user_id   = v_user_id
       AND hm.role      = 'owner'
       AND h.subscription_status = 'trial'
       AND h.trial_ends_at > NOW()
  ) INTO v_active_trial;

  -- Enforce the one-household limit for free users:
  -- blocked when not subscribed, not on a paid plan, and no active trial.
  IF v_is_subscribed = false
     AND v_plan NOT IN ('carebee_plus', 'plus', 'family', 'custom', 'self_care_standard', 'self_care_plus')
     AND v_active_trial = false
  THEN
    SELECT COUNT(*)
      INTO v_household_count
      FROM public.household_members
     WHERE user_id = v_user_id
       AND role    = 'owner';

    IF v_household_count >= 1 THEN
      RAISE EXCEPTION 'Free plan is limited to one care record. Upgrade to CareBee Plus to create more.';
    END IF;
  END IF;

  -- All checks passed — create the household with a 30-day trial
  INSERT INTO public.households (name, created_by, subscription_status, trial_ends_at)
  VALUES (household_name, v_user_id, 'trial', NOW() + INTERVAL '30 days')
  RETURNING id INTO v_household_id;

  INSERT INTO public.household_members (household_id, user_id, role, accepted_at)
  VALUES (v_household_id, v_user_id, 'owner', NOW());

  RETURN v_household_id;
END;
$$;
