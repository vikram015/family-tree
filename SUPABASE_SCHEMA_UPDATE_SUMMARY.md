# Updated Migration Service and Supabase Service

## Summary of Changes

Updated both `migrationService.ts` and `supabaseService.ts` to align with the new normalized schema in `setup_supabase_schema.sql`.

## Key Schema Changes

### Old Schema

- Embedded JSONB arrays for relationships (parents, children, spouses, siblings, hierarchy)
- Denormalized structure with all data in person document
- Village and hierarchy data stored directly in people table

### New Schema

- Normalized `people_relations` table for storing relationships
- Separate tables for `state`, `district`, `village`, `caste`, `sub_caste`
- Simplified `people` table with just: name, gender, dob, tree_id
- Relationships stored as `relation_type` (parent, spouse)

---

## Migration Service Updates

### New Methods

#### `migrateStates()`

- Extracts unique states from Firebase villages data
- Creates state records in Supabase

#### `migrateVillages()`

- Updated to reference state via state_id (foreign key)
- Removed country field (now using state/district hierarchy)

#### `migrateTrees()`

- Updated field mappings:
  - `villageId` → `village_id`
  - `createdAt` → `created_at`
  - `updatedAt` → `modified_at`
- Added: `description`, `caste`, `sub_caste` fields
- Added: `created_by` field

#### `migratePeople()`

- Simplified to only include: name, gender, dob, tree_id
- Removed JSONB arrays (handled by `migrateRelationships()`)
- Changed `treeId` → `tree_id`

#### `migrateRelationships()` (NEW)

- Runs after people migration
- Converts Firebase embedded relationships to `people_relations` table
- Creates entries for:
  - Parent relationships (`relation_type: 'parent'`)
  - Spouse relationships (`relation_type: 'spouse'`)
- Note: Children are queried from other direction (parent reference)

#### `migrateBusinesses()`

- Updated table name: `businesses` → `business`
- Updated field: `ownerId` → `people_id`
- Removed `villageId`, `treeId`, `phone`, `email`, `address` (out of scope for new schema)

#### `runFullMigration()`

- **New order of execution**:
  1. States (no dependencies)
  2. Villages (depends on states)
  3. Trees (depends on villages)
  4. Business Categories
  5. People (depends on trees)
  6. **Relationships** (depends on people) ← NEW STEP
  7. Businesses (depends on people)

#### `verifyMigration()`

- Updated table names:
  - `villages` → `village`
  - `businesses` → `business`

---

## Supabase Service Updates

### Interface Change

**Old**: Methods returned `FNode[]` with embedded relationships

**New**: Methods return `PersonWithRelations` which fetches relationships from `people_relations` table

```typescript
interface PersonWithRelations extends FNode {
  parents?: Array<{ id: string; relation_type: string }>;
  children?: Array<{ id: string; relation_type: string }>;
  spouses?: Array<{ id: string; relation_type: string }>;
}
```

### Core Methods Updated

#### `getPeopleByTree(treeId)`

- Changed query field: `treeId` → `tree_id`
- Now fetches relationships for each person

#### `getPersonById(personId)`

- Now fetches and merges relationships from `people_relations` table

#### `getPersonRelations(personId)` (NEW)

- Helper method to fetch relationships for a person
- Queries both directions:
  - `person_id = personId` (parents, spouses)
  - `related_person_id = personId` (children)

#### `createPerson(person)`

- Simplified data structure (no JSONB)
- Creates just: name, gender, dob, tree_id

#### `updatePerson(personId, updates)`

- Removed name_lowercase handling
- Only updates: name, gender, dob

#### `deletePerson(personId)`

- Simplified: deletes from `people_relations` first, then people
- No need for complex recursive cleanup

#### `addParent(childId, parentId)`

- Now creates entry in `people_relations` table
- Removed complex array manipulation

#### `addSpouse(personId, spouseId)` (UPDATED)

- Creates bidirectional entries in `people_relations`
- Both person→spouse and spouse→person relationships

#### `addChild(parentId, childId)`

- Simplified to call `addParent()`

#### `removeRelation(personId, relatedPersonId, relationType)` (NEW)

- Remove any relationship from people_relations table

#### `searchPeople(searchTerm, treeId)`

- Changed field: `name_lowercase` → `name` with ILIKE
- Can filter by tree_id

### New Methods for Hierarchy Management

#### `getVillages()`, `getStates()`, `getDistricts()`, `getVillagesForDistrict()`

- Access to the new geographic hierarchy tables

#### `getCastes()`, `getSubCastes()`

- Access to caste hierarchy tables

#### `getTreeWithDetails(treeId)`

- Fetches tree with nested village/district/state details

### Business Methods

#### `searchBusinesses()`, `getBusinessesByPerson()`, `createBusiness()`, `updateBusiness()`, `deleteBusiness()`

- Updated table name: `businesses` → `business`
- Updated field: `ownerId` → `people_id`

---

## Field Name Mappings

| Old (Firebase/JSONB)             | New (PostgreSQL)                                       | Notes                                |
| -------------------------------- | ------------------------------------------------------ | ------------------------------------ |
| `treeId`                         | `tree_id`                                              | Foreign key to tree table            |
| `villageId`                      | (removed from people)                                  | Villages accessed via tree table     |
| `name_lowercase`                 | (removed)                                              | Use ILIKE with lowercase()           |
| `dod`, `place`, `notes`, `photo` | (removed)                                              | Not in new schema                    |
| `parents[]`                      | people_relations with relation_type='parent'           | Separate table                       |
| `children[]`                     | people_relations with relation_type='parent' (reverse) | Separate table                       |
| `spouses[]`                      | people_relations with relation_type='spouse'           | Separate table                       |
| `siblings[]`                     | (removed)                                              | Not in new schema                    |
| `hierarchy[]`                    | (removed)                                              | Can be calculated with SQL recursion |
| `createdBy`                      | `created_by`                                           | Snake_case                           |
| `createdAt`                      | `created_at`                                           | Snake_case                           |
| `updatedAt`                      | `modified_at`                                          | Snake_case                           |

---

## Usage Examples

### Migrate Data from Firebase to Supabase

```typescript
import { MigrationService } from "./services/migrationService";

// Run full migration with new relationship handling
const results = await MigrationService.runFullMigration();
console.log(results); // Shows success/failed counts for each step

// Verify migration
const verification = await MigrationService.verifyMigration();
console.log(verification);
```

### Create Person with Relationships

```typescript
import { SupabaseService } from "./services/supabaseService";

// Create person
const person = await SupabaseService.createPerson({
  name: "John Doe",
  gender: "male",
  dob: "1990-01-01",
  treeId: "tree-id-123",
});

// Add parent relationship
await SupabaseService.addParent(person.id, parentId);

// Add spouse relationship
await SupabaseService.addSpouse(person.id, spouseId);

// Get person with relationships
const personWithRelations = await SupabaseService.getPersonById(person.id);
console.log(personWithRelations.parents); // Array of parent objects
console.log(personWithRelations.spouses); // Array of spouse objects
```

### Search and Filter

```typescript
// Search by name in specific tree
const people = await SupabaseService.searchPeople("John", "tree-id-123");

// Get all people in a tree with relationships
const allPeople = await SupabaseService.getPeopleByTree("tree-id-123");

// Access tree with geographic hierarchy
const tree = await SupabaseService.getTreeWithDetails("tree-id-123");
console.log(tree.village.district.state.name); // Full hierarchy
```

---

## Benefits of New Schema

✅ **Relational Integrity**: Foreign keys prevent orphaned data
✅ **Normalized Design**: No data duplication
✅ **Easier Updates**: Change one relationship, not multiple arrays
✅ **Better Scalability**: Separate relationships table for large families
✅ **Flexible Hierarchy**: State → District → Village structure
✅ **Cleaner Code**: No complex JSONB array manipulation
✅ **SQL Queries**: Can use recursive CTEs for ancestry queries

---

## Testing the Changes

### Before Running Migration

1. ✅ Verify Firebase data exists in all collections
2. ✅ Backup Firebase (just in case)
3. ✅ Create Supabase schema (run setup_supabase_schema.sql)
4. ✅ Configure environment variables

### Run Migration

```typescript
// In browser console or DebugPage
const results = await MigrationService.runFullMigration();
```

### Verify Results

1. Check migration console output for success/failed counts
2. Run verification: `await MigrationService.verifyMigration()`
3. Check Supabase Table Editor for data
4. Verify relationships in `people_relations` table

### Test Service Methods

```typescript
// Get person with relationships
const person = await SupabaseService.getPersonById("person-id");
console.log(person.parents, person.children, person.spouses);

// Add relationship
await SupabaseService.addSpouse("person1-id", "person2-id");

// Remove relationship
await SupabaseService.removeRelation("person1-id", "person2-id", "spouse");
```

---

## Breaking Changes for Components

Any components using the old service will need updates:

### Old Code

```typescript
const person = await SupabaseService.getPersonById(id);
person.parents[0].type; // Accessing embedded array
```

### New Code

```typescript
const person = await SupabaseService.getPersonById(id);
person.parents[0].relation_type; // Field name changed
```

---

## Next Steps

1. ✅ Update migrationService.ts (DONE)
2. ✅ Update supabaseService.ts (DONE)
3. ⏳ Run migration: `MigrationService.runFullMigration()`
4. ⏳ Update React components to use new service methods
5. ⏳ Test all CRUD operations
6. ⏳ Update documentation

---

## Files Modified

- `src/services/migrationService.ts` - Updated migration logic for new schema
- `src/services/supabaseService.ts` - Updated service methods for relationships table

## Files Unchanged

- `setup_supabase_schema.sql` - Already updated with new schema
- `src/supabase.ts` - No changes needed
- `.env` - No changes needed
