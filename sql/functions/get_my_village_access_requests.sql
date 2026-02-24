-- =====================================================
-- FUNCTION: get_my_village_access_requests
-- Returns current user's village assignment requests.
-- =====================================================
CREATE OR REPLACE FUNCTION get_my_village_access_requests()
RETURNS TABLE (
  id UUID,
  village_id UUID,
  village_name TEXT,
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
    r.village_id,
    v.name::TEXT AS village_name,
    r.status,
    r.request_message,
    r.review_note,
    r.reviewed_by,
    reviewer.name::TEXT AS reviewed_by_name,
    r.reviewed_at,
    r.created_at
  FROM village_access_requests r
  JOIN village v ON v.id = r.village_id
  LEFT JOIN users reviewer ON reviewer.id = r.reviewed_by
  WHERE r.requester_user_id = auth.uid()
    AND r.is_deleted = false
  ORDER BY r.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
