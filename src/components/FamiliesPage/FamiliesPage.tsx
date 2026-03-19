import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Paper,
  Stack,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import FemaleOutlinedIcon from "@mui/icons-material/FemaleOutlined";
import MaleOutlinedIcon from "@mui/icons-material/MaleOutlined";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { DTreeComponent } from "../DTree/DTreeComponent";
import { NodeDetails } from "../NodeDetails/NodeDetails";
import AddNode from "../AddNode/AddNode";
import { getNodeHierarchy } from "../const";
import { ApiService } from "../../services/apiService";
import type { TreeWriteScope } from "../../services/apiService";
import { FNode } from "../model/FNode";
import { Gender, RelType } from "relatives-tree/lib/types";
import AddTree from "../AddTree/AddTree";
import { useAuth } from "../hooks/useAuth";
import { useVillage } from "../hooks/useVillage";
import { useLoginModal } from "../context/LoginModalContext";
import { useSearchParams } from "react-router-dom";
import { FamiliesPageHeader } from "./FamiliesPageHeader";
import type { StatusAlert } from "./FamiliesPageHeader";
import { InviteCollaboratorDialog } from "./InviteCollaboratorDialog";

interface FamiliesPageProps {
  treeId: string;
  setTreeId: (id: string, options?: { personId?: string | null }) => void;
  onSourceChange: (value: string, nodes: readonly any[]) => void;
  onCreate?: (id: string) => void;
}

export const FamiliesPage: React.FC<FamiliesPageProps> = ({
  treeId,
  setTreeId,
  onSourceChange,
  onCreate,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser, loading, hasPermission, isApproved, isAdmin, isSuperAdmin } =
    useAuth();
  const { setSelectedVillage } = useVillage();
  const { openLoginModal } = useLoginModal();
  const highlightedPersonId = searchParams.get("personId");
  const inviteToken = searchParams.get("inviteToken");
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
    targetPersonId: string | null;
  }>({
    open: false,
    targetTreeId: null,
    targetPersonId: null,
  });
  const [dismissNoAccessAlert, setDismissNoAccessAlert] = useState(false);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  const [treeWriteScope, setTreeWriteScope] = useState<TreeWriteScope | null>(
    null,
  );
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteRole, setInviteRole] = useState("write");
  const [inviteScope, setInviteScope] = useState<"full" | "branch">("full");
  const [invitePersonId, setInvitePersonId] = useState("");
  const [invitePersonSearch, setInvitePersonSearch] = useState("");
  const [inviteSelectedPersonName, setInviteSelectedPersonName] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteAccepting, setInviteAccepting] = useState(false);
  const loadRequestIdRef = useRef(0);
  const acceptedInviteTokenRef = useRef<string | null>(null);
  const inviteLoginPromptedRef = useRef<string | null>(null);
  const canWriteCurrentTree = hasPermission("admin", villageId);
  const canWriteAnyBranch =
    canWriteCurrentTree &&
    Boolean(treeWriteScope?.canWriteAll || treeWriteScope?.rootPersonIds.length);
  const canCreateRootNode = canWriteCurrentTree && Boolean(treeWriteScope?.canWriteAll);
  const canManageInvites = Boolean(canWriteCurrentTree && (isSuperAdmin() || treeWriteScope?.canWriteAll));
  const showNoAccessAlert =
    isAdmin() && isApproved && !canWriteCurrentTree && !dismissNoAccessAlert;

  const editableNodeIds = useMemo(() => {
    const editable = new Set<string>();
    if (!canWriteCurrentTree || !treeWriteScope) return editable;
    if (treeWriteScope.canWriteAll) {
      nodes.forEach((node) => editable.add(node.id));
      return editable;
    }

    const nodeMap = new Map(nodes.map((node) => [node.id, node]));
    const queue = [...treeWriteScope.rootPersonIds];
    while (queue.length > 0) {
      const currentId = queue.shift();
      if (!currentId || editable.has(currentId)) continue;
      editable.add(currentId);
      const current = nodeMap.get(currentId);
      (current?.children || []).forEach((child) => {
        if (child?.id && !editable.has(child.id)) {
          queue.push(child.id);
        }
      });
    }
    return editable;
  }, [canWriteCurrentTree, treeWriteScope, nodes]);

  const canEditNode = useCallback(
    (nodeId?: string | null) => {
      if (!nodeId || !canWriteCurrentTree || !treeWriteScope) return false;
      if (treeWriteScope.canWriteAll) return true;
      return editableNodeIds.has(nodeId);
    },
    [canWriteCurrentTree, treeWriteScope, editableNodeIds],
  );

  useEffect(() => {
    let active = true;

    if (!treeId || !currentUser || !canWriteCurrentTree) {
      setTreeWriteScope(null);
      return () => {
        active = false;
      };
    }

    ApiService.getTreeWriteScope(treeId)
      .then((scope) => {
        if (!active) return;
        setTreeWriteScope(scope);
      })
      .catch((error) => {
        if (!active) return;
        console.warn("Failed to load tree write scope:", error);
        setTreeWriteScope({ treeId, canWriteAll: false, rootPersonIds: [] });
      });

    return () => {
      active = false;
    };
  }, [treeId, currentUser, canWriteCurrentTree]);

  useEffect(() => {
    if (!inviteToken || loading) {
      return;
    }
    if (!currentUser) {
      if (inviteLoginPromptedRef.current !== inviteToken) {
        inviteLoginPromptedRef.current = inviteToken;
        openLoginModal();
      }
      return;
    }
    if (acceptedInviteTokenRef.current === inviteToken || inviteAccepting) {
      return;
    }

    acceptedInviteTokenRef.current = inviteToken;
    setInviteAccepting(true);
    ApiService.acceptTreeInvite(inviteToken)
      .then((result) => {
        if (result?.treeId && result.treeId !== treeId) {
          setTreeId(result.treeId);
        }
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.delete("inviteToken");
          return next;
        });
        alert("Invite accepted. You now have access to this tree.");
        return ApiService.getTreeWriteScope(result.treeId || treeId);
      })
      .then((scope) => {
        if (scope) {
          setTreeWriteScope(scope);
        }
        inviteLoginPromptedRef.current = null;
      })
      .catch((error) => {
        console.error("Failed to accept invite:", error);
        alert(`Failed to accept invite: ${error instanceof Error ? error.message : String(error)}`);
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.delete("inviteToken");
          return next;
        });
        inviteLoginPromptedRef.current = null;
      })
      .finally(() => {
        setInviteAccepting(false);
      });
  }, [
    inviteToken,
    inviteAccepting,
    currentUser,
    loading,
    treeId,
    setTreeId,
    setSearchParams,
    openLoginModal,
  ]);

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
        const treeData = await ApiService.getCompleteTreeById(treeId);
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

  const selected = useMemo(
    () => nodes.find((item) => item.id === selectId),
    [nodes, selectId],
  );

  const onUpdate = useCallback(
    async (nodeId: string, updates: Partial<FNode>) => {
      if (!canEditNode(nodeId)) {
        alert("You don't have permission to edit this person.");
        return;
      }

      try {
        // Update person with both core properties and additional details in one call
        await ApiService.updatePerson(nodeId, updates);
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
    [canEditNode, loadTreeData],
  );

  const onDelete = useCallback(
    async (nodeId: string, force: boolean = false) => {
      if (!canEditNode(nodeId)) {
        alert("You don't have permission to delete this person.");
        return;
      }

      try {
        // Delete person using Supabase
        const result = await ApiService.deletePerson(nodeId, force);

        if (result?.requiresConfirmation) {
          const person = nodes.find((n) => n.id === nodeId);
          setDeleteConfirmation({
            open: true,
            personId: nodeId,
            childrenCount: result.childrenCount,
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
    [canEditNode, loadTreeData, nodes],
  );

  const onAdd = useCallback(
    async (
      node: Partial<FNode>,
      relation: "child" | "spouse" | "parent",
      targetId?: string,
      type?: RelType,
      otherParentId?: string,
    ): Promise<string | undefined> => {
      if (targetId && !canEditNode(targetId)) {
        alert("You don't have permission to add relatives in this branch.");
        return undefined;
      }

      if (!targetId && !canCreateRootNode) {
        alert("You don't have permission to create a new root node in this tree.");
        return undefined;
      }

      // Special handling for linking existing spouse
      if (node.id && relation === "spouse" && targetId) {
        try {
          setIsLoading(true);
          await ApiService.addSpouse(
            targetId,
            node.id,
            node.relationSubtype,
            node.relationStartDate,
            node.relationEndDate,
          );
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
        const newPerson = await ApiService.addPersonToTree(
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
          undefined,
          coreNode.relationStartDate,
          coreNode.relationEndDate,
        );

        // Efficiently merge affected nodes into existing state instead of full reload
        if (newPerson?.success && newPerson?.personId) {
          const affectedNodes = newPerson.affectedNodes || [];
          if (affectedNodes.length > 0) {
            mergeAffectedNodes(affectedNodes, newPerson.personId);
          } else {
            // Fallback: full reload if response did not include affected nodes
            await loadTreeData(true);
          }
          if (relation === "child" && targetId) {
            setAutoExpandNodeId(targetId);
          }
          return newPerson.personId;
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
    [canEditNode, canCreateRootNode, treeId, loadTreeData, nodes, mergeAffectedNodes],
  );

  const handleShareTree = useCallback(async () => {
    const shareUrl = (() => {
      if (!treeId) {
        return window.location.href;
      }

      const currentUrl = new URL(window.location.href);
      const nextUrl = new URL(`${window.location.origin}/families`);
      nextUrl.searchParams.set("tree", treeId);

      const currentPersonId = currentUrl.searchParams.get("personId");
      if (currentPersonId) {
        nextUrl.searchParams.set("personId", currentPersonId);
      }

      return nextUrl.toString();
    })();

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

  const handleOpenInviteDialog = useCallback(() => {
    if (!currentUser) {
      openLoginModal(() => setInviteDialogOpen(true));
      return;
    }
    if (!canManageInvites) {
      alert("You need full-tree access to invite collaborators.");
      return;
    }
    const defaultPersonId = selectId || rootId || "";
    const defaultPerson = nodes.find((node) => node.id === defaultPersonId);
    setInvitePersonId(defaultPersonId);
    setInviteSelectedPersonName(defaultPerson?.name || "");
    setInvitePersonSearch(defaultPerson?.name || "");
    setInviteDialogOpen(true);
  }, [currentUser, openLoginModal, canManageInvites, selectId, rootId, nodes]);

  const handleCreateInvite = useCallback(async () => {
    if (!treeId) return;
    if (!canManageInvites) {
      alert("You need full-tree access to invite collaborators.");
      return;
    }

    const selectedBranchId = invitePersonId || null;
    const personId = inviteScope === "branch" ? selectedBranchId : null;
    if (inviteScope === "branch" && !personId) {
      alert("Select a person in the tree to invite for branch access.");
      return;
    }

    const phoneDigits = invitePhone.replace(/\D/g, "").slice(0, 10);
    const normalizedInvitePhone = phoneDigits ? `+91${phoneDigits}` : null;

    try {
      setInviteBusy(true);
      const invite = await ApiService.createTreeInvite(treeId, {
        role: inviteRole,
        personId,
        invitedPhone: normalizedInvitePhone,
      });
      const shareLink = invite.inviteLink || `${window.location.origin}/families?tree=${treeId}&inviteToken=${invite.inviteToken || ""}`;
      const targetScope = personId ? `branch from ${nodes.find((n) => n.id === personId)?.name || "selected person"}` : "full tree";
      const targetPhone = normalizedInvitePhone ? `Phone: ${normalizedInvitePhone}\n` : "";
      const shareText = `You are invited to edit the family tree (${targetScope}).\n${targetPhone}${shareLink}`;

      if (navigator.share) {
        await navigator.share({
          title: "Family Tree Invite",
          text: shareText,
          url: shareLink,
        });
      } else {
        await navigator.clipboard.writeText(shareText);
        alert("Invite link copied to clipboard. Share it via SMS/WhatsApp.");
      }

      setInviteDialogOpen(false);
      setInvitePhone("");
      setInviteRole("write");
      setInviteScope("full");
      setInvitePersonId("");
      setInvitePersonSearch("");
      setInviteSelectedPersonName("");
    } catch (error) {
      console.error("Failed to create invite:", error);
      alert(`Failed to create invite: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setInviteBusy(false);
    }
  }, [treeId, canManageInvites, invitePersonId, inviteScope, inviteRole, invitePhone, nodes]);

  // Handler for "View Details" — opens NodeDetails in details view
  const handleViewDetails = useCallback((nodeId: string) => {
    setNodeDetailsInitialView("details");
    setNodeDetailsAddInfo(undefined);
    setSelectId(nodeId);
  }, []);

  // Handler for edit icon on tree nodes — opens NodeDetails in edit view
  const handleEditNode = useCallback(
    (nodeId: string) => {
      if (!canEditNode(nodeId)) {
        alert("You don't have permission to edit this person.");
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
    [canEditNode, currentUser, openLoginModal],
  );

  // Handler for placeholder "add relative" nodes in the tree
  const handleAddRelative = useCallback(
    (
      nodeId: string,
      relType: "father" | "mother" | "spouse" | "son" | "daughter",
    ) => {
      if (!canEditNode(nodeId)) {
        alert("You don't have permission to add relatives in this branch.");
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
    [canEditNode, currentUser, openLoginModal],
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

  const treeStatus = useMemo(() => {
    if (!currentUser) {
      return {
        label: "View only",
        description: "Sign in to edit this tree or manage invites.",
        color: "default" as const,
        icon: <LockOutlinedIcon sx={{ fontSize: 18 }} />,
      };
    }

    if (!canWriteAnyBranch) {
      return {
        label: "Read only",
        description: "You can browse this tree but cannot change people in it.",
        color: "default" as const,
        icon: <LockOutlinedIcon sx={{ fontSize: 18 }} />,
      };
    }

    if (treeWriteScope?.canWriteAll) {
      return {
        label: "Full edit access",
        description: "You can create roots, edit any branch, and manage invites.",
        color: "success" as const,
        icon: <EditOutlinedIcon sx={{ fontSize: 18 }} />,
      };
    }

    return {
      label: "Branch edit access",
      description: "You can edit only the branches assigned to your account.",
      color: "info" as const,
      icon: <EditOutlinedIcon sx={{ fontSize: 18 }} />,
    };
  }, [currentUser, canWriteAnyBranch, treeWriteScope]);

  const statusAlerts = useMemo<StatusAlert[]>(
    () =>
      [
        isAdmin() && !isApproved
          ? {
              key: "pending-approval",
              severity: "info" as const,
              text: "Your account is pending approval. You can view trees but cannot make changes until a Super Admin approves your account.",
            }
          : null,
        showNoAccessAlert
          ? {
              key: "no-village-access",
              severity: "info" as const,
              text: "You can view this tree but cannot make changes because you do not have village write access for this tree.",
              onClose: () => setDismissNoAccessAlert(true),
            }
          : null,
        inviteAccepting
          ? {
              key: "invite-processing",
              severity: "info" as const,
              text: "Processing invite link...",
            }
          : null,
      ].filter(Boolean) as StatusAlert[],
    [isAdmin, isApproved, showNoAccessAlert, inviteAccepting],
  );

  const statCards = useMemo(
    () => [
      {
        key: "people",
        label: "People",
        value: statistics.totalPeople,
        icon: <GroupOutlinedIcon sx={{ fontSize: 18 }} />,
        color: theme.palette.primary.main,
      },
      {
        key: "female",
        label: "Women",
        value: statistics.femaleCount,
        icon: <FemaleOutlinedIcon sx={{ fontSize: 18 }} />,
        color: theme.palette.error.main,
      },
      {
        key: "male",
        label: "Men",
        value: statistics.maleCount,
        icon: <MaleOutlinedIcon sx={{ fontSize: 18 }} />,
        color: theme.palette.info.main,
      },
      {
        key: "generations",
        label: "Generations",
        value: statistics.generations,
        icon: <AccountTreeOutlinedIcon sx={{ fontSize: 18 }} />,
        color: theme.palette.success.main,
      },
    ],
    [statistics, theme.palette],
  );

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
      <FamiliesPageHeader
        isMobile={isMobile}
        treeId={treeId}
        treeStatus={treeStatus}
        statusAlerts={statusAlerts}
        canManageInvites={canManageInvites}
        hasStats={nodes.length > 0 && !isLoading}
        statCards={statCards}
        onShareTree={handleShareTree}
        onOpenInviteDialog={handleOpenInviteDialog}
        onSourceChange={onSourceChange}
      />
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
          position: "relative",
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          px: { xs: 0.5, sm: 2, md: 3 },
          py: { xs: 0.5, sm: 1.5 },
        }}
      >
        {isLoading ? (
          <Paper
            elevation={0}
            sx={{
              flex: 1,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              flexDirection: "column",
              gap: 2,
              borderRadius: 4,
              border: "1px solid",
              borderColor: "divider",
              background: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.04)} 0%, ${theme.palette.background.paper} 100%)`,
            }}
          >
            <CircularProgress />
            <Typography variant="body1" sx={{ color: "text.secondary" }}>
              Loading tree...
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Building relationships, permissions, and branch data.
            </Typography>
          </Paper>
        ) : nodes.length > 0 ? (
          <Paper
            elevation={0}
            sx={{
              flex: 1,
              position: "relative",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              borderRadius: { xs: 3, md: 4 },
              border: "1px solid",
              borderColor: "divider",
              backgroundColor: theme.palette.background.paper,
            }}
          >
            {rootId && nodes.find((n) => n.id === rootId) ? (
              <DTreeComponent
                nodes={nodes}
                rootId={rootId}
                canEditTree={canWriteAnyBranch}
                canEditNode={(nodeId) => canEditNode(nodeId)}
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
                highlightedPersonId={highlightedPersonId || undefined}
                onMobileSheetChange={setIsMobileSheetOpen}
                onExternalTreeClick={(tid, pid) => {
                  setExternalTreeConfirm({
                    open: true,
                    targetTreeId: tid,
                    targetPersonId: pid || null,
                  });
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
          </Paper>
        ) : (
          treeId &&
          treeId !== "" && (
            <Paper
              elevation={0}
              sx={{
                maxWidth: 680,
                mx: "auto",
                mt: { xs: 2, sm: 3 },
                px: { xs: 2, sm: 3 },
                py: { xs: 3, sm: 4 },
                textAlign: "center",
                borderRadius: 4,
                border: "1px solid",
                borderColor: "divider",
                background: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${theme.palette.background.paper} 100%)`,
              }}
            >
              <Typography variant="overline" sx={{ color: "text.secondary" }}>
                Empty Tree
              </Typography>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 800 }}>
                Start this family tree with the first person
              </Typography>
              <Typography
                variant="body1"
                sx={{ color: "text.secondary", maxWidth: 520, mx: "auto" }}
              >
                Create the root person first. After that, you can add parents, spouses,
                children, branch invites, and detailed profile information.
              </Typography>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                sx={{
                  mt: 3,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => setShowAddStartingNode(true)}
                  disabled={!canCreateRootNode}
                >
                  Create First Node
                </Button>
                {!canCreateRootNode && (
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Full-tree write access is required to create the root node.
                  </Typography>
                )}
              </Stack>
            </Paper>
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
          setExternalTreeConfirm({
            open: false,
            targetTreeId: null,
            targetPersonId: null,
          })
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
              setExternalTreeConfirm({
                open: false,
                targetTreeId: null,
                targetPersonId: null,
              })
            }
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={async () => {
              const tid = externalTreeConfirm.targetTreeId;
              const pid = externalTreeConfirm.targetPersonId;
              setExternalTreeConfirm({
                open: false,
                targetTreeId: null,
                targetPersonId: null,
              });
              if (tid) {
                try {
                  const tree = await ApiService.getTreeWithDetails(tid);
                  if (tree?.villageId) {
                    setSelectedVillage(tree.villageId);
                  }
                } catch (e) {
                  console.warn("Could not fetch target tree village:", e);
                }
                setTreeId(tid, { personId: pid || undefined });
              }
            }}
          >
            Navigate
          </Button>
        </DialogActions>
      </Dialog>

      <InviteCollaboratorDialog
        open={inviteDialogOpen}
        busy={inviteBusy}
        invitePhone={invitePhone}
        inviteRole={inviteRole}
        inviteScope={inviteScope}
        invitePersonId={invitePersonId}
        invitePersonSearch={invitePersonSearch}
        treeId={treeId}
        selectedBranchPersonName={inviteSelectedPersonName || nodes.find((n) => n.id === invitePersonId)?.name || undefined}
        onClose={() => setInviteDialogOpen(false)}
        onInvitePhoneChange={(value) => {
          const digits = value.replace(/\D/g, "").slice(0, 10);
          setInvitePhone(digits);
        }}
        onInviteRoleChange={setInviteRole}
        onInviteScopeChange={(scope) => {
          setInviteScope(scope);
          if (scope === "branch" && !invitePersonId) {
            const defaultPersonId = selectId || rootId || "";
            const defaultPerson = nodes.find((node) => node.id === defaultPersonId);
            setInvitePersonId(defaultPersonId);
            setInviteSelectedPersonName(defaultPerson?.name || "");
            setInvitePersonSearch(defaultPerson?.name || "");
          }
        }}
        onInvitePersonIdChange={(value) => {
          setInvitePersonId(value);
          if (!value) {
            setInviteSelectedPersonName("");
          }
        }}
        onInvitePersonSearchChange={setInvitePersonSearch}
        onInvitePersonSelect={(person) => {
          setInvitePersonId(person?.id || "");
          setInviteSelectedPersonName(person?.name || "");
          setInvitePersonSearch(person?.name || "");
        }}
        onCreateInvite={handleCreateInvite}
      />

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
          canEditNode={(nodeId) => canEditNode(nodeId)}
          treeId={treeId}
          initialView={nodeDetailsInitialView}
          initialAddInfo={nodeDetailsAddInfo}
        />
      )}
    </Box>
  );
};
