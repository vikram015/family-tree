# Supabase Quick Reference

## 🚀 Getting Started (5 Minutes)

### 1. Create Database Schema

```
1. Go to https://app.supabase.com
2. Select your project
3. SQL Editor → New Query
4. Copy all of setup_supabase_schema.sql
5. Paste and Run
6. Wait for "Success"
```

### 2. Verify Tables Exist

```
Table Editor (left sidebar)
Should see: villages, tree, people, businesses, business_categories
```

### 3. Environment Variables

✅ Already in `.env`:

```
REACT_APP_SUPABASE_URL=https://mmmzbcxwdfaeujayuwzp.supabase.co
REACT_APP_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_ilxaYHDkjyQbGf5KEjMQcw_0EKVZqnt
```

---

## 📚 Service Layer Usage

### Import

```typescript
import { SupabaseService } from "../services/supabaseService";
```

### Create Person

```typescript
const newPerson = await SupabaseService.createPerson({
  name: "John Doe",
  gender: "male",
  dob: "1990-01-01",
  treeId: "tree-123",
  villageId: "village-456",
});
```

### Update Person

```typescript
const updated = await SupabaseService.updatePerson(personId, {
  name: "Jane Doe",
  dod: "2024-01-01",
});
```

### Add Relationships

```typescript
// Add parent
await SupabaseService.addParent(childId, parentId);

// Add spouse
await SupabaseService.addSpouse(personId, spouseId);

// Add child
await SupabaseService.addChild(parentId, childId);
```

### Search People

```typescript
// Search by name
const results = await SupabaseService.searchPeople("John");

// Search by name in specific village
const villageResults = await SupabaseService.searchPeople("John", villageId);
```

### Get Person

```typescript
const person = await SupabaseService.getPersonById(personId);
```

### Get All People in Tree

```typescript
const allPeople = await SupabaseService.getPeopleByTree(treeId);
```

### Delete Person

```typescript
await SupabaseService.deletePerson(personId);
```

### Build Hierarchy

```typescript
const ancestors = await SupabaseService.buildHierarchy(personId);
// Returns: [{ name: 'Grandfather', id: '...' }, { name: 'Father', id: '...' }]
```

---

## 🔄 Migration

### Run Migration

```typescript
import { MigrationService } from "../services/migrationService";

// Migrate everything from Firebase to Supabase
const results = await MigrationService.runFullMigration();
```

### Verify Migration

```typescript
// Check if record counts match
const verification = await MigrationService.verifyMigration();
```

---

## 🧪 Test Data Queries

### In Browser Console

```javascript
// Test basic fetch
const people = await SupabaseService.getPeopleByTree("YOUR_TREE_ID");
console.log(people);

// Test search
const results = await SupabaseService.searchPeople("John");
console.log(results);

// Test person fetch
const person = await SupabaseService.getPersonById("PERSON_ID");
console.log(person);
```

---

## 📊 Database Schema Quick Reference

### people table columns

- `id` - UUID primary key
- `name` - Person's name
- `name_lowercase` - For searching
- `gender` - 'male', 'female', or 'other'
- `dob`, `dod` - Birth and death dates
- `place` - Place of birth/origin
- `notes` - Additional info
- `photo` - Photo URL
- `treeId` - Foreign key to tree
- `villageId` - Foreign key to villages
- `parents` - JSONB array: [{ id, type }, ...]
- `children` - JSONB array: [{ id, type }, ...]
- `spouses` - JSONB array: [{ id, type }, ...]
- `hierarchy` - JSONB array: [{ name, id }, ...]

### tree table columns

- `id` - UUID primary key
- `name` - Tree name
- `villageId` - Foreign key to villages
- `villageName` - Denormalized for quick access
- `createdBy` - Creator's name/ID
- `createdAt`, `updatedAt` - Timestamps

### businesses table columns

- `id` - UUID primary key
- `name` - Business name
- `name_lowercase` - For searching
- `category` - Business category
- `ownerId` - Foreign key to people
- `villageId` - Foreign key to villages
- `treeId` - Foreign key to tree
- `phone`, `email` - Contact info
- `address` - Business address

---

## 🔍 Common Patterns

### Village-Scoped Operations

```typescript
// Get all people in a specific village
const villageId = "village-123";
const people = await supabase
  .from("people")
  .select("*")
  .eq("villageId", villageId);
```

### Search with Village Filter

```typescript
const searchResults = await SupabaseService.searchPeople("John", villageId);
// Returns only people named John in the specific village
```

### Get Business Owners

```typescript
const businesses = await supabase
  .from("businesses")
  .select("*, people(*)") // Join with people table
  .eq("villageId", villageId);
```

### Relationship Operations

```typescript
// Add parent and update hierarchy
await SupabaseService.addParent(childId, parentId);

// This automatically:
// 1. Updates child's parents array
// 2. Updates parent's children array
// 3. Recalculates child's hierarchy
// 4. Triggers for all descendants
```

---

## ⚠️ Common Issues

| Error                              | Solution                                                   |
| ---------------------------------- | ---------------------------------------------------------- |
| "relation 'people' does not exist" | Run setup_supabase_schema.sql                              |
| "403 Forbidden"                    | RLS policy issue - check policies in Table Editor          |
| "permission denied"                | Not authenticated - check auth context                     |
| "duplicate key value"              | UUID conflict - clear and re-migrate                       |
| "JSONB syntax error"               | Check parent/children format: [{ id: '...', type: '...' }] |

---

## 📁 Key Files

| File                               | Purpose                             |
| ---------------------------------- | ----------------------------------- |
| `src/supabase.ts`                  | Supabase client config              |
| `src/services/supabaseService.ts`  | All family tree operations          |
| `src/services/migrationService.ts` | Firebase → Supabase migration       |
| `setup_supabase_schema.sql`        | Database schema (run in SQL Editor) |
| `SUPABASE_SCHEMA.md`               | Detailed schema documentation       |
| `SUPABASE_MIGRATION.md`            | Step-by-step migration guide        |
| `SUPABASE_SETUP_SUMMARY.md`        | Complete setup overview             |

---

## 🔗 Useful Links

- Supabase Dashboard: https://app.supabase.com
- Supabase Docs: https://supabase.com/docs
- PostgreSQL Docs: https://www.postgresql.org/docs/
- Supabase JS Client: https://supabase.com/docs/reference/javascript

---

## ✅ Checklist

- [ ] Supabase project created
- [ ] Schema created (SQL run successfully)
- [ ] Environment variables configured
- [ ] Tables visible in Table Editor
- [ ] Migration completed (optional but recommended)
- [ ] Data verified in Supabase
- [ ] Components updated to use SupabaseService
- [ ] Search tested and working
- [ ] Relationships tested and working
- [ ] Ready for production

---

## 💡 Tips

1. **Always verify your Supabase dashboard** - Table Editor shows what's actually in the database
2. **Use the service layer** - SupabaseService handles all the complexity
3. **Test in browser console** - Copy-paste methods from this file to test
4. **Check RLS policies** - If queries fail, check Table Editor → RLS button
5. **Monitor migrations** - Console shows detailed error messages if something goes wrong
6. **Keep Firebase running** - Don't delete Firebase until everything works in Supabase

---

## 🆘 Need Help?

1. Read the errors in **browser console** (F12)
2. Check **Supabase dashboard** → SQL Editor for schema errors
3. Review **SUPABASE_MIGRATION.md** for detailed steps
4. Look at **SUPABASE_SCHEMA.md** for schema details
5. Check **SupabaseService** JSDoc comments for usage examples
