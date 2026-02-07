-- =====================================================
-- FUNCTION: link_spouse_in_tree
-- Links an EXISTING person as a spouse to a target person in the tree.
-- Also replicates the "copy children" logic: existing children of the
-- target person usually imply they are children of this spouse too (contextual).
-- Input: p_tree_id, p_person_id_1 (The person initiating the link, usually the one already in view), 
--        p_person_id_2 (The person being linked - the one found via search)
-- Output: JSON with success status
-- =====================================================
CREATE OR REPLACE FUNCTION link_spouse_in_tree(
  p_person_id_1 UUID, -- The "Target" or "Main" person
  p_person_id_2 UUID, -- The "Linked" person (Spouse)
  p_replace_person_id UUID DEFAULT NULL -- Optional: Placeholder to remove
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_relation_subtype VARCHAR := 'married'; -- Default subtype
BEGIN
  
  -- 1. Create Bidirectional Spouse Relationship
  
  -- Link Person 1 -> Person 2
  INSERT INTO people_relations (person_id, related_person_id, relation_type, relation_subtype, created_at, modified_at)
  SELECT p_person_id_1, p_person_id_2, 'spouse', v_relation_subtype, now(), now()
  WHERE NOT EXISTS (
    SELECT 1 FROM people_relations 
    WHERE person_id = p_person_id_1 AND related_person_id = p_person_id_2 AND relation_type = 'spouse'
  );
  
  -- Link Person 2 -> Person 1
  INSERT INTO people_relations (person_id, related_person_id, relation_type, relation_subtype, created_at, modified_at)
  SELECT p_person_id_2, p_person_id_1, 'spouse', v_relation_subtype, now(), now()
  WHERE NOT EXISTS (
    SELECT 1 FROM people_relations 
    WHERE person_id = p_person_id_2 AND related_person_id = p_person_id_1 AND relation_type = 'spouse'
  );
  
  -- 2. Copy Children Logic (Bidirectional copy)
  --    If Person 1 has children, link them to Person 2 as Parent.
  --    If Person 2 has children (less likely in this UI context but possible), link them to Person 1 as Parent??
  --    (Based on add_person_to_tree, we only do Target -> New Person logic. So we assume Person 1 is the 'Target' who has the children currently visible in the tree).

  -- Map children of Person 1 to Person 2
  INSERT INTO people_relations (person_id, related_person_id, relation_type, relation_subtype, created_at, modified_at)
  SELECT child_relations.person_id, p_person_id_2, 'parent', 'blood', now(), now()
  FROM people_relations AS child_relations
  WHERE child_relations.related_person_id = p_person_id_1
    AND child_relations.relation_type = 'parent' -- person_id is child of p_person_id_1
    AND NOT EXISTS (
      SELECT 1 FROM people_relations pr2
      WHERE pr2.person_id = child_relations.person_id
        AND pr2.related_person_id = p_person_id_2
        AND pr2.relation_type = 'parent'
    );
    
  -- Map children of Person 2 to Person 1 (Symmetric logic, just in case the linked person already brings children into the marriage)
  INSERT INTO people_relations (person_id, related_person_id, relation_type, relation_subtype, created_at, modified_at)
  SELECT child_relations.person_id, p_person_id_1, 'parent', 'blood', now(), now()
  FROM people_relations AS child_relations
  WHERE child_relations.related_person_id = p_person_id_2
    AND child_relations.relation_type = 'parent' -- person_id is child of p_person_id_2
    AND NOT EXISTS (
      SELECT 1 FROM people_relations pr2
      WHERE pr2.person_id = child_relations.person_id
        AND pr2.related_person_id = p_person_id_1
        AND pr2.relation_type = 'parent'
    );

  -- 3. Replace Placeholder (if provided)
  IF p_replace_person_id IS NOT NULL THEN
    
    -- a. Move any children linked ONLY to the placeholder to the new spouse
    UPDATE people_relations
    SET related_person_id = p_person_id_2
    WHERE related_person_id = p_replace_person_id
      AND relation_type = 'parent'
      AND person_id NOT IN (
        SELECT person_id FROM people_relations 
        WHERE related_person_id = p_person_id_2 AND relation_type = 'parent'
      );

    -- b. Delete the placeholder relations
    DELETE FROM people_relations 
    WHERE person_id = p_replace_person_id 
       OR related_person_id = p_replace_person_id;
       
    -- c. Delete the placeholder person
    DELETE FROM people WHERE id = p_replace_person_id;
    
  END IF;

  v_result := json_build_object(
    'success', true,
    'message', 'Spouse linked successfully and children relationships updated.'
  );
  
  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql;
