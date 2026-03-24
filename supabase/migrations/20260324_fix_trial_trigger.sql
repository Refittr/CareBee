-- Fix handle_new_user trigger to set trial fields on signup
-- New users should start a 30-day free trial with plan = 'family'

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    INSERT INTO public.profiles (
      id,
      full_name,
      email,
      avatar_url,
      account_type,
      plan,
      trial_started_at,
      trial_ends_at
    )
    VALUES (
      NEW.id,
      COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        NEW.email
      ),
      NEW.email,
      COALESCE(
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'picture'
      ),
      'standard',
      'family',
      now(),
      now() + interval '30 days'
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing standard users who signed up without trial dates
-- Sets trial to 30 days from their account creation date
UPDATE public.profiles
SET
  plan = 'family',
  trial_started_at = created_at,
  trial_ends_at = created_at + interval '30 days'
WHERE account_type = 'standard'
  AND trial_ends_at IS NULL;
