-- =====================================================
-- TABLE: TREE
-- =====================================================
CREATE TABLE IF NOT EXISTS tree (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  village_id UUID REFERENCES village(id) ON DELETE SET NULL,
  description TEXT,
  caste VARCHAR(100),
  sub_caste VARCHAR(100),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT now(),
  modified_at TIMESTAMP DEFAULT now(),
  modified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_deleted BOOLEAN DEFAULT FALSE
);

-- =====================================================
-- INDEXES FOR TREE TABLE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_tree_village_id ON tree(village_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_tree_name_lowercase ON tree(LOWER(name)) WHERE is_deleted = FALSE;

-- =====================================================
-- ROW LEVEL SECURITY FOR TREE TABLE
-- =====================================================
ALTER TABLE tree ENABLE ROW LEVEL SECURITY;

-- TREE: Public read and write access
DROP POLICY IF EXISTS "tree_read_policy" ON tree;
CREATE POLICY "tree_read_policy" ON tree
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "tree_create_policy" ON tree;
CREATE POLICY "tree_create_policy" ON tree
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "tree_update_policy" ON tree;
CREATE POLICY "tree_update_policy" ON tree
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "tree_delete_policy" ON tree;
CREATE POLICY "tree_delete_policy" ON tree
  FOR DELETE USING (true);
