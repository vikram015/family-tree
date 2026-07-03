-- =====================================================
-- FUNCTION: get_my_location_access_requests
-- Returns current user's location assignment requests.
-- =====================================================
CREATE OR REPLACE FUNCTION get_my_location_access_requests()
RETURNS TABLE (
  id UUID,
  location_id UUID,
  location_name TEXT,
  status VARCHAR,
  request_message TEXT,
  review_note TEXT,
  reviewed_by UUID,
  reviewed_by_name TEXT,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.location_id,
    v.name::TEXT AS location_name,
    r.status,
    r.request_message,
    r.review_note,
    r.reviewed_by,
    reviewer.name::TEXT AS reviewed_by_name,
    r.reviewed_at,
    r.created_at
  FROM location_access_requests r
  JOIN location v ON v.id = r.location_id
  LEFT JOIN users reviewer ON reviewer.id = r.reviewed_by
  WHERE r.requester_user_id = auth.uid()
    AND r.is_deleted = false
  ORDER BY r.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
