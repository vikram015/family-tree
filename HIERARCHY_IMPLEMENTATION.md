# Family Tree Hierarchy Implementation

## Overview

Added a new `hierarchy` field to each node in the family tree that stores the complete chain of ancestors (parent chain) for that person.

## Implementation Details

### 1. **FNode Model Update** (`src/components/model/FNode.tsx`)

Added two new optional fields to the `FNode` interface:

```typescript
hierarchy?: Array<{ name: string; id: string }>; // Complete parent chain hierarchy
treeId?: string; // Tree ID this node belongs to
```

### 2. **Utility Functions** (`src/components/const.ts`)

Created three main functions:

#### `buildHierarchy(nodeId, allNodes)`

- Builds the parent chain for a single node by recursively walking up the parent relationships
- Returns an array of `{name, id}` objects representing all ancestors
- Stops at the root node (person with no parents)

#### `populateHierarchyForAllNodes(treeId)`

- Populates hierarchy for all nodes in a specific tree
- Uses batch operations to efficiently update Firestore (max 500 operations per batch)
- Useful for one-time updates when initial deploying

#### `getNodeHierarchy(nodeId, allNodes)`

- Real-time hierarchy computation for a single node using client-side data
- Used during component rendering to calculate hierarchy on-the-fly

### 3. **FamiliesPage Integration** (`src/components/FamiliesPage/FamiliesPage.tsx`)

Updated the component to:

- Auto-compute hierarchy when nodes are loaded from Firestore
- Update hierarchy in Firestore whenever a node is updated
- Persist hierarchy changes back to the database

### 4. **Migration Utility** (`src/utils/hierarchyMigration.ts`)

Created standalone migration functions:

#### `runHierarchyMigration(treeId)`

- Migrates a specific tree by populating hierarchy for all nodes

#### `runHierarchyMigrationForAllTrees()`

- Migrates all trees in the database
- Useful for bulk data updates

### 5. **Admin Interface** (`src/components/DebugPage/DebugPage.tsx`)

Added migration button to the debug page:

- One-click migration for all family trees
- Status updates during migration
- Error handling and user confirmation

## Example Data Structure

Before:

```json
{
  "id": "child123",
  "name": "Rahul",
  "dob": "1990-05-15",
  "parents": [{ "id": "parent456", "type": "blood" }]
}
```

After:

```json
{
  "id": "child123",
  "name": "Rahul",
  "dob": "1990-05-15",
  "parents": [{ "id": "parent456", "type": "blood" }],
  "hierarchy": [
    { "name": "Nathuram", "id": "grandparent789" },
    { "name": "Rajinder", "id": "parent456" }
  ]
}
```

## How to Use

### Option 1: Auto-Migration (Recommended)

1. Navigate to the Debug Page (`/debug`)
2. Click "Run Hierarchy Migration" button
3. Confirm the action when prompted
4. Wait for migration to complete (shows progress)

### Option 2: Manual Migration via Console

```typescript
import { runHierarchyMigrationForAllTrees } from "@/utils/hierarchyMigration";

// Run in browser console
await runHierarchyMigrationForAllTrees();
```

### Option 3: Specific Tree Migration

```typescript
import { runHierarchyMigration } from "@/utils/hierarchyMigration";

// Migrate a specific tree
await runHierarchyMigration("treeId123");
```

## Key Features

✅ **Recursive Parent Chain**: Walks up the entire ancestor chain  
✅ **Batch Processing**: Efficient Firestore updates with 500-op batches  
✅ **Real-time Computation**: Auto-calculates hierarchy on component load  
✅ **Persistence**: Saves hierarchy to Firestore for faster queries  
✅ **Error Handling**: Graceful handling of missing or orphaned nodes  
✅ **Admin Tools**: UI-based migration from Debug Page

## Performance Considerations

- Hierarchy is pre-computed and stored in Firestore for fast access
- Real-time computation provides accurate data even if relationships change
- Batch updates minimize Firestore costs
- Large family trees can be migrated without UI blocking (runs in background)

## Notes

- The hierarchy is automatically computed during normal tree operations
- Migration is optional but recommended for backward compatibility
- Circular references are prevented by the `visited` Set
- Only the primary parent (first in parents array) is used for hierarchy
