-- =====================================================
-- TABLE: CASTE
-- =====================================================
CREATE TABLE IF NOT EXISTS caste (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,   
    created_at TIMESTAMP DEFAULT now(),
    modified_at TIMESTAMP DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    modified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT FALSE
);

-- =====================================================
-- INDEXES FOR CASTE TABLE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_caste_name_lowercase ON caste(LOWER(name)) WHERE is_deleted = FALSE;

-- =====================================================
-- ROW LEVEL SECURITY FOR CASTE TABLE
-- =====================================================
ALTER TABLE caste ENABLE ROW LEVEL SECURITY;

-- CASTE: Public read and write access
DROP POLICY IF EXISTS "caste_read_policy" ON caste;
CREATE POLICY "caste_read_policy" ON caste
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "caste_create_policy" ON caste;
CREATE POLICY "caste_create_policy" ON caste
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "caste_update_policy" ON caste;
CREATE POLICY "caste_update_policy" ON caste
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "caste_delete_policy" ON caste;
CREATE POLICY "caste_delete_policy" ON caste
  FOR DELETE USING (true);
