-- =====================================================
-- TABLE: PEOPLE
-- =====================================================
CREATE TABLE IF NOT EXISTS people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  gender VARCHAR(10),
  dob DATE,
  -- Foreign keys
  tree_id UUID NOT NULL REFERENCES tree(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT now(),
  modified_at TIMESTAMP DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  modified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_deleted BOOLEAN DEFAULT FALSE,
  CONSTRAINT valid_gender CHECK (gender IN ('male', 'female', 'other'))
);

-- =====================================================
-- INDEXES FOR PEOPLE TABLE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_people_name_lowercase ON people(LOWER(name)) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_people_tree_id_name_lowercase ON people(tree_id, LOWER(name)) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_people_tree_id ON people(tree_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_people_search ON people USING GIN(to_tsvector('english', name));

-- =====================================================
-- ROW LEVEL SECURITY FOR PEOPLE TABLE
-- =====================================================
ALTER TABLE people ENABLE ROW LEVEL SECURITY;

-- PEOPLE: Public read, authenticated write
DROP POLICY IF EXISTS "people_read_policy" ON people;
CREATE POLICY "people_read_policy" ON people
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "people_create_policy" ON people;
CREATE POLICY "people_create_policy" ON people
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "people_update_policy" ON people;
CREATE POLICY "people_update_policy" ON people
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "people_delete_policy" ON people;
CREATE POLICY "people_delete_policy" ON people
  FOR DELETE TO authenticated USING (true);
