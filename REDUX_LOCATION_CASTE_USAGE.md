# Redux Location and Caste Slices - Usage Guide

## Overview

States, districts, villages, castes, and sub-castes are now managed in Redux store for consistent access across the application.

## New Slices Added

### 1. Location Slice (`locationSlice.ts`)

Manages states and districts data.

### 2. Caste Slice (`casteSlice.ts`)

Manages castes and sub-castes data.

## Usage in Components

### Import Required Hooks and Actions

```typescript
import { useAppDispatch, useAppSelector } from "../../store/hooks";

// For Location data
import {
  fetchStates,
  fetchDistricts,
  fetchAllDistricts,
  selectStates,
  selectDistricts,
  selectStatesLoading,
  selectDistrictsLoading,
  clearDistricts,
} from "../../store/slices/locationSlice";

// For Caste data
import {
  fetchCastes,
  fetchSubCastes,
  fetchAllSubCastes,
  selectCastes,
  selectSubCastes,
  selectCastesLoading,
  selectSubCastesLoading,
  clearSubCastes,
} from "../../store/slices/casteSlice";
```

### Fetch Data on Component Mount

```typescript
const MyComponent = () => {
  const dispatch = useAppDispatch();

  // Get data from Redux store
  const states = useAppSelector(selectStates);
  const districts = useAppSelector(selectDistricts);
  const castes = useAppSelector(selectCastes);
  const subCastes = useAppSelector(selectSubCastes);

  // Fetch on mount
  useEffect(() => {
    dispatch(fetchStates());
    dispatch(fetchAllDistricts()); // All districts
    dispatch(fetchCastes());
    dispatch(fetchAllSubCastes()); // All sub-castes
  }, [dispatch]);

  return (
    <div>
      {/* Use the data */}
      {states.map(state => <div key={state.id}>{state.name}</div>)}
    </div>
  );
};
```

### Fetch Filtered Data

```typescript
// Fetch districts for a specific state
const handleStateChange = (stateId: string) => {
  dispatch(fetchDistricts(stateId));
};

// Fetch sub-castes for a specific caste
const handleCasteChange = (casteId: string) => {
  dispatch(fetchSubCastes(casteId));
};
```

### Clear Data

```typescript
// Clear districts when state is deselected
dispatch(clearDistricts());

// Clear sub-castes when caste is deselected
dispatch(clearSubCastes());
```

## Components Updated

### 1. AdminManagement Component

- **Before**: Used local state with `useState` for states, districts, villages, castes, subCastes
- **After**: Uses Redux selectors to access data
- **Benefits**:
  - No need for manual data loading in each component
  - Data persists across navigation
  - Eliminated isMounted flags

### 2. AddTree Component

- **Before**: Fetched castes and sub-castes on modal open
- **After**: Uses Redux for caste data
- **Benefits**:
  - Faster loading (data may already be in store)
  - Consistent data across app

## Data Structure

### State

```typescript
interface State {
  id: string;
  name: string;
  created_at?: string;
  modified_at?: string;
  is_deleted?: boolean;
}
```

### District

```typescript
interface District {
  id: string;
  name: string;
  state_id: string;
  created_at?: string;
  modified_at?: string;
  is_deleted?: boolean;
}
```

### Caste

```typescript
interface Caste {
  id: string;
  name: string;
  created_at?: string;
  modified_at?: string;
  is_deleted?: boolean;
}
```

### SubCaste

```typescript
interface SubCaste {
  id: string;
  name: string;
  caste_id: string;
  created_at?: string;
  modified_at?: string;
  is_deleted?: boolean;
}
```

## Loading States

```typescript
const statesLoading = useAppSelector(selectStatesLoading);
const districtsLoading = useAppSelector(selectDistrictsLoading);
const castesLoading = useAppSelector(selectCastesLoading);
const subCastesLoading = useAppSelector(selectSubCastesLoading);

// Show loading spinner
{statesLoading && <CircularProgress />}
```

## Error Handling

```typescript
import { selectLocationError } from '../../store/slices/locationSlice';
import { selectCasteError } from '../../store/slices/casteSlice';

const locationError = useAppSelector(selectLocationError);
const casteError = useAppSelector(selectCasteError);

{locationError && <Alert severity="error">{locationError}</Alert>}
{casteError && <Alert severity="error">{casteError}</Alert>}
```

## Benefits of Redux Approach

1. **Single Source of Truth**: All components access the same data
2. **Performance**: Data fetched once and reused
3. **No Lifecycle Issues**: No need for isMounted flags
4. **Consistent State**: Updates propagate automatically
5. **Better Testing**: Easy to mock Redux state
6. **DevTools**: Use Redux DevTools to inspect state

## Store Configuration

The store now includes:

```typescript
{
  auth: authReducer,
  village: villageReducer,
  business: businessReducer,
  profession: professionReducer,
  statistics: statisticsReducer,
  location: locationReducer,  // NEW
  caste: casteReducer,        // NEW
}
```

## Migration Checklist

When migrating a component to use these Redux slices:

- [ ] Import `useAppDispatch` and `useAppSelector`
- [ ] Import required selectors and actions
- [ ] Replace `useState` with `useAppSelector`
- [ ] Remove manual fetch functions
- [ ] Dispatch fetch actions in `useEffect`
- [ ] Remove `isMounted` flags (Redux handles this)
- [ ] Update TypeScript types if needed
- [ ] Test the component

## Example: Complete Component

```typescript
import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchStates, selectStates } from '../../store/slices/locationSlice';

export const StateSelector: React.FC = () => {
  const dispatch = useAppDispatch();
  const states = useAppSelector(selectStates);

  useEffect(() => {
    dispatch(fetchStates());
  }, [dispatch]);

  return (
    <select>
      {states.map(state => (
        <option key={state.id} value={state.id}>
          {state.name}
        </option>
      ))}
    </select>
  );
};
```
