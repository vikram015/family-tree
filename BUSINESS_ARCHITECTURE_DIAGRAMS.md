# Business with Hierarchy - Visual Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     React Application                        │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              BusinessPage Component                   │   │
│  │                                                        │   │
│  │  1. User selects village from dropdown               │   │
│  │  2. useEffect triggers fetchBusinesses()             │   │
│  │  3. Calls SupabaseService.getBusinessesByVillage... │   │
│  │  4. Maps result to Business interface                │   │
│  │  5. Renders business cards with OwnerLink component  │   │
│  │                                                        │   │
│  └──────────────────────────────────────────────────────┘   │
│           ↓                                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │      SupabaseService (Service Layer)                 │   │
│  │                                                        │   │
│  │  getBusinessesByVillageWithHierarchy(villageId)      │   │
│  │  - Calls Supabase RPC function                       │   │
│  │  - Passes village ID as parameter                    │   │
│  │  - Returns structured business data with hierarchy   │   │
│  │                                                        │   │
│  └──────────────────────────────────────────────────────┘   │
│           ↓                                                   │
└─────────────┼───────────────────────────────────────────────┘
              │ RPC Call
┌─────────────┼───────────────────────────────────────────────┐
│   Supabase PostgreSQL Database                              │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Function: get_businesses_by_village(p_village_id)   │   │
│  │                                                        │   │
│  │  Step 1: Find all family trees for the village       │   │
│  │  ├─ SELECT id FROM tree                              │   │
│  │  └─ WHERE village_id = p_village_id                  │   │
│  │                                                        │   │
│  │  Step 2: For each business in those trees            │   │
│  │  ├─ Get business details                             │   │
│  │  ├─ Get owner (people) details                       │   │
│  │  └─ Build parent hierarchy using recursive CTE       │   │
│  │                                                        │   │
│  │  Step 3: Recursive CTE (parent_chain)                │   │
│  │  ├─ Base case: Select person from people            │   │
│  │  ├─ Recursive: JOIN with people_relations            │   │
│  │  ├─ Filter: WHERE parent_gender = 'male'             │   │
│  │  └─ Limit: generation < 5                            │   │
│  │                                                        │   │
│  │  Step 4: Aggregate hierarchy as JSONB                │   │
│  │  └─ JSONB_AGG({id, name, generation})               │   │
│  │                                                        │   │
│  │  Returns: Business with owner + hierarchy            │   │
│  │                                                        │   │
│  └──────────────────────────────────────────────────────┘   │
│           ↓                                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Data Tables                              │   │
│  │                                                        │   │
│  │  business                                             │   │
│  │  ├─ id, name, category, people_id                    │   │
│  │  └─ is_deleted, created_at                           │   │
│  │                                                        │   │
│  │  people                                               │   │
│  │  ├─ id, name, gender, dob, tree_id                   │   │
│  │  └─ various personal details                         │   │
│  │                                                        │   │
│  │  people_relations                                    │   │
│  │  ├─ person_id, related_person_id, relation_type      │   │
│  │  └─ Used to traverse parent-child relationships      │   │
│  │                                                        │   │
│  │  tree                                                 │   │
│  │  ├─ id, village_id, name, caste, sub_caste          │   │
│  │  └─ Links to family tree structure                   │   │
│  │                                                        │   │
│  │  village, caste, sub_caste                           │   │
│  │  └─ Demographic lookup tables                        │   │
│  │                                                        │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Component Interaction Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                 BusinessPage                                 │
│                                                               │
│  State:                                                       │
│  ├─ businesses: Business[]                                   │
│  ├─ selectedVillage: string                                  │
│  └─ navigate: NavigateFn                                     │
│                                                               │
│  Lifecycle:                                                   │
│  1. useEffect([selectedVillage])                             │
│     └─ Calls fetchBusinesses()                               │
│                                                               │
│  2. fetchBusinesses()                                         │
│     └─ Calls SupabaseService.get...                          │
│        └─ Maps results to Business[]                         │
│           └─ setBusinesses(businessList)                     │
│                                                               │
│  3. Render                                                    │
│     └─ businesses.map(business => (                          │
│        └─ <Card>                                             │
│           └─ <OwnerLink business={business} />               │
│        ))                                                     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
           │
           ├─────────────────┬──────────────────┐
           │                 │                  │
           ↓                 ↓                  ↓
    ┌─────────────┐   ┌─────────────┐   ┌────────────────┐
    │  OwnerLink  │   │   Service   │   │ useNavigate()  │
    │  Component  │   │   Method    │   │    Hook        │
    └─────────────┘   └─────────────┘   └────────────────┘
           │                 │                  │
           │  Shows:         │  Calls:          │  Provides:
           │  - Owner name   │  - RPC function  │  - navigate()
           │  - Tooltip      │  - Error handle  │  - Route change
           │  - Hierarchy    │  - Data mapping  │
           │                 │                  │
           └─────────────────┴──────────────────┘
                      │
                      ↓
              User Interactions:
              1. Hover owner name → Tooltip appears
              2. Click owner name → Navigate to FamilyPage
```

## Data Transformation Flow

```
Step 1: Raw Database Result
┌────────────────────────────────────┐
│ {                                  │
│   business_id: "bus-001"           │
│   business_name: "Tech Ltd"        │
│   person_id: "person-001"          │
│   person_name: "John Doe"          │
│   caste_name: "Brahmin"            │
│   parent_hierarchy: [              │
│     {id: "...", name: "Father"},   │
│     {id: "...", name: "GF"}        │
│   ]                                │
│ }                                  │
└────────────────────────────────────┘
         ↓
Step 2: Map to Business Interface
┌────────────────────────────────────┐
│ {                                  │
│   id: "bus-001"                    │
│   name: "Tech Ltd"                 │
│   owner: "John Doe"                │
│   ownerId: "person-001"            │
│   casteName: "Brahmin"             │
│   hierarchy: [{...}, {...}]        │
│   treeId: "tree-001"               │
│ }                                  │
└────────────────────────────────────┘
         ↓
Step 3: Format for Display
┌────────────────────────────────────┐
│ Hierarchy text: "Father → GF"      │
│ Caste display: "Brahmin"           │
│ Navigation URL: "/families?tree=X" │
└────────────────────────────────────┘
         ↓
Step 4: Render in UI
┌────────────────────────────────────┐
│ Owner: [John Doe] ← Clickable       │
│                                    │
│ Hover Shows:                       │
│ ├─ John Doe                        │
│ ├─ Caste: Brahmin                  │
│ └─ 🧬 Father → GF                  │
│                                    │
│ Click: Navigate to family tree      │
└────────────────────────────────────┘
```

## Recursive CTE Visualization

```
Family Tree Structure in Database
═══════════════════════════════════════════════════════════════

                          Generation 0
                         [Target Person]
                         John Doe (Male)
                               │
                  ┌────────────┴────────────┐
                  │                         │
              Generation 1                Generation 1
             [Father - Male]             [Mother - Female]
             Mohan Kumar                  Ramya Devi
                  │
              ┌───┴───┐
          Generation 2 │
         [Grandfather]  └─ (Mother filtered out)
         Shriram Kumar
              │
          Generation 3
         [Great-Grandfather]
         Ramakant Kumar
              │
          Generation 4
         [Great-Great-Grandfather]
         Hari Kumar


Recursive CTE Traversal (Male-only)
═══════════════════════════════════════════════════════════════

Generation 0:
START: John Doe (person_id: 1)
OUTPUT: {generation: 0}

Generation 1:
RECURSE: Get parents of John Doe
FILTER: parent_gender = 'male'
OUTPUT: Mohan Kumar (generation: 1)
SKIP: Ramya Devi (mother - filtered out)

Generation 2:
RECURSE: Get parents of Mohan Kumar
OUTPUT: Shriram Kumar (generation: 2)

Generation 3:
RECURSE: Get parents of Shriram Kumar
OUTPUT: Ramakant Kumar (generation: 3)

Generation 4:
RECURSE: Get parents of Ramakant Kumar
OUTPUT: Hari Kumar (generation: 4)

Generation 5:
STOP: generation >= 5 (limit reached)

Final JSONB Output:
[
  { id: "2", name: "Mohan Kumar", generation: 1 },
  { id: "3", name: "Shriram Kumar", generation: 2 },
  { id: "4", name: "Ramakant Kumar", generation: 3 },
  { id: "5", name: "Hari Kumar", generation: 4 }
]
```

## UI Rendering Flow

```
Business Card Rendering
═══════════════════════════════════════════════════════════════

┌──────────────────────────────────────┐
│  Business Card                       │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ 💻 IT & Technology             │  │
│  │ Tech Solutions Ltd             │  │
│  │ Software development services  │  │
│  └────────────────────────────────┘  │
│                                      │
│  Owner: [John Doe]                   │
│         ↑ Blue Link                  │
│         └─ OwnerLink Component       │
│                                      │
│  Contact: 9876543210                 │
│                                      │
└──────────────────────────────────────┘
         ↑
    On Hover:
    ┌──────────────────────────────┐
    │      Tooltip Content         │
    ├──────────────────────────────┤
    │ John Doe                     │
    │ Caste: Brahmin               │
    │ Sub-Caste: Kanyakubj         │
    │                              │
    │ 🧬 Mohan → Shriram → ...     │
    └──────────────────────────────┘
         On Click:
         Navigate to
         /families?treeId=tree-001
```

## State Management

```
BusinessPage Component State
═══════════════════════════════════════════════════════════════

Initial State:
┌─────────────────────────────────────┐
│ businesses: []                      │
│ loading: true                       │
│ selectedVillage: null               │
│ navigate: (path: string) => void    │
└─────────────────────────────────────┘

After Village Selection:
┌─────────────────────────────────────┐
│ selectedVillage: "village-001"      │
│ loading: true                       │
│ Triggers: useEffect(() => {         │
│   fetchBusinesses()                 │
│ })                                  │
└─────────────────────────────────────┘

After Data Fetch:
┌─────────────────────────────────────────┐
│ businesses: [                           │
│   {                                     │
│     id: "bus-001",                      │
│     name: "Tech Ltd",                   │
│     owner: "John Doe",                  │
│     hierarchy: [...],                   │
│     casteName: "Brahmin"                │
│     ... (more fields)                   │
│   },                                    │
│   ... (more businesses)                 │
│ ]                                       │
│ loading: false                          │
└─────────────────────────────────────────┘

Component Renders:
business.map(b => (
  <OwnerLink key={b.id} business={b} />
))
```

## Performance Flow

```
User Action → State Update → Re-render
═══════════════════════════════════════════════════════════════

1. User selects village
   └─ setSelectedVillage()

2. useEffect detects change
   └─ setLoading(true)
   └─ Calls fetchBusinesses()

3. Service method called
   └─ Calls Supabase RPC
   └─ ~100-500ms (database query)

4. Data returned
   └─ Map to Business interface
   └─ setBusinesses(businessList)

5. Component re-renders
   └─ setLoading(false)
   └─ Displays business cards
   └─ <1000ms total (typical)

6. User interaction
   └─ Hover: Tooltip appears instantly
   └─ Click: Navigation happens immediately
```

---

These diagrams show the complete flow from user interaction through database query to final UI rendering, including all data transformations and component relationships.
