-- =====================================================
-- TABLE: PEOPLE_ADDITIONAL_DETAIL
-- =====================================================
CREATE TABLE IF NOT EXISTS people_additional_detail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  people_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  people_field_id UUID NOT NULL REFERENCES people_field(id) ON DELETE CASCADE,
  field_value TEXT,
  created_at TIMESTAMP DEFAULT now(),
  modified_at TIMESTAMP DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  modified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- =====================================================
-- INDEXES FOR PEOPLE_ADDITIONAL_DETAIL TABLE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_people_additional_people_id ON people_additional_detail(people_id);
CREATE INDEX IF NOT EXISTS idx_people_additional_field_id ON people_additional_detail(people_field_id);

-- =====================================================
-- ROW LEVEL SECURITY FOR PEOPLE_ADDITIONAL_DETAIL TABLE
-- =====================================================
ALTER TABLE people_additional_detail ENABLE ROW LEVEL SECURITY;

-- PEOPLE_ADDITIONAL_DETAIL: Public read, authenticated write
DROP POLICY IF EXISTS "people_additional_detail_read_policy" ON people_additional_detail;
CREATE POLICY "people_additional_detail_read_policy" ON people_additional_detail
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "people_additional_detail_create_policy" ON people_additional_detail;
CREATE POLICY "people_additional_detail_create_policy" ON people_additional_detail
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "people_additional_detail_update_policy" ON people_additional_detail;
CREATE POLICY "people_additional_detail_update_policy" ON people_additional_detail
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "people_additional_detail_delete_policy" ON people_additional_detail;
CREATE POLICY "people_additional_detail_delete_policy" ON people_additional_detail
  FOR DELETE TO authenticated USING (true);
