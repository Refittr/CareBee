-- Migration: Generated Letters Vault

CREATE TABLE IF NOT EXISTS public.generated_letters (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id           UUID REFERENCES public.people(id) ON DELETE CASCADE NOT NULL,
  household_id        UUID REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
  title               TEXT NOT NULL,
  content             TEXT NOT NULL,
  template_id         TEXT,
  custom_prompt       TEXT,
  entitlement_context TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_generated_letters_person    ON public.generated_letters(person_id);
CREATE INDEX IF NOT EXISTS idx_generated_letters_household ON public.generated_letters(household_id);

ALTER TABLE public.generated_letters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view generated letters" ON public.generated_letters
  FOR SELECT USING (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
    )
  );

CREATE POLICY "Editors can manage generated letters" ON public.generated_letters
  FOR ALL USING (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor') AND accepted_at IS NOT NULL
    )
  );
