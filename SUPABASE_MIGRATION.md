# Supabase Migration Guide

This guide walks you through migrating your React Family Tree application from Firebase to Supabase.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Create Supabase Project](#step-1-create-supabase-project)
3. [Step 2: Set Up Database Schema](#step-2-set-up-database-schema)
4. [Step 3: Configure Environment Variables](#step-3-configure-environment-variables)
5. [Step 4: Migrate Data from Firebase](#step-4-migrate-data-from-firebase)
6. [Step 5: Update React Components](#step-5-update-react-components)
7. [Step 6: Set Up Authentication](#step-6-set-up-authentication)
8. [Step 7: Testing and Validation](#step-7-testing-and-validation)
9. [Troubleshooting](#troubleshooting)

## Prerequisites

- ✅ Existing Firebase project with data
- ✅ Node.js and npm installed
- ✅ Supabase account (create at https://supabase.com)
- ✅ Basic understanding of SQL and REST APIs

## Step 1: Create Supabase Project

1. Go to https://supabase.com and sign in
2. Click "New Project"
3. Fill in:
   - **Project name**: e.g., "family-tree"
   - **Database password**: Save this securely
   - **Region**: Choose closest to your users
4. Click "Create new project"
5. Wait for initialization (2-3 minutes)
6. Go to Project Settings → API to find:
   - `REACT_APP_SUPABASE_URL` (Project URL)
   - `REACT_APP_SUPABASE_PUBLISHABLE_DEFAULT_KEY` (Anon Key)

**Note**: You already have these credentials configured in `.env`

## Step 2: Set Up Database Schema

### Option A: Using SQL Editor (Recommended)

1. In Supabase dashboard, go to **SQL Editor**
2. Click **"New Query"**
3. Open the file: `setup_supabase_schema.sql`
4. Copy the entire SQL content
5. Paste into the SQL Editor
6. Click **"Run"** button
7. Check for success messages

### Option B: Using psql Command Line

```bash
# Get your database connection string from:
# Supabase Dashboard → Settings → Database → Connection String

psql "postgresql://[user]:[password]@[host]:[port]/[database]" < setup_supabase_schema.sql
```

### Verify Schema Creation

1. In Supabase, go to **Table Editor** on the left
2. You should see these tables:
   - `villages`
   - `tree`
   - `people`
   - `businesses`
   - `business_categories`
   - `users`

3. Click on `people` table to verify structure includes:
   - name
   - name_lowercase
   - gender
   - dob, dod, place
   - parents (JSONB)
   - children (JSONB)
   - spouses (JSONB)
   - hierarchy (JSONB)

## Step 3: Configure Environment Variables

Your `.env` file should already have:

```
REACT_APP_SUPABASE_URL=https://mmmzbcxwdfaeujayuwzp.supabase.co
REACT_APP_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_ilxaYHDkjyQbGf5KEjMQcw_0EKVZqnt
```

Restart your development server to load new environment variables:

```bash
npm start
```

## Step 4: Migrate Data from Firebase

### Pre-Migration Checklist

- [ ] All Firebase data is backed up
- [ ] Supabase schema is created and verified
- [ ] Environment variables are configured
- [ ] Application is not in use during migration

### Run Migration

1. Open your app's debug page or run from console:

```javascript
import { MigrationService } from "./services/migrationService";

// Run the migration
const results = await MigrationService.runFullMigration();
console.log(results);
```

2. The migration will:
   - Migrate all villages
   - Migrate all family trees
   - Migrate all people (with hierarchy, relationships)
   - Migrate all businesses
   - Migrate all business categories

3. After migration, verify:

```javascript
// Verify record counts match
const verification = await MigrationService.verifyMigration();
console.log(verification);
```

### Expected Output

```
Verification Results:
┌──────────────────┬──────────┬──────────┬───────┐
│ (index)          │ firebase │ supabase │ match │
├──────────────────┼──────────┼──────────┼───────┤
│ villages         │ 3        │ 3        │ true  │
│ tree             │ 5        │ 5        │ true  │
│ people           │ 245      │ 245      │ true  │
│ businesses       │ 18       │ 18       │ true  │
│ businessCateg... │ 12       │ 12       │ true  │
└──────────────────┴──────────┴──────────┴───────┘
✅ All records migrated successfully!
```

## Step 5: Update React Components

### Update FamiliesPage.tsx

Replace Firebase calls with Supabase:

```typescript
import { SupabaseService } from "../services/supabaseService";

// Instead of:
// await applyRelationInTransaction(...)

// Use:
const updatedPerson = await SupabaseService.updatePerson(personId, updates);
```

### Update BusinessPage.tsx

```typescript
// Instead of:
// const results = await db.collection('businesses')
//   .where('villageId', '==', villageId)
//   .where('name_lowercase', '>=', searchTerm.toLowerCase())
//   .get();

// Use:
const results = await SupabaseService.searchPeople(searchTerm, villageId);
```

### Update FamilyNode.tsx

```typescript
// Instead of:
// const person = await db.collection('people').doc(personId).get();

// Use:
const person = await SupabaseService.getPersonById(personId);
```

## Step 6: Set Up Authentication

### Supabase Auth (Future Phase)

Currently, your app uses Firebase Auth. To migrate to Supabase Auth:

1. Go to **Authentication** in Supabase dashboard
2. Enable providers (Email, Google, Phone)
3. Update your `AuthContext.tsx` to use Supabase Auth:

```typescript
import { supabase } from "../supabase";

const signUp = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) throw error;
  return data.user;
};
```

## Step 7: Testing and Validation

### Test Checklist

- [ ] People can be created with `SupabaseService.createPerson()`
- [ ] People can be updated with `SupabaseService.updatePerson()`
- [ ] People can be deleted with `SupabaseService.deletePerson()`
- [ ] Parent relationships work with `SupabaseService.addParent()`
- [ ] Spouse relationships work with `SupabaseService.addSpouse()`
- [ ] Search works with `SupabaseService.searchPeople()`
- [ ] Hierarchy is calculated correctly with `SupabaseService.buildHierarchy()`
- [ ] Business search works with village filtering
- [ ] All CRUD operations work for businesses

### Manual Testing Steps

1. **Create a Test Person**:

   ```javascript
   const person = await SupabaseService.createPerson({
     name: "Test Person",
     gender: "male",
     treeId: "your-tree-id",
   });
   ```

2. **Add a Relationship**:

   ```javascript
   await SupabaseService.addParent(childId, parentId);
   ```

3. **Search for People**:

   ```javascript
   const results = await SupabaseService.searchPeople("John", villageId);
   ```

4. **Verify in Supabase**:
   - Go to Table Editor → people
   - Verify new records appear
   - Check that parents/children/spouses are stored as JSONB

## Troubleshooting

### Issue: "Cannot find module 'supabaseService'"

**Solution**: Make sure you've created `src/services/supabaseService.ts`

```bash
# Check if file exists:
ls -la src/services/
```

### Issue: Supabase queries return 403 Forbidden

**Solution**: Check RLS policies

1. Go to **Table Editor** → Select table → **RLS** button
2. Ensure at least one policy allows reads:
   ```sql
   CREATE POLICY "public_read" ON people
   FOR SELECT USING (true);
   ```

### Issue: JSONB arrays not working in queries

**Solution**: Use JSONB-specific operators:

```typescript
// Instead of:
.eq('parents', parentId)

// Use:
.contains('parents', [{ id: parentId }])
```

### Issue: "Column does not exist" errors

**Solution**: Verify schema was created correctly

1. In Supabase, go to **Table Editor** → **people**
2. Click the "Info" icon to see all columns
3. Verify these exist:
   - name_lowercase
   - villageId
   - hierarchy (JSONB)
   - parents (JSONB)
   - children (JSONB)

### Issue: Data not migrating - getting errors

**Solution**: Check the browser console for detailed error messages

1. Open Developer Tools (F12)
2. Go to **Console** tab
3. Look for red error messages from MigrationService
4. Common issues:
   - Firebase timestamps not converting properly
   - JSONB format is different
   - UUID mismatches

## Performance Considerations

### PostgreSQL Advantages Over Firebase

| Feature           | Firebase            | Supabase               | Winner   |
| ----------------- | ------------------- | ---------------------- | -------- |
| Full-text search  | Basic               | Advanced (GIN indexes) | Supabase |
| Complex joins     | Difficult           | Native SQL             | Supabase |
| Aggregation       | Client-side         | Built-in               | Supabase |
| Transactions      | Atomic at doc level | ACID across tables     | Supabase |
| Recursive queries | Not possible        | Using WITH RECURSIVE   | Supabase |
| Scaling           | Document limits     | Database scaling       | Supabase |

### Optimizations Already in Place

1. **Indexes on common queries**:
   - `idx_people_treeId` - Fast tree lookups
   - `idx_people_village_lowercase` - Fast village + search
   - `idx_people_hierarchy` - Fast hierarchy traversal

2. **JSONB for flexible relationships**:
   - No need to normalize parent/child tables
   - Still queryable with GIN indexes
   - Can store relationship metadata

## Next Steps

1. ✅ Create Supabase project
2. ✅ Set up database schema
3. ✅ Configure environment variables
4. ⏳ Migrate data from Firebase
5. ⏳ Update React components to use SupabaseService
6. ⏳ Test all functionality
7. ⏳ Deploy to production
8. ⏳ Monitor for issues
9. ⏳ (Optional) Migrate to Supabase Auth

## Questions or Issues?

- Check Supabase docs: https://supabase.com/docs
- See schema design: [SUPABASE_SCHEMA.md](SUPABASE_SCHEMA.md)
- Review service layer: [src/services/supabaseService.ts](src/services/supabaseService.ts)
