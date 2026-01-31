-- =====================================================
-- TABLE: PEOPLE_FIELD
-- =====================================================
CREATE TABLE IF NOT EXISTS people_field (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  modified_at TIMESTAMP DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  modified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- =====================================================
-- INDEXES FOR PEOPLE_FIELD TABLE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_people_field_name_lowercase ON people_field(LOWER(field_name));

-- =====================================================
-- ROW LEVEL SECURITY FOR PEOPLE_FIELD TABLE
-- =====================================================
ALTER TABLE people_field ENABLE ROW LEVEL SECURITY;

-- PEOPLE_FIELD: Public read, authenticated write
DROP POLICY IF EXISTS "people_field_read_policy" ON people_field;
CREATE POLICY "people_field_read_policy" ON people_field
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "people_field_create_policy" ON people_field;
CREATE POLICY "people_field_create_policy" ON people_field
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "people_field_update_policy" ON people_field;
CREATE POLICY "people_field_update_policy" ON people_field
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "people_field_delete_policy" ON people_field;
CREATE POLICY "people_field_delete_policy" ON people_field
  FOR DELETE TO authenticated USING (true);
