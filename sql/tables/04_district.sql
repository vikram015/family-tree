-- =====================================================
-- TABLE: DISTRICT
-- =====================================================
CREATE TABLE IF NOT EXISTS district (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  state_id UUID REFERENCES state(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT now(),
  modified_at TIMESTAMP DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  modified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_deleted BOOLEAN DEFAULT FALSE
);

-- =====================================================
-- INDEXES FOR DISTRICT TABLE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_district_name_lowercase ON district(LOWER(name)) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_district_state_id ON district(state_id) WHERE is_deleted = FALSE;

-- =====================================================
-- ROW LEVEL SECURITY FOR DISTRICT TABLE
-- =====================================================
ALTER TABLE district ENABLE ROW LEVEL SECURITY;

-- DISTRICT: Public read and write access
DROP POLICY IF EXISTS "district_read_policy" ON district;
CREATE POLICY "district_read_policy" ON district
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "district_create_policy" ON district;
CREATE POLICY "district_create_policy" ON district
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "district_update_policy" ON district;
CREATE POLICY "district_update_policy" ON district
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "district_delete_policy" ON district;
CREATE POLICY "district_delete_policy" ON district
  FOR DELETE USING (true);
