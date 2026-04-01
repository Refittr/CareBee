-- Calendar: medication scheduling columns and tables

-- 1. Add scheduling columns to existing medications table
ALTER TABLE public.medications
  ADD COLUMN IF NOT EXISTS schedule_type text CHECK (schedule_type IN ('specific_times', 'times_per_day')),
  ADD COLUMN IF NOT EXISTS times_per_day integer;

-- 2. Specific time slots per medication (only populated for schedule_type = 'specific_times')
CREATE TABLE IF NOT EXISTS public.medication_schedules (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id uuid NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  time          time NOT NULL,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_med_schedules_medication
  ON public.medication_schedules(medication_id);

ALTER TABLE public.medication_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view medication_schedules" ON public.medication_schedules
  FOR SELECT USING (
    medication_id IN (
      SELECT m.id FROM public.medications m
      JOIN public.household_members hm ON hm.household_id = m.household_id
      WHERE hm.user_id = auth.uid() AND hm.accepted_at IS NOT NULL
    )
  );

CREATE POLICY "Editors can manage medication_schedules" ON public.medication_schedules
  FOR ALL USING (
    medication_id IN (
      SELECT m.id FROM public.medications m
      JOIN public.household_members hm ON hm.household_id = m.household_id
      WHERE hm.user_id = auth.uid() AND hm.role IN ('owner', 'editor') AND hm.accepted_at IS NOT NULL
    )
  );

-- 3. Daily taken log — tracks whether each scheduled dose was taken
CREATE TABLE IF NOT EXISTS public.medication_taken_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id uuid NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  schedule_id   uuid REFERENCES public.medication_schedules(id) ON DELETE CASCADE,
  taken_date    date NOT NULL,
  taken         boolean DEFAULT false,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  UNIQUE (medication_id, schedule_id, taken_date)
);

-- Partial unique index for times_per_day case where schedule_id IS NULL
-- (standard UNIQUE treats NULLs as distinct, so the above constraint won't prevent duplicates there)
CREATE UNIQUE INDEX IF NOT EXISTS idx_med_taken_log_null_schedule
  ON public.medication_taken_log (medication_id, taken_date)
  WHERE schedule_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_med_taken_log_date
  ON public.medication_taken_log(taken_date);

ALTER TABLE public.medication_taken_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view medication_taken_log" ON public.medication_taken_log
  FOR SELECT USING (
    medication_id IN (
      SELECT m.id FROM public.medications m
      JOIN public.household_members hm ON hm.household_id = m.household_id
      WHERE hm.user_id = auth.uid() AND hm.accepted_at IS NOT NULL
    )
  );

CREATE POLICY "Editors can manage medication_taken_log" ON public.medication_taken_log
  FOR ALL USING (
    medication_id IN (
      SELECT m.id FROM public.medications m
      JOIN public.household_members hm ON hm.household_id = m.household_id
      WHERE hm.user_id = auth.uid() AND hm.role IN ('owner', 'editor') AND hm.accepted_at IS NOT NULL
    )
  );
