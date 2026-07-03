-- =====================================================
-- TABLE: LOCATION
-- =====================================================
CREATE TABLE IF NOT EXISTS location (
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
-- INDEXES FOR LOCATION TABLE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_location_name_lowercase ON location(LOWER(name)) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_location_district_id ON location(district_id) WHERE is_deleted = FALSE;

-- =====================================================
-- ROW LEVEL SECURITY FOR LOCATION TABLE
-- =====================================================
ALTER TABLE location ENABLE ROW LEVEL SECURITY;

-- LOCATION: Public read and write access
DROP POLICY IF EXISTS "location_read_policy" ON location;
CREATE POLICY "location_read_policy" ON location
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "location_create_policy" ON location;
CREATE POLICY "location_create_policy" ON location
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "location_update_policy" ON location;
CREATE POLICY "location_update_policy" ON location
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "location_delete_policy" ON location;
CREATE POLICY "location_delete_policy" ON location
  FOR DELETE USING (true);
