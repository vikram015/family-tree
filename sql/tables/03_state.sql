-- =====================================================
-- TABLE: STATE
-- =====================================================
CREATE TABLE IF NOT EXISTS state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  modified_at TIMESTAMP DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  modified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_deleted BOOLEAN DEFAULT FALSE
);

-- =====================================================
-- INDEXES FOR STATE TABLE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_state_name_lowercase ON state(LOWER(name)) WHERE is_deleted = FALSE;

-- =====================================================
-- ROW LEVEL SECURITY FOR STATE TABLE
-- =====================================================
ALTER TABLE state ENABLE ROW LEVEL SECURITY;

-- STATE: Public read, authenticated write
DROP POLICY IF EXISTS "state_read_policy" ON state;
CREATE POLICY "state_read_policy" ON state
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "state_create_policy" ON state;
CREATE POLICY "state_create_policy" ON state
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "state_update_policy" ON state;
CREATE POLICY "state_update_policy" ON state
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "state_delete_policy" ON state;
CREATE POLICY "state_delete_policy" ON state
  FOR DELETE TO authenticated USING (true);
