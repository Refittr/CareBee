-- Care notes table
CREATE TABLE care_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_care_notes_person ON care_notes(person_id);
CREATE INDEX idx_care_notes_household ON care_notes(household_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_care_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_care_notes_updated_at
  BEFORE UPDATE ON care_notes
  FOR EACH ROW EXECUTE FUNCTION update_care_notes_updated_at();

-- RLS
ALTER TABLE care_notes ENABLE ROW LEVEL SECURITY;

-- Household members (owner/editor/viewer) can read notes
-- emergency_only members cannot see notes
CREATE POLICY "household_members_read_care_notes" ON care_notes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = care_notes.household_id
        AND household_members.user_id = auth.uid()
        AND household_members.role IN ('owner', 'editor', 'viewer')
    )
  );

-- Owners and editors can insert
CREATE POLICY "household_editors_insert_care_notes" ON care_notes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = care_notes.household_id
        AND household_members.user_id = auth.uid()
        AND household_members.role IN ('owner', 'editor')
    )
  );

-- Owners and editors can update
CREATE POLICY "household_editors_update_care_notes" ON care_notes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = care_notes.household_id
        AND household_members.user_id = auth.uid()
        AND household_members.role IN ('owner', 'editor')
    )
  );

-- Owners and editors can delete
CREATE POLICY "household_editors_delete_care_notes" ON care_notes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = care_notes.household_id
        AND household_members.user_id = auth.uid()
        AND household_members.role IN ('owner', 'editor')
    )
  );
