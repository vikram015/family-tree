-- Fix circular relationships in tree 89e2e77c-406c-49e6-af1a-3b7138bcaaec

-- First, identify and remove the circular relationships
-- The issue: test and Balwant have bidirectional parent-child relationships

-- Remove the incorrect relationship where test is parent of Balwant
DELETE FROM people_relations
WHERE person_id = '307f99a1-f31c-47fe-82f2-028db49b5922' -- test
  AND related_person_id = 'c59464a4-8556-431b-ac30-820e7ce57dfc' -- Balwant
  AND relation_type = 'parent';

-- Remove the incorrect relationship where Balwant has test as parent
DELETE FROM people_relations
WHERE person_id = 'c59464a4-8556-431b-ac30-820e7ce57dfc' -- Balwant
  AND related_person_id = '307f99a1-f31c-47fe-82f2-028db49b5922' -- test
  AND relation_type = 'parent';

-- Verify the relationships are fixed
SELECT 'Fixed Relations' as status,
  p1.name as person_name,
  pr.relation_type,
  p2.name as related_person_name
FROM people_relations pr
JOIN people p1 ON pr.person_id = p1.id
JOIN people p2 ON pr.related_person_id = p2.id
WHERE p1.tree_id = '89e2e77c-406c-49e6-af1a-3b7138bcaaec'
ORDER BY p1.name, pr.relation_type;

-- Verify the tree now renders correctly
SELECT get_complete_tree_by_id('89e2e77c-406c-49e6-af1a-3b7138bcaaec');
