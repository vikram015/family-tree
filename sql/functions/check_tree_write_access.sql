-- =====================================================
-- FUNCTION: check_tree_write_access
-- Centralized access check for tree write operations.
-- Rules:
-- - superadmin: full access
-- - admin: must be verified and assigned to tree village
-- =====================================================
CREATE OR REPLACE FUNCTION check_tree_write_access(
  p_tree_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_user_role VARCHAR;
  v_user_is_verified BOOLEAN;
  v_user_villages TEXT[];
  v_tree_village_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'allowed', false,
      'error', 'Permission denied: not authenticated'
    );
  END IF;

  SELECT role, is_verified, villages
  INTO v_user_role, v_user_is_verified, v_user_villages
  FROM users
  WHERE id = v_user_id
    AND is_deleted = false;

  IF v_user_role IS NULL THEN
    RETURN json_build_object(
      'allowed', false,
      'error', 'Permission denied: user profile not found'
    );
  END IF;

  SELECT village_id
  INTO v_tree_village_id
  FROM tree
  WHERE id = p_tree_id
    AND is_deleted = false;

  IF v_tree_village_id IS NULL THEN
    RETURN json_build_object(
      'allowed', false,
      'error', 'Tree not found'
    );
  END IF;

  IF v_user_role = 'superadmin' THEN
    RETURN json_build_object('allowed', true);
  END IF;

  IF v_user_role <> 'admin' OR COALESCE(v_user_is_verified, false) = false THEN
    RETURN json_build_object(
      'allowed', false,
      'error', 'Permission denied: admin approval required'
    );
  END IF;

  IF NOT (v_tree_village_id::TEXT = ANY(COALESCE(v_user_villages, ARRAY[]::TEXT[]))) THEN
    RETURN json_build_object(
      'allowed', false,
      'error', 'Permission denied: village access required'
    );
  END IF;

  RETURN json_build_object('allowed', true);
END;
$$ LANGUAGE plpgsql;
