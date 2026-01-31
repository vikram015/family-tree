-- =====================================================
-- TABLE: SUB_CASTE
-- =====================================================
CREATE TABLE IF NOT EXISTS sub_caste (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,  
    caste_id UUID REFERENCES caste(id) ON DELETE SET NULL, 
    created_at TIMESTAMP DEFAULT now(),
    modified_at TIMESTAMP DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    modified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT FALSE
);

-- =====================================================
-- INDEXES FOR SUB_CASTE TABLE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_sub_caste_name_lowercase ON sub_caste(LOWER(name)) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_sub_caste_caste_id ON sub_caste(caste_id) WHERE is_deleted = FALSE;

-- =====================================================
-- ROW LEVEL SECURITY FOR SUB_CASTE TABLE
-- =====================================================
ALTER TABLE sub_caste ENABLE ROW LEVEL SECURITY;

-- SUB_CASTE: Public read, authenticated write
DROP POLICY IF EXISTS "sub_caste_read_policy" ON sub_caste;
CREATE POLICY "sub_caste_read_policy" ON sub_caste
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "sub_caste_create_policy" ON sub_caste;
CREATE POLICY "sub_caste_create_policy" ON sub_caste
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "sub_caste_update_policy" ON sub_caste;
CREATE POLICY "sub_caste_update_policy" ON sub_caste
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "sub_caste_delete_policy" ON sub_caste;
CREATE POLICY "sub_caste_delete_policy" ON sub_caste
  FOR DELETE TO authenticated USING (true);
