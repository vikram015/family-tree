# Supabase Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    REACT APPLICATION                         │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              React Components                         │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │   │
│  │  │ FamiliesPage │  │ BusinessPage │  │ FamousPage │ │   │
│  │  │ (Complex)    │  │ (Search)     │  │ (Simple)   │ │   │
│  │  └──────────────┘  └──────────────┘  └────────────┘ │   │
│  │         ↓                 ↓                ↓          │   │
│  │  ┌──────────────────────────────────────────────┐    │   │
│  │  │         SupabaseService Layer               │    │   │
│  │  │  • getPeopleByTree()                        │    │   │
│  │  │  • createPerson()                           │    │   │
│  │  │  • updatePerson()                           │    │   │
│  │  │  • addParent/addSpouse/addChild()          │    │   │
│  │  │  • searchPeople()                           │    │   │
│  │  │  • buildHierarchy()                         │    │   │
│  │  └──────────────────────────────────────────────┘    │   │
│  │         ↓                                              │   │
│  │  ┌──────────────────────────────────────────────┐    │   │
│  │  │       Supabase JavaScript Client            │    │   │
│  │  │   (src/supabase.ts)                         │    │   │
│  │  └──────────────────────────────────────────────┘    │   │
│  └──────────────────────────────────────────────────────┘   │
│                          ↓                                    │
└──────────────────────────────────────────────────────────────┘
                          ↓
                   HTTPS REST API
                          ↓
┌──────────────────────────────────────────────────────────────┐
│              SUPABASE CLOUD (supabase.co)                     │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │           PostgreSQL Database                          │  │
│  │                                                        │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │  │
│  │  │   villages   │  │   people     │  │    tree    │  │  │
│  │  │              │  │              │  │            │  │  │
│  │  │ • name       │  │ • name       │  │ • name     │  │  │
│  │  │ • state      │  │ • gender     │  │ • villageId│  │  │
│  │  │ • country    │  │ • dob/dod    │  │ • createdBy│  │  │
│  │  └──────────────┘  │ • parents[]  │  └────────────┘  │  │
│  │                    │ • children[] │                   │  │
│  │  ┌──────────────┐  │ • spouses[]  │  ┌────────────┐  │  │
│  │  │  businesses  │  │ • hierarchy[]│  │   users    │  │  │
│  │  │              │  └──────────────┘  │            │  │  │
│  │  │ • name       │                    │ • email    │  │  │
│  │  │ • category   │                    │ • role     │  │  │
│  │  │ • ownerId    │  ┌──────────────┐  └────────────┘  │  │
│  │  │ • villageId  │  │ business_cat │                   │  │
│  │  └──────────────┘  │              │                   │  │
│  │                    │ • name       │                   │  │
│  │                    └──────────────┘                   │  │
│  │                                                        │  │
│  │  Indexes:                                             │  │
│  │  • people(treeId)                                     │  │
│  │  • people(villageId)                                 │  │
│  │  • people(name_lowercase)                            │  │
│  │  • people(treeId, villageId)                         │  │
│  │  • people(treeId, name_lowercase)                    │  │
│  │  • businesses(villageId, name_lowercase)             │  │
│  │                                                        │  │
│  │  RLS Policies:                                        │  │
│  │  • Public read access                                │  │
│  │  • Authenticated write/delete                        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagram

### Create Person Flow

```
React Component (AddNode.tsx)
    ↓
    → SupabaseService.createPerson(personData)
    ↓
    → supabase.from('people').insert([personData])
    ↓
    → Supabase REST API
    ↓
    → PostgreSQL: INSERT INTO people (...)
    ↓
    → Trigger: Auto-update name_lowercase
    ↓
    → Return created person with UUID
    ↓
    → Component updates UI
```

### Add Parent Relationship Flow

```
React Component (NodeDetails.tsx)
    ↓
    → SupabaseService.addParent(childId, parentId)
    ↓
    → Fetch child: getPersonById(childId)
    → Fetch parent: getPersonById(parentId)
    ↓
    → Add parentId to child.parents[]
    → Add childId to parent.children[]
    ↓
    → updatePerson(childId, { parents: [...] })
    → updatePerson(parentId, { children: [...] })
    ↓
    → supabase.from('people').update(...)
    ↓
    → PostgreSQL: UPDATE people SET ...
    ↓
    → Trigger: Recalculate child's hierarchy
    ↓
    → Trigger: Recalculate all descendants' hierarchy
    ↓
    → Return success
    ↓
    → Component updates UI
```

### Search People Flow

```
React Component (BusinessPage.tsx)
    ↓
    → SupabaseService.searchPeople(searchTerm, villageId)
    ↓
    → supabase.from('people')
      .select('*')
      .ilike('name_lowercase', '%searchTerm%')
      .eq('villageId', villageId)
    ↓
    → Supabase REST API
    ↓
    → PostgreSQL: SELECT * FROM people
                  WHERE name_lowercase ILIKE '%searchTerm%'
                  AND villageId = villageId
                  (Uses GIN index for speed)
    ↓
    → Return matching people
    ↓
    → Component displays results
```

---

## Database Relationships

```
            ┌─────────────┐
            │  villages   │
            └──────┬──────┘
                   │
          (1) ← ─ ┤ ─ → (M)
                   │
        ┌──────────┴──────────┐
        ↓                     ↓
    ┌─────────┐         ┌────────────┐
    │  tree   │         │   people   │
    └────┬────┘         └─────┬──────┘
         │                    │
    (1)←─┤─→(M)          (M)←─┼─→(M)
         │              Parents/Children
    ┌────┴─────┐             │
    ↓          ↓         Stored as JSONB:
┌─────────┐ ┌──────────────┐ { id, type }
│ people  │ │ businesses   │
└─────────┘ └──────────────┘
(treeId)        (ownerId)
(villageId)     (villageId)
```

---

## Component Integration Points

### Ready for Migration:

```
┌─────────────────────────────────────────┐
│ Easy → Medium → Hard                    │
├─────────────────────────────────────────┤
│                                         │
│ EASY:                                   │
│ • FamousPage (read-only, simple)       │
│ • HeritagePage (read-only, simple)     │
│ • HomePage (read-only, simple)         │
│                                         │
│ MEDIUM:                                 │
│ • BusinessPage (search + create)       │
│ • Contact (read + create)              │
│ • SourceSelect (read + filter)         │
│                                         │
│ HARD:                                   │
│ • FamiliesPage (complex CRUD)          │
│ • NodeDetails (relationship ops)       │
│ • AddNode (transaction-based)          │
│                                         │
└─────────────────────────────────────────┘
```

---

## API Call Patterns

### Pattern 1: Simple Read

```typescript
const data = await SupabaseService.getPersonById(id);
// GET /people?id=eq.{id}
```

### Pattern 2: Search with Filter

```typescript
const data = await SupabaseService.searchPeople(term, villageId);
// GET /people?name_lowercase=ilike.%term%&villageId=eq.{villageId}
```

### Pattern 3: Create with Relations

```typescript
const newPerson = await SupabaseService.createPerson({...});
const parent = await SupabaseService.getPersonById(parentId);
await SupabaseService.addParent(newPerson.id, parentId);
// POST /people
// GET /people?id=eq.{parentId}
// PUT /people?id=eq.{newPersonId}
// PUT /people?id=eq.{parentId}
```

### Pattern 4: Update with Cascading

```typescript
await SupabaseService.recalculateHierarchyTree(personId);
// Internally:
// PUT /people?id=eq.{personId}
// (Optional) For each child: PUT /people?id=eq.{childId}
// (Optional) For each descendant: PUT /people?id=eq.{descendantId}
```

---

## Performance Considerations

### Index Strategy

```sql
-- Fast tree lookups
CREATE INDEX idx_people_treeId ON people(treeId);
-- Lookup time: O(log n) for 1000s of people

-- Fast village lookups
CREATE INDEX idx_people_villageId ON people(villageId);
-- Lookup time: O(log n)

-- Fast name searches
CREATE INDEX idx_people_name_lowercase ON people(name_lowercase);
-- Lookup time: O(log n) for prefix matching

-- Combined index for village + search
CREATE INDEX idx_people_tree_lowercase ON people(treeId, name_lowercase);
-- Lookup time: O(log n) for both filters at once
```

### Expected Query Times (PostgreSQL)

| Query             | Without Index | With Index | Improvement |
| ----------------- | ------------- | ---------- | ----------- |
| Get person by ID  | 50ms          | <1ms       | 50x faster  |
| Search in village | 500ms         | 5ms        | 100x faster |
| Fetch tree        | 1000ms        | 50ms       | 20x faster  |
| Full-text search  | 2000ms        | 100ms      | 20x faster  |

---

## Scalability

### Current Setup (Firebase equivalent):

- ~500 trees
- ~50,000 people
- ~2,000 businesses
- ~100 villages

### Supabase Handles:

- Scales to millions of records
- Concurrent users: 100s at once
- Storage: 500GB+ included
- CPU/Memory: Auto-scales

### Optimization Done:

- ✅ Indexes on common queries
- ✅ JSONB for flexible relationships
- ✅ Foreign keys for integrity
- ✅ RLS policies for security

---

## Cost Comparison

| Metric                 | Firebase       | Supabase      |
| ---------------------- | -------------- | ------------- |
| Storage per 50K people | $15-30/month   | <$5/month     |
| API calls per month    | 5M calls @ 10¢ | Free/included |
| Egress traffic         | $0.12/GB       | $0.12/GB      |
| Total est. cost        | $50-100/month  | $10-20/month  |

---

## Future Enhancements

```
Phase 1 (Current):  Migrate family tree data
Phase 2:            Implement Supabase Auth
Phase 3:            Add real-time subscriptions
Phase 4:            Add full-text search UI
Phase 5:            Add vector search (photos)
Phase 6:            Add audit logging
Phase 7:            Add analytics/reporting
```
