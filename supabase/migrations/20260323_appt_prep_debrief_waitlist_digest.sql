-- Migration: Appointment Prep, Debrief, Waiting Lists, Weekly Digest

-- 1. Appointment preparation briefs
CREATE TABLE IF NOT EXISTS public.appointment_preps (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id  UUID NOT NULL,
  person_id       UUID NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  household_id    UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointment_preps_appointment ON public.appointment_preps(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_preps_person ON public.appointment_preps(person_id);
ALTER TABLE public.appointment_preps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members can view preps" ON public.appointment_preps
  FOR SELECT USING (
    household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Household editors can manage preps" ON public.appointment_preps
  FOR ALL USING (
    household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid() AND role IN ('owner','editor'))
  );

-- 2. Appointment debriefs
CREATE TABLE IF NOT EXISTS public.appointment_debriefs (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id           UUID NOT NULL,
  person_id                UUID NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  household_id             UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  summary                  TEXT,
  medication_changes       BOOLEAN NOT NULL DEFAULT false,
  medication_change_details TEXT,
  new_referrals            BOOLEAN NOT NULL DEFAULT false,
  new_referral_details     TEXT,
  tests_ordered            BOOLEAN NOT NULL DEFAULT false,
  test_details             TEXT,
  next_appointment         TEXT,
  concerns                 TEXT,
  suggested_updates        JSONB NOT NULL DEFAULT '[]',
  status                   TEXT NOT NULL DEFAULT 'draft',
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_debriefs_appointment ON public.appointment_debriefs(appointment_id);
CREATE INDEX IF NOT EXISTS idx_debriefs_person      ON public.appointment_debriefs(person_id);
ALTER TABLE public.appointment_debriefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members can view debriefs" ON public.appointment_debriefs
  FOR SELECT USING (
    household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Household editors can manage debriefs" ON public.appointment_debriefs
  FOR ALL USING (
    household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid() AND role IN ('owner','editor'))
  );

-- 3. Waiting lists
CREATE TABLE IF NOT EXISTS public.waiting_lists (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id             UUID NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  household_id          UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  department            TEXT NOT NULL,
  trust_name            TEXT,
  referred_by           TEXT,
  referral_date         DATE NOT NULL,
  expected_wait         TEXT,
  status                TEXT NOT NULL DEFAULT 'waiting',
  notes                 TEXT,
  estimated_weeks       INTEGER,
  wait_status           TEXT,
  estimate_details      TEXT,
  action_suggestion     TEXT,
  chase_recommended     BOOLEAN NOT NULL DEFAULT false,
  last_estimated_at     TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_waiting_lists_person    ON public.waiting_lists(person_id);
CREATE INDEX IF NOT EXISTS idx_waiting_lists_household ON public.waiting_lists(household_id);
ALTER TABLE public.waiting_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members can view waiting lists" ON public.waiting_lists
  FOR SELECT USING (
    household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Household editors can manage waiting lists" ON public.waiting_lists
  FOR ALL USING (
    household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid() AND role IN ('owner','editor'))
  );

-- 4. Weekly digest preferences on household_members
ALTER TABLE public.household_members
  ADD COLUMN IF NOT EXISTS weekly_digest_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS weekly_digest_day TEXT NOT NULL DEFAULT 'monday',
  ADD COLUMN IF NOT EXISTS last_digest_sent_at TIMESTAMPTZ;
