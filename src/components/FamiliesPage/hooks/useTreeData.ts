import { useCallback, useEffect, useRef, useState } from "react";
import { Gender, RelType } from "relatives-tree/lib/types";
import { ApiService } from "../../../services/apiService";
import { getNodeHierarchy } from "../../const";
import type { FNode } from "../../model/FNode";

interface UseTreeDataParams {
  treeId: string;
  /** Bump to force a reload without changing treeId (e.g. after an invite grants access). */
  treeReloadKey: number;
  /** Clears the current node selection — invoked whenever the tree data reloads. */
  resetSelection: () => void;
}

/**
 * Owns the family-tree data for the active tree: fetching + mapping to `FNode`s,
 * the root-selection heuristic, and the incremental `mergeAffectedNodes` path that
 * folds `add_person_to_tree` results into state without a full reload.
 *
 * `setIsLoading` is exposed because callers (e.g. the spouse-link flow) toggle the
 * loading state around their own async work.
 */
export function useTreeData({
  treeId,
  treeReloadKey,
  resetSelection,
}: UseTreeDataParams) {
  const [nodes, setNodes] = useState<Array<FNode>>([]);
  /**
   * True when this tree was loaded through the limited preview because the
   * viewer has no permission on it — reached, for example, by following a
   * spouse who married in from another family. Living members come back without
   * birth dates, photos or blood groups, and nothing here is editable.
   */
  const [isPreview, setIsPreview] = useState(false);
  /**
   * True when the tree could not be read because nobody is signed in. Distinct
   * from `isPreview`: the masked preview also needs an account, so there is
   * nothing to fall back to — the only way forward is to sign in.
   */
  const [requiresSignIn, setRequiresSignIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rootId, setRootId] = useState("");
  const [locationId, setLocationId] = useState<string | undefined>(undefined);
  const loadRequestIdRef = useRef(0);

  const loadTreeData = useCallback(
    async (keepRoot = false) => {
      const requestId = ++loadRequestIdRef.current;
      if (!treeId || treeId === "") {
        if (requestId !== loadRequestIdRef.current) return;
        setNodes([]);
        resetSelection();
        setIsLoading(false);
        return;
      }

      try {
        if (!keepRoot) {
          setIsLoading(true);
        }
        // Full read first. A 403 means this is someone else's tree, reached
        // through a marriage link — fall back to the masked preview so the user
        // can still see who the family is and ask for access.
        let previewOnly = false;
        let treeData: any;
        try {
          treeData = await ApiService.getCompleteTreeById(treeId);
        } catch (err: any) {
          // 401 means signed out — the preview needs an account too, so there is
          // no degraded view to offer, only a prompt to sign in.
          if (err?.status === 401) {
            if (requestId !== loadRequestIdRef.current) return;
            setRequiresSignIn(true);
            setIsPreview(false);
            setNodes([]);
            setRootId("");
            setIsLoading(false);
            return;
          }
          if (err?.status !== 403) throw err;
          treeData = await ApiService.getTreePreviewById(treeId);
          previewOnly = true;
        }
        if (requestId !== loadRequestIdRef.current) return;
        setRequiresSignIn(false);
        setIsPreview(previewOnly);
        setLocationId(treeData.tree?.location?.id);

        // Convert tree data to FNode format
        const items: Readonly<FNode>[] = (treeData.members || []).map(
          (person: any) =>
            ({
              id: person.id,
              name: person.name,
              nameHindi: person.nameHindi || undefined,
              gender: person.gender as Gender,
              dob: person.dob || "",
              parents:
                person.parents?.map((p: any) => ({
                  id: p.id,
                  type: (p.type || RelType.blood) as RelType,
                })) || [],
              children:
                person.children?.map((c: any) => ({
                  id: c.id,
                  type: (c.type || RelType.blood) as RelType,
                })) || [],
              spouses:
                person.spouses?.map((s: any) => ({
                  id: s.id,
                  type: (s.type || RelType.married) as RelType,
                  relationSubtype: s.relationSubtype || s.type || RelType.married,
                  startDate: s.startDate || undefined,
                  endDate: s.endDate || undefined,
                })) || [],
              siblings:
                person.siblings?.map((s: any) => ({
                  id: s.id,
                  type: RelType.blood,
                })) || [],
              treeId: person.treeId || treeId,
              photo: person.photoUrl || undefined,
              createdAt: person.createdAt || undefined,
              createdBy: person.createdBy || undefined,
              createdByName: person.createdByName || undefined,
              bloodGroup: person.bloodGroup || undefined,
              isAlive: person.isAlive !== false,
              deceasedDate: person.deceasedDate || undefined,
            }) as FNode,
        );

        // Populate hierarchy for all nodes
        const itemsWithHierarchy = items.map((node) => ({
          ...node,
          hierarchy: getNodeHierarchy(node.id, items),
        }));

        setNodes(itemsWithHierarchy);
        resetSelection();

        if (items.length === 0) {
          if (requestId !== loadRequestIdRef.current) return;
          setIsLoading(false);
          return;
        }

        // If keepRoot is true, we want to see if the current root ID is still valid in the new data.
        // We can access the current rootId via the state setter to make a decision,
        // OR we can just allow the caller to handle the root preservation logic?
        // No, the caller just says "reload data".

        // Let's use a functional state update to determine if we need to CHANGE the root.
        // But we need to calculate the *new potential root* first.

        // -------------------------------------------------------------
        // Root Selection Logic Refined
        // 1. Candidate must belong to the current tree.
        // 2. Candidate must have NO parents.
        // 3. If Candidate has a spouse in the SAME tree, that spouse must NOT have parents.
        //    (If the spouse has parents, then the spouse's lineage is the true root, and Candidate is just an in-law).
        // -------------------------------------------------------------

        const currentTreeId = treeId;
        const rawMembers = treeData.members || [];
        const memberMap = new Map<string, any>(rawMembers.map((m: any) => [m.id, m]));

        // Step 1 & 2: Filter by Tree ID and No Parents
        const baseCandidates = rawMembers.filter((m: any) => {
          const isInCurrentTree = m.treeId === currentTreeId;
          const hasNoParents = !m.parents || m.parents.length === 0;
          return isInCurrentTree && hasNoParents;
        });

        // Step 3: Filter out "In-Laws" (whose spouses are in-tree and have parents)
        const validCandidates = baseCandidates.filter((candidate: any) => {
          const spouses = candidate.spouses || [];

          // Check if ANY spouse disqualifies this candidate
          const isDisqualified = spouses.some((s: any) => {
            const spouseNode = memberMap.get(s.id);

            if (!spouseNode) return false; // Spouse data missing, ignore

            // Condition: Spouse is in the SAME tree
            if (spouseNode.treeId === currentTreeId) {
              // Check if this spouse has parents (meaning the root is higher up on their side)
              if (spouseNode.parents && spouseNode.parents.length > 0) {
                return true; // Disqualify Candidate
              }
            }
            return false;
          });

          return !isDisqualified;
        });

        // Tie-Breaking: Use Descendant Count and Age
        const countDescendants = (
          nodeId: string,
          depth = 0,
          memo = new Map<string, number>(),
        ): number => {
          if (depth > 50) return 0;
          if (memo.has(nodeId)) return memo.get(nodeId)!;

          const node = memberMap.get(nodeId);
          if (!node || !node.children || node.children.length === 0) {
            memo.set(nodeId, 0);
            return 0;
          }

          let count = 0;
          node.children.forEach((child: any) => {
            count += 1 + countDescendants(child.id, depth + 1, memo);
          });

          memo.set(nodeId, count);
          return count;
        };

        const finalCandidates =
          validCandidates.length > 0 ? validCandidates : baseCandidates;

        // Sort candidates
        finalCandidates.sort((a: any, b: any) => {
          // Priority 1: Descendant Count
          const aDesc = countDescendants(a.id);
          const bDesc = countDescendants(b.id);
          if (aDesc !== bDesc) return bDesc - aDesc;

          // Priority 2: Creation Date (Oldest First)
          const aTime = new Date(a.createdAt).getTime() || 0;
          const bTime = new Date(b.createdAt).getTime() || 0;
          return aTime - bTime;
        });

        if (finalCandidates.length > 0) {
          const bestRootId = finalCandidates[0].id;
          setRootId((prevRoot) => {
            if (keepRoot && prevRoot && items.find((n) => n.id === prevRoot)) {
              return prevRoot;
            }
            return bestRootId;
          });
        } else if (items.length > 0) {
          const firstItemId = items[0].id;
          setRootId((prevRoot) => {
            if (keepRoot && prevRoot && items.find((n) => n.id === prevRoot)) {
              return prevRoot;
            }
            return firstItemId;
          });
        }

        setIsLoading(false);
      } catch (error) {
        if (requestId !== loadRequestIdRef.current) return;
        console.error("FamiliesPage: Failed to load tree data:", error);
        setIsPreview(false);
        setRequiresSignIn(false);
        setNodes([]);
        setIsLoading(false);
      }
    },
    // treeReloadKey is intentionally here despite being unused in the body: it is
    // the reload trigger. Bumping it rebuilds this callback, which re-runs the
    // effect below. Removing it silences the lint and breaks tree refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [treeId, treeReloadKey, resetSelection],
  );

  useEffect(() => {
    // Prevent stale tree content/icons while switching between trees.
    setNodes([]);
    setRootId("");
    resetSelection();
    loadTreeData();
  }, [loadTreeData, resetSelection]);

  /**
   * Merges affected nodes from add_person_to_tree into the current state.
   * - New nodes (not in current state) are added.
   * - Existing nodes (already in state) have their relationship arrays updated.
   * - Hierarchy is recalculated for all nodes that changed.
   * This avoids a full tree reload.
   */
  const mergeAffectedNodes = useCallback(
    (affectedRaw: any[], newPersonId?: string) => {
      setNodes((prevNodes) => {
        const nodeMap = new Map(prevNodes.map((n) => [n.id, { ...n }]));

        for (const raw of affectedRaw) {
          const fnode: FNode = {
            id: raw.id,
            name: raw.name,
            nameHindi: raw.nameHindi || undefined,
            gender: (raw.gender as Gender) || ("" as any),
            dob: raw.dob || "",
            parents:
              raw.parents?.map((p: any) => ({
                id: p.id,
                type: (p.type || RelType.blood) as RelType,
              })) || [],
            children:
              raw.children?.map((c: any) => ({
                id: c.id,
                type: (c.type || RelType.blood) as RelType,
              })) || [],
            spouses:
              raw.spouses?.map((s: any) => ({
                id: s.id,
                type: (s.type || RelType.married) as RelType,
                relationSubtype: s.relationSubtype || s.type || RelType.married,
                startDate: s.startDate || undefined,
                endDate: s.endDate || undefined,
              })) || [],
            siblings:
              raw.siblings?.map((s: any) => ({
                id: s.id,
                type: RelType.blood,
              })) || [],
            treeId: raw.treeId || treeId,
            photo: raw.photoUrl || undefined,
            createdAt: raw.createdAt || undefined,
            createdBy: raw.createdBy || undefined,
            createdByName: raw.createdByName || undefined,
            bloodGroup: raw.bloodGroup || undefined,
            isAlive: raw.isAlive !== false,
            deceasedDate: raw.deceasedDate || undefined,
          } as FNode;

          nodeMap.set(raw.id, fnode);
        }

        // Rebuild hierarchy for all nodes (cheap — just walks parent pointers)
        const allNodes = Array.from(nodeMap.values());
        const result = allNodes.map((node) => ({
          ...node,
          hierarchy: getNodeHierarchy(node.id, allNodes),
        }));

        // Update rootId if needed:
        // - Tree was empty (prevNodes was []) → set root to the new person
        // - A new parent was added (reverse relation) → new person has no parents, should be root
        setRootId((prevRoot) => {
          // If we already have a valid root in the updated data, keep it
          if (prevRoot && result.find((n) => n.id === prevRoot)) {
            // But if the new person is a parent (has no parents, and the old root
            // now has parents), switch to the new root
            if (newPersonId) {
              const newNode = result.find((n) => n.id === newPersonId);
              const oldRootNode = result.find((n) => n.id === prevRoot);
              if (
                newNode &&
                oldRootNode &&
                newNode.parents.length === 0 &&
                oldRootNode.parents.length > 0
              ) {
                return newPersonId;
              }
            }
            return prevRoot;
          }
          // No valid root — pick the new person or first parentless node
          if (newPersonId) return newPersonId;
          const parentless = result.find((n) => n.parents.length === 0);
          return parentless?.id || (result.length > 0 ? result[0].id : "");
        });

        return result;
      });
    },
    [treeId],
  );

  return {
    nodes,
    rootId,
    isLoading,
    setIsLoading,
    locationId,
    loadTreeData,
    mergeAffectedNodes,
    isPreview,
    requiresSignIn,
  };
}
