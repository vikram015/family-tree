-- =====================================================
-- TABLE: PEOPLE_RELATIONS
-- =====================================================
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

-- =====================================================
-- INDEXES FOR PEOPLE_RELATIONS TABLE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_people_relations_person ON people_relations(person_id, relation_type);
CREATE INDEX IF NOT EXISTS idx_people_relations_related ON people_relations(related_person_id, relation_type);
CREATE INDEX IF NOT EXISTS idx_people_relations_person_id ON people_relations(person_id);
CREATE INDEX IF NOT EXISTS idx_people_relations_related_person_id ON people_relations(related_person_id);

-- =====================================================
-- ROW LEVEL SECURITY FOR PEOPLE_RELATIONS TABLE
-- =====================================================
ALTER TABLE people_relations ENABLE ROW LEVEL SECURITY;

-- PEOPLE_RELATIONS: Public read, authenticated write
DROP POLICY IF EXISTS "people_relations_read_policy" ON people_relations;
CREATE POLICY "people_relations_read_policy" ON people_relations
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "people_relations_create_policy" ON people_relations;
CREATE POLICY "people_relations_create_policy" ON people_relations
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "people_relations_update_policy" ON people_relations;
CREATE POLICY "people_relations_update_policy" ON people_relations
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "people_relations_delete_policy" ON people_relations;
CREATE POLICY "people_relations_delete_policy" ON people_relations
  FOR DELETE TO authenticated USING (true);
