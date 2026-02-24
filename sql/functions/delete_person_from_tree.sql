-- =====================================================
-- FUNCTION: delete_person_from_tree
-- Deletes a person from a family tree with all their relationships and additional details
-- Input: p_person_id (UUID), p_force (BOOLEAN) - set to true to delete even if children exist
-- Output: JSON with success status and deleted person info
-- =====================================================
CREATE OR REPLACE FUNCTION delete_person_from_tree(p_person_id UUID, p_force BOOLEAN DEFAULT false)
RETURNS JSON AS $$
DECLARE
  v_access JSON;
  v_person_record RECORD;
  v_child_count INTEGER;
  v_result JSON;
BEGIN
  
  -- Get person details before deletion for response
  SELECT id, name, tree_id
  INTO v_person_record
  FROM people
  WHERE id = p_person_id;
  
  -- If person not found, return error
  IF v_person_record IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Person not found'
    );
  END IF;

  v_access := check_tree_write_access(v_person_record.tree_id);
  IF NOT COALESCE((v_access->>'allowed')::BOOLEAN, false) THEN
    RETURN json_build_object(
      'success', false,
      'error', COALESCE(v_access->>'error', 'Permission denied')
    );
  END IF;

  -- SAFETY CHECK: Check for children (dependents)
  -- In people_relations: person_id is CHILD, related_person_id is PARENT
  SELECT COUNT(*) INTO v_child_count
  FROM people_relations
  WHERE related_person_id = p_person_id 
  AND relation_type = 'parent';

  -- If person has children and force is not true, block deletion
  IF v_child_count > 0 AND p_force = false THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Cannot delete person with children. They would become orphans.',
      'children_count', v_child_count,
      'requires_confirmation', true
    );
  END IF;
  
  -- Delete all relationships involving this person (both directions)
  DELETE FROM people_relations
  WHERE person_id = p_person_id OR related_person_id = p_person_id;
  
  -- Delete all additional details for this person
  DELETE FROM people_additional_detail
  WHERE people_id = p_person_id;
  
  -- Delete the person (cascade will handle any other foreign keys)
  DELETE FROM people
  WHERE id = p_person_id;
  
  -- Build result JSON
  v_result := json_build_object(
    'success', true,
    'deleted_person_id', v_person_record.id,
    'deleted_person_name', v_person_record.name,
    'deleted_from_tree_id', v_person_record.tree_id,
    'message', 'Person deleted successfully'
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
