# Family Tree Flow

This document explains how the frontend family tree works today, with emphasis on loading trees, adding people, updating people, deleting people, linking spouses, and enforcing branch-level permissions.

## Main entry points

- App route: `src/components/App/App.tsx`
- Main tree page: `src/components/FamiliesPage/FamiliesPage.tsx`
- Tree renderer: `src/components/DTree/DTreeComponent.tsx`
- Details and add/edit dialog surface: `src/components/NodeDetails/NodeDetails.tsx`
- Add-person form: `src/components/AddNode/AddNode.tsx`
- HTTP client facade: `src/services/apiService.ts`

## Canonical frontend data shape

The frontend renders the tree as `FNode[]`.

Each `FNode` contains:

- `id`, `name`, `gender`, `dob`
- relationship arrays: `parents`, `children`, `spouses`, `siblings`
- tree metadata: `treeId`
- profile fields such as `photo`, `bloodGroup`, `isAlive`, `deceasedDate`
- computed `hierarchy`, built client-side with `getNodeHierarchy`

The backend returns a richer JSON shape, and `FamiliesPage` maps that into `FNode`.

## Tree loading flow

`FamiliesPage` owns the active tree state:

- `treeId` comes from the route search param
- `loadTreeData()` calls `ApiService.getCompleteTreeById(treeId)`
- the response is converted into `FNode[]`
- `hierarchy` is recomputed for every node
- a root node is chosen for rendering

Root selection logic in `FamiliesPage`:

- prefer nodes from the current tree that have no parents
- filter out in-law roots when a spouse in the same tree still has parents
- break ties using descendant count, then oldest `createdAt`

This is why the visible root may change after certain add/delete operations.

## Write access model in the frontend

The frontend does not trust UI-only checks, but it still uses local permission state to disable actions early.

`FamiliesPage` loads `ApiService.getTreeWriteScope(treeId)` and computes:

- `canWriteAll`
- `rootPersonIds`
- `editableNodeIds`

Branch permissions are expanded client-side by walking downward from each allowed root through `children`.

Result:

- full-tree writers can edit any node in the tree
- branch writers can only edit descendants of the permitted root people
- root-node creation is restricted to full-tree writers

Helper methods:

- `canEditNode(nodeId)`
- `canCreateRootNode`
- `canManageInvites`

## Rendering and interaction

`DTreeComponent` is the visual tree engine.

It is responsible for:

- converting `FNode[]` into the custom D3/dTree format
- rendering node cards and marriage connectors
- expand/collapse behavior
- pan/zoom and centering
- tree action entry points such as:
  - node tap
  - edit
  - delete
  - add father/mother/spouse/son/daughter
  - external tree navigation

Important boundary:

- `DTreeComponent` does not mutate backend state directly
- it emits actions back to `FamiliesPage`
- `FamiliesPage` decides whether to open details, add mode, edit mode, or call APIs

## Add person flow

Main method: `FamiliesPage.onAdd(...)`

### UI entry points

A new person can be created from:

- add-relative placeholders in `DTreeComponent`
- add actions inside `NodeDetails`
- root add flow when a tree is empty or user creates the first node

### Relation mapping

The UI talks in family terms:

- `child`
- `parent`
- `spouse`

Before calling the backend, `FamiliesPage` maps those into the backend contract:

- child -> `relationType = "parent"`, `isReverseRelation = false`
- parent -> `relationType = "parent"`, `isReverseRelation = true`
- spouse -> `relationType = "spouse"`

For child creation, `otherParentId` may be passed as `relatedPersonId2`.

For parent creation, `FamiliesPage` tries to infer the other existing parent so the backend can preserve spouse linkage between the parents.

### Existing spouse link flow

If the form submits a node with an existing `id` and relation `spouse`, the frontend does not create a new person.

Instead it calls:

- `ApiService.addSpouse(...)`

and then reloads the tree.

### New person creation flow

For normal creation, `FamiliesPage` calls:

- `ApiService.addPersonToTree(...)`

Payload includes:

- tree info
- core person fields
- relation information
- custom fields
- spouse relation dates when relevant

### Frontend update after add

The add API returns `affectedNodes`.

`FamiliesPage.mergeAffectedNodes(...)` then:

- inserts new nodes into the current state
- replaces changed nodes with the returned versions
- recomputes `hierarchy`
- adjusts the root when a newly added parent becomes the proper root

This avoids a full reload for most add operations.

Fallback:

- if `affectedNodes` is missing, `loadTreeData(true)` is used

### Auto expand behavior

After adding a child, the frontend sets `autoExpandNodeId` so the relevant branch opens again in the renderer.

## Update person flow

Main method: `FamiliesPage.onUpdate(nodeId, updates)`

Sequence:

1. check `canEditNode(nodeId)`
2. call `ApiService.updatePerson(nodeId, updates)`
3. reload tree with `loadTreeData(true)`
4. clear selection so details refresh cleanly

Notes:

- both core fields and custom fields are sent in one request
- custom fields are passed as `additionalFields`
- the frontend currently reloads after update instead of merging a partial response

## Delete person flow

Main method: `FamiliesPage.onDelete(nodeId, force = false)`

Sequence:

1. check `canEditNode(nodeId)`
2. call `ApiService.deletePerson(nodeId, force)`
3. if backend says confirmation is required, open a confirmation dialog
4. on confirmed force delete, call the same API again with `force = true`
5. reload tree with `loadTreeData(true)`

Deletion behavior depends on backend rules:

- deleting a person with children is blocked by default
- backend returns `requiresConfirmation` and `childrenCount`
- frontend shows a confirmation dialog before force delete

## Invite and branch-sharing flow

`FamiliesPage` supports tree invites and branch-scoped invites.

Main APIs:

- `ApiService.createTreeInvite(...)`
- `ApiService.acceptTreeInvite(...)`
- `ApiService.getTreeWriteScope(...)`

Frontend behavior:

- full-tree writers can invite collaborators
- invite scope can be:
  - full tree
  - branch rooted at a selected person
- invite acceptance is driven by `inviteToken` in the URL
- after acceptance, the tree write scope is reloaded

## Important backend contracts the frontend depends on

The frontend assumes:

- `GET /api/tree/:treeId/complete` returns enough data to rebuild the whole tree
- `POST /api/people` may return `affectedNodes`
- `PATCH /api/people/:personId` can accept both core fields and additional fields
- `DELETE /api/people/:personId?force=true|false` can block or force deletion
- `POST /api/people/spouse-link` links an existing spouse
- `PATCH /api/people/spouse-relation` updates marriage dates
- `GET /api/tree/:treeId/write-scope` returns branch write permissions

## Known design characteristics

- Tree rendering is browser/DOM-oriented and tightly coupled to D3 behavior.
- `FamiliesPage` currently owns a lot of orchestration logic: fetch, permission mapping, root selection, add/update/delete flows, invite logic, and details state.
- Add flow is optimized with `affectedNodes`, while update/delete mostly use full reloads.
- Branch edit rules are enforced both in frontend UX and again on the backend.

## Recommended files to read together

When changing family tree behavior, read these in order:

1. `src/components/FamiliesPage/FamiliesPage.tsx`
2. `src/components/DTree/DTreeComponent.tsx`
3. `src/components/NodeDetails/NodeDetails.tsx`
4. `src/components/AddNode/AddNode.tsx`
5. `src/services/apiService.ts`

