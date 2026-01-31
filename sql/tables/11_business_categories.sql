-- =====================================================
-- TABLE: BUSINESS_CATEGORIES
-- =====================================================
CREATE TABLE IF NOT EXISTS business_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- =====================================================
-- INDEXES FOR BUSINESS_CATEGORIES TABLE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_business_categories_name_lowercase ON business_categories(LOWER(name));

-- =====================================================
-- ROW LEVEL SECURITY FOR BUSINESS_CATEGORIES TABLE
-- =====================================================
ALTER TABLE business_categories ENABLE ROW LEVEL SECURITY;

-- BUSINESS_CATEGORIES: Public read, authenticated write
DROP POLICY IF EXISTS "business_categories_read_policy" ON business_categories;
CREATE POLICY "business_categories_read_policy" ON business_categories
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "business_categories_create_policy" ON business_categories;
CREATE POLICY "business_categories_create_policy" ON business_categories
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "business_categories_update_policy" ON business_categories;
CREATE POLICY "business_categories_update_policy" ON business_categories
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "business_categories_delete_policy" ON business_categories;
CREATE POLICY "business_categories_delete_policy" ON business_categories
  FOR DELETE TO authenticated USING (true);
