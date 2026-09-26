-- =====================================================
-- FUNCTION: get_pending_location_access_requests
-- Superadmin sees all pending requests.
-- Admin sees pending requests only for locations they manage.
-- =====================================================
CREATE OR REPLACE FUNCTION get_pending_location_access_requests()
RETURNS TABLE (
  id UUID,
  requester_user_id UUID,
  requester_email TEXT,
  requester_name TEXT,
  location_id UUID,
  location_name TEXT,
  request_message TEXT,
  created_at TIMESTAMP
) AS $$
DECLARE
  v_user_id UUID;
  v_role VARCHAR;
  v_locations TEXT[];
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  SELECT role, locations
  INTO v_role, v_locations
  FROM users
  WHERE users.id = v_user_id
    AND users.is_deleted = false;

  IF v_role IS NULL THEN
    RETURN;
  END IF;

  IF v_role = 'superadmin' THEN
    RETURN QUERY
    SELECT
      r.id,
      r.requester_user_id,
      u.email::TEXT AS requester_email,
      u.name::TEXT AS requester_name,
      r.location_id,
      v.name::TEXT AS location_name,
      r.request_message,
      r.created_at
    FROM location_access_requests r
    JOIN users u ON u.id = r.requester_user_id
    JOIN location v ON v.id = r.location_id
    WHERE r.status = 'pending'
      AND r.is_deleted = false
    ORDER BY r.created_at ASC;
    RETURN;
  END IF;

  IF v_role = 'admin' THEN
    RETURN QUERY
    SELECT
      r.id,
      r.requester_user_id,
      u.email::TEXT AS requester_email,
      u.name::TEXT AS requester_name,
      r.location_id,
      v.name::TEXT AS location_name,
      r.request_message,
      r.created_at
    FROM location_access_requests r
    JOIN users u ON u.id = r.requester_user_id
    JOIN location v ON v.id = r.location_id
    WHERE r.status = 'pending'
      AND r.is_deleted = false
      AND r.location_id::TEXT = ANY(COALESCE(v_locations, ARRAY[]::TEXT[]))
    ORDER BY r.created_at ASC;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
