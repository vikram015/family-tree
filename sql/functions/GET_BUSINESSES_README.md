# Get Businesses by Village Function

## Overview

The `get_businesses_by_village()` function retrieves all businesses in a specific village along with complete details about the business owners, including their family hierarchy and demographic information.

## Function Signature

```sql
CREATE OR REPLACE FUNCTION get_businesses_by_village(
  p_village_id UUID
)
RETURNS TABLE (
  business_id UUID,
  business_name VARCHAR,
  business_category VARCHAR,
  business_description TEXT,
  business_contact VARCHAR,
  business_created_at TIMESTAMP,
  person_id UUID,
  person_name VARCHAR,
  person_gender VARCHAR,
  person_dob DATE,
  village_id UUID,
  village_name VARCHAR,
  caste_name VARCHAR,
  sub_caste_name VARCHAR,
  tree_id UUID,
  tree_name VARCHAR,
  parent_hierarchy JSONB
)
```

## Parameters

- **p_village_id** (UUID): The ID of the village for which to fetch businesses

## Return Columns

### Business Information

- **business_id**: Unique identifier for the business
- **business_name**: Name of the business
- **business_category**: Business category (retail, agriculture, it, education, healthcare, engineering, properties)
- **business_description**: Detailed description of the business
- **business_contact**: Contact number or information
- **business_created_at**: Timestamp when the business was created

### Person (Owner) Information

- **person_id**: Unique identifier of the business owner
- **person_name**: Name of the business owner
- **person_gender**: Gender of the owner (male/female)
- **person_dob**: Date of birth of the owner

### Location & Family Information

- **village_id**: ID of the village where the business is located
- **village_name**: Name of the village
- **caste_name**: Caste of the business owner
- **sub_caste_name**: Sub-caste of the business owner
- **tree_id**: ID of the family tree
- **tree_name**: Name of the family tree

### Hierarchy Information

- **parent_hierarchy**: JSONB array containing parent hierarchy information up to 5 generations (male ancestors only)
  - Each entry contains: `{ id, name, generation }`
  - Filtered to include only male ancestors

## How It Works

### Algorithm

1. **Get all trees in the village**: Fetches all family trees (tree IDs) that belong to the specified village
2. **Recursive CTE for hierarchy**: Uses a recursive Common Table Expression to traverse the family tree:
   - Base case: Starts with all people in the village trees
   - Recursive case: Follows parent relationships up to 5 generations
   - Filtering: Only includes male ancestors in the recursion
3. **Build parent data**: Aggregates parent information into a JSONB array
4. **Join with businesses**: Matches businesses with their owners and their detailed information

### Key Features

- **Gender filtering**: Automatically filters to show only male ancestors in the hierarchy
- **Depth limit**: Limits ancestor traversal to 5 generations
- **JSON aggregation**: Returns parent hierarchy as structured JSON for easy client-side processing
- **Complete demographics**: Includes village, caste, and sub-caste information

## Usage Example

### In SQL

```sql
SELECT * FROM get_businesses_by_village('550e8400-e29b-41d4-a716-446655440000');
```

### In TypeScript (via Supabase RPC)

```typescript
const { data, error } = await supabase.rpc("get_businesses_by_village", {
  p_village_id: villageId,
});
```

### In React (via SupabaseService)

```typescript
const businesses =
  await SupabaseService.getBusinessesByVillageWithHierarchy(villageId);

// Result structure:
// [{
//   business_id: "...",
//   business_name: "Tech Solutions Ltd",
//   business_category: "it",
//   person_id: "...",
//   person_name: "John Doe",
//   village_name: "Gangwa",
//   caste_name: "Brahmin",
//   sub_caste_name: "Kanyakubj",
//   parent_hierarchy: [
//     { id: "...", name: "Father Name", generation: 1 },
//     { id: "...", name: "Grandfather Name", generation: 2 },
//     ...
//   ]
// }, ...]
```

## UI Integration

The function is integrated in the BusinessPage component to:

1. **Fetch businesses**: On component mount or village selection change
2. **Display owner information**: Show clickable owner names
3. **Show hierarchy on hover**: Tooltip displays:
   - Owner name
   - Caste and Sub-Caste
   - Parent hierarchy with 🧬 emoji
4. **Navigate to family tree**: Click on owner name to navigate to the FamilyPage for that tree

## Performance Considerations

- **Indexed lookups**: Uses indexes on:
  - `tree.village_id` for fast village lookups
  - `business.is_deleted` for filtering deleted records
  - `people_relations(person_id, relation_type)` for parent lookups

- **Recursive limit**: Limited to 5 generations to prevent excessive recursion depth
- **Early return**: Returns early if no trees are found in the village

## Data Flow

```
User selects village
    ↓
getBusinessesByVillageWithHierarchy() called
    ↓
Function finds all family trees in village
    ↓
For each business owner, builds parent hierarchy using recursive CTE
    ↓
Returns businesses with complete owner details and hierarchy
    ↓
UI displays businesses with clickable owner names
    ↓
On hover: Shows tooltip with hierarchy
    ↓
On click: Navigates to FamilyPage for that tree
```

## Related Components

- **BusinessPage.tsx**: Main component using this function
- **SupabaseService.ts**: `getBusinessesByVillageWithHierarchy()` wrapper method
- **search_people_by_village.sql**: Similar function for searching people with hierarchy
