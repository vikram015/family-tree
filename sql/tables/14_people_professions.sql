-- =====================================================
-- TABLE: PEOPLE_PROFESSIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS people_professions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  people_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  profession_id UUID NOT NULL REFERENCES professions(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT now(),
  modified_at TIMESTAMP DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  modified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_deleted BOOLEAN DEFAULT FALSE,
  UNIQUE(people_id, profession_id)
);

-- =====================================================
-- INDEXES FOR PEOPLE_PROFESSIONS TABLE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_people_professions_people_id ON people_professions(people_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_people_professions_profession_id ON people_professions(profession_id) WHERE is_deleted = FALSE;

-- =====================================================
-- ROW LEVEL SECURITY FOR PEOPLE_PROFESSIONS TABLE
-- =====================================================
ALTER TABLE people_professions ENABLE ROW LEVEL SECURITY;

-- PEOPLE_PROFESSIONS: Public read and write access
DROP POLICY IF EXISTS "people_professions_read_policy" ON people_professions;
CREATE POLICY "people_professions_read_policy" ON people_professions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "people_professions_create_policy" ON people_professions;
CREATE POLICY "people_professions_create_policy" ON people_professions
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "people_professions_update_policy" ON people_professions;
CREATE POLICY "people_professions_update_policy" ON people_professions
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "people_professions_delete_policy" ON people_professions;
CREATE POLICY "people_professions_delete_policy" ON people_professions
  FOR DELETE USING (true);
