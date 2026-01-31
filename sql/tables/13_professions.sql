-- =====================================================
-- TABLE: PROFESSIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS professions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  category VARCHAR(100),
  created_at TIMESTAMP DEFAULT now(),
  modified_at TIMESTAMP DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  modified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_deleted BOOLEAN DEFAULT FALSE
);

-- =====================================================
-- INDEXES FOR PROFESSIONS TABLE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_profession_name_lowercase ON professions(LOWER(name)) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_profession_category ON professions(category) WHERE is_deleted = FALSE;

-- =====================================================
-- ROW LEVEL SECURITY FOR PROFESSIONS TABLE
-- =====================================================
ALTER TABLE professions ENABLE ROW LEVEL SECURITY;

-- PROFESSIONS: Public read, authenticated write
DROP POLICY IF EXISTS "professions_read_policy" ON professions;
CREATE POLICY "professions_read_policy" ON professions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "professions_create_policy" ON professions;
CREATE POLICY "professions_create_policy" ON professions
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "professions_update_policy" ON professions;
CREATE POLICY "professions_update_policy" ON professions
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "professions_delete_policy" ON professions;
CREATE POLICY "professions_delete_policy" ON professions
  FOR DELETE TO authenticated USING (true);
