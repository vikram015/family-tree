-- =====================================================
-- FUNCTION: get_complete_tree_by_id
-- Returns the complete family tree with all members and their relationships
-- Input: p_tree_id (UUID of the family tree)
-- Output: JSON with tree details and all members with their parents, children, spouses, siblings
-- =====================================================
CREATE OR REPLACE FUNCTION get_complete_tree_by_id(p_tree_id UUID)
RETURNS JSON AS $$
DECLARE
  v_tree_info JSON;
  v_members JSON;
  v_result JSON;
BEGIN
  
  -- Get tree information with location, district, state hierarchy
  SELECT json_build_object(
    'id', t.id,
    'name', t.name,
    'description', t.description,
    'caste', t.caste,
    'sub_caste', t.sub_caste,
    'created_at', t.created_at,
    'modified_at', t.modified_at,
    'location', CASE 
      WHEN v.id IS NOT NULL THEN json_build_object(
        'id', v.id,
        'name', v.name,
        'district', CASE 
          WHEN d.id IS NOT NULL THEN json_build_object(
            'id', d.id,
            'name', d.name,
            'state', CASE 
              WHEN s.id IS NOT NULL THEN json_build_object(
                'id', s.id,
                'name', s.name
              )
              ELSE NULL
            END
          )
          ELSE NULL
        END
      )
      ELSE NULL
    END
  ) INTO v_tree_info
  FROM tree t
  LEFT JOIN location v ON t.location_id = v.id
  LEFT JOIN district d ON v.district_id = d.id
  LEFT JOIN state s ON d.state_id = s.id
  WHERE t.id = p_tree_id;

  -- If tree doesn't exist, return error
  IF v_tree_info IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Tree not found',
      'data', NULL
    );
  END IF;

  -- Get all members with their complete relationships
  WITH RECURSIVE hierarchy AS (
    -- 1. Base Case: All members of the current tree
    SELECT * FROM people WHERE tree_id = p_tree_id
    
    UNION
    
    -- 2. Include Spouses of current tree members (who might be in other trees)
    SELECT spouse.*
    FROM people member
    JOIN people_relations pr ON member.id = pr.person_id AND pr.relation_type = 'spouse'
    JOIN people spouse ON pr.related_person_id = spouse.id
    WHERE member.tree_id = p_tree_id
    
    UNION
    
    -- 3. Recursive Step: Get children of anyone currently in the hierarchy
    SELECT child.*
    FROM hierarchy parent
    JOIN people_relations pr ON parent.id = pr.related_person_id AND pr.relation_type = 'parent'
    JOIN people child ON pr.person_id = child.id
  )
  SELECT json_agg(
    json_build_object(
      'id', p.id,
      'name', p.name,
      'gender', p.gender,
      'dob', p.dob,
      'blood_group', p.blood_group,
      'is_alive', p.is_alive,
      'deceased_date', p.deceased_date,
      'photo_url', p.photo_url,
      'tree_id', p.tree_id,
      'created_at', p.created_at,
      'parents', COALESCE(
        (SELECT json_agg(json_build_object(
          'id', p_parent.id,
          'name', p_parent.name,
          'gender', p_parent.gender,
          'dob', p_parent.dob,
          'relation_subtype', COALESCE(pr.relation_subtype, 'blood'),
          'type', COALESCE(pr.relation_subtype, 'blood')
        ))
        FROM people_relations pr
        JOIN people p_parent ON pr.related_person_id = p_parent.id
        WHERE pr.person_id = p.id AND pr.relation_type = 'parent'),
        '[]'::json
      ),
      'children', COALESCE(
        (SELECT json_agg(json_build_object(
          'id', p_child.id,
          'name', p_child.name,
          'gender', p_child.gender,
          'dob', p_child.dob,
          'relation_subtype', COALESCE(pr.relation_subtype, 'blood'),
          'type', COALESCE(pr.relation_subtype, 'blood')
        ))
        FROM people_relations pr
        JOIN people p_child ON pr.person_id = p_child.id
        WHERE pr.related_person_id = p.id AND pr.relation_type = 'parent'),
        '[]'::json
      ),
      'spouses', COALESCE(
        (SELECT json_agg(json_build_object(
          'id', p_spouse.id,
          'name', p_spouse.name,
          'gender', p_spouse.gender,
          'dob', p_spouse.dob,
          'relation_subtype', p_spouse.relation_subtype,
          'type', p_spouse.relation_subtype
        ))
        FROM (
          SELECT
            p_spouse.id,
            p_spouse.name,
            p_spouse.gender,
            p_spouse.dob,
            CASE
              WHEN bool_or(COALESCE(pr.relation_subtype, 'married') = 'divorced') THEN 'divorced'
              WHEN bool_or(COALESCE(pr.relation_subtype, 'married') = 'married') THEN 'married'
              ELSE COALESCE(max(pr.relation_subtype), 'married')
            END AS relation_subtype
          FROM (
            SELECT
              pr.related_person_id AS spouse_id,
              pr.relation_subtype
            FROM people_relations pr
            WHERE pr.person_id = p.id AND pr.relation_type = 'spouse'
            UNION ALL
            SELECT
              pr.person_id AS spouse_id,
              pr.relation_subtype
            FROM people_relations pr
            WHERE pr.related_person_id = p.id AND pr.relation_type = 'spouse'
          ) pr
          JOIN people p_spouse ON p_spouse.id = pr.spouse_id
          GROUP BY p_spouse.id, p_spouse.name, p_spouse.gender, p_spouse.dob
        ) AS p_spouse),
        '[]'::json
      ),
      'siblings', COALESCE(
        (SELECT json_agg(json_build_object(
          'id', p_sibling.id,
          'name', p_sibling.name,
          'gender', p_sibling.gender,
          'dob', p_sibling.dob
        ))
        FROM (
          SELECT DISTINCT p1.id, p1.name, p1.gender, p1.dob
          FROM people p1
          INNER JOIN people_relations pr1 ON p1.id = pr1.person_id
          INNER JOIN people_relations pr2 ON pr1.related_person_id = pr2.related_person_id
          WHERE pr2.person_id = p.id 
            AND pr1.relation_type = 'parent'
            AND pr2.relation_type = 'parent'
            AND p1.id != p.id
        ) AS p_sibling),
        '[]'::json
      )
    )
    ORDER BY p.name
  ) INTO v_members
  FROM hierarchy p;

  -- Build final result with statistics
  v_result := json_build_object(
    'success', true,
    'tree', v_tree_info,
    'members', COALESCE(v_members, '[]'::json),
    'statistics', json_build_object(
      'total_members', COALESCE(json_array_length(v_members), 0),
      'male_count', (
        SELECT COUNT(*)
        FROM people
        WHERE tree_id = p_tree_id AND gender = 'male'
      ),
      'female_count', (
        SELECT COUNT(*)
        FROM people
        WHERE tree_id = p_tree_id AND gender = 'female'
      ),
      'total_relations', (
        SELECT COUNT(*)
        FROM people_relations pr
        JOIN people p ON pr.person_id = p.id
        WHERE p.tree_id = p_tree_id
      )
    )
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE;
