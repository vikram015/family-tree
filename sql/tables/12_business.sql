-- =====================================================
-- TABLE: BUSINESS
-- =====================================================
CREATE TABLE IF NOT EXISTS business (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(255),
  description TEXT,
  -- Owner reference
  people_id UUID REFERENCES people(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT now(),
  modified_at TIMESTAMP DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  modified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_deleted BOOLEAN DEFAULT FALSE
);

-- =====================================================
-- INDEXES FOR BUSINESS TABLE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_business_people_id ON business(people_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_business_people_id_name ON business(people_id, LOWER(name)) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_business_name_lowercase ON business(LOWER(name)) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_business_search ON business USING GIN(to_tsvector('english', name));

-- =====================================================
-- ROW LEVEL SECURITY FOR BUSINESS TABLE
-- =====================================================
ALTER TABLE business ENABLE ROW LEVEL SECURITY;

-- BUSINESS: Public read, authenticated write
DROP POLICY IF EXISTS "business_read_policy" ON business;
CREATE POLICY "business_read_policy" ON business
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "business_create_policy" ON business;
CREATE POLICY "business_create_policy" ON business
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "business_update_policy" ON business;
CREATE POLICY "business_update_policy" ON business
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "business_delete_policy" ON business;
CREATE POLICY "business_delete_policy" ON business
  FOR DELETE TO authenticated USING (true);
