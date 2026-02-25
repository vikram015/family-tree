import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import {
  Box,
  Button,
  Typography,
  Container,
  CircularProgress,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Alert,
} from "@mui/material";
import ShareIcon from "@mui/icons-material/Share";
import { DTreeComponent } from "../DTree/DTreeComponent";
import { NodeDetails } from "../NodeDetails/NodeDetails";
import AddNode from "../AddNode/AddNode";
import { getNodeHierarchy } from "../const";
import { SupabaseService } from "../../services/supabaseService";
import { FNode } from "../model/FNode";
import { Gender, RelType } from "relatives-tree/lib/types";
import { SourceSelect } from "../SourceSelect/SourceSelect";
import AddTree from "../AddTree/AddTree";
import { useAuth } from "../hooks/useAuth";
import { useVillage } from "../hooks/useVillage";
import { useLoginModal } from "../context/LoginModalContext";

interface FamiliesPageProps {
  treeId: string;
  setTreeId: (id: string) => void;
  onSourceChange: (value: string, nodes: readonly any[]) => void;
  onCreate?: (id: string) => void;
}

export const FamiliesPage: React.FC<FamiliesPageProps> = ({
  treeId,
  setTreeId,
  onSourceChange,
  onCreate,
}) => {
  const { currentUser, hasPermission, isApproved, isAdmin, isSuperAdmin } =
    useAuth();
  const { setSelectedVillage } = useVillage();
  const { openLoginModal } = useLoginModal();
  const [nodes, setNodes] = useState<Array<FNode>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [rootId, setRootId] = useState("");
  const [villageId, setVillageId] = useState<string | undefined>(undefined);
  const [selectId, setSelectId] = useState<string>();
  const [autoExpandNodeId, setAutoExpandNodeId] = useState<string | null>(null);
  const [showAddStartingNode, setShowAddStartingNode] = useState(false);
  // Track initial view & add info for NodeDetails (when opening from placeholder nodes)
  const [nodeDetailsInitialView, setNodeDetailsInitialView] = useState<
    "details" | "edit" | "add" | undefined
  >(undefined);
  const [nodeDetailsAddInfo, setNodeDetailsAddInfo] = useState<
    { relation: "child" | "spouse" | "parent"; gender?: string } | undefined
  >(undefined);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    open: boolean;
    personId: string | null;
    childrenCount: number;
    personName?: string;
  }>({
    open: false,
    personId: null,
    childrenCount: 0,
  });
  const [externalTreeConfirm, setExternalTreeConfirm] = useState<{
    open: boolean;
    targetTreeId: string | null;
  }>({
    open: false,
    targetTreeId: null,
  });
  const [dismissNoAccessAlert, setDismissNoAccessAlert] = useState(false);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  const loadRequestIdRef = useRef(0);
  const canWriteCurrentTree = hasPermission("admin", villageId);
  const showNoAccessAlert =
    isAdmin() && isApproved && !canWriteCurrentTree && !dismissNoAccessAlert;

  const loadTreeData = useCallback(
    async (keepRoot = false) => {
      const requestId = ++loadRequestIdRef.current;
      if (!treeId || treeId === "") {
        if (requestId !== loadRequestIdRef.current) return;
        setNodes([]);
        setSelectId(undefined);
        setIsLoading(false);
        return;
      }

      try {
        if (!keepRoot) {
          setIsLoading(true);
        }
        // Fetch complete tree from Supabase using the PostgreSQL function
        const treeData = await SupabaseService.getCompleteTreeById(treeId);
        if (requestId !== loadRequestIdRef.current) return;
        setVillageId(treeData.tree?.village?.id);

        // Convert tree data to FNode format
        const items: Readonly<FNode>[] = (treeData.members || []).map(
          (person: any) =>
            ({
              id: person.id,
              name: person.name,
              gender: person.gender as Gender,
              dob: person.dob || "",
              parents:
                person.parents?.map((p: any) => ({
                  id: p.id,
                  type: RelType.blood,
                })) || [],
              children:
                person.children?.map((c: any) => ({
                  id: c.id,
                  type: RelType.blood,
                })) || [],
              spouses:
                person.spouses?.map((s: any) => ({
                  id: s.id,
                  type: (s.type || s.relation_subtype || RelType.married) as RelType,
                })) || [],
              siblings:
                person.siblings?.map((s: any) => ({
                  id: s.id,
                  type: RelType.blood,
                })) || [],
              treeId: person.tree_id || treeId,
              photo: person.photo_url || undefined,
              bloodGroup: person.blood_group || undefined,
              isAlive: person.is_alive !== false,
              deceasedDate: person.deceased_date || undefined,
            }) as FNode,
        );

        // Populate hierarchy for all nodes
        const itemsWithHierarchy = items.map((node) => ({
          ...node,
          hierarchy: getNodeHierarchy(node.id, items),
        }));

        setNodes(itemsWithHierarchy);
        setSelectId(undefined);

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

        // -------------------------------------------------------------
        // Root Selection Logic Refined
        // 1. Candidate must belong to the current tree.
        // 2. Candidate must have NO parents.
        // 3. If Candidate has a spouse in the SAME tree, that spouse must NOT have parents.
        //    (If the spouse has parents, then the spouse's lineage is the true root, and Candidate is just an in-law).
        // -------------------------------------------------------------

        const currentTreeId = treeId;
        const rawMembers = treeData.members || [];
        const memberMap = new Map(rawMembers.map((m: any) => [m.id, m]));

        // Step 1 & 2: Filter by Tree ID and No Parents
        const baseCandidates = rawMembers.filter((m: any) => {
          const isInCurrentTree = m.tree_id === currentTreeId;
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
            if (spouseNode.tree_id === currentTreeId) {
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
          const aTime = new Date(a.created_at).getTime() || 0;
          const bTime = new Date(b.created_at).getTime() || 0;
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
        setNodes([]);
        setIsLoading(false);
      }
    },
    [treeId],
  );

  useEffect(() => {
    // Prevent stale tree content/icons while switching between trees.
    setNodes([]);
    setRootId("");
    setSelectId(undefined);
    setDismissNoAccessAlert(false);
    loadTreeData();
  }, [loadTreeData]);

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
            gender: (raw.gender as Gender) || ("" as any),
            dob: raw.dob || "",
            parents:
              raw.parents?.map((p: any) => ({
                id: p.id,
                type: RelType.blood,
              })) || [],
            children:
              raw.children?.map((c: any) => ({
                id: c.id,
                type: RelType.blood,
              })) || [],
            spouses:
              raw.spouses?.map((s: any) => ({
                id: s.id,
                type: (s.type || s.relation_subtype || RelType.married) as RelType,
              })) || [],
            siblings:
              raw.siblings?.map((s: any) => ({
                id: s.id,
                type: RelType.blood,
              })) || [],
            treeId: raw.tree_id || treeId,
            photo: raw.photo_url || undefined,
            bloodGroup: raw.blood_group || undefined,
            isAlive: raw.is_alive !== false,
            deceasedDate: raw.deceased_date || undefined,
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

  const selected = useMemo(
    () => nodes.find((item) => item.id === selectId),
    [nodes, selectId],
  );

  const onUpdate = useCallback(
    async (nodeId: string, updates: Partial<FNode>) => {
      if (!canWriteCurrentTree) {
        alert("You don't have permission to edit this family tree.");
        return;
      }

      try {
        // Update person with both core properties and additional details in one call
        await SupabaseService.updatePerson(nodeId, updates);
        // Refresh tree data but keep current root if valid
        await loadTreeData(true);
        // Clear selection to refresh the detail panel
        setSelectId(undefined);
      } catch (err) {
        console.error("Failed to update node:", err);
        alert(
          `Failed to update node: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    },
    [canWriteCurrentTree, treeId, loadTreeData, villageId],
  );

  const onDelete = useCallback(
    async (nodeId: string, force: boolean = false) => {
      if (!canWriteCurrentTree) {
        alert("You don't have permission to delete from this family tree.");
        return;
      }

      try {
        // Delete person using Supabase
        const result = await SupabaseService.deletePerson(nodeId, force);

        if (result?.requires_confirmation) {
          const person = nodes.find((n) => n.id === nodeId);
          setDeleteConfirmation({
            open: true,
            personId: nodeId,
            childrenCount: result.children_count,
            personName: person?.name,
          });
          return;
        }

        // Refresh tree data but keep current root if valid
        await loadTreeData(true);
        // Clear selection
        setSelectId(undefined);
        setDeleteConfirmation((prev) => ({ ...prev, open: false }));
      } catch (err) {
        console.error("Failed to delete node:", err);
        alert(
          `Failed to delete node: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    },
    [canWriteCurrentTree, treeId, loadTreeData, nodes, villageId],
  );

  const onAdd = useCallback(
    async (
      node: Partial<FNode>,
      relation: "child" | "spouse" | "parent",
      targetId?: string,
      type?: RelType,
      otherParentId?: string,
    ): Promise<string | undefined> => {
      if (!canWriteCurrentTree) {
        alert("You don't have permission to add to this family tree.");
        return undefined;
      }

      // Special handling for linking existing spouse
      if (node.id && relation === "spouse" && targetId) {
        try {
          setIsLoading(true);
          await SupabaseService.addSpouse(targetId, node.id);
          await loadTreeData(true);
          return node.id; // Return the linked person ID
        } catch (err) {
          console.error("Failed to link spouse:", err);
          alert(
            `Failed to link spouse: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
          setIsLoading(false);
          return undefined;
        }
      }

      try {
        // Separate custom fields from the node data
        const { customFields, ...coreNode } = node;

        // Map UI relation to database relation type
        // UI relations: "child" (new person is child of target), "spouse", "parent" (new person is parent of target)
        // DB relations: only 'parent' or 'spouse' with subtypes for blood/adopted/married/divorced
        let relationType: "parent" | "spouse" | undefined;
        let relatedPersonId: string | undefined;
        let relatedPersonId2: string | undefined;
        let isReverseRelation = false;

        if (relation === "child" && targetId) {
          // Adding a child to target: new_person → parent → target
          // Use the second parent from AddNode component if provided
          relationType = "parent";
          relatedPersonId = targetId;
          relatedPersonId2 = otherParentId; // From AddNode selection
          isReverseRelation = false;
        } else if (relation === "spouse" && targetId) {
          // Adding a spouse: only pass one target
          // relatedPersonId2 must remain NULL for spouse relationships
          relationType = "spouse";
          relatedPersonId = targetId;
          relatedPersonId2 = undefined; // NEVER pass second person for spouse
          isReverseRelation = false;
        } else if (relation === "parent" && targetId) {
          // Adding a parent to target: target → parent → new_person
          // We store it as: new_person is the related_person, but mark it as reverse
          relationType = "parent";
          relatedPersonId = targetId;
          // If the child already has another parent, pass it so the backend
          // can maintain spouse linkage between parents.
          const targetNode = nodes.find((n) => n.id === targetId);
          if (targetNode?.parents && targetNode.parents.length > 0) {
            const preferredParent = targetNode.parents.find((p) => {
              const parentNode = nodes.find((n) => n.id === p.id);
              return coreNode.gender
                ? parentNode?.gender && parentNode.gender !== coreNode.gender
                : true;
            });
            relatedPersonId2 = preferredParent?.id || targetNode.parents[0].id;
          }
          isReverseRelation = true;
        }

        // Create person in Supabase using the add_person_to_tree procedure
        // This handles: person creation, relationship creation, and auto-spouse creation for children
        const newPerson = await SupabaseService.addPersonToTree(
          treeId,
          coreNode.name || "Unnamed",
          coreNode.gender,
          coreNode.dob,
          relationType,
          relatedPersonId,
          type,
          customFields, // Pass additional details
          isReverseRelation,
          relatedPersonId2,
          coreNode.bloodGroup,
          coreNode.isAlive,
          coreNode.deceasedDate,
        );

        // Efficiently merge affected_nodes into existing state instead of full reload
        if (newPerson?.success && newPerson?.person_id) {
          const affectedNodes = newPerson.affected_nodes || [];
          if (affectedNodes.length > 0) {
            mergeAffectedNodes(affectedNodes, newPerson.person_id);
          } else {
            // Fallback: full reload if procedure didn't return affected_nodes (old DB version)
            await loadTreeData(true);
          }
          if (relation === "child" && targetId) {
            setAutoExpandNodeId(targetId);
          }
          return newPerson.person_id;
        }
      } catch (err) {
        console.error("Failed to add node:", err);
        alert(
          `Failed to add node: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
      return undefined;
    },
    [canWriteCurrentTree, treeId, loadTreeData, villageId, nodes],
  );

  const handleShareTree = useCallback(async () => {
    const shareUrl = treeId
      ? `${window.location.origin}/families?tree=${treeId}`
      : window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Family Tree",
          url: shareUrl,
        });
        return;
      }
      alert("Native share is not supported on this device/browser.");
    } catch (err) {
      console.warn("Share cancelled or failed:", err);
    }
  }, [treeId]);

  // Handler for "View Details" — opens NodeDetails in details view
  const handleViewDetails = useCallback((nodeId: string) => {
    setNodeDetailsInitialView("details");
    setNodeDetailsAddInfo(undefined);
    setSelectId(nodeId);
  }, []);

  // Handler for edit icon on tree nodes — opens NodeDetails in edit view
  const handleEditNode = useCallback(
    (nodeId: string) => {
      if (!canWriteCurrentTree) {
        alert("You don't have permission to edit this family tree.");
        return;
      }
      if (!currentUser) {
        openLoginModal(() => {
          setNodeDetailsInitialView("edit");
          setNodeDetailsAddInfo(undefined);
          setSelectId(nodeId);
        });
        return;
      }
      setNodeDetailsInitialView("edit");
      setNodeDetailsAddInfo(undefined);
      setSelectId(nodeId);
    },
    [canWriteCurrentTree, currentUser, openLoginModal],
  );

  // Handler for placeholder "add relative" nodes in the tree
  const handleAddRelative = useCallback(
    (
      nodeId: string,
      relType: "father" | "mother" | "spouse" | "son" | "daughter",
    ) => {
      if (!canWriteCurrentTree) {
        alert("You don't have permission to add to this family tree.");
        return;
      }
      // Map family-chart relTypes to onAdd's relation + gender
      let relation: "child" | "spouse" | "parent";
      let gender: string | undefined;

      switch (relType) {
        case "father":
          relation = "parent";
          gender = "male";
          break;
        case "mother":
          relation = "parent";
          gender = "female";
          break;
        case "spouse":
          relation = "spouse";
          gender = undefined;
          break;
        case "son":
          relation = "child";
          gender = "male";
          break;
        case "daughter":
          relation = "child";
          gender = "female";
          break;
      }

      if (!currentUser) {
        openLoginModal(() => {
          setNodeDetailsInitialView("add");
          setNodeDetailsAddInfo({ relation, gender });
          setSelectId(nodeId);
        });
        return;
      }

      setNodeDetailsInitialView("add");
      setNodeDetailsAddInfo({ relation, gender });
      setSelectId(nodeId);
    },
    [canWriteCurrentTree, currentUser, openLoginModal],
  );

  // Calculate tree statistics
  const statistics = useMemo(() => {
    const totalPeople = nodes.length;
    const maleCount = nodes.filter((n) => n.gender === Gender.male).length;
    const femaleCount = nodes.filter((n) => n.gender === Gender.female).length;
    const generationsSet = new Set<number>();

    nodes.forEach((node) => {
      if (node.hierarchy && node.hierarchy.length > 0) {
        generationsSet.add(node.hierarchy.length);
      }
    });

    const generations = generationsSet.size || 1;

    return {
      totalPeople,
      maleCount,
      femaleCount,
      generations,
    };
  }, [nodes]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        width: "100%",
      }}
    >
      <Helmet>
        <title>My Family Tree - Kinvia | Build Your Family Tree</title>
        <meta
          name="description"
          content="Create and manage your interactive family tree. Visualize relationships, add family members, and preserve your family history on Kinvia."
        />
        <meta
          name="keywords"
          content="family tree, genealogy, family members, relationships, tree visualization, family history"
        />
        <meta property="og:title" content="My Family Tree - Kinvia" />
        <meta
          property="og:description"
          content="View and manage your interactive family tree with Kinvia."
        />
      </Helmet>
      {(isSuperAdmin() || isApproved) && (
        <Box
          sx={{
            position: "fixed",
            right: { xs: 16, sm: 24 },
            bottom: { xs: 16, sm: 24 },
            zIndex: 1200,
            opacity: isMobileSheetOpen ? 0 : 1,
            pointerEvents: isMobileSheetOpen ? "none" : "auto",
            transition: "opacity 0.2s ease",
          }}
        >
          <AddTree
            variant="fab"
            onCreate={(createdTreeId) => {
              // Move to the newly created tree
              setTreeId(createdTreeId);
              // Call parent onCreate callback if provided
              onCreate?.(createdTreeId);
            }}
          />
        </Box>
      )}
      <Box
        sx={{
          position: "fixed",
          left: { xs: 16, sm: 24 },
          bottom: { xs: 16, sm: 24 },
          zIndex: 1200,
          display: { xs: "flex", sm: "none" },
          opacity: isMobileSheetOpen ? 0 : 1,
          pointerEvents: isMobileSheetOpen ? "none" : "auto",
          transition: "opacity 0.2s ease",
        }}
      >
        <Fab
          color="primary"
          size="medium"
          aria-label="Share tree"
          onClick={handleShareTree}
          disabled={!treeId}
        >
          <ShareIcon />
        </Fab>
      </Box>
      {isAdmin() && !isApproved && (
        <Alert severity="info" sx={{ mx: 2, mt: 1 }}>
          Your account is pending approval. You can view trees but cannot make
          changes until a Super Admin approves your account.
        </Alert>
      )}
      {showNoAccessAlert && (
        <Alert
          severity="info"
          sx={{ mx: 2, mt: 1 }}
          onClose={() => setDismissNoAccessAlert(true)}
        >
          You can view this tree but cannot make changes because you don&apos;t
          have village write access for this tree.
        </Alert>
      )}
      {nodes.length > 0 && !isLoading && (
        <Box
          sx={{
            display: { xs: "none", sm: "flex" },
            gap: 2,
            p: 1.5,
            px: 2,
            borderBottom: 1,
            borderColor: "divider",
            alignItems: "center",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Typography
              variant="h6"
              sx={{ fontWeight: 700, color: "primary.main" }}
            >
              {statistics.totalPeople}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              People
            </Typography>
          </Box>

          <Box
            sx={{
              width: "1px",
              height: 20,
              borderLeft: "1px solid",
              borderColor: "divider",
            }}
          />

          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Typography
              variant="h6"
              sx={{ fontWeight: 700, color: "error.main" }}
            >
              {statistics.femaleCount}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Female
            </Typography>
          </Box>

          <Box
            sx={{
              width: "1px",
              height: 20,
              borderLeft: "1px solid",
              borderColor: "divider",
            }}
          />

          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Typography
              variant="h6"
              sx={{ fontWeight: 700, color: "info.main" }}
            >
              {statistics.maleCount}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Male
            </Typography>
          </Box>

          <Box
            sx={{
              width: "1px",
              height: 20,
              borderLeft: "1px solid",
              borderColor: "divider",
            }}
          />

          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Typography
              variant="h6"
              sx={{ fontWeight: 700, color: "success.main" }}
            >
              {statistics.generations}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Generations
            </Typography>
          </Box>
        </Box>
      )}
      <Box
        sx={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: 10,
            left: 10,
            right: { xs: 10, sm: "auto" },
            width: { xs: "calc(100% - 20px)", sm: "auto" },
            zIndex: 20,
            background: "rgba(255,255,255,0.92)",
            padding: "4px 8px",
            borderRadius: 1,
            boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
          }}
        >
          <SourceSelect onChange={onSourceChange} />
        </Box>
        {isLoading ? (
          <Box
            sx={{
              flex: 1,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <CircularProgress />
            <Typography variant="body1" sx={{ color: "text.secondary" }}>
              Loading tree...
            </Typography>
          </Box>
        ) : nodes.length > 0 ? (
          <Box
            sx={{
              flex: 1,
              position: "relative",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {rootId && nodes.find((n) => n.id === rootId) ? (
              <DTreeComponent
                nodes={nodes}
                rootId={rootId}
                canEditTree={canWriteCurrentTree}
                autoExpandNodeId={autoExpandNodeId}
                onAutoExpandHandled={() => setAutoExpandNodeId(null)}
                onNodeClick={(id) => {
                  setNodeDetailsInitialView(undefined);
                  setNodeDetailsAddInfo(undefined);
                  setSelectId(id);
                }}
                onEditNode={handleEditNode}
                onDelete={onDelete}
                onAddRelative={handleAddRelative}
                onViewDetails={handleViewDetails}
                currentTreeId={treeId}
                onMobileSheetChange={setIsMobileSheetOpen}
                onExternalTreeClick={(tid) => {
                  setExternalTreeConfirm({ open: true, targetTreeId: tid });
                }}
              />
            ) : (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "100%",
                }}
              >
                <Typography>
                  Unable to find root node. Please check tree data.
                </Typography>
              </Box>
            )}
          </Box>
        ) : (
          treeId &&
          treeId !== "" && (
            <Container
              maxWidth="sm"
              sx={{ mt: { xs: 14, sm: 8 }, textAlign: "center" }}
            >
              <Typography variant="h5" gutterBottom>
                This tree is empty.
              </Typography>
              <Box
                sx={{
                  mt: 3,
                  display: "flex",
                  gap: 2,
                  justifyContent: "center",
                }}
              >
                <Button
                  variant="contained"
                  onClick={() => setShowAddStartingNode(true)}
                  disabled={!canWriteCurrentTree}
                >
                  Create First Node
                </Button>
              </Box>
            </Container>
          )
        )}
      </Box>
      <Dialog
        open={showAddStartingNode}
        onClose={() => setShowAddStartingNode(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create First Person</DialogTitle>
        <DialogContent>
          <AddNode
            isFirstNode={true}
            onAdd={async (node) => {
              // Pass as 'child' with no target - the onAdd handler will handle default case if we modify it,
              // OR we just pass appropriate dummy values that onAdd understands.
              // Looking at onAdd, it doesn't handle "no relation". I should update onAdd or pass dummy.
              // Actually, better to check onAdd logic.
              // If I pass relation="child" and targetId=undefined, it skips all if/else blocks and goes to default addPersonToTree.
              // addPersonToTree procedure handles null relations as root node.
              return await onAdd(node, "child", undefined); // "child" is just a placeholder type, won't be used logic-wise if targetId is missing
            }}
            onCancel={() => setShowAddStartingNode(false)}
            onComplete={() => setShowAddStartingNode(false)}
            noCard
            // Pass the callback to handle completion
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteConfirmation.open}
        onClose={() =>
          setDeleteConfirmation((prev) => ({ ...prev, open: false }))
        }
      >
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {deleteConfirmation.personName || "This person"} has{" "}
            <strong>{deleteConfirmation.childrenCount} children</strong> in the
            tree.
            <br />
            <br />
            Deleting them will leave these children as <strong>
              orphans
            </strong>{" "}
            (disconnected from the main lineage).
            <br />
            <br />
            Are you sure you want to proceed?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() =>
              setDeleteConfirmation((prev) => ({ ...prev, open: false }))
            }
          >
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              if (deleteConfirmation.personId) {
                onDelete(deleteConfirmation.personId, true);
              }
            }}
          >
            Force Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* External tree navigation confirmation */}
      <Dialog
        open={externalTreeConfirm.open}
        onClose={() =>
          setExternalTreeConfirm({ open: false, targetTreeId: null })
        }
      >
        <DialogTitle>Navigate to Another Tree</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This person belongs to another family tree. Would you like to
            navigate to that tree?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() =>
              setExternalTreeConfirm({ open: false, targetTreeId: null })
            }
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={async () => {
              const tid = externalTreeConfirm.targetTreeId;
              setExternalTreeConfirm({ open: false, targetTreeId: null });
              if (tid) {
                try {
                  const tree = await SupabaseService.getTreeWithDetails(tid);
                  if (tree?.village_id) {
                    setSelectedVillage(tree.village_id);
                  }
                } catch (e) {
                  console.warn("Could not fetch target tree village:", e);
                }
                onSourceChange(tid, []);
              }
            }}
          >
            Navigate
          </Button>
        </DialogActions>
      </Dialog>

      {selected && (
        <NodeDetails
          node={selected}
          nodes={nodes}
          onSelect={(id) => {
            setNodeDetailsInitialView(undefined);
            setNodeDetailsAddInfo(undefined);
            setSelectId(id);
          }}
          onAdd={onAdd}
          onUpdate={onUpdate}
          onDelete={onDelete}
          treeId={treeId}
          initialView={nodeDetailsInitialView}
          initialAddInfo={nodeDetailsAddInfo}
        />
      )}
    </Box>
  );
};
