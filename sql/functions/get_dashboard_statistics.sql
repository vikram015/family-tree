-- =====================================================
-- FUNCTION: get_dashboard_statistics
-- =====================================================
-- Description: Get dashboard statistics including total count of
-- people, trees, businesses, and professions across all villages
--
-- Parameters: None
--
-- Returns: A table with dashboard statistics
-- =====================================================

CREATE OR REPLACE FUNCTION get_dashboard_statistics()
RETURNS TABLE (
  total_people BIGINT,
  total_trees BIGINT,
  total_villages BIGINT,
  total_businesses BIGINT,
  total_professions BIGINT,
  people_with_professions BIGINT,
  total_professions_assigned BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Total active people
    (SELECT COUNT(*) FROM people WHERE is_deleted = FALSE)::BIGINT as total_people,
    
    -- Total active trees
    (SELECT COUNT(*) FROM tree WHERE is_deleted = FALSE)::BIGINT as total_trees,
    
    -- Total active villages
    (SELECT COUNT(*) FROM village WHERE is_deleted = FALSE)::BIGINT as total_villages,
    
    -- Total active businesses
    (SELECT COUNT(*) FROM business WHERE is_deleted = FALSE)::BIGINT as total_businesses,
    
    -- Total active professions
    (SELECT COUNT(*) FROM professions WHERE is_deleted = FALSE)::BIGINT as total_professions,
    
    -- Total people with at least one profession
    (SELECT COUNT(DISTINCT people_id) FROM people_professions WHERE is_deleted = FALSE)::BIGINT as people_with_professions,
    
    -- Total profession assignments (number of people_professions records)
    (SELECT COUNT(*) FROM people_professions WHERE is_deleted = FALSE)::BIGINT as total_professions_assigned;
END;
$$ LANGUAGE plpgsql;
