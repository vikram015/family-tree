# Business with Hierarchy - Code Examples

## Example 1: Database Function Usage

### SQL - Direct Function Call

```sql
-- Get all businesses in a specific village with owner hierarchy
SELECT
  business_name,
  business_category,
  person_name,
  village_name,
  caste_name,
  sub_caste_name,
  parent_hierarchy
FROM get_businesses_by_village('550e8400-e29b-41d4-a716-446655440000');
```

### Output Structure

```json
[
  {
    "business_id": "bus-001",
    "business_name": "Tech Solutions Ltd",
    "business_category": "it",
    "business_description": "Software development services",
    "business_contact": "9876543210",
    "person_id": "person-001",
    "person_name": "Raj Kumar",
    "person_gender": "male",
    "person_dob": "1985-05-15",
    "village_id": "village-001",
    "village_name": "Gangwa",
    "caste_name": "Brahmin",
    "sub_caste_name": "Kanyakubj",
    "tree_id": "tree-001",
    "tree_name": "Kumar Family",
    "parent_hierarchy": [
      {
        "id": "person-002",
        "name": "Mohan Kumar",
        "generation": 1
      },
      {
        "id": "person-003",
        "name": "Shriram Kumar",
        "generation": 2
      },
      {
        "id": "person-004",
        "name": "Ramakant Kumar",
        "generation": 3
      }
    ]
  }
]
```

## Example 2: TypeScript Service Implementation

### SupabaseService Method

```typescript
/**
 * Get businesses by village with person hierarchy
 */
async getBusinessesByVillageWithHierarchy(
  villageId: string
): Promise<any[]> {
  const { data, error } = await supabase.rpc(
    'get_businesses_by_village',
    { p_village_id: villageId }
  );

  if (error) throw error;
  return data || [];
}
```

### Usage in Component

```typescript
const fetchBusinesses = async () => {
  try {
    const businessesWithHierarchy =
      await SupabaseService.getBusinessesByVillageWithHierarchy(
        selectedVillage,
      );

    const businessList: Business[] = businessesWithHierarchy.map(
      (business) => ({
        id: business.business_id,
        name: business.business_name,
        category: business.business_category || "",
        description: business.business_description || "",
        owner: business.person_name || "",
        ownerId: business.person_id || "",
        ownerName: business.person_name || "",
        contact: business.business_contact || "",
        villageId: selectedVillage,
        treeId: business.tree_id || "",
        gender: business.person_gender || "",
        dob: business.person_dob || "",
        hierarchy: business.parent_hierarchy || [],
        casteName: business.caste_name || "",
        subCasteName: business.sub_caste_name || "",
        createdAt: business.business_created_at,
        updatedAt: business.business_created_at,
      }),
    );

    setBusinesses(businessList);
  } catch (error) {
    console.error("Error fetching businesses:", error);
  }
};
```

## Example 3: React Component - OwnerLink

### Component Definition

```typescript
const OwnerLink: React.FC<{
  business: Business;
  onNavigate: (path: string) => void;
}> = ({ business, onNavigate }) => {
  // Format hierarchy as "Name → Name → Name..."
  const hierarchyText =
    business.hierarchy && business.hierarchy.length > 0
      ? business.hierarchy
          .slice(-5)  // Last 5 ancestors only
          .map((a: any) => a.name)
          .join(" → ")
      : "No ancestry data";

  // Build tooltip content
  const tooltipContent = (
    <Box sx={{ p: 1 }}>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {business.owner}
      </Typography>
      {business.casteName && (
        <Typography variant="caption" display="block">
          Caste: {business.casteName}
        </Typography>
      )}
      {business.subCasteName && (
        <Typography variant="caption" display="block">
          Sub-Caste: {business.subCasteName}
        </Typography>
      )}
      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
        🧬 {hierarchyText}
      </Typography>
    </Box>
  );

  return (
    <Tooltip title={tooltipContent}>
      <Box
        component="span"
        onClick={() => onNavigate(`/families?treeId=${business.treeId}`)}
        sx={{
          color: "#0066cc",
          cursor: "pointer",
          textDecoration: "underline",
          "&:hover": {
            color: "#0052a3",
            fontWeight: 600
          },
          transition: "all 0.2s",
        }}
      >
        {business.owner}
      </Box>
    </Tooltip>
  );
};
```

### Usage in Business Card

```typescript
<Typography variant="body2">
  <strong>Owner:</strong>{" "}
  {business.ownerId && business.treeId ? (
    <OwnerLink
      business={business}
      onNavigate={navigate}
    />
  ) : (
    business.owner
  )}
</Typography>
```

## Example 4: Business Interface

```typescript
interface Business {
  id: string;
  name: string;
  category: string;
  description: string;
  owner: string;
  ownerId?: string;
  ownerName?: string;
  contact?: string;
  villageId: string;
  createdAt?: any;
  updatedAt?: any;
  // New hierarchy fields
  treeId?: string; // For navigation
  gender?: string; // Owner gender
  dob?: string; // Owner DOB
  hierarchy?: any[]; // Parent hierarchy
  casteName?: string; // Caste info
  subCasteName?: string; // Sub-caste info
}
```

## Example 5: Parent Hierarchy Array Structure

### Input from Database

```json
[
  { "id": "uuid1", "name": "Father Name", "generation": 1 },
  { "id": "uuid2", "name": "Grandfather Name", "generation": 2 },
  { "id": "uuid3", "name": "Great-grandfather Name", "generation": 3 }
]
```

### Processing in Component

```typescript
// Take last 5 and extract names
const hierarchyText = business.hierarchy
  .slice(-5)
  .map((ancestor: any) => ancestor.name)
  .join(" → ");

// Result: "Father Name → Grandfather Name → Great-grandfather Name"
```

### Display in UI

```
🧬 Father Name → Grandfather Name → Great-grandfather Name
```

## Example 6: Navigation Example

### Navigate to Family Tree

```typescript
// When user clicks owner name
onClick={() => navigate(`/families?treeId=${business.treeId}`)}

// Results in URL: /families?treeId=550e8400-e29b-41d4-a716-446655440000
```

### FamiliesPage can read it as:

```typescript
const [searchParams] = useSearchParams();
const treeId = searchParams.get("treeId");

useEffect(() => {
  if (treeId) {
    loadTreeData(treeId);
  }
}, [treeId]);
```

## Example 7: Styling & Hover Effects

### Owner Name Styles

```typescript
sx={{
  color: "#0066cc",              // Blue
  cursor: "pointer",             // Hand cursor
  textDecoration: "underline",   // Underline
  "&:hover": {
    color: "#0052a3",            // Darker blue
    fontWeight: 600              // Bold on hover
  },
  transition: "all 0.2s",        // Smooth animation
}}
```

### Before Hover

```
Owner: John Doe  (blue, underlined)
```

### On Hover

```
Owner: John Doe  (darker blue, bold, underlined)
Tooltip appears with hierarchy
```

## Example 8: Error Handling

### Service Method with Error

```typescript
async getBusinessesByVillageWithHierarchy(
  villageId: string
): Promise<any[]> {
  const { data, error } = await supabase.rpc(
    'get_businesses_by_village',
    { p_village_id: villageId }
  );

  if (error) {
    console.error('Database error:', error);
    throw error;
  }

  return data || [];
}
```

### Component Error Handling

```typescript
const fetchBusinesses = async () => {
  try {
    const businessesWithHierarchy =
      await SupabaseService.getBusinessesByVillageWithHierarchy(
        selectedVillage,
      );

    setBusinesses(businessList);
  } catch (error) {
    console.error("Error fetching businesses:", error);
    // Could show error alert or fallback UI here
  }
};
```

## Example 9: Real Data Flow

### Step 1: User Selects Village

```
User clicks: Gangwa Village dropdown
```

### Step 2: Component Fetches Data

```typescript
useEffect(() => {
  if (!selectedVillage) return;

  fetchBusinesses();
}, [selectedVillage]);
```

### Step 3: Service Calls Function

```typescript
const businessesWithHierarchy =
  await SupabaseService.getBusinessesByVillageWithHierarchy("gangwa-id");
```

### Step 4: Function Processes Data

```sql
-- In Supabase
SELECT * FROM get_businesses_by_village('gangwa-id')
-- Returns businesses with hierarchy
```

### Step 5: Component Renders Results

```
Business Card:
┌─────────────────────────────────┐
│ 💻 IT & Technology              │
│ Tech Solutions                  │
│ Software development services   │
│                                 │
│ Owner: [Raj Kumar] ← Clickable   │
│ Contact: 9876543210             │
└─────────────────────────────────┘

Hover over "Raj Kumar":
┌──────────────────────────────────┐
│ Raj Kumar                         │
│ Caste: Brahmin                   │
│ Sub-Caste: Kanyakubj             │
│ 🧬 Father → Grandfather → GGF    │
└──────────────────────────────────┘

Click "Raj Kumar":
Navigate to /families?treeId=tree-001
```

## Example 10: Complete Integration Test

```typescript
// In your test file
describe('Business with Hierarchy Feature', () => {
  it('should display businesses with owner hierarchy', async () => {
    // 1. Render component with village selected
    render(<BusinessPage />);

    // 2. Wait for data to load
    const ownerLinks = await screen.findAllByRole('link', { name: /\w+/ });

    // 3. Verify owner appears as link
    expect(ownerLinks).toHaveLength(businessCount);

    // 4. Verify link styling
    expect(ownerLinks[0]).toHaveStyle('color: rgb(0, 102, 204)');

    // 5. Hover and check tooltip
    fireEvent.mouseOver(ownerLinks[0]);
    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveTextContent('🧬');

    // 6. Click and verify navigation
    fireEvent.click(ownerLinks[0]);
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.stringContaining('/families?treeId=')
    );
  });
});
```

---

These examples show the complete implementation from database to UI, including data structures, component code, styling, and error handling.
