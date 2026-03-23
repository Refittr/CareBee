-- Migration: Health Insights, Drug Interactions, Contacts
-- Run in Supabase SQL editor

-- -------------------------------------------------------
-- 1. Health Insights
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS health_insights (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id       UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  household_id    UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  insight_type    TEXT NOT NULL,
  category        TEXT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  priority        TEXT NOT NULL DEFAULT 'info',
  status          TEXT NOT NULL DEFAULT 'active',
  source_data     JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now(),
  dismissed_at    TIMESTAMPTZ,
  resolved_at     TIMESTAMPTZ,
  last_checked_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_insights_person ON health_insights(person_id);
CREATE INDEX IF NOT EXISTS idx_insights_status ON health_insights(status);

ALTER TABLE health_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members can view insights" ON health_insights
  FOR SELECT USING (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
    )
  );

CREATE POLICY "Household editors can manage insights" ON health_insights
  FOR ALL USING (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor') AND accepted_at IS NOT NULL
    )
  );

-- -------------------------------------------------------
-- 2. Insight Checks (rate limiting / last-run tracking)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS insight_checks (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id      UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  checked_at     TIMESTAMPTZ DEFAULT now(),
  insights_found INTEGER DEFAULT 0,
  new_insights   INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_insight_checks_person ON insight_checks(person_id);

ALTER TABLE insight_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members can view insight checks" ON insight_checks
  FOR SELECT USING (
    person_id IN (
      SELECT p.id FROM people p
      JOIN household_members hm ON hm.household_id = p.household_id
      WHERE hm.user_id = auth.uid() AND hm.accepted_at IS NOT NULL
    )
  );

CREATE POLICY "Household editors can manage insight checks" ON insight_checks
  FOR ALL USING (
    person_id IN (
      SELECT p.id FROM people p
      JOIN household_members hm ON hm.household_id = p.household_id
      WHERE hm.user_id = auth.uid() AND hm.role IN ('owner', 'editor') AND hm.accepted_at IS NOT NULL
    )
  );

-- -------------------------------------------------------
-- 3. Drug Interactions
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS drug_interactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id       UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  household_id    UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  medication_a    TEXT NOT NULL,
  medication_b    TEXT NOT NULL,
  severity        TEXT NOT NULL,
  description     TEXT NOT NULL,
  recommendation  TEXT NOT NULL,
  mechanism       TEXT,
  status          TEXT NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ DEFAULT now(),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_interactions_person ON drug_interactions(person_id);

ALTER TABLE drug_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members can view interactions" ON drug_interactions
  FOR SELECT USING (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
    )
  );

CREATE POLICY "Household editors can manage interactions" ON drug_interactions
  FOR ALL USING (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor') AND accepted_at IS NOT NULL
    )
  );

-- -------------------------------------------------------
-- 4. Contacts
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS contacts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id     UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  household_id  UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  contact_type  TEXT NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT,
  organisation  TEXT,
  phone         TEXT,
  email         TEXT,
  address       TEXT,
  notes         TEXT,
  is_primary    BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contacts_person ON contacts(person_id);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members can view contacts" ON contacts
  FOR SELECT USING (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
    )
  );

CREATE POLICY "Household editors can manage contacts" ON contacts
  FOR ALL USING (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor') AND accepted_at IS NOT NULL
    )
  );
