-- =====================================================
-- FUNCTION: update_person_in_tree
-- Updates a person's details and additional fields in a family tree
-- Input: p_person_id, p_name, p_gender, p_dob, p_additional_fields
-- Output: JSON with updated person details and success status
-- =====================================================
CREATE OR REPLACE FUNCTION update_person_in_tree(
  p_person_id UUID,
  p_name VARCHAR DEFAULT NULL,
  p_gender VARCHAR DEFAULT NULL,
  p_dob DATE DEFAULT NULL,
  p_additional_fields JSONB DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_field_key TEXT;
  v_field_value TEXT;
  v_field_id UUID;
  v_result JSON;
  v_person_record RECORD;
BEGIN
  
  -- Update person's core properties
  UPDATE people
  SET 
    name = COALESCE(p_name, name),
    gender = COALESCE(p_gender, gender),
    dob = COALESCE(p_dob, dob),
    modified_at = now()
  WHERE id = p_person_id
  RETURNING id, name, gender, dob, tree_id, created_at, modified_at
  INTO v_person_record;
  
  -- If person not found, return error
  IF v_person_record IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Person not found'
    );
  END IF;
  
  -- If additional fields are provided, delete old fields and insert new ones
  IF p_additional_fields IS NOT NULL AND jsonb_typeof(p_additional_fields) = 'object' THEN
    -- Delete existing additional details for this person
    DELETE FROM people_additional_detail
    WHERE people_id = p_person_id;
    
    -- Insert new fields
    FOR v_field_key, v_field_value IN
    SELECT key, value FROM jsonb_each_text(p_additional_fields)
    LOOP
      -- Get the field ID (must already exist in people_field)
      SELECT id INTO v_field_id FROM people_field WHERE field_name = v_field_key LIMIT 1;
      
      -- Only insert if field exists
      IF v_field_id IS NOT NULL THEN
        INSERT INTO people_additional_detail (people_id, people_field_id, field_value, created_at, modified_at)
        VALUES (p_person_id, v_field_id, v_field_value, now(), now());
      END IF;
    END LOOP;
  END IF;
  
  -- Build result JSON
  v_result := json_build_object(
    'success', true,
    'person_id', v_person_record.id,
    'name', v_person_record.name,
    'gender', v_person_record.gender,
    'dob', v_person_record.dob,
    'tree_id', v_person_record.tree_id,
    'fields_updated', CASE WHEN p_additional_fields IS NOT NULL THEN (SELECT count(*) FROM jsonb_object_keys(p_additional_fields)) ELSE 0 END
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
