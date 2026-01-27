# Supabase Integration Summary

## What's Been Set Up

### 1. ✅ Supabase Client Configuration

- **File**: `src/supabase.ts`
- **Status**: Created and ready
- **Contains**: Supabase client initialization using your provided credentials
- **Usage**: Import and use in any component

```typescript
import { supabase } from "../supabase";
```

### 2. ✅ Environment Variables

- **File**: `.env`
- **Status**: Configured with your credentials
- **Contains**:
  - `REACT_APP_SUPABASE_URL`
  - `REACT_APP_SUPABASE_PUBLISHABLE_DEFAULT_KEY`

### 3. ✅ Service Layer

- **File**: `src/services/supabaseService.ts`
- **Status**: Fully implemented
- **Provides**: Complete abstraction for all family tree operations

#### Available Methods:

**People Management**:

- `getPeopleByTree(treeId)` - Fetch all people in a tree
- `getPersonById(personId)` - Get individual person
- `createPerson(person)` - Create new person
- `updatePerson(personId, updates)` - Update person
- `deletePerson(personId)` - Delete person and clean up relationships

**Relationships**:

- `addParent(childId, parentId, type)` - Add parent relationship
- `addSpouse(personId, spouseId, type)` - Add spouse relationship
- `addChild(parentId, childId, type)` - Add child relationship

**Search & Query**:

- `searchPeople(searchTerm, villageId?)` - Search with optional village filter
- `buildHierarchy(personId)` - Calculate ancestry hierarchy

**Other**:

- `getTrees()` - Fetch all family trees
- `createTree(tree)` - Create new tree
- `recalculateHierarchyTree(personId)` - Recalculate hierarchy for person and descendants
- `subscribeToPeople(treeId, callback)` - Real-time subscription to people updates

### 4. ✅ Migration Tools

- **File**: `src/services/migrationService.ts`
- **Status**: Ready to migrate data from Firebase
- **Provides**: One-click migration from Firebase to Supabase

#### Migration Methods:

- `runFullMigration()` - Migrate everything in correct order
- `verifyMigration()` - Compare Firebase vs Supabase record counts

### 5. ✅ Documentation

- **File**: `SUPABASE_SCHEMA.md` - Complete database schema design
- **File**: `setup_supabase_schema.sql` - SQL to create all tables
- **File**: `SUPABASE_MIGRATION.md` - Step-by-step migration guide

## Next Steps (In Order)

### Phase 1: Database Setup (Do First)

1. Go to https://app.supabase.com
2. Find your project
3. Go to **SQL Editor**
4. Create a new query
5. Copy entire content from `setup_supabase_schema.sql`
6. Paste and run in SQL Editor
7. Verify tables appear in Table Editor

### Phase 2: Data Migration (After DB Setup)

1. Add this button to your DebugPage.tsx:

```typescript
const handleMigrateToSupabase = async () => {
  try {
    setLoading(true);
    const results = await MigrationService.runFullMigration();
    alert(`Migration complete! Results: ${JSON.stringify(results)}`);

    // Verify
    const verification = await MigrationService.verifyMigration();
    console.log("Verification:", verification);
  } catch (error) {
    alert(`Migration failed: ${error}`);
  } finally {
    setLoading(false);
  }
};
```

2. Click the migration button
3. Watch console for migration progress
4. Verify counts match at the end

### Phase 3: Component Updates (Incremental)

**Easier components to migrate first**:

1. BusinessPage.tsx - Simple search/filter operations
2. FamousPage.tsx - Simple read-only operations
3. HeritagePage.tsx - Simple read-only operations

**More complex components**: 4. FamiliesPage.tsx - Complex relationship logic and transactions 5. NodeDetails.tsx - Update operations

**Example migration for BusinessPage.tsx**:

```typescript
// OLD (Firebase):
import { db } from "../firebase";
const { docs } = await db
  .collection("businesses")
  .where("villageId", "==", villageId)
  .where("name_lowercase", ">=", searchTerm)
  .get();

// NEW (Supabase):
import { SupabaseService } from "../services/supabaseService";
const people = await SupabaseService.searchPeople(searchTerm, villageId);
const businessOwners = people.map((p) => p.business);
```

### Phase 4: Auth Migration (Optional Later)

- Replace Firebase Auth with Supabase Auth
- This can be done later without affecting family tree data

## File Structure

```
src/
├── supabase.ts                          ← Supabase client
├── services/
│   ├── supabaseService.ts              ← All family tree operations
│   └── migrationService.ts              ← Firebase to Supabase migration
├── components/
│   ├── model/FNode.tsx                 ← Already updated with new fields
│   └── ...
└── firebase.tsx                         ← Keep for now (still using Auth)

Root/
├── .env                                 ← Supabase credentials
├── setup_supabase_schema.sql            ← Run this in Supabase SQL Editor
├── SUPABASE_SCHEMA.md                   ← Schema documentation
└── SUPABASE_MIGRATION.md                ← Migration guide
```

## Key Differences (Firebase → Supabase)

| Aspect             | Firebase              | Supabase                          |
| ------------------ | --------------------- | --------------------------------- |
| **Database Type**  | Document store        | PostgreSQL relational             |
| **Queries**        | FirebaseQuery API     | SQL + REST API                    |
| **Relationships**  | Embedded/refs in docs | JSONB arrays + foreign keys       |
| **Search**         | Basic startAt/endAt   | Full-text search with GIN indexes |
| **Transactions**   | Document atomic       | ACID across tables                |
| **Real-time**      | Real-time listeners   | Subscriptions via WebSocket       |
| **Authentication** | Firebase Auth         | Supabase Auth                     |

## Benefits You Get

1. **Easier Relationship Management**
   - When you add a parent, no need for complex cascading updates
   - Foreign keys prevent orphaned data
   - JSONB relationships are flexible but still queryable

2. **Better Search Performance**
   - Full-text search with GIN indexes
   - Composite indexes on (treeId, name_lowercase)
   - Can add vector search for advanced features

3. **Simpler Code**
   - `SupabaseService` handles all the complexity
   - No more manual transaction management
   - Clean abstraction for component code

4. **Better Scalability**
   - PostgreSQL scales better than Firestore for complex queries
   - Relational integrity prevents data corruption
   - Can use triggers for automatic field updates

5. **Cost Savings**
   - Supabase PostgreSQL is cheaper than Firestore for large datasets
   - No per-operation costs

## Potential Issues & Solutions

| Issue                      | Solution                                          |
| -------------------------- | ------------------------------------------------- |
| "Missing schema" error     | Run setup_supabase_schema.sql in SQL Editor       |
| "403 Forbidden" on queries | Enable RLS policies (done in SQL script)          |
| Migration incomplete       | Check console for errors, rerun MigrationService  |
| Different record counts    | Check Firebase data completeness before migration |
| "Column does not exist"    | Verify schema in Table Editor, rerun SQL script   |

## Connection Details (Already Configured)

```
Project URL: https://mmmzbcxwdfaeujayuwzp.supabase.co
Anon Key: sb_publishable_ilxaYHDkjyQbGf5KEjMQcw_0EKVZqnt
```

If you need the service role key (for migrations), it's in:
Supabase Dashboard → Settings → API Keys → Service Role Key

## Testing After Migration

```typescript
// Quick test in browser console:
import { SupabaseService } from "./services/supabaseService";

// Test 1: Fetch people from a tree
const people = await SupabaseService.getPeopleByTree("your-tree-id");
console.log("People:", people);

// Test 2: Search
const results = await SupabaseService.searchPeople("John", "your-village-id");
console.log("Search results:", results);

// Test 3: Verify hierarchy
if (people.length > 0) {
  const hierarchy = await SupabaseService.buildHierarchy(people[0].id);
  console.log("Hierarchy:", hierarchy);
}
```

## Questions?

1. **Schema issues?** → See `SUPABASE_SCHEMA.md`
2. **How to migrate?** → See `SUPABASE_MIGRATION.md`
3. **How to use service?** → See `src/services/supabaseService.ts` JSDoc comments
4. **Need example component updates?** → Check comment blocks in this file

---

**Status**: Ready for Phase 1 (Database Setup)  
**Blocking Issue**: None - all tools ready  
**Next Action**: Run `setup_supabase_schema.sql` in your Supabase SQL Editor
