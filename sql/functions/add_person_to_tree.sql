-- =====================================================
-- FUNCTION: add_person_to_tree
-- Adds a new person to a family tree with optional relationships
-- Supports adding child with two parents or creating spouse with both targets
-- Input: p_tree_id, p_name, p_gender, p_dob, p_relation_type, p_related_person_id, p_related_person_id_2, p_relation_subtype, p_is_reverse_relation
-- Output: JSON with new person ID and success status
-- =====================================================
CREATE OR REPLACE FUNCTION add_person_to_tree(
  p_tree_id UUID,
  p_name VARCHAR,
  p_gender VARCHAR DEFAULT NULL,
  p_dob DATE DEFAULT NULL,
  p_relation_type VARCHAR DEFAULT NULL,
  p_related_person_id UUID DEFAULT NULL,
  p_relation_subtype VARCHAR DEFAULT NULL,
  p_is_reverse_relation BOOLEAN DEFAULT FALSE,
  p_additional_fields JSONB DEFAULT NULL,
  p_related_person_id_2 UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_new_person_id UUID;
  v_field_key TEXT;
  v_field_value TEXT;
  v_field_id UUID;
  v_result JSON;
  v_spouse_id UUID;
  v_target_gender VARCHAR;
BEGIN
  
  -- Generate new UUID for the person
  v_new_person_id := gen_random_uuid();
  
  -- Insert new person into people table
  INSERT INTO people (id, name, gender, dob, tree_id, created_at, modified_at)
  VALUES (v_new_person_id, p_name, p_gender, p_dob, p_tree_id, now(), now());
  
  -- If relationship information is provided, create the relationship based on type
  IF p_relation_type IS NOT NULL AND p_related_person_id IS NOT NULL THEN
    
    -- PARENT: Create parent relationship (used for both adding child and adding parent)
    -- When adding child: new_person → parent → related_person_id (target)
    --                    optionally: new_person → parent → related_person_id_2 (second parent)
    -- When adding parent: related_person_id (target) → parent → new_person (reverse)
    IF p_relation_type = 'parent' THEN
      IF p_is_reverse_relation THEN
        -- Reverse: related_person_id → parent → new_person
        INSERT INTO people_relations (person_id, related_person_id, relation_type, relation_subtype, created_at, modified_at)
        VALUES (p_related_person_id, v_new_person_id, 'parent', p_relation_subtype, now(), now());
      ELSE
        -- Normal: new_person → parent → related_person_id (first parent)
        INSERT INTO people_relations (person_id, related_person_id, relation_type, relation_subtype, created_at, modified_at)
        VALUES (v_new_person_id, p_related_person_id, 'parent', p_relation_subtype, now(), now());
        
        -- Handle second parent (spouse of first parent)
        IF p_related_person_id_2 IS NOT NULL THEN
          -- Use provided second parent (spouse)
          v_spouse_id := p_related_person_id_2;
        ELSE
          -- AUTO-CREATE DEFAULT SPOUSE if target has no spouse
          -- Get target's spouse (if any)
          SELECT related_person_id INTO v_spouse_id FROM people_relations 
          WHERE person_id = p_related_person_id AND relation_type = 'spouse' LIMIT 1;
          
          -- If target has no spouse, create one automatically
          IF v_spouse_id IS NULL THEN
            -- Get target's gender to create opposite gender spouse
            SELECT gender INTO v_target_gender FROM people WHERE id = p_related_person_id;
            
            -- Create default spouse with opposite gender
            v_spouse_id := gen_random_uuid();
            INSERT INTO people (id, name, gender, dob, tree_id, created_at, modified_at)
            VALUES (
              v_spouse_id, 
              '', -- Empty name for auto-created spouse
              CASE WHEN v_target_gender = 'male' THEN 'female' ELSE 'male' END,
              NULL,
              p_tree_id,
              now(),
              now()
            );
            
            -- Create bidirectional spouse relationships
            INSERT INTO people_relations (person_id, related_person_id, relation_type, relation_subtype, created_at, modified_at)
            VALUES (p_related_person_id, v_spouse_id, 'spouse', 'married', now(), now());
            
            INSERT INTO people_relations (person_id, related_person_id, relation_type, relation_subtype, created_at, modified_at)
            VALUES (v_spouse_id, p_related_person_id, 'spouse', 'married', now(), now());
            
            -- IMPORTANT: Map all existing children of the target person to the newly created spouse
            -- This ensures that when we query the spouse's children, existing children are also returned
            INSERT INTO people_relations (person_id, related_person_id, relation_type, relation_subtype, created_at, modified_at)
            SELECT child_relations.person_id, v_spouse_id, 'parent', 'blood', now(), now()
            FROM people_relations AS child_relations
            WHERE child_relations.related_person_id = p_related_person_id
              AND child_relations.relation_type = 'parent'
              -- Only add if this relationship doesn't already exist
              AND NOT EXISTS (
                SELECT 1 FROM people_relations pr2
                WHERE pr2.person_id = child_relations.person_id
                  AND pr2.related_person_id = v_spouse_id
                  AND pr2.relation_type = 'parent'
              );
          END IF;
        END IF;
        
        -- Add spouse as second parent of the new child
        -- This creates: new_person → parent → spouse
        -- Which means the child has the spouse as a parent
        -- And when spouse's children are queried, this child will be found
        IF v_spouse_id IS NOT NULL THEN
          INSERT INTO people_relations (person_id, related_person_id, relation_type, relation_subtype, created_at, modified_at)
          VALUES (v_new_person_id, v_spouse_id, 'parent', p_relation_subtype, now(), now());
        END IF;
      END IF;
    
    -- SPOUSE: bidirectional spouse relationship
    -- Only accepts one target. p_related_person_id_2 must be NULL for spouse relationships
    ELSIF p_relation_type = 'spouse' THEN
      INSERT INTO people_relations (person_id, related_person_id, relation_type, relation_subtype, created_at, modified_at)
      VALUES (v_new_person_id, p_related_person_id, 'spouse', p_relation_subtype, now(), now());
      
      INSERT INTO people_relations (person_id, related_person_id, relation_type, relation_subtype, created_at, modified_at)
      VALUES (p_related_person_id, v_new_person_id, 'spouse', p_relation_subtype, now(), now());
      
      -- IMPORTANT: Map all existing children of the target person to the newly added spouse
      -- This ensures that when we query the spouse's children, existing children are also returned
      INSERT INTO people_relations (person_id, related_person_id, relation_type, relation_subtype, created_at, modified_at)
      SELECT child_relations.person_id, v_new_person_id, 'parent', 'blood', now(), now()
      FROM people_relations AS child_relations
      WHERE child_relations.related_person_id = p_related_person_id
        AND child_relations.relation_type = 'parent'
        -- Only add if this relationship doesn't already exist
        AND NOT EXISTS (
          SELECT 1 FROM people_relations pr2
          WHERE pr2.person_id = child_relations.person_id
            AND pr2.related_person_id = v_new_person_id
            AND pr2.relation_type = 'parent'
        );
    END IF;
  END IF;
  
  -- If additional fields are provided, insert them into people_additional_detail table
  IF p_additional_fields IS NOT NULL THEN
    FOR v_field_key, v_field_value IN
    SELECT key, value FROM jsonb_each_text(p_additional_fields)
    LOOP
      -- Get the field ID (must already exist in people_field)
      SELECT id INTO v_field_id FROM people_field WHERE field_name = v_field_key LIMIT 1;
      
      -- Only insert if field exists
      IF v_field_id IS NOT NULL THEN
        INSERT INTO people_additional_detail (people_id, people_field_id, field_value, created_at, modified_at)
        VALUES (v_new_person_id, v_field_id, v_field_value, now(), now());
      END IF;
    END LOOP;
  END IF;
  
  -- Build result JSON
  v_result := json_build_object(
    'success', true,
    'person_id', v_new_person_id,
    'name', p_name,
    'gender', p_gender,
    'dob', p_dob,
    'tree_id', p_tree_id,
    'relation_type', p_relation_type,
    'relation_subtype', p_relation_subtype,
    'related_person_id', p_related_person_id,
    'fields_added', CASE WHEN p_additional_fields IS NOT NULL THEN (SELECT count(*) FROM jsonb_object_keys(p_additional_fields)) ELSE 0 END
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
