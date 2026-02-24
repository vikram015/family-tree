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
  p_additional_fields JSONB DEFAULT NULL,
  p_blood_group VARCHAR DEFAULT NULL,
  p_is_alive BOOLEAN DEFAULT NULL,
  p_deceased_date DATE DEFAULT NULL,
  p_photo_url TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_access JSON;
  v_tree_id UUID;
  v_field_key TEXT;
  v_field_value TEXT;
  v_field_id UUID;
  v_result JSON;
  v_person_record RECORD;
BEGIN
  SELECT p.tree_id
  INTO v_tree_id
  FROM people p
  WHERE p.id = p_person_id;

  IF v_tree_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Person not found'
    );
  END IF;

  v_access := check_tree_write_access(v_tree_id);
  IF NOT COALESCE((v_access->>'allowed')::BOOLEAN, false) THEN
    RETURN json_build_object(
      'success', false,
      'error', COALESCE(v_access->>'error', 'Permission denied')
    );
  END IF;

  
  -- Update person's core properties
  UPDATE people
  SET 
    name = COALESCE(p_name, name),
    gender = COALESCE(p_gender, gender),
    dob = COALESCE(p_dob, dob),
    blood_group = COALESCE(p_blood_group, blood_group),
    is_alive = COALESCE(p_is_alive, is_alive),
    deceased_date = COALESCE(p_deceased_date, deceased_date),
    photo_url = COALESCE(p_photo_url, photo_url),
    modified_at = now()
  WHERE id = p_person_id
  RETURNING id, name, gender, dob, blood_group, is_alive, deceased_date, photo_url, tree_id, created_at, modified_at
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
    'blood_group', v_person_record.blood_group,
    'is_alive', v_person_record.is_alive,
    'deceased_date', v_person_record.deceased_date,
    'photo_url', v_person_record.photo_url,
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
