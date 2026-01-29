# Quick Deployment Guide - Business with Hierarchy Feature

## Step 1: Deploy Database Function

### In Supabase SQL Editor:

Copy and paste the entire contents of:

```
sql/functions/get_businesses_by_village.sql
```

Execute the SQL to create the function.

### Verify Deployment:

```sql
-- Test the function
SELECT * FROM get_businesses_by_village('YOUR_VILLAGE_ID_HERE');
```

Expected output: A list of businesses with their owners' hierarchy information

## Step 2: Code is Already Ready

No additional code deployment needed - the React component and service methods are already implemented.

## Step 3: Test in Browser

1. Navigate to the Business Page in your application
2. Select a village from the dropdown
3. You should see:
   - Business cards with updated owner information
   - Owner names appearing as **blue clickable links**
   - When you **hover** over an owner name, a tooltip appears showing:
     ```
     John Doe
     Caste: Brahmin
     Sub-Caste: Kanyakubj
     🧬 Father Name → Grandfather Name → Great-Grandfather Name
     ```
   - When you **click** on an owner name, you navigate to the FamilyPage for that tree

## Step 4: Troubleshooting

### If owner names don't appear as clickable links:

1. Check browser console for JavaScript errors
2. Verify the database function was created successfully
3. Check that businesses have owner IDs assigned (people_id field)

### If hierarchy doesn't show on hover:

1. Verify the function returns parent_hierarchy data
2. Check in browser console that the data is being received
3. Ensure people_relations table has proper parent relationships

### If navigation to FamiliesPage doesn't work:

1. Verify the route `/families` exists in App.tsx
2. Check that treeId is being passed correctly in the URL
3. Verify the FamiliesPage component accepts treeId as a query parameter

## Step 5: Manual Testing Queries

### Check if function exists:

```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_name = 'get_businesses_by_village';
```

### Check business data structure:

```sql
SELECT * FROM business LIMIT 1;
```

### Check people_relations for hierarchy:

```sql
SELECT person_id, related_person_id, relation_type
FROM people_relations
WHERE relation_type = 'parent'
LIMIT 10;
```

### Test the function with a real village:

```sql
SELECT
  business_name,
  person_name,
  village_name,
  caste_name,
  parent_hierarchy
FROM get_businesses_by_village(
  (SELECT id FROM village LIMIT 1)
);
```

## Component Structure

```
BusinessPage.tsx
├── OwnerLink component (new)
│   ├── Tooltip with hierarchy info
│   └── Click handler for navigation
├── Fetch businesses with hierarchy
├── Render business cards
└── Show owner as clickable link
```

## Data Flow Diagram

```
Browser
  ↓
BusinessPage (React)
  ↓
SupabaseService.getBusinessesByVillageWithHierarchy()
  ↓
Supabase RPC
  ↓
PostgreSQL: get_businesses_by_village()
  ├── Find village trees
  ├── For each business:
  │   ├── Get owner
  │   ├── Recursive CTE for ancestors
  │   └── Aggregate hierarchy
  └── Return results
```

## File Reference

| File                                           | Purpose                | Status      |
| ---------------------------------------------- | ---------------------- | ----------- |
| `sql/functions/get_businesses_by_village.sql`  | Database function      | ✅ Created  |
| `src/services/supabaseService.ts`              | Service method added   | ✅ Modified |
| `src/components/BusinessPage/BusinessPage.tsx` | Component logic        | ✅ Modified |
| `sql/functions/GET_BUSINESSES_README.md`       | Function documentation | ✅ Created  |
| `BUSINESS_WITH_HIERARCHY_IMPLEMENTATION.md`    | Implementation details | ✅ Created  |

## Key Metrics

- Database function: ~100 lines of SQL
- Service method: 6 lines
- Component changes: OwnerLink component + hierarchy data mapping
- No external dependencies added
- Type-safe implementation with TypeScript

## Support

For questions or issues:

1. Check the GET_BUSINESSES_README.md for function details
2. Review BUSINESS_WITH_HIERARCHY_IMPLEMENTATION.md for architecture
3. Check browser console for runtime errors
4. Verify Supabase RLS policies allow reading business and people data

## What to Expect After Deployment

✅ Business cards show owner names as blue links
✅ Hover shows complete family hierarchy with demographics  
✅ Click navigates to family tree for that person
✅ All businesses in selected village load with hierarchy
✅ Male-only ancestor filtering works automatically
✅ Displays up to 5 generations of ancestry
✅ Shows caste and sub-caste information

---

**Deployment Time**: ~5 minutes
**Testing Time**: ~10 minutes
**Total**: ~15 minutes to full deployment
