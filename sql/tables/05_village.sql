-- =====================================================
-- TABLE: VILLAGE
-- =====================================================
CREATE TABLE IF NOT EXISTS village (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  district_id UUID REFERENCES district(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT now(),
  modified_at TIMESTAMP DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  modified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_deleted BOOLEAN DEFAULT FALSE
);

-- =====================================================
-- INDEXES FOR VILLAGE TABLE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_village_name_lowercase ON village(LOWER(name)) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_village_district_id ON village(district_id) WHERE is_deleted = FALSE;

-- =====================================================
-- ROW LEVEL SECURITY FOR VILLAGE TABLE
-- =====================================================
ALTER TABLE village ENABLE ROW LEVEL SECURITY;

-- VILLAGE: Public read, authenticated write
DROP POLICY IF EXISTS "village_read_policy" ON village;
CREATE POLICY "village_read_policy" ON village
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "village_create_policy" ON village;
CREATE POLICY "village_create_policy" ON village
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "village_update_policy" ON village;
CREATE POLICY "village_update_policy" ON village
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "village_delete_policy" ON village;
CREATE POLICY "village_delete_policy" ON village
  FOR DELETE TO authenticated USING (true);
