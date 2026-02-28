-- =====================================================
-- FUNCTION: submit_village_access_request
-- Admin users can raise a village assignment request.
-- =====================================================
CREATE OR REPLACE FUNCTION submit_village_access_request(
  p_village_id UUID,
  p_request_message TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_user_role VARCHAR;
  v_user_villages TEXT[];
  v_exists BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT role, villages
  INTO v_user_role, v_user_villages
  FROM users
  WHERE id = v_user_id
    AND is_deleted = false;

  IF v_user_role IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User profile not found');
  END IF;

  IF v_user_role NOT IN ('admin', 'superadmin') THEN
    RETURN json_build_object('success', false, 'error', 'Only admins can raise requests');
  END IF;

  IF array_length(COALESCE(v_user_villages, ARRAY[]::TEXT[]), 1) > 0 THEN
    RETURN json_build_object('success', false, 'error', 'Village already assigned. Contact support@kinvia.in for changes.');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM users
    WHERE id = v_user_id
      AND p_village_id::TEXT = ANY(COALESCE(villages, ARRAY[]::TEXT[]))
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Village already assigned');
  END IF;

  SELECT EXISTS(
    SELECT 1
    FROM village_access_requests
    WHERE requester_user_id = v_user_id
      AND village_id = p_village_id
      AND status = 'pending'
      AND is_deleted = false
  ) INTO v_exists;

  IF v_exists THEN
    RETURN json_build_object('success', false, 'error', 'A pending request already exists');
  END IF;

  INSERT INTO village_access_requests (
    requester_user_id,
    village_id,
    status,
    request_message,
    created_at,
    modified_at
  ) VALUES (
    v_user_id,
    p_village_id,
    'pending',
    p_request_message,
    now(),
    now()
  );

  RETURN json_build_object('success', true, 'message', 'Request submitted successfully');
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
