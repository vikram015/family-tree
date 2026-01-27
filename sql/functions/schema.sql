-- Supabase Schema Setup Script
-- Run this in your Supabase SQL Editor (https://app.supabase.com -> SQL Editor)
CREATE TABLE IF NOT EXISTS caste (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,   
    created_at TIMESTAMP DEFAULT now(),
    modified_at TIMESTAMP DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    modified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT FALSE
);
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
CREATE TABLE IF NOT EXISTS state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  modified_at TIMESTAMP DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  modified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_deleted BOOLEAN DEFAULT FALSE
);

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
-- 1. CREATE VILLAGES TABLE
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
-- 2. CREATE TREE TABLE
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
-- 3. CREATE PEOPLE TABLE (Main Family Tree Data)
-- =====================================================
CREATE TABLE IF NOT EXISTS people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  gender VARCHAR(10),
  dob DATE,
  -- Foreign keys
  tree_id UUID NOT NULL REFERENCES tree(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT now(),
  modified_at TIMESTAMP DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  modified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT valid_gender CHECK (gender IN ('male', 'female', 'other'))
);

CREATE INDEX IF NOT EXISTS idx_people_name_lowercase ON people(LOWER(name));
CREATE INDEX IF NOT EXISTS idx_people_tree_id_name_lowercase ON people(tree_id, LOWER(name));

-- Create indexes for people table
CREATE INDEX IF NOT EXISTS idx_people_tree_id ON people(tree_id);
CREATE INDEX IF NOT EXISTS idx_people_search ON people USING GIN(to_tsvector('english', name));

-- =====================================================
-- 3b. CREATE PEOPLE_FIELD TABLE (Custom Fields)
-- =====================================================
CREATE TABLE IF NOT EXISTS people_field (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  modified_at TIMESTAMP DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  modified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_people_field_name_lowercase ON people_field(LOWER(field_name));

-- =====================================================
-- 3a. CREATE PEOPLE_ADDITIONAL_DETAIL TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS people_additional_detail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  people_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  people_field_id UUID NOT NULL REFERENCES people_field(id) ON DELETE CASCADE,
  field_value TEXT,
  created_at TIMESTAMP DEFAULT now(),
  modified_at TIMESTAMP DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  modified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_people_additional_people_id ON people_additional_detail(people_id);

--Relation table

CREATE TABLE IF NOT EXISTS people_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  related_person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  relation_type VARCHAR(50) NOT NULL,
  relation_subtype VARCHAR(50),
  created_at TIMESTAMP DEFAULT now(),
  modified_at TIMESTAMP DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  modified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT valid_relation_type CHECK (relation_type IN ('parent', 'spouse')),
  CONSTRAINT valid_relation_subtype CHECK (relation_subtype IN ('blood', 'adopted', 'married', 'divorced', NULL))
);

ALTER TABLE people_relations ENABLE ROW LEVEL SECURITY;

-- Create indexes for people_relations table
CREATE INDEX IF NOT EXISTS idx_people_relations_person_id ON people_relations(person_id);
CREATE INDEX IF NOT EXISTS idx_people_relations_related_person_id ON people_relations(related_person_id);



-- =====================================================
-- 4. CREATE BUSINESS_CATEGORIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS business_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- =====================================================
-- 5. CREATE BUSINESSES TABLE
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

-- Create indexes for businesses table

CREATE INDEX IF NOT EXISTS idx_business_people_id ON business(people_id);
CREATE INDEX IF NOT EXISTS idx_business_people_id_name ON business(people_id, LOWER(name));
CREATE INDEX IF NOT EXISTS idx_business_name_lowercase ON business(LOWER(name));
CREATE INDEX IF NOT EXISTS idx_business_search ON business USING GIN(to_tsvector('english', name));
-- =====================================================
-- 6. CREATE USERS TABLE
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
-- 7. ENABLE ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE people_additional_detail ENABLE ROW LEVEL SECURITY;
ALTER TABLE people_field ENABLE ROW LEVEL SECURITY;
ALTER TABLE business ENABLE ROW LEVEL SECURITY;
ALTER TABLE tree ENABLE ROW LEVEL SECURITY;
ALTER TABLE village ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE caste ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_caste ENABLE ROW LEVEL SECURITY;
ALTER TABLE state ENABLE ROW LEVEL SECURITY;
ALTER TABLE district ENABLE ROW LEVEL SECURITY; 
ALTER TABLE business_categories ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 8. CREATE RLS POLICIES (PUBLIC ACCESS FOR MIGRATION)
-- =====================================================

-- people_relations: Authenticated users can insert
DROP POLICY IF EXISTS "people_relations_create_policy" ON people_relations;
CREATE POLICY "people_relations_create_policy" ON people_relations
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
-- people_relations: Authenticated users can update
DROP POLICY IF EXISTS "people_relations_update_policy" ON people_relations;
CREATE POLICY "people_relations_update_policy" ON people_relations
  FOR UPDATE USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
-- people_relations: Authenticated users can delete
DROP POLICY IF EXISTS "people_relations_delete_policy" ON people_relations;
CREATE POLICY "people_relations_delete_policy" ON people_relations
  FOR DELETE USING (auth.role() = 'authenticated');
-- people_relations: Public read access
DROP POLICY IF EXISTS "people_relations_read_policy" ON people_relations;
CREATE POLICY "people_relations_read_policy" ON people_relations
  FOR SELECT USING (true);

-- STATE: Public read and write access
DROP POLICY IF EXISTS "state_read_policy" ON state;
CREATE POLICY "state_read_policy" ON state
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "state_create_policy" ON state;
CREATE POLICY "state_create_policy" ON state
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "state_update_policy" ON state;
CREATE POLICY "state_update_policy" ON state
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "state_delete_policy" ON state;
CREATE POLICY "state_delete_policy" ON state
  FOR DELETE USING (true);

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

-- VILLAGE: Public read and write access
DROP POLICY IF EXISTS "village_read_policy" ON village;
CREATE POLICY "village_read_policy" ON village
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "village_create_policy" ON village;
CREATE POLICY "village_create_policy" ON village
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "village_update_policy" ON village;
CREATE POLICY "village_update_policy" ON village
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "village_delete_policy" ON village;
CREATE POLICY "village_delete_policy" ON village
  FOR DELETE USING (true);

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

-- PEOPLE: Public read and write access
DROP POLICY IF EXISTS "people_read_policy" ON people;
CREATE POLICY "people_read_policy" ON people
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "people_create_policy" ON people;
CREATE POLICY "people_create_policy" ON people
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "people_update_policy" ON people;
CREATE POLICY "people_update_policy" ON people
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "people_delete_policy" ON people;
CREATE POLICY "people_delete_policy" ON people
  FOR DELETE USING (true);

-- PEOPLE_ADDITIONAL_DETAIL: Public read and write access
DROP POLICY IF EXISTS "people_additional_detail_read_policy" ON people_additional_detail;
CREATE POLICY "people_additional_detail_read_policy" ON people_additional_detail
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "people_additional_detail_create_policy" ON people_additional_detail;
CREATE POLICY "people_additional_detail_create_policy" ON people_additional_detail
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "people_additional_detail_update_policy" ON people_additional_detail;
CREATE POLICY "people_additional_detail_update_policy" ON people_additional_detail
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "people_additional_detail_delete_policy" ON people_additional_detail;
CREATE POLICY "people_additional_detail_delete_policy" ON people_additional_detail
  FOR DELETE USING (true);

-- PEOPLE_FIELD: Public read and write access
DROP POLICY IF EXISTS "people_field_read_policy" ON people_field;
CREATE POLICY "people_field_read_policy" ON people_field
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "people_field_create_policy" ON people_field;
CREATE POLICY "people_field_create_policy" ON people_field
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "people_field_update_policy" ON people_field;
CREATE POLICY "people_field_update_policy" ON people_field
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "people_field_delete_policy" ON people_field;
CREATE POLICY "people_field_delete_policy" ON people_field
  FOR DELETE USING (true);

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

-- SUB_CASTE: Public read and write access
DROP POLICY IF EXISTS "sub_caste_read_policy" ON sub_caste;
CREATE POLICY "sub_caste_read_policy" ON sub_caste
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "sub_caste_create_policy" ON sub_caste;
CREATE POLICY "sub_caste_create_policy" ON sub_caste
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "sub_caste_update_policy" ON sub_caste;
CREATE POLICY "sub_caste_update_policy" ON sub_caste
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "sub_caste_delete_policy" ON sub_caste;
CREATE POLICY "sub_caste_delete_policy" ON sub_caste
  FOR DELETE USING (true);

-- BUSINESS: Public read and write access
DROP POLICY IF EXISTS "business_read_policy" ON business;
CREATE POLICY "business_read_policy" ON business
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "business_create_policy" ON business;
CREATE POLICY "business_create_policy" ON business
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "business_update_policy" ON business;
CREATE POLICY "business_update_policy" ON business
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "business_delete_policy" ON business;
CREATE POLICY "business_delete_policy" ON business
  FOR DELETE USING (true);

-- BUSINESS_CATEGORIES: Public read and write access
DROP POLICY IF EXISTS "business_categories_read_policy" ON business_categories;
CREATE POLICY "business_categories_read_policy" ON business_categories
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "business_categories_create_policy" ON business_categories;
CREATE POLICY "business_categories_create_policy" ON business_categories
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "business_categories_update_policy" ON business_categories;
CREATE POLICY "business_categories_update_policy" ON business_categories
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "business_categories_delete_policy" ON business_categories;
CREATE POLICY "business_categories_delete_policy" ON business_categories
  FOR DELETE USING (true);

-- USERS: Public read and write access
DROP POLICY IF EXISTS "users_read_policy" ON users;
CREATE POLICY "users_read_policy" ON users
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "users_create_policy" ON users;
CREATE POLICY "users_create_policy" ON users
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "users_update_policy" ON users;
CREATE POLICY "users_update_policy" ON users
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "users_delete_policy" ON users;
CREATE POLICY "users_delete_policy" ON users
  FOR DELETE USING (true);
