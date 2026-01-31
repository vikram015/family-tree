-- =====================================================
-- TABLE: USERS
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255),
  name VARCHAR(255),
  people_id UUID REFERENCES people(id) ON DELETE SET NULL,
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT now(),
  modified_at TIMESTAMP DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  modified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_deleted BOOLEAN DEFAULT FALSE
);

-- =====================================================
-- INDEXES FOR USERS TABLE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_users_email_lowercase ON users(LOWER(email)) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_users_people_id ON users(people_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role) WHERE is_deleted = FALSE;

-- =====================================================
-- ROW LEVEL SECURITY FOR USERS TABLE
-- =====================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- USERS: Public read and write access
-- USERS: Public read, authenticated write
DROP POLICY IF EXISTS "users_read_policy" ON users;
CREATE POLICY "users_read_policy" ON users
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "users_create_policy" ON users;
CREATE POLICY "users_create_policy" ON users
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "users_update_policy" ON users;
CREATE POLICY "users_update_policy" ON users
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "users_delete_policy" ON users;
CREATE POLICY "users_delete_policy" ON users
  FOR DELETE TO authenticated USING (true);
