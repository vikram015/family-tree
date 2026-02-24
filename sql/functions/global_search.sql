-- =====================================================
-- FUNCTION: global_search
-- =====================================================
-- Description: Global search across people, businesses, and professions.
-- Returns enriched rows with village/tree context and parent hierarchy.
--
-- Parameters:
--   p_search_term: case-insensitive partial term
--
-- Returns:
--   entity_type: 'person' | 'business' | 'profession'
--   entity_id: row identifier for the matched entity
--   title: primary display text
--   subtitle: secondary display text
--   person_id: linked person (for person/business/profession rows)
--   person_name: linked person display name
--   tree_id: linked tree id
--   tree_name: linked tree name
--   village_id: linked village id
--   village_name: linked village name
--   caste_name: caste name
--   sub_caste_name: sub-caste name
--   parent_hierarchy: ancestor chain up to 5 generations
-- =====================================================

CREATE OR REPLACE FUNCTION global_search(
  p_search_term TEXT
)
RETURNS TABLE (
  entity_type TEXT,
  entity_id UUID,
  title TEXT,
  subtitle TEXT,
  person_id UUID,
  person_name TEXT,
  tree_id UUID,
  tree_name TEXT,
  village_id UUID,
  village_name TEXT,
  caste_name TEXT,
  sub_caste_name TEXT,
  parent_hierarchy JSONB
) AS $$
BEGIN
  IF p_search_term IS NULL OR LENGTH(TRIM(p_search_term)) < 2 THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH RECURSIVE people_context AS (
    SELECT
      p.id AS person_id,
      p.name AS person_name,
      p.gender,
      p.tree_id,
      t.name AS tree_name,
      v.id AS village_id,
      v.name AS village_name,
      c.name AS caste_name,
      sc.name AS sub_caste_name
    FROM people p
    JOIN tree t ON t.id = p.tree_id AND t.is_deleted = FALSE
    LEFT JOIN village v ON v.id = t.village_id
    LEFT JOIN caste c ON c.id = t.caste
    LEFT JOIN sub_caste sc ON sc.id = t.sub_caste
    WHERE p.is_deleted = FALSE
  ),
  parent_chain AS (
    SELECT
      pc.person_id,
      pr.related_person_id AS ancestor_id,
      1 AS generation
    FROM people_context pc
    LEFT JOIN people_relations pr
      ON pr.person_id = pc.person_id
      AND pr.relation_type = 'parent'
    LEFT JOIN people parent_p
      ON parent_p.id = pr.related_person_id
      AND parent_p.gender = 'male'
    WHERE parent_p.id IS NOT NULL

    UNION ALL

    SELECT
      pch.person_id,
      pr.related_person_id AS ancestor_id,
      pch.generation + 1 AS generation
    FROM parent_chain pch
    JOIN people_relations pr
      ON pr.person_id = pch.ancestor_id
      AND pr.relation_type = 'parent'
    JOIN people parent_p
      ON parent_p.id = pr.related_person_id
      AND parent_p.gender = 'male'
    WHERE pch.generation < 5
      AND pch.ancestor_id IS NOT NULL
  ),
  people_with_hierarchy AS (
    SELECT
      pc.person_id,
      pc.person_name,
      pc.tree_id,
      pc.tree_name,
      pc.village_id,
      pc.village_name,
      pc.caste_name,
      pc.sub_caste_name,
      COALESCE(
        JSONB_AGG(
          JSONB_BUILD_OBJECT(
            'id', pch.ancestor_id,
            'name', p2.name,
            'generation', pch.generation
          )
          ORDER BY pch.generation
        ) FILTER (WHERE pch.ancestor_id IS NOT NULL),
        '[]'::JSONB
      ) AS parent_hierarchy
    FROM people_context pc
    LEFT JOIN parent_chain pch ON pch.person_id = pc.person_id
    LEFT JOIN people p2 ON p2.id = pch.ancestor_id
    GROUP BY
      pc.person_id,
      pc.person_name,
      pc.tree_id,
      pc.tree_name,
      pc.village_id,
      pc.village_name,
      pc.caste_name,
      pc.sub_caste_name
  ),
  people_matches AS (
    SELECT
      'person'::TEXT AS entity_type,
      pwh.person_id AS entity_id,
      pwh.person_name::TEXT AS title,
      ('Village: ' || COALESCE(pwh.village_name, 'N/A'))::TEXT AS subtitle,
      pwh.person_id,
      pwh.person_name::TEXT,
      pwh.tree_id,
      pwh.tree_name::TEXT,
      pwh.village_id,
      pwh.village_name::TEXT,
      pwh.caste_name::TEXT,
      pwh.sub_caste_name::TEXT,
      pwh.parent_hierarchy
    FROM people_with_hierarchy pwh
    WHERE pwh.person_name ILIKE '%' || p_search_term || '%'
    LIMIT 20
  ),
  business_matches AS (
    SELECT
      'business'::TEXT AS entity_type,
      b.id AS entity_id,
      b.name::TEXT AS title,
      (
        COALESCE(b.category, 'General')
        || CASE WHEN pwh.person_name IS NOT NULL
          THEN ' | Owner: ' || pwh.person_name
          ELSE ''
        END
      )::TEXT AS subtitle,
      pwh.person_id,
      pwh.person_name::TEXT,
      pwh.tree_id,
      pwh.tree_name::TEXT,
      pwh.village_id,
      pwh.village_name::TEXT,
      pwh.caste_name::TEXT,
      pwh.sub_caste_name::TEXT,
      COALESCE(pwh.parent_hierarchy, '[]'::JSONB) AS parent_hierarchy
    FROM business b
    LEFT JOIN people_with_hierarchy pwh ON pwh.person_id = b.people_id
    WHERE b.is_deleted = FALSE
      AND (
        b.name ILIKE '%' || p_search_term || '%'
        OR COALESCE(b.category, '') ILIKE '%' || p_search_term || '%'
      )
    LIMIT 20
  ),
  profession_matches AS (
    SELECT
      'profession'::TEXT AS entity_type,
      prof.id AS entity_id,
      prof.name::TEXT AS title,
      (
        'Profession'
        || CASE WHEN pwh.person_name IS NOT NULL
          THEN ' | ' || pwh.person_name
          ELSE ''
        END
      )::TEXT AS subtitle,
      pwh.person_id,
      pwh.person_name::TEXT,
      pwh.tree_id,
      pwh.tree_name::TEXT,
      pwh.village_id,
      pwh.village_name::TEXT,
      pwh.caste_name::TEXT,
      pwh.sub_caste_name::TEXT,
      COALESCE(pwh.parent_hierarchy, '[]'::JSONB) AS parent_hierarchy
    FROM professions prof
    LEFT JOIN people_professions pp
      ON pp.profession_id = prof.id
      AND pp.is_deleted = FALSE
    LEFT JOIN people_with_hierarchy pwh
      ON pwh.person_id = pp.people_id
    WHERE prof.is_deleted = FALSE
      AND (
        prof.name ILIKE '%' || p_search_term || '%'
        OR COALESCE(prof.category, '') ILIKE '%' || p_search_term || '%'
      )
    LIMIT 20
  )
  SELECT * FROM people_matches
  UNION ALL
  SELECT * FROM business_matches
  UNION ALL
  SELECT * FROM profession_matches
  LIMIT 40;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
