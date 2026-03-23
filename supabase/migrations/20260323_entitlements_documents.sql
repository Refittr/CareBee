-- Migration: Entitlements Engine and Document Generation

-- 1. Add care needs assessment to people
ALTER TABLE public.people
  ADD COLUMN IF NOT EXISTS care_needs_assessment JSONB DEFAULT '{}'::jsonb;

-- 2. Entitlements table
CREATE TABLE IF NOT EXISTS public.entitlements (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id              UUID REFERENCES public.people(id) ON DELETE CASCADE NOT NULL,
  household_id           UUID REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
  benefit_name           TEXT NOT NULL,
  benefit_category       TEXT NOT NULL,
  eligibility_status     TEXT NOT NULL DEFAULT 'likely_eligible',
  confidence             TEXT NOT NULL DEFAULT 'medium',
  estimated_annual_value TEXT,
  reasoning              TEXT NOT NULL,
  what_it_is             TEXT NOT NULL,
  how_to_apply           TEXT,
  key_criteria           TEXT[],
  missing_info           TEXT[],
  current_status         TEXT NOT NULL DEFAULT 'not_started',
  application_reference  TEXT,
  review_date            DATE,
  award_amount           TEXT,
  is_dismissed           BOOLEAN DEFAULT false,
  last_checked_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_entitlements_person ON public.entitlements(person_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_status ON public.entitlements(person_id, eligibility_status);

ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view entitlements" ON public.entitlements
  FOR SELECT USING (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
    )
  );

CREATE POLICY "Editors can manage entitlements" ON public.entitlements
  FOR ALL USING (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor') AND accepted_at IS NOT NULL
    )
  );
