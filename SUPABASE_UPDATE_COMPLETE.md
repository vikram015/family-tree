# ✅ Supabase Schema Update - Complete

## What Was Updated

### Files Modified ✅

- [x] `src/services/migrationService.ts` - Updated to match new schema
- [x] `src/services/supabaseService.ts` - Rewritten for normalized schema
- [x] `SUPABASE_SCHEMA_UPDATE_SUMMARY.md` - Created documentation of changes

### Files Unchanged ✅

- `setup_supabase_schema.sql` - Already had your updates
- `src/supabase.ts` - No changes needed
- `.env` - No changes needed
- All documentation files - Reference only

---

## Key Changes Summary

### Migration Service (`migrationService.ts`)

**New Methods**:

- ✅ `migrateStates()` - Extract unique states and create records
- ✅ `migrateRelationships()` - Create people_relations entries (NEW APPROACH)

**Updated Methods**:

- ✅ `migrateVillages()` - Uses state_id foreign key
- ✅ `migrateTrees()` - Maps new fields (village_id, created_at, modified_at, description, caste, sub_caste)
- ✅ `migratePeople()` - Simplified to only name, gender, dob, tree_id
- ✅ `migrateBusinesses()` - Uses business table, people_id field
- ✅ `runFullMigration()` - Includes relationships step (7 steps total)
- ✅ `verifyMigration()` - Updated table names (village, business)

**Migration Order**:

1. States (new)
2. Villages (updated)
3. Trees (updated)
4. Business Categories
5. People (simplified)
6. **Relationships** (NEW)
7. Businesses (updated)

### Supabase Service (`supabaseService.ts`)

**Completely Rewritten**:

- ✅ New interface: `PersonWithRelations`
- ✅ Fetches relationships from `people_relations` table
- ✅ All CRUD operations updated for normalized schema

**Core Methods Updated**:

- ✅ `getPeopleByTree(treeId)` - Fetches relationships for each person
- ✅ `getPersonById(personId)` - Includes relationships
- ✅ `getPersonRelations(personId)` - NEW helper method
- ✅ `createPerson()` - Simplified data structure
- ✅ `updatePerson()` - Only updates simple fields
- ✅ `deletePerson()` - Deletes from people_relations first
- ✅ `addParent()` - Inserts into people_relations
- ✅ `addSpouse()` - Creates bidirectional relationship
- ✅ `addChild()` - Simplified implementation
- ✅ `removeRelation()` - NEW method for deleting relationships
- ✅ `searchPeople()` - Uses ILIKE on name field

**New Hierarchy Methods**:

- ✅ `getVillages()` - With nested district/state
- ✅ `getStates()`
- ✅ `getDistricts(stateId)`
- ✅ `getVillagesForDistrict(districtId)`
- ✅ `getCastes()`
- ✅ `getSubCastes(casteId)`
- ✅ `getTreeWithDetails(treeId)` - Tree with village hierarchy

**Business Methods**:

- ✅ `searchBusinesses()`
- ✅ `getBusinessesByPerson()`
- ✅ `createBusiness()`
- ✅ `updateBusiness()`
- ✅ `deleteBusiness()`

---

## Table & Field Mapping Reference

### Old → New Field Names

```
people table:
  treeId              → tree_id
  villageId           → (removed - access via tree)
  name_lowercase      → (removed - use ILIKE)
  dod, place, notes, photo → (removed)
  parents[] (JSONB)   → people_relations (relation_type='parent')
  children[] (JSONB)  → people_relations (relation_type='parent', reversed)
  spouses[] (JSONB)   → people_relations (relation_type='spouse')
  siblings[] (JSONB)  → (removed)
  hierarchy[] (JSONB) → (removed - can use SQL recursion)
  createdBy           → created_by
  createdAt           → created_at
  updatedAt           → modified_at

tree table:
  villageId           → village_id
  villageName         → (removed - get from village table)
  createdAt           → created_at
  updatedAt           → modified_at
  (new fields)        → description, caste, sub_caste, created_by

businesses:
  table name          → business
  ownerId             → people_id
  villageId, treeId   → (removed from business table)
  phone, email, address → (removed)
  name_lowercase      → (removed - use ILIKE)
```

### New Tables Added

```
state
  id, name, created_at, modified_at, created_by, modified_by, is_deleted

district
  id, name, state_id (FK), created_at, modified_at, created_by, modified_by, is_deleted

village (was 'villages')
  id, name, district_id (FK), created_at, modified_at, created_by, modified_by, is_deleted

caste
  id, name, created_at, modified_at, created_by, modified_by, is_deleted

sub_caste
  id, name, caste_id (FK), created_at, modified_at, created_by, modified_by, is_deleted

people_relations (NEW)
  id, person_id (FK), related_person_id (FK), relation_type (parent|spouse)
  created_at, modified_at, created_by, modified_by
```

---

## What Changed About Relationships

### Old Approach (JSONB Arrays)

```javascript
// In people document:
{
  id: "person1",
  name: "John",
  parents: [
    { id: "person2", type: "blood" },
    { id: "person3", type: "blood" }
  ],
  children: [...],
  spouses: [...]
}

// To add parent: Update entire parents array
```

### New Approach (Normalized Table)

```javascript
// In people table:
{
  id: "person1",
  name: "John",
  tree_id: "tree1",
  // NO relationship arrays
}

// In people_relations table:
{
  id: "rel1",
  person_id: "person1",
  related_person_id: "person2",
  relation_type: "parent"
}

{
  id: "rel2",
  person_id: "person1",
  related_person_id: "person3",
  relation_type: "parent"
}

// To add parent: INSERT single row into people_relations
```

**Benefits**:

- ✅ No data duplication
- ✅ ACID constraints
- ✅ Easier cascading deletes
- ✅ Can query relationships independently
- ✅ Better performance for complex queries

---

## Code Examples

### Migrate Data

```typescript
import { MigrationService } from "./services/migrationService";

// Run migration (handles states → villages → trees → people → relationships)
const results = await MigrationService.runFullMigration();
console.log(results);
// {
//   states: { success: 1, failed: 0 },
//   villages: { success: 5, failed: 0 },
//   trees: { success: 10, failed: 0 },
//   businessCategories: { success: 8, failed: 0 },
//   people: { success: 500, failed: 0 },
//   relationships: { success: 1200, failed: 0 },
//   businesses: { success: 25, failed: 0 }
// }
```

### Create Person with Relationships

```typescript
import { SupabaseService } from "./services/supabaseService";

// Create person
const person = await SupabaseService.createPerson({
  name: "Alice Smith",
  gender: "female",
  dob: "1995-05-15",
  treeId: "tree-123",
});

// Add parent
await SupabaseService.addParent(person.id, "parent-id");

// Add spouse (bidirectional)
await SupabaseService.addSpouse(person.id, "spouse-id");

// Get person with relationships
const aliceWithFamily = await SupabaseService.getPersonById(person.id);
console.log(aliceWithFamily);
// {
//   id: '...',
//   name: 'Alice Smith',
//   gender: 'female',
//   dob: '1995-05-15',
//   tree_id: 'tree-123',
//   parents: [{ id: 'parent-id', relation_type: 'parent' }],
//   spouses: [{ id: 'spouse-id', relation_type: 'spouse' }],
//   children: []
// }
```

### Query Relationships

```typescript
// Get all parents of a person
const person = await SupabaseService.getPersonById("person-id");
const parents = person.parents || [];
console.log(parents);

// Get all people in a tree with their relationships
const familyMembers = await SupabaseService.getPeopleByTree("tree-id");
familyMembers.forEach((person) => {
  console.log(`${person.name} has ${person.children?.length || 0} children`);
});

// Search people
const results = await SupabaseService.searchPeople("John", "tree-123");
results.forEach((person) => {
  console.log(`Found: ${person.name}`);
  if (person.spouses && person.spouses.length > 0) {
    console.log(`  Spouse(s): ${person.spouses.map((s) => s.id).join(", ")}`);
  }
});
```

### Geographic Hierarchy

```typescript
// Get all states
const states = await SupabaseService.getStates();

// Get districts for a state
const districts = await SupabaseService.getDistricts(stateId);

// Get villages for a district
const villages = await SupabaseService.getVillagesForDistrict(districtId);

// Get tree with full geographic hierarchy
const tree = await SupabaseService.getTreeWithDetails(treeId);
console.log(tree.village.district.state.name);
```

---

## Ready for Testing

✅ **Migration Service**: Ready to migrate data
✅ **Supabase Service**: Ready for component integration
✅ **Documentation**: Complete with examples

---

## Next Steps

1. **Run Migration**

   ```typescript
   await MigrationService.runFullMigration();
   ```

2. **Verify Migration**

   ```typescript
   await MigrationService.verifyMigration();
   ```

3. **Update Components**
   - Replace Firebase calls with SupabaseService
   - Update relationship handling code
   - Test all CRUD operations

4. **Test Relationships**

   ```typescript
   // Test adding parents
   await SupabaseService.addParent(childId, parentId);

   // Test adding spouses
   await SupabaseService.addSpouse(personId, spouseId);

   // Test removing relationships
   await SupabaseService.removeRelation(personId, relatedId, "parent");
   ```

---

## Files Ready for Review

- `src/services/migrationService.ts` ✅
- `src/services/supabaseService.ts` ✅
- `SUPABASE_SCHEMA_UPDATE_SUMMARY.md` ✅ (this file)

All changes align with your updated `setup_supabase_schema.sql`.
