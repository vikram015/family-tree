# Deploy Business Hierarchy Function - Step by Step

## Prerequisites

- Access to Supabase Project
- SQL Editor in Supabase Console
- At least one business record with a people_id assigned

## Deployment Steps

### Step 1: Go to Supabase SQL Editor

1. Open your Supabase project
2. Click on "SQL Editor" in the left sidebar
3. Click "+ New Query"

### Step 2: Copy the SQL

Copy the entire SQL from `sql/functions/get_businesses_by_village.sql`

The SQL starts with:

```sql
-- =====================================================
-- FUNCTION: get_businesses_by_village
-- =====================================================
```

### Step 3: Paste into Supabase

- Paste the SQL into the query editor
- Do NOT modify anything
- Click "Run" button

### Expected Result

```
Query saved successfully
Function created: get_businesses_by_village
```

## Verification Tests

### Test 1: Function Exists

```sql
-- Run this to verify the function was created
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name = 'get_businesses_by_village'
AND routine_schema = 'public';
```

**Expected Result**: One row showing function details

### Test 2: Function Returns Data

```sql
-- Get first village ID
SELECT id, name FROM village LIMIT 1;

-- Then run the function with that ID
SELECT * FROM get_businesses_by_village('[PASTE_VILLAGE_ID_HERE]');
```

**Expected Result**: List of businesses with hierarchy (may be empty if no businesses exist)

### Test 3: Check Hierarchy Data

```sql
-- Test with a real business
SELECT
  business_name,
  person_name,
  parent_hierarchy,
  jsonb_array_length(parent_hierarchy) as ancestor_count
FROM get_businesses_by_village(
  (SELECT id FROM village LIMIT 1)
)
WHERE person_name IS NOT NULL
LIMIT 1;
```

**Expected Result**:

- business_name: Name of business
- person_name: Owner name
- parent_hierarchy: JSON array with ancestors
- ancestor_count: Number showing how many ancestors

### Test 4: Check Specific Fields

```sql
-- Verify all fields are returned correctly
SELECT
  business_id,
  business_name,
  person_name,
  village_name,
  caste_name,
  sub_caste_name,
  tree_name,
  jsonb_pretty(parent_hierarchy) as formatted_hierarchy
FROM get_businesses_by_village(
  (SELECT id FROM village LIMIT 1)
)
LIMIT 1;
```

## Troubleshooting

### Error: "Function does not exist"

**Solution**:

1. Check if SQL was executed successfully
2. Verify spelling of function name: `get_businesses_by_village`
3. Try running the SQL again
4. Refresh the page and try again

### Error: "relation 'business' does not exist"

**Solution**:

1. Verify business table exists: `SELECT * FROM business LIMIT 1;`
2. Verify people table exists: `SELECT * FROM people LIMIT 1;`
3. Verify people_relations table exists: `SELECT * FROM people_relations LIMIT 1;`
4. Check all references in the function match your table names

### Error: "column 'is_deleted' does not exist in 'business'"

**Solution**:

1. Check your business table schema: `DESCRIBE business;`
2. Update the function WHERE clause to match your actual column names
3. If you don't have is_deleted, remove those conditions

### Error: "column 'is_deleted' does not exist in 'people'"

**Solution**:

1. The function filters on business.is_deleted, not people.is_deleted
2. If your business table doesn't have is_deleted, remove: `WHERE b.is_deleted = FALSE;`
3. Save and run again

### No Data Returned

**Solution**:

1. Check if businesses exist: `SELECT COUNT(*) FROM business;`
2. Check if people_id is assigned: `SELECT * FROM business WHERE people_id IS NOT NULL LIMIT 1;`
3. Check if those people exist in people table: `SELECT * FROM people WHERE id = '[PERSON_ID]';`
4. Verify people have tree assignments: `SELECT DISTINCT tree_id FROM people LIMIT 5;`
5. Verify that tree belongs to the village: `SELECT * FROM tree WHERE id = '[TREE_ID]';`

## React Component Status

✅ **Component is ready** - No additional steps needed

The React component and service methods are already:

- Implemented
- Tested for TypeScript errors
- Ready to use

Just deploy the database function and refresh your app.

## Full Integration Checklist

### Database

- [ ] Function created in Supabase
- [ ] Test queries return data
- [ ] Verify hierarchy is populated
- [ ] Check caste/sub-caste information

### Service Layer

- [ ] Service method exists (already done)
- [ ] Method imports correctly
- [ ] No TypeScript errors

### React Component

- [ ] Component imports correctly
- [ ] Business Page loads
- [ ] Village can be selected
- [ ] Businesses load from new function
- [ ] Owner names appear as blue links
- [ ] Hover shows tooltip
- [ ] Click navigates to family tree

### UI/UX

- [ ] Owner names are styled correctly
- [ ] Tooltip appears on hover
- [ ] DNA emoji displays (🧬)
- [ ] Hierarchy shows up to 5 ancestors
- [ ] Caste information visible
- [ ] Click navigation works

## If Something Goes Wrong

### Debug Steps

1. **Check browser console** for JavaScript errors
2. **Check Supabase logs** for database errors
3. **Test function directly** in Supabase SQL editor
4. **Verify data exists** with simple SELECT queries
5. **Check React dev tools** for component state

### Common Issues & Fixes

| Issue                   | Fix                                             |
| ----------------------- | ----------------------------------------------- |
| Function not found      | Re-execute SQL, check function name spelling    |
| No data returned        | Check business people_id assignments            |
| Hierarchy empty         | Check people_relations for parent relationships |
| Navigation doesn't work | Verify /families route exists in App.tsx        |
| Tooltip not showing     | Check business.hierarchy exists in data         |
| Style looks off         | Clear browser cache, reload page                |

## Success Indicators

When working correctly, you should see:

✅ Businesses load from the new function
✅ Owner names in blue color
✅ Cursor changes to pointer on hover
✅ Tooltip appears with hierarchy
✅ Click navigates to family tree
✅ No console errors

## Performance Considerations

After deployment, the function should:

- Load 20-50 businesses in < 1 second
- Handle recursive queries efficiently
- Use proper indexing for lookups
- Return results in JSONB format

If slow, check:

1. Database table sizes
2. Index on people_relations
3. Network latency
4. Browser developer tools network tab

## Next Steps After Deployment

1. ✅ Verify function works in SQL editor
2. ✅ Test React component with real data
3. ✅ Check business cards display correctly
4. ✅ Test owner name interaction
5. ✅ Verify navigation works
6. ✅ Test on mobile devices
7. ✅ Check accessibility features

---

**Deployment Time**: ~5 minutes
**Verification Time**: ~5 minutes
**Total**: ~10 minutes

You're ready to deploy! 🚀
