-- =====================================================
-- FUNCTION: get_businesses_by_village
-- =====================================================
-- Description: Get all businesses in a village with complete person details
-- including parent hierarchy up to 5 generations
--
-- Parameters:
--   p_village_id: The village to fetch businesses from
--
-- Returns: A table with business details and person hierarchy as JSON
-- =====================================================

CREATE OR REPLACE FUNCTION get_businesses_by_village(
  p_village_id UUID
)
RETURNS TABLE (
  business_id UUID,
  business_name VARCHAR,
  business_category VARCHAR,
  business_description TEXT,
  business_contact VARCHAR,
  business_created_at TIMESTAMP,
  person_id UUID,
  person_name VARCHAR,
  person_gender VARCHAR,
  person_dob DATE,
  village_id UUID,
  village_name VARCHAR,
  caste_name VARCHAR,
  sub_caste_name VARCHAR,
  tree_id UUID,
  tree_name VARCHAR,
  parent_hierarchy JSONB
) AS $$
DECLARE
  v_tree_ids UUID[];
BEGIN
  -- Get all tree IDs for the selected village
  SELECT ARRAY_AGG(t.id)
  INTO v_tree_ids
  FROM tree t
  WHERE t.village_id = p_village_id AND t.is_deleted = FALSE;

  -- Return early if no trees found
  IF v_tree_ids IS NULL OR ARRAY_LENGTH(v_tree_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  -- Main query with business and person hierarchy
  RETURN QUERY
  WITH RECURSIVE parent_chain AS (
    -- Base case: Start with the person
    SELECT
      p.id,
      p.name,
      p.gender,
      p.dob,
      p.tree_id,
      pr.related_person_id,
      pr.relation_type,
      parent_p.gender as parent_gender,
      1 AS generation
    FROM people p
    LEFT JOIN people_relations pr ON p.id = pr.person_id AND pr.relation_type = 'parent'
    LEFT JOIN people parent_p ON pr.related_person_id = parent_p.id
    WHERE p.tree_id = ANY(v_tree_ids)

    UNION ALL

    -- Recursive case: Get parents of parents up to 5 generations (only males)
    SELECT
      pc.id,
      pc.name,
      pc.gender,
      pc.dob,
      pc.tree_id,
      pr.related_person_id,
      pr.relation_type,
      parent_p.gender as parent_gender,
      pc.generation + 1
    FROM parent_chain pc
    LEFT JOIN people_relations pr ON pc.related_person_id = pr.person_id AND pr.relation_type = 'parent'
    LEFT JOIN people parent_p ON pr.related_person_id = parent_p.id
    WHERE pc.generation < 5
      AND pc.related_person_id IS NOT NULL
      AND pc.parent_gender = 'male'
	  AND parent_p.gender = 'male'
  ),
  parent_data AS (
    -- Build the parent hierarchy JSON structure
    SELECT
      p.id as person_id,
      p.name as person_name,
      p.gender,
      p.dob,
      p.tree_id,
      t.name as tree_name,
      v.id as village_id,
      v.name as village_name,
      c.name as caste_name,
      sc.name as sub_caste_name,
      JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'id', pc.related_person_id,
          'name', parent_person.name,
          'generation', pc.generation
        ) ORDER BY pc.generation
      ) FILTER (WHERE pc.related_person_id IS NOT NULL) as parent_hierarchy
    FROM people p
    JOIN tree t ON p.tree_id = t.id
    JOIN village v ON t.village_id = v.id
    LEFT JOIN caste c ON t.caste = c.id
    LEFT JOIN sub_caste sc ON t.sub_caste = sc.id
    LEFT JOIN parent_chain pc ON p.id = pc.id AND pc.generation >= 1
    LEFT JOIN people parent_person ON pc.related_person_id = parent_person.id
    WHERE p.tree_id = ANY(v_tree_ids)
    GROUP BY p.id, p.name, p.gender, p.dob, p.tree_id, t.name, v.id, v.name, c.name, sc.name
  )
  SELECT
    b.id as business_id,
    b.name as business_name,
    b.category as business_category,
    b.description as business_description,
    b.contact as business_contact,
    b.created_at as business_created_at,
    pd.person_id,
    pd.person_name,
    pd.gender,
    pd.dob,
    pd.village_id,
    pd.village_name,
    pd.caste_name,
    pd.sub_caste_name,
    pd.tree_id,
    pd.tree_name,
    COALESCE(pd.parent_hierarchy, '[]'::JSONB) as parent_hierarchy
  FROM business b
  LEFT JOIN parent_data pd ON b.people_id = pd.person_id
  WHERE b.is_deleted = FALSE;

END;
$$ LANGUAGE plpgsql;