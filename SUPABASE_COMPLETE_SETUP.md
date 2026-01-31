# Supabase Integration - Complete Setup Instructions

## ✅ What's Already Done

- [x] Supabase package installed (@supabase/supabase-js)
- [x] Supabase client created (src/supabase.ts)
- [x] Environment variables configured (.env)
- [x] Service layer created (src/services/supabaseService.ts)
- [x] Migration utility created (src/services/migrationService.ts)
- [x] Documentation completed

## 📋 What You Need to Do (In Order)

### Step 1: Create Database Schema in Supabase (5 minutes)

**Purpose**: Create all the PostgreSQL tables needed for your family tree data

**Instructions**:

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project: "family-tree" (or whatever you named it)
3. Click **SQL Editor** in the left sidebar
4. Click **New Query** button
5. Copy the entire contents of the file: `setup_supabase_schema.sql`
   - Full path: `c:\Users\HP\project\react-family-tree-example\setup_supabase_schema.sql`
6. Paste all the SQL into the editor
7. Click the blue **"Run"** button
8. Wait for the success message (should be green)
9. You should see messages like:
   ```
   CREATE TABLE
   CREATE INDEX
   ALTER TABLE
   ...
   ```

**Verification** (2 minutes after):

1. Click **Table Editor** in left sidebar
2. Look for these tables in the list:
   - villages
   - tree
   - people
   - businesses
   - business_categories
   - users

3. Click on `people` table to verify columns exist:
   - name ✓
   - name_lowercase ✓
   - gender ✓
   - dob, dod ✓
   - parents (JSONB) ✓
   - children (JSONB) ✓
   - spouses (JSONB) ✓
   - hierarchy (JSONB) ✓
   - villageId ✓
   - treeId ✓

If all tables appear with correct columns, **Step 1 is complete!** ✅

---

### Step 2: Verify Environment Variables (2 minutes)

**Purpose**: Ensure Supabase credentials are correctly configured

**Instructions**:

1. Check that `.env` file exists in your project root:

   ```
   c:\Users\HP\project\react-family-tree-example\.env
   ```

2. Verify it contains:

   ```
   REACT_APP_SUPABASE_URL=https://mmmzbcxwdfaeujayuwzp.supabase.co
   REACT_APP_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_ilxaYHDkjyQbGf5KEjMQcw_0EKVZqnt
   ```

3. If running npm start, stop and restart:

   ```bash
   # In terminal (Ctrl+C to stop)
   npm start
   ```

4. Verify in browser console (F12 → Console) that there are no errors about environment variables

If no errors, **Step 2 is complete!** ✅

---

### Step 3: Migrate Firebase Data to Supabase (10-30 minutes)

**Purpose**: Copy all your existing data from Firebase to Supabase

**Prerequisites**:

- ✅ Supabase schema created (Step 1)
- ✅ Environment variables configured (Step 2)
- ✅ Your application is NOT being used by others right now

**Instructions**:

**Option A: Using Debug Page (Easiest)**

1. Add this to `src/components/DebugPage/DebugPage.tsx`:

   Find this section in the file:

   ```typescript
   const handleRunHierarchyMigration = async () => {
   ```

   Add this new function right after it:

   ```typescript
   const handleMigrateToSupabase = async () => {
     try {
       setLoading(true);
       const results = await MigrationService.runFullMigration();
       console.log("Migration results:", results);

       const verification = await MigrationService.verifyMigration();
       console.log("Verification results:", verification);

       alert(
         `Migration complete!\n\nResults:\n${JSON.stringify(results, null, 2)}`,
       );
     } catch (error) {
       console.error("Migration error:", error);
       alert(
         `Migration failed: ${error instanceof Error ? error.message : "Unknown error"}`,
       );
     } finally {
       setLoading(false);
     }
   };
   ```

2. Add a button to the JSX:

   ```typescript
   <button onClick={handleMigrateToSupabase} disabled={loading}>
     Migrate to Supabase
   </button>
   ```

3. Import MigrationService at the top:

   ```typescript
   import { MigrationService } from "../../services/migrationService";
   ```

4. Open your app at http://localhost:3000
5. Go to the Debug page
6. Click **"Migrate to Supabase"** button
7. Watch the console (F12 → Console tab) for progress messages
8. You should see output like:

   ```
   Starting villages migration...
   Villages migration complete: 3 success, 0 failed

   Starting trees migration...
   Trees migration complete: 5 success, 0 failed

   ... etc for people, businesses, categories ...

   Migration complete: X success, 0 failed
   ```

9. A popup should appear saying "Migration complete!"

**Option B: Using Browser Console (If you can't modify DebugPage)**

1. In your browser, press F12 to open Developer Tools
2. Go to **Console** tab
3. Paste and run:

   ```javascript
   import { MigrationService } from "./services/migrationService";

   const results = await MigrationService.runFullMigration();
   console.log("Results:", results);

   const verification = await MigrationService.verifyMigration();
   console.log("Verification:", verification);
   ```

**Verification** (After migration):

1. In Supabase dashboard, go to **Table Editor**
2. Click on each table and verify data appears:
   - villages: Should show your villages
   - tree: Should show your family trees
   - people: Should show all your people with hierarchies
   - businesses: Should show all your businesses
   - business_categories: Should show categories

3. Check the console output shows:
   ```
   ✅ All records migrated successfully!
   ```

If data appears in all tables, **Step 3 is complete!** ✅

---

### Step 4: Test Supabase Queries (10 minutes)

**Purpose**: Verify that SupabaseService can read/write data correctly

**Instructions**:

1. In your browser console (F12 → Console), test each operation:

**Test 1: Fetch all people from a tree**

```javascript
const { SupabaseService } = await import("./services/supabaseService");
const treeId = "YOUR_TREE_ID"; // Get from your data
const people = await SupabaseService.getPeopleByTree(treeId);
console.log("People:", people);
// Should log array of people objects
```

**Test 2: Search for a person**

```javascript
const results = await SupabaseService.searchPeople("John");
console.log("Search results:", results);
// Should log matching people
```

**Test 3: Get a specific person**

```javascript
const personId = "SOME_PERSON_ID"; // Get from results above
const person = await SupabaseService.getPersonById(personId);
console.log("Person:", person);
// Should log person object with all fields
```

**Test 4: Create a test person**

```javascript
const newPerson = await SupabaseService.createPerson({
  name: "Test Person",
  gender: "male",
  treeId: "YOUR_TREE_ID",
  villageId: "YOUR_VILLAGE_ID",
});
console.log("Created:", newPerson);
// Should log the newly created person with an ID
```

**Test 5: Verify it was created**

```javascript
const supabase = (await import("./supabase")).supabase;
const { data } = await supabase
  .from("people")
  .select("*")
  .eq("name", "Test Person");
console.log("Found:", data);
// Should show the test person in the list
```

If all tests log data without errors, **Step 4 is complete!** ✅

---

### Step 5: Update Components (1-2 hours)

**Purpose**: Replace Firebase calls with Supabase calls in React components

**Which files to update** (in order of complexity):

#### 5.1 BusinessPage.tsx (Easiest)

Find the `handleSearchOwner` function:

```typescript
// OLD (Firebase):
const results = await db
  .collection("businesses")
  .where("villageId", "==", villageId)
  .where("name_lowercase", ">=", searchTerm)
  .get();

// NEW (Supabase):
import { SupabaseService } from "../../services/supabaseService";

const results = await SupabaseService.searchPeople(searchTerm, villageId);
```

#### 5.2 FamousPage.tsx (Easy)

Find where it fetches people:

```typescript
// OLD (Firebase):
const snapshot = await db
  .collection("people")
  .where("treeId", "==", treeId)
  .get();

// NEW (Supabase):
import { SupabaseService } from "../../services/supabaseService";

const people = await SupabaseService.getPeopleByTree(treeId);
```

#### 5.3 FamiliesPage.tsx (Hard)

This is complex because it uses transactions. For now, keep using Firebase here and migrate after other components work.

#### 5.4 Other Components

Update any other Firebase calls similarly using SupabaseService methods.

---

### Step 6: Test Full Application (30 minutes)

**Purpose**: Verify everything still works with Supabase

**Test Scenarios**:

- [ ] Can view family tree
- [ ] Can search for people
- [ ] Search results filter by village
- [ ] Can search for business owners
- [ ] Can create a new person (if using SupabaseService)
- [ ] Can add relationships (if using SupabaseService)
- [ ] Can update person info
- [ ] Business page displays correctly
- [ ] No errors in browser console (F12)

**If you encounter errors**:

1. Check browser console for error messages
2. Check Supabase dashboard:
   - SQL Editor: Can you query the data?
   - Table Editor: Does the data look correct?
3. Check if columns match (name vs name_lowercase, etc.)
4. Review SUPABASE_SCHEMA.md for expected structure

---

### Step 7: Deploy to Production (When Ready)

Once all components are updated and tested:

1. Commit your changes to git
2. Push to your main branch
3. Deploy using your CI/CD pipeline (Firebase Hosting, Vercel, Netlify, etc.)
4. Test in production
5. Monitor for errors

---

## 🚀 Quick Command Reference

```bash
# Start development server
npm start

# Run tests
npm test

# Build for production
npm run build

# Check for TypeScript errors
npx tsc --noEmit
```

---

## 📞 Troubleshooting

### Problem: "Cannot find module 'supabaseService'"

**Solution**: Verify file exists at `src/services/supabaseService.ts`

```bash
# Check in terminal:
ls src/services/supabaseService.ts
```

### Problem: Supabase queries return 403 Forbidden

**Solution**: Check RLS policies in Supabase:

1. Go to Table Editor
2. Select `people` table
3. Click **RLS** button at top
4. Verify you see policies allowing SELECT

### Problem: "relation 'people' does not exist"

**Solution**: Schema wasn't created - go back to Step 1

1. Run setup_supabase_schema.sql again
2. Verify tables appear in Table Editor

### Problem: Migration shows 0 records migrated

**Solution**: Check Firebase connection

1. Verify `src/firebase.tsx` is configured correctly
2. Check that Firebase data actually exists
3. Look at console for detailed error messages

### Problem: Different record counts after migration

**Solution**: Check for errors during migration

1. Look at browser console during migration
2. Check Supabase Table Editor for partial data
3. Try running migration again
4. Check Firebase for any special data types that couldn't convert

---

## 📊 Progress Tracking

| Step | Task              | Status       | Time      |
| ---- | ----------------- | ------------ | --------- |
| 1    | Create Schema     | Start here   | 5 min     |
| 2    | Verify Env Vars   | After Step 1 | 2 min     |
| 3    | Migrate Data      | After Step 2 | 10-30 min |
| 4    | Test Queries      | After Step 3 | 10 min    |
| 5    | Update Components | After Step 4 | 1-2 hours |
| 6    | Test App          | After Step 5 | 30 min    |
| 7    | Deploy            | After Step 6 | Varies    |

---

## 📚 Reference Documents

- **SUPABASE_QUICK_REFERENCE.md** - Quick syntax for common operations
- **SUPABASE_SCHEMA.md** - Database schema details
- **SUPABASE_MIGRATION.md** - Detailed migration guide
- **SUPABASE_ARCHITECTURE.md** - System design and flows
- **SUPABASE_SETUP_SUMMARY.md** - Overview of all files

---

## ✅ Final Checklist

Before marking as complete:

- [ ] Schema created in Supabase (Table Editor shows all tables)
- [ ] Environment variables configured (.env file exists)
- [ ] Data migrated from Firebase (verification shows 100% match)
- [ ] Service layer tested (console tests passed)
- [ ] Components updated (Firebase imports replaced with SupabaseService)
- [ ] Application tested (no errors, features work)
- [ ] Ready for production deployment

---

**Current Status**: Ready for Step 1 - Create Schema

**Next Action**: Go to Supabase dashboard and run setup_supabase_schema.sql

**Questions?** See SUPABASE_QUICK_REFERENCE.md or check error messages carefully.
