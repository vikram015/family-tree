-- Debug script for analyzing tree relationships
-- Use this to diagnose relationship issues for treeId = 89e2e77c-406c-49e6-af1a-3b7138bcaaec

-- 1. Check if tree exists
SELECT 'Tree Info' as check_type,
  id, name, village_id, created_at
FROM tree
WHERE id = '89e2e77c-406c-49e6-af1a-3b7138bcaaec';

-- 2. Check people in this tree
SELECT 'People Count' as check_type,
  COUNT(*) as total_people,
  SUM(CASE WHEN gender = 'male' THEN 1 ELSE 0 END) as males,
  SUM(CASE WHEN gender = 'female' THEN 1 ELSE 0 END) as females
FROM people
WHERE tree_id = '89e2e77c-406c-49e6-af1a-3b7138bcaaec';

-- 3. Check all people in tree with IDs
SELECT 'All People' as check_type,
  id, name, gender, dob
FROM people
WHERE tree_id = '89e2e77c-406c-49e6-af1a-3b7138bcaaec'
ORDER BY name;

-- 4. Check all relationships in tree
SELECT 'All Relations' as check_type,
  pr.id, 
  pr.person_id,
  p1.name as person_name,
  pr.relation_type,
  pr.related_person_id,
  p2.name as related_person_name
FROM people_relations pr
JOIN people p1 ON pr.person_id = p1.id
JOIN people p2 ON pr.related_person_id = p2.id
WHERE p1.tree_id = '89e2e77c-406c-49e6-af1a-3b7138bcaaec'
ORDER BY p1.name, pr.relation_type;

-- 5. Check for orphaned relationships (people not in tree but in relations)
SELECT 'Orphaned Relations' as check_type,
  COUNT(*) as orphaned_count
FROM people_relations pr
LEFT JOIN people p1 ON pr.person_id = p1.id
LEFT JOIN people p2 ON pr.related_person_id = p2.id
WHERE (p1.id IS NULL OR p1.tree_id != '89e2e77c-406c-49e6-af1a-3b7138bcaaec')
   OR (p2.id IS NULL OR p2.tree_id != '89e2e77c-406c-49e6-af1a-3b7138bcaaec');

-- 6. Check for circular relationships or duplicates
SELECT 'Duplicate Relations' as check_type,
  person_id, related_person_id, relation_type,
  COUNT(*) as duplicate_count
FROM people_relations pr
JOIN people p ON pr.person_id = p.id
WHERE p.tree_id = '89e2e77c-406c-49e6-af1a-3b7138bcaaec'
GROUP BY person_id, related_person_id, relation_type
HAVING COUNT(*) > 1;

-- 7. Check for self-relationships
SELECT 'Self Relations' as check_type,
  pr.id, p.name, pr.relation_type
FROM people_relations pr
JOIN people p ON pr.person_id = p.id
WHERE pr.person_id = pr.related_person_id
  AND p.tree_id = '89e2e77c-406c-49e6-af1a-3b7138bcaaec';

-- 8. Check for missing reverse relationships
SELECT 'Missing Spouse Reverse Relations' as check_type,
  p1.name as person_from,
  p2.name as person_to,
  'spouse' as relation_type
FROM people_relations pr
JOIN people p1 ON pr.person_id = p1.id
JOIN people p2 ON pr.related_person_id = p2.id
WHERE pr.relation_type = 'spouse'
  AND p1.tree_id = '89e2e77c-406c-49e6-af1a-3b7138bcaaec'
  AND NOT EXISTS (
    SELECT 1 FROM people_relations pr2
    WHERE pr2.person_id = pr.related_person_id
      AND pr2.related_person_id = pr.person_id
      AND pr2.relation_type = 'spouse'
  );

-- 9. Show complete tree using the RPC function
SELECT get_complete_tree_by_id('89e2e77c-406c-49e6-af1a-3b7138bcaaec');
