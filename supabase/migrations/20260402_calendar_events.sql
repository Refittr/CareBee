-- Manually created calendar entries
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  created_by   uuid NOT NULL REFERENCES auth.users(id),
  title        text NOT NULL,
  event_date   date NOT NULL,
  event_time   time,              -- null = all-day
  notes        text,
  category     text CHECK (category IN ('appointment', 'task', 'reminder', 'other')) DEFAULT 'other',
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_household_date
  ON public.calendar_events(household_id, event_date);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view calendar_events" ON public.calendar_events
  FOR SELECT USING (
    household_id IN (
      SELECT household_id FROM public.household_members
      WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
    )
  );

CREATE POLICY "Members can insert calendar_events" ON public.calendar_events
  FOR INSERT WITH CHECK (
    household_id IN (
      SELECT household_id FROM public.household_members
      WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Creator can update calendar_events" ON public.calendar_events
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Creator can delete calendar_events" ON public.calendar_events
  FOR DELETE USING (created_by = auth.uid());
