-- =====================================================
-- FUNCTION: add_person_to_tree
-- Adds a new person to a family tree with optional relationships
-- Supports adding child with two parents or creating spouse with both targets
-- Returns ALL affected nodes with full relationship data so the UI can
-- merge changes without a full tree reload.
-- Input: p_tree_id, p_name, p_gender, p_dob, p_relation_type, p_related_person_id, p_related_person_id_2, p_relation_subtype, p_is_reverse_relation
-- Output: JSON with new person ID, success status, and affected_nodes array
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
  p_related_person_id_2 UUID DEFAULT NULL,
  p_blood_group VARCHAR DEFAULT NULL,
  p_is_alive BOOLEAN DEFAULT TRUE,
  p_deceased_date DATE DEFAULT NULL,
  p_photo_url TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_access JSON;
  v_new_person_id UUID;
  v_field_key TEXT;
  v_field_value TEXT;
  v_field_id UUID;
  v_result JSON;
  v_spouse_id UUID;
  v_target_gender VARCHAR;
  v_affected_ids UUID[];
  v_affected_nodes JSON;
  v_auto_created_spouse_id UUID; -- Track separately if a spouse was auto-created
BEGIN
  v_access := check_tree_write_access(p_tree_id);
  IF NOT COALESCE((v_access->>'allowed')::BOOLEAN, false) THEN
    RETURN json_build_object(
      'success', false,
      'error', COALESCE(v_access->>'error', 'Permission denied')
    );
  END IF;

  
  -- Generate new UUID for the person
  v_new_person_id := gen_random_uuid();
  v_auto_created_spouse_id := NULL;
  
  -- Insert new person into people table
  INSERT INTO people (id, name, gender, dob, blood_group, is_alive, deceased_date, photo_url, tree_id, created_at, modified_at)
  VALUES (v_new_person_id, p_name, p_gender, p_dob, p_blood_group, COALESCE(p_is_alive, TRUE), p_deceased_date, p_photo_url, p_tree_id, now(), now());
  
  -- Start tracking affected IDs (always includes the new person)
  v_affected_ids := ARRAY[v_new_person_id];
  
  -- If relationship information is provided, create the relationship based on type
  IF p_relation_type IS NOT NULL AND p_related_person_id IS NOT NULL THEN
    
    -- The related person is always affected (its children/spouses list changes)
    v_affected_ids := array_append(v_affected_ids, p_related_person_id);
    
    -- PARENT: Create parent relationship (used for both adding child and adding parent)
    IF p_relation_type = 'parent' THEN
      IF p_is_reverse_relation THEN
        -- Reverse: related_person_id → parent → new_person (adding a parent)
        INSERT INTO people_relations (person_id, related_person_id, relation_type, relation_subtype, created_at, modified_at)
        VALUES (p_related_person_id, v_new_person_id, 'parent', p_relation_subtype, now(), now());

        -- If the child already has another parent, link them as spouses
        IF p_related_person_id_2 IS NOT NULL THEN
          v_spouse_id := p_related_person_id_2;
        ELSE
          SELECT related_person_id INTO v_spouse_id
          FROM people_relations
          WHERE person_id = p_related_person_id
            AND relation_type = 'parent'
            AND related_person_id != v_new_person_id
          LIMIT 1;
        END IF;

        IF v_spouse_id IS NOT NULL THEN
          -- Create bidirectional spouse relationships if missing
          INSERT INTO people_relations (person_id, related_person_id, relation_type, relation_subtype, created_at, modified_at)
          SELECT v_new_person_id, v_spouse_id, 'spouse', 'married', now(), now()
          WHERE NOT EXISTS (
            SELECT 1 FROM people_relations pr
            WHERE pr.person_id = v_new_person_id
              AND pr.related_person_id = v_spouse_id
              AND pr.relation_type = 'spouse'
          );

          INSERT INTO people_relations (person_id, related_person_id, relation_type, relation_subtype, created_at, modified_at)
          SELECT v_spouse_id, v_new_person_id, 'spouse', 'married', now(), now()
          WHERE NOT EXISTS (
            SELECT 1 FROM people_relations pr
            WHERE pr.person_id = v_spouse_id
              AND pr.related_person_id = v_new_person_id
              AND pr.relation_type = 'spouse'
          );

          v_affected_ids := array_append(v_affected_ids, v_spouse_id);
        END IF;
      ELSE
        -- Normal: new_person → parent → related_person_id (first parent)
        INSERT INTO people_relations (person_id, related_person_id, relation_type, relation_subtype, created_at, modified_at)
        VALUES (v_new_person_id, p_related_person_id, 'parent', p_relation_subtype, now(), now());
        
        -- Handle second parent (spouse of first parent)
        IF p_related_person_id_2 IS NOT NULL THEN
          -- Use provided second parent (spouse)
          v_spouse_id := p_related_person_id_2;
          v_affected_ids := array_append(v_affected_ids, v_spouse_id);
        ELSE
          -- AUTO-CREATE DEFAULT SPOUSE if target has no spouse
          SELECT related_person_id INTO v_spouse_id FROM people_relations 
          WHERE person_id = p_related_person_id AND relation_type = 'spouse' LIMIT 1;
          
          IF v_spouse_id IS NULL THEN
            -- Get target's gender to create opposite gender spouse
            SELECT gender INTO v_target_gender FROM people WHERE id = p_related_person_id;
            
            -- Create default spouse with opposite gender
            v_spouse_id := gen_random_uuid();
            v_auto_created_spouse_id := v_spouse_id;
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
            
            -- Map all existing children of the target person to the newly created spouse
            INSERT INTO people_relations (person_id, related_person_id, relation_type, relation_subtype, created_at, modified_at)
            SELECT child_relations.person_id, v_spouse_id, 'parent', 'blood', now(), now()
            FROM people_relations AS child_relations
            WHERE child_relations.related_person_id = p_related_person_id
              AND child_relations.relation_type = 'parent'
              AND NOT EXISTS (
                SELECT 1 FROM people_relations pr2
                WHERE pr2.person_id = child_relations.person_id
                  AND pr2.related_person_id = v_spouse_id
                  AND pr2.relation_type = 'parent'
              );
            
            -- Track existing children as affected (they now have a new parent)
            v_affected_ids := v_affected_ids || ARRAY(
              SELECT person_id FROM people_relations
              WHERE related_person_id = p_related_person_id AND relation_type = 'parent'
              AND person_id != v_new_person_id
            );
          ELSE
            -- Existing spouse found, track it
            v_affected_ids := array_append(v_affected_ids, v_spouse_id);
          END IF;
        END IF;
        
        -- Add spouse as second parent of the new child
        IF v_spouse_id IS NOT NULL THEN
          INSERT INTO people_relations (person_id, related_person_id, relation_type, relation_subtype, created_at, modified_at)
          SELECT v_new_person_id, v_spouse_id, 'parent', p_relation_subtype, now(), now()
          WHERE NOT EXISTS (
            SELECT 1 FROM people_relations pr
            WHERE pr.person_id = v_new_person_id
              AND pr.related_person_id = v_spouse_id
              AND pr.relation_type = 'parent'
          );
          
          -- Auto-created spouse must be in affected list
          v_affected_ids := array_append(v_affected_ids, v_spouse_id);
        END IF;
      END IF;
    
    -- SPOUSE: bidirectional spouse relationship
    ELSIF p_relation_type = 'spouse' THEN
      INSERT INTO people_relations (person_id, related_person_id, relation_type, relation_subtype, created_at, modified_at)
      VALUES (v_new_person_id, p_related_person_id, 'spouse', p_relation_subtype, now(), now());
      
      INSERT INTO people_relations (person_id, related_person_id, relation_type, relation_subtype, created_at, modified_at)
      VALUES (p_related_person_id, v_new_person_id, 'spouse', p_relation_subtype, now(), now());
      
      -- Map all existing children of the target person to the newly added spouse
      INSERT INTO people_relations (person_id, related_person_id, relation_type, relation_subtype, created_at, modified_at)
      SELECT child_relations.person_id, v_new_person_id, 'parent', 'blood', now(), now()
      FROM people_relations AS child_relations
      WHERE child_relations.related_person_id = p_related_person_id
        AND child_relations.relation_type = 'parent'
        AND NOT EXISTS (
          SELECT 1 FROM people_relations pr2
          WHERE pr2.person_id = child_relations.person_id
            AND pr2.related_person_id = v_new_person_id
            AND pr2.relation_type = 'parent'
        );
      
      -- Track existing children as affected (they now have a new parent)
      v_affected_ids := v_affected_ids || ARRAY(
        SELECT person_id FROM people_relations
        WHERE related_person_id = p_related_person_id AND relation_type = 'parent'
      );
    END IF;
    
    -- Also track second related person if provided
    IF p_related_person_id_2 IS NOT NULL THEN
      v_affected_ids := array_append(v_affected_ids, p_related_person_id_2);
    END IF;
  END IF;
  
  -- If additional fields are provided, insert them into people_additional_detail table
  IF p_additional_fields IS NOT NULL THEN
    FOR v_field_key, v_field_value IN
    SELECT key, value FROM jsonb_each_text(p_additional_fields)
    LOOP
      v_field_id := NULL;
      
      -- 1. Try exact match
      SELECT id INTO v_field_id FROM people_field WHERE field_name = v_field_key LIMIT 1;
      
      -- 2. Try case-insensitive match
      IF v_field_id IS NULL THEN
        SELECT id INTO v_field_id FROM people_field WHERE LOWER(field_name) = LOWER(v_field_key) LIMIT 1;
      END IF;

      -- 3. If missing AND is standard field (Gotra/Village/Note), auto-create
      IF v_field_id IS NULL AND (LOWER(v_field_key) = 'gotra' OR LOWER(v_field_key) = 'village' OR LOWER(v_field_key) = 'note') THEN
         INSERT INTO people_field (field_name) VALUES (v_field_key) RETURNING id INTO v_field_id;
      END IF;
      
      -- Only insert if field exists
      IF v_field_id IS NOT NULL THEN
        INSERT INTO people_additional_detail (people_id, people_field_id, field_value, created_at, modified_at)
        VALUES (v_new_person_id, v_field_id, v_field_value, now(), now());
      END IF;
    END LOOP;
  END IF;
  
  -- De-duplicate affected_ids
  v_affected_ids := ARRAY(SELECT DISTINCT unnest(v_affected_ids));
  
  -- =====================================================
  -- Build affected_nodes: full relationship data for every touched node
  -- Uses the SAME shape as get_complete_tree_by_id members
  -- =====================================================
  SELECT json_agg(node_json) INTO v_affected_nodes
  FROM (
    SELECT json_build_object(
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
          'dob', p_parent.dob
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
          'dob', p_child.dob
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
          'dob', p_spouse.dob
        ))
        FROM (
          SELECT DISTINCT sp.id, sp.name, sp.gender, sp.dob
          FROM people_relations pr
          JOIN people sp ON pr.related_person_id = sp.id
          WHERE pr.person_id = p.id AND pr.relation_type = 'spouse'
          UNION
          SELECT DISTINCT sp.id, sp.name, sp.gender, sp.dob
          FROM people_relations pr
          JOIN people sp ON pr.person_id = sp.id
          WHERE pr.related_person_id = p.id AND pr.relation_type = 'spouse'
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
    ) AS node_json
    FROM people p
    WHERE p.id = ANY(v_affected_ids)
  ) sub;
  
  -- Build result JSON with affected_nodes
  v_result := json_build_object(
    'success', true,
    'person_id', v_new_person_id,
    'auto_created_spouse_id', v_auto_created_spouse_id,
    'name', p_name,
    'gender', p_gender,
    'dob', p_dob,
    'tree_id', p_tree_id,
    'relation_type', p_relation_type,
    'relation_subtype', p_relation_subtype,
    'related_person_id', p_related_person_id,
    'fields_added', CASE WHEN p_additional_fields IS NOT NULL THEN (SELECT count(*) FROM jsonb_object_keys(p_additional_fields)) ELSE 0 END,
    'affected_nodes', COALESCE(v_affected_nodes, '[]'::json)
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
