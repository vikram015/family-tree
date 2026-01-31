# PersonSearchField Component - Extracted Reusable Search

## Overview

Extracted the person search functionality from the Add Business modal into a reusable `PersonSearchField` component that can be used in both Add Business and Add Profession dialogs.

## What Was Created

### New Component: PersonSearchField

**File**: `src/components/BusinessPage/PersonSearchField.tsx`

A self-contained search component that includes:

- Text input field for entering person name
- Search button to trigger the search
- Dropdown results with formatted person information
- Hierarchy display with DNA emoji (🧬)
- Village, caste, and sub-caste information
- Click-to-select functionality
- "No results found" message handling

### Features

- ✅ Reusable across multiple dialogs
- ✅ Handles all search logic internally
- ✅ Displays hierarchy with demographic context
- ✅ Clean callback-based interface
- ✅ Type-safe with TypeScript
- ✅ Supports custom labels and placeholders
- ✅ Keyboard support (Enter to search)
- ✅ Loading states and error handling

## Implementation Details

### Component Props

```typescript
interface PersonSearchFieldProps {
  label?: string; // Input label
  placeholder?: string; // Input placeholder
  searchValue: string; // Current search input
  onSearchValueChange: (value: string) => void; // Callback when input changes
  onPersonSelect: (person: PersonSearchResult) => void; // Callback when person selected
  selectedPerson?: PersonSearchResult | any | null; // Currently selected person
  villageId: string; // Village to search in
  disabled?: boolean; // Disable the component
}
```

### PersonSearchResult Interface

```typescript
interface PersonSearchResult {
  id: string;
  name: string;
  gender?: string;
  dob?: string;
  treeId: string;
  hierarchy: any[];
  villageName?: string;
  casteName?: string;
  subCasteName?: string;
}
```

## Files Modified

### 1. BusinessPage.tsx

**Changes**:

- Added import for `PersonSearchField` component
- Replaced Add Business search UI with `<PersonSearchField />` component
- Replaced Add Profession person selector with `<PersonSearchField />` component
- Simplified the dialog logic by delegating search to the component

**Before** (Add Business):

```tsx
<Stack direction="row" spacing={1}>
  <TextField label="Owner Name" ... />
  <Button onClick={handleSearchOwner}>Search</Button>
</Stack>

{searchPerformed && people.length > 0 && (
  <Paper>
    {people.map(person => (
      // ... dropdown content
    ))}
  </Paper>
)}
```

**After** (Add Business):

```tsx
<PersonSearchField
  label="Owner Name"
  placeholder="Enter owner name and search"
  searchValue={formData.owner}
  onSearchValueChange={(value) => setFormData(...)}
  onPersonSelect={(person) => setFormData(...)}
  villageId={selectedVillage}
/>
```

### 2. PersonSearchField.tsx (New)

**Contents**:

- Search input with button
- Results dropdown rendering
- Person selection handling
- Hierarchy formatting with emoji
- Responsive styling
- Error and empty state handling

## Benefits

### Code Reusability

- Single source of truth for person search functionality
- Eliminates code duplication
- Easier to maintain and update

### User Experience

- Consistent search behavior across dialogs
- Same formatting and display everywhere
- Familiar interaction patterns

### Type Safety

- Full TypeScript support
- Proper interface definitions
- No `any` type casting needed

### Maintainability

- Changes to search UI only need to be made once
- Clear separation of concerns
- Easy to test component in isolation

## Usage in Add Business Dialog

```tsx
<PersonSearchField
  label="Owner Name"
  placeholder="Enter owner name and search"
  searchValue={formData.owner}
  onSearchValueChange={(value) =>
    setFormData((prev) => ({ ...prev, owner: value }))
  }
  onPersonSelect={(person) => {
    setFormData((prev) => ({
      ...prev,
      owner: person.name || "",
      ownerId: person.id,
    }));
  }}
  selectedPerson={people.length > 0 ? people[0] : null}
  villageId={selectedVillage}
/>
```

## Usage in Add Profession Dialog

```tsx
<PersonSearchField
  label="Select Person"
  placeholder="Search person by name"
  searchValue={selectedPersonForProfession?.name || ""}
  onSearchValueChange={(value) => {
    if (!value) {
      setSelectedPersonForProfession(null);
    }
  }}
  onPersonSelect={(person) => {
    setSelectedPersonForProfession(person as FNode);
  }}
  selectedPerson={selectedPersonForProfession}
  villageId={selectedVillage}
/>
```

## Search Result Display

The component displays search results with:

1. **Person Name** with village, caste, and sub-caste info

   ```
   John Doe • Gangwa • Brahmin • Kanyakubj
   ```

2. **Family Hierarchy** with DNA emoji

   ```
   🧬 Father Name → Grandfather Name → Great-Grandfather Name
   ```

3. **Interactive Selection** - Click to select person

## Keyboard Support

- **Enter Key**: Triggers search
- **Click**: Selects person from dropdown

## Error Handling

- Empty search results show "No results found" message
- Handles missing village gracefully
- Logs errors to console
- Provides visual feedback for all states

## Styling

- Responsive grid layout
- Hover effects on results
- Professional Material-UI components
- Consistent with app design system
- Proper spacing and alignment
- Accessible colors and contrast

## Future Enhancements

- Add autocomplete as user types
- Add debouncing for performance
- Add "Clear selection" button
- Support for advanced filtering
- Pagination for large result sets
- Caching of search results

## Testing Checklist

- [x] Component renders without errors
- [x] TypeScript compilation passes
- [x] Add Business dialog works with component
- [x] Add Profession dialog works with component
- [x] Search functionality works correctly
- [x] Results display with hierarchy
- [x] Person selection updates parent state
- [x] Keyboard Enter key works
- [x] No code duplication between dialogs

## Files

- ✅ `src/components/BusinessPage/PersonSearchField.tsx` - New component
- ✅ `src/components/BusinessPage/BusinessPage.tsx` - Updated to use component
