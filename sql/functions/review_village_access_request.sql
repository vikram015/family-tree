-- =====================================================
-- FUNCTION: review_village_access_request
-- Approve/reject request by superadmin or admin of that village.
-- =====================================================
CREATE OR REPLACE FUNCTION review_village_access_request(
  p_request_id UUID,
  p_action VARCHAR, -- 'approved' | 'rejected'
  p_review_note TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_role VARCHAR;
  v_villages TEXT[];
  v_request RECORD;
  v_requester_villages TEXT[];
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF p_action NOT IN ('approved', 'rejected') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid action');
  END IF;

  SELECT role, villages
  INTO v_role, v_villages
  FROM users
  WHERE id = v_user_id
    AND is_deleted = false;

  IF v_role IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User profile not found');
  END IF;

  SELECT *
  INTO v_request
  FROM village_access_requests
  WHERE id = p_request_id
    AND is_deleted = false;

  IF v_request IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Request not found');
  END IF;

  IF v_request.status <> 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Request already reviewed');
  END IF;

  IF v_role <> 'superadmin' THEN
    IF v_role <> 'admin' OR NOT (v_request.village_id::TEXT = ANY(COALESCE(v_villages, ARRAY[]::TEXT[]))) THEN
      RETURN json_build_object('success', false, 'error', 'Permission denied');
    END IF;
  END IF;

  UPDATE village_access_requests
  SET
    status = p_action,
    review_note = p_review_note,
    reviewed_by = v_user_id,
    reviewed_at = now(),
    modified_at = now()
  WHERE id = p_request_id;

  IF p_action = 'approved' THEN
    SELECT villages INTO v_requester_villages
    FROM users
    WHERE id = v_request.requester_user_id;

    UPDATE users
    SET villages = (
      SELECT ARRAY(
        SELECT DISTINCT unnest(COALESCE(v_requester_villages, ARRAY[]::TEXT[]) || ARRAY[v_request.village_id::TEXT])
      )
    ),
    modified_at = now(),
    modified_by = v_user_id
    WHERE id = v_request.requester_user_id;
  END IF;

  RETURN json_build_object('success', true, 'message', 'Request reviewed successfully');
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
