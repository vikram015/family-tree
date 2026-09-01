import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
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
  TextField,
  Tooltip,
  IconButton,
  Snackbar,
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
import PersonAddAltOutlinedIcon from "@mui/icons-material/PersonAddAltOutlined";
import ShareOutlinedIcon from "@mui/icons-material/ShareOutlined";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import { DTreeComponent } from "../DTree/DTreeComponent";
import { NodeDetails } from "../NodeDetails/NodeDetails";
import AddNode from "../AddNode/AddNode";
import { ApiService } from "../../services/apiService";
import { FNode } from "../model/FNode";
import { Gender, RelType } from "relatives-tree/lib/types";
import AddTree from "../AddTree/AddTree";
import TreeSetupWizard from "../TreeSetupWizard/TreeSetupWizard";
import { useAuth } from "../hooks/useAuth";
import { useLocations } from "../hooks/useLocations";
import { useLoginModal } from "../context/LoginModalContext";
import { useNotificationPrompt } from "../context/NotificationPromptContext";
import { useTreeFullscreen } from "../context/TreeFullscreenContext";
import { useSearchParams } from "react-router-dom";
import { FamiliesPageHeader } from "./FamiliesPageHeader";
import type { StatusAlert } from "./FamiliesPageHeader";
import { TimelineView } from "./timeline/TimelineView";
import { InviteCollaboratorDialog } from "./InviteCollaboratorDialog";
import { useTreeWriteAccess } from "./hooks/useTreeWriteAccess";
import { useTreeData } from "./hooks/useTreeData";
import { useLinkRequests } from "./hooks/useLinkRequests";
import { useAppDispatch } from "../../store/hooks";
import { fetchUserOnboarding } from "../../store/slices/userOnboardingSlice";

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
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser, userProfile, loading, hasPermission, isApproved, isAdmin, isSuperAdmin } =
    useAuth();
  const { setSelectedLocation } = useLocations();
  const { openLoginModal } = useLoginModal();
  const { offerNotifications } = useNotificationPrompt();
  const { isFullscreen, toggleFullscreen, exitFullscreen } = useTreeFullscreen();
  const highlightedPersonId = searchParams.get("personId");
  const inviteToken = searchParams.get("inviteToken");
  const shouldCreateRootFromQuery = searchParams.get("createRoot") === "1";
  const shouldRunSetupFromQuery = searchParams.get("setup") === "1";
  const [showSetupWizard, setShowSetupWizard] = useState(false);
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
  const [externalTreeConfirm, setExternalTreeConfirm] = useState<{
    open: boolean;
    targetTreeId: string | null;
    targetPersonId: string | null;
  }>({
    open: false,
    targetTreeId: null,
    targetPersonId: null,
  });
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"tree" | "timeline">("tree");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteRole, setInviteRole] = useState("write");
  const [inviteScope, setInviteScope] = useState<"full" | "branch">("full");
  const [invitePersonId, setInvitePersonId] = useState("");
  const [invitePersonSearch, setInvitePersonSearch] = useState("");
  const [inviteSelectedPersonName, setInviteSelectedPersonName] = useState("");
  // When opened from a node, the branch person is fixed (shown as selected, not searchable).
  const [inviteBranchPersonLocked, setInviteBranchPersonLocked] = useState(false);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteAccepting, setInviteAccepting] = useState(false);
  // Transient feedback for invite actions (replaces native alert()).
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info" | "warning";
  }>({ open: false, message: "", severity: "info" });
  const showSnackbar = useCallback(
    (message: string, severity: "success" | "error" | "info" | "warning" = "info") => {
      setSnackbar({ open: true, message, severity });
    },
    [],
  );
  // Bumped to force a tree-data reload (e.g. after accepting an invite grants access).
  const [treeReloadKey, setTreeReloadKey] = useState(0);
  const [requestingAccess, setRequestingAccess] = useState(false);
  // Tree id for which the view-only banner has been dismissed (re-shows per tree).
  const [accessBannerDismissedFor, setAccessBannerDismissedFor] = useState<string | null>(
    null,
  );
  const [rejectDialog, setRejectDialog] = useState<{
    open: boolean;
    requestId: string | null;
    note: string;
  }>({ open: false, requestId: null, note: "" });
  const [pendingRequestsDialogOpen, setPendingRequestsDialogOpen] = useState(false);
  const acceptedInviteTokenRef = useRef<string | null>(null);
  const inviteLoginPromptedRef = useRef<string | null>(null);

  const resetSelection = useCallback(() => setSelectId(undefined), []);

  // A fresh tree means a fresh access question.
  useEffect(() => {
    setPreviewAccessRequested(false);
    setConnectedFamilyRootId(null);
  }, [treeId]);

  // Fullscreen belongs to this page. Unmounting without leaving it would strip
  // the header off whatever the user navigates to next.
  useEffect(() => exitFullscreen, [exitFullscreen]);

  const {
    nodes,
    rootId,
    isLoading,
    setIsLoading,
    locationId,
    loadTreeData,
    mergeAffectedNodes,
    isPreview,
    requiresSignIn,
  } = useTreeData({ treeId, treeReloadKey, resetSelection });

  // Set when the viewer follows a marriage into a family they cannot access.
  const [previewAccessRequested, setPreviewAccessRequested] = useState(false);
  const [previewAccessBusy, setPreviewAccessBusy] = useState(false);
  // The spouse we followed to get here. Held separately from the URL's personId,
  // which drifts as the user clicks around and is absent after a refresh — and a
  // missing root would silently turn a branch request into a whole-tree one.
  const [connectedFamilyRootId, setConnectedFamilyRootId] = useState<string | null>(null);

  // True only when we actually followed a marriage into this tree. Everything
  // else that lands here — a top-contributor card, a search result, a shared
  // link — is simply a tree the viewer has no access to, and saying "connected
  // family" there would be wrong.
  const arrivedViaMarriage = Boolean(connectedFamilyRootId);

  const {
    treeWriteScope,
    setTreeWriteScope,
    isSuperAdminUser,
    canWriteAnyBranch,
    canCreateRootNode,
    canManageInvites,
    canEditNode,
  } = useTreeWriteAccess({
    treeId,
    currentUser,
    nodes,
    locationId,
    isSuperAdmin,
    hasPermission,
  });

  const {
    pendingLinkRequests,
    myPendingRequests,
    setMyPendingRequests,
    reviewingLinkRequestId,
    linkRequestReviewError,
    linkRequestReviewSuccess,
    handleReviewLinkRequest,
  } = useLinkRequests({ treeId, currentUser });

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
        const acceptedTreeId = result?.treeId || treeId;
        // Accepting an invite completes onboarding server-side. Refresh the
        // status *before* the token leaves the URL: the in-flight fetch holds
        // the onboarding guard off until the completed status lands, so the
        // user stays in the tree instead of being bounced to /onboarding.
        dispatch(fetchUserOnboarding());
        // Always move the user to the tree they were invited to, and drop the
        // one-time invite token from the URL. A branch-scoped invite also
        // focuses the branch root they were granted access to — that node is
        // the whole point of the invite, so opening on it beats dropping them
        // at the top of a tree they may not recognise. Full-tree invites carry
        // no person and keep whatever focus the URL already had.
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          if (acceptedTreeId) {
            next.set("tree", acceptedTreeId);
          }
          if (result?.personId) {
            next.set("personId", result.personId);
          }
          next.delete("inviteToken");
          return next;
        });
        // Re-fetch the tree now that access has been granted (the treeId may be
        // unchanged from the link, so a plain treeId change wouldn't reload it).
        setTreeReloadKey((key) => key + 1);
        showSnackbar("Invite accepted. You now have access to this tree.", "success");
        return ApiService.getTreeWriteScope(acceptedTreeId);
      })
      .then((scope) => {
        if (scope) {
          setTreeWriteScope(scope);
        }
        inviteLoginPromptedRef.current = null;
      })
      .catch((error) => {
        console.error("Failed to accept invite:", error);
        showSnackbar(`Failed to accept invite: ${error instanceof Error ? error.message : String(error)}`, "error");
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
    dispatch,
      setTreeWriteScope,
    showSnackbar,
]);

  useEffect(() => {
    if (!shouldCreateRootFromQuery || isLoading) {
      return;
    }

    if (!treeId || nodes.length > 0 || !canCreateRootNode) {
      return;
    }

    setShowAddStartingNode(true);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("createRoot");
      return next;
    });
  }, [
    canCreateRootNode,
    isLoading,
    nodes.length,
    setSearchParams,
    shouldCreateRootFromQuery,
    treeId,
  ]);

  // A freshly created tree arrives here with ?setup=1 and opens the guided
  // questionnaire instead of a single blank "add a person" form.
  useEffect(() => {
    if (!shouldRunSetupFromQuery || isLoading) {
      return;
    }
    if (!treeId || nodes.length > 0 || !canCreateRootNode) {
      return;
    }

    setShowSetupWizard(true);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("setup");
      return next;
    });
  }, [
    canCreateRootNode,
    isLoading,
    nodes.length,
    setSearchParams,
    shouldRunSetupFromQuery,
    treeId,
  ]);

  const selected = useMemo(
    () => nodes.find((item) => item.id === selectId),
    [nodes, selectId],
  );

  const onUpdate = useCallback(
    async (nodeId: string, updates: Partial<FNode>) => {
      if (!canEditNode(nodeId)) {
        showSnackbar("You don't have permission to edit this person.", "warning");
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
        showSnackbar(
          `Failed to update node: ${
            err instanceof Error ? err.message : String(err)
          }`,
          "error",
        );
      }
    },
    [canEditNode, loadTreeData, showSnackbar],
  );

  const onChangeOtherParent = useCallback(
    async (
      personId: string,
      anchorParentId: string,
      otherParentMode: "existing" | "new" | "unknown",
      otherParentId?: string,
      newSpouse?: {
        name?: string;
        nameHindi?: string;
        gender?: string;
        dob?: string;
      },
    ) => {
      if (!canEditNode(personId)) {
        showSnackbar("You don't have permission to edit this person.", "warning");
        return;
      }

      const result = await ApiService.changeOtherParent(
        personId,
        anchorParentId,
        otherParentMode,
        otherParentId,
        newSpouse,
      );

      if (result && (result as any).success === false) {
        throw new Error(
          (result as any).error || "Failed to change the other parent",
        );
      }

      const affectedNodes = result?.affectedNodes || [];
      if (affectedNodes.length > 0) {
        mergeAffectedNodes(affectedNodes);
      }
    },
    [canEditNode, mergeAffectedNodes, showSnackbar],
  );

  const onDelete = useCallback(
    async (nodeId: string, force: boolean = false) => {
      if (!canEditNode(nodeId)) {
        showSnackbar("You don't have permission to delete this person.", "warning");
        return;
      }

      try {
        const result = await ApiService.deletePerson(nodeId, force);

        // Only leaf nodes are deletable — the server refuses a person with
        // children (or any other blocker) and returns success: false.
        if (result?.success === false) {
          showSnackbar(
            result.error || "This person can't be deleted.",
            "warning",
          );
          return;
        }

        // Refresh tree data but keep current root if valid
        await loadTreeData(true);
        // Clear selection
        setSelectId(undefined);
      } catch (err) {
        console.error("Failed to delete node:", err);
        showSnackbar(
          `Failed to delete node: ${
            err instanceof Error ? err.message : String(err)
          }`,
          "error",
        );
      }
    },
    [canEditNode, loadTreeData, showSnackbar],
  );

  const onAdd = useCallback(
    async (
      node: Partial<FNode>,
      relation: "child" | "spouse" | "parent",
      targetId?: string,
      type?: RelType,
      otherParentId?: string,
      childOptions?: {
        otherParentMode?: "existing" | "new" | "unknown";
        newSpouse?: {
          name?: string;
          nameHindi?: string;
          gender?: string;
          dob?: string;
        };
      },
    ): Promise<string | undefined> => {
      if (targetId && !canEditNode(targetId)) {
        showSnackbar("You don't have permission to add relatives in this branch.", "warning");
        return undefined;
      }

      if (!targetId && !canCreateRootNode) {
        showSnackbar("You don't have permission to create a new root node in this tree.", "warning");
        return undefined;
      }

      // Special handling for linking existing spouse
      if (node.id && relation === "spouse" && targetId) {
        try {
          setIsLoading(true);
          if (isSuperAdminUser) {
            await ApiService.addSpouse(
              targetId,
              node.id,
              node.relationSubtype,
              node.relationStartDate,
              node.relationEndDate,
            );
            await loadTreeData(true);
          } else {
            await ApiService.createSpouseLinkRequest({
              personId1: targetId,
              personId2: node.id,
              relationSubtype: node.relationSubtype || null,
              relationStartDate: node.relationStartDate || null,
              relationEndDate: node.relationEndDate || null,
              requestMessage: `Request to link ${node.name || "selected profile"} as spouse.`,
            });
            window.dispatchEvent(new Event("link-requests-updated"));
            offerNotifications(
              "We'll let you know as soon as your spouse link request is approved or declined.",
            );
            showSnackbar(
              "Spouse link request raised. The other tree owner or a superadmin can approve it.",
              "success",
            );
          }
          return node.id; // Return the linked person ID
        } catch (err) {
          console.error("Failed to link spouse:", err);
          showSnackbar(
            `Failed to link spouse: ${
              err instanceof Error ? err.message : String(err)
            }`,
            "error",
          );
          setIsLoading(false);
          return undefined;
        } finally {
          setIsLoading(false);
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
          // The other parent is now an explicit choice made in AddNode:
          //   - "existing": link to the selected spouse (otherParentId)
          //   - "new": backend creates the spouse from childOptions.newSpouse
          //   - "unknown": no other parent is linked
          relationType = "parent";
          relatedPersonId = targetId;
          relatedPersonId2 =
            childOptions?.otherParentMode === "existing" ? otherParentId : undefined;
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
          const targetNode = nodes.find((n) => n.id === targetId);
          // A person can have at most two parents; block a third (the backend
          // also rejects this — this is a friendlier client-side guard).
          if ((targetNode?.parents?.length ?? 0) >= 2) {
            showSnackbar(
              `${targetNode?.name || "This person"} already has two parents.`,
              "warning",
            );
            return;
          }
          relationType = "parent";
          relatedPersonId = targetId;
          // If the child already has another parent, pass it so the backend
          // can maintain spouse linkage between parents.
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
          coreNode.nameHindi,
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
          relation === "child" ? childOptions?.otherParentMode : undefined,
          relation === "child" ? childOptions?.newSpouse : undefined,
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
        showSnackbar(
          `Failed to add node: ${
            err instanceof Error ? err.message : String(err)
          }`,
          "error",
        );
      }
      return undefined;
    },
    [
      canEditNode,
      canCreateRootNode,
      treeId,
      loadTreeData,
      nodes,
      mergeAffectedNodes,
      isSuperAdminUser,
      showSnackbar,
        offerNotifications,
    setIsLoading,
],
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
      showSnackbar("Native share is not supported on this device/browser.", "warning");
    } catch (err) {
      console.warn("Share cancelled or failed:", err);
    }
  }, [treeId, showSnackbar]);

  const handleOpenInviteDialog = useCallback(() => {
    // Start from a clean form each time so a previously entered number/role/scope
    // is not retained from the last invite.
    setInvitePhone("");
    setInviteRole("write");
    setInviteScope("full");
    setInviteBranchPersonLocked(false);
    if (!currentUser) {
      openLoginModal(() => setInviteDialogOpen(true));
      return;
    }
    if (!canManageInvites) {
      showSnackbar("You need full-tree access to invite collaborators.", "warning");
      return;
    }
    const defaultPersonId = selectId || rootId || "";
    const defaultPerson = nodes.find((node) => node.id === defaultPersonId);
    setInvitePersonId(defaultPersonId);
    setInviteSelectedPersonName(defaultPerson?.name || "");
    setInvitePersonSearch(defaultPerson?.name || "");
    setInviteDialogOpen(true);
  }, [currentUser, openLoginModal, canManageInvites, selectId, rootId, nodes, showSnackbar]);

  // Open the invite dialog scoped to a specific person's branch (from node details).
  const handleInviteForNode = useCallback(
    (personId: string) => {
      const openForNode = () => {
        if (!canEditNode(personId)) {
          showSnackbar("You don't have access to invite collaborators for this branch.", "warning");
          return;
        }
        setInvitePhone("");
        setInviteRole("write");
        setInviteScope("branch");
        setInvitePersonId(personId);
        const person = nodes.find((n) => n.id === personId);
        setInviteSelectedPersonName(person?.name || "");
        setInvitePersonSearch(person?.name || "");
        setInviteBranchPersonLocked(true);
        setInviteDialogOpen(true);
      };
      if (!currentUser) {
        openLoginModal(openForNode);
        return;
      }
      openForNode();
    },
    [currentUser, openLoginModal, canEditNode, nodes, showSnackbar],
  );

  const handleCreateInvite = useCallback(async () => {
    if (!treeId) return;
    if (!canManageInvites) {
      showSnackbar("You need full-tree access to invite collaborators.", "warning");
      return;
    }

    const selectedBranchId = invitePersonId || null;
    const personId = inviteScope === "branch" ? selectedBranchId : null;
    if (inviteScope === "branch" && !personId) {
      showSnackbar("Select a person in the tree to invite for branch access.", "warning");
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

      // If the invitee already had an account, the backend grants access immediately
      // (no link to share).
      if (invite.granted) {
        const grantedName = invite.user?.name || "The user";
        showSnackbar(`${grantedName} already has an account and now has access to this tree.`, "success");
        setInviteDialogOpen(false);
        setInvitePhone("");
        setInviteRole("write");
        setInviteScope("full");
        setInvitePersonId("");
        setInvitePersonSearch("");
        setInviteSelectedPersonName("");
        return;
      }

      // Always build the link on the CURRENT browser domain (the backend's
      // inviteLink is generated with a hard-coded host). Keep the backend link's
      // path + query (which carries the token) but swap in this origin.
      const inviteOrigin = window.location.origin;
      const fallbackLink = `${inviteOrigin}/families?tree=${treeId}&inviteToken=${invite.inviteToken || ""}`;
      let shareLink = fallbackLink;
      if (invite.inviteLink) {
        try {
          const parsed = new URL(invite.inviteLink);
          shareLink = `${inviteOrigin}${parsed.pathname}${parsed.search}${parsed.hash}`;
        } catch {
          shareLink = fallbackLink;
        }
      }
      // Only worth offering on the link path: an instant grant has no pending
      // outcome for the inviter to be told about.
      offerNotifications(
        "We'll let you know as soon as your invite is accepted.",
      );
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
        showSnackbar("Invite link copied to clipboard. Share it via SMS/WhatsApp.", "success");
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
      showSnackbar(`Failed to create invite: ${error instanceof Error ? error.message : String(error)}`, "error");
    } finally {
      setInviteBusy(false);
    }
  }, [treeId, canManageInvites, invitePersonId, inviteScope, inviteRole, invitePhone, nodes, showSnackbar, offerNotifications]);

  const handleConfirmRejectRequest = useCallback(async () => {
    const note = rejectDialog.note.trim();
    const requestId = rejectDialog.requestId;
    if (!requestId || !note) return;
    setRejectDialog({ open: false, requestId: null, note: "" });
    await handleReviewLinkRequest(requestId, "rejected", note);
  }, [rejectDialog, handleReviewLinkRequest]);

  // Focus a person from the header search. Sets the `personId` query param, which
  // drives the tree to highlight + center on that node (and the timeline to scroll
  // to it). This is a navigation action — it does not open the details panel.
  const handleSearchSelect = useCallback(
    (personId: string) => {
      if (!personId) return;
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("personId", personId);
          return next;
        },
        { replace: true },
      );
      setAutoExpandNodeId(personId);
    },
    [setSearchParams],
  );

  // A pending full-tree access request for the current tree (target person is null),
  // used to switch the "Request edit access" button into a pending state.
  const pendingFullTreeAccessRequest = useMemo(
    () =>
      myPendingRequests.find(
        (request) =>
          request.requestType === "branch_access_request" &&
          request.targetTreeId === treeId &&
          !request.targetPersonId,
      ),
    [myPendingRequests, treeId],
  );

  // Any pending branch-access request against this tree means the ask is already
  // in flight — branch-rooted or whole-family. Matching on the tree alone is
  // deliberate: the backend rejects a second request either way, so offering the
  // button again can only produce an error.
  const pendingConnectedFamilyRequest = useMemo(
    () =>
      myPendingRequests.find(
        (request) =>
          request.requestType === "branch_access_request" &&
          request.targetTreeId === treeId,
      ),
    [myPendingRequests, treeId],
  );

  const handleRequestAccess = useCallback(async () => {
    if (!currentUser) {
      openLoginModal();
      return;
    }
    if (!treeId) return;

    try {
      setRequestingAccess(true);
      await ApiService.createBranchAccessRequest({
        targetTreeId: treeId,
        targetPersonId: null,
        requestMessage: "Requesting edit access to this tree.",
      });
      // Refresh so the button flips to its pending state and the status banner appears.
      const rows = await ApiService.getMyLinkRequests();
      setMyPendingRequests((rows || []).filter((request) => request.status === "pending"));
      window.dispatchEvent(new Event("link-requests-updated"));
      offerNotifications(
        "We'll let you know as soon as your access request is reviewed.",
      );
      showSnackbar(
        "Access request sent. A tree admin or super admin can approve it.",
        "success",
      );
    } catch (error) {
      showSnackbar(
        `Failed to request access: ${error instanceof Error ? error.message : String(error)}`,
        "error",
      );
    } finally {
      setRequestingAccess(false);
    }
  }, [currentUser, treeId, openLoginModal, showSnackbar, offerNotifications, setMyPendingRequests]);

  /**
   * Ask for access to a family reached through a marriage link. Rooted at the
   * spouse we followed when we know who that was, so the owner is approving a
   * branch rather than their whole tree.
   */
  const handleRequestPreviewAccess = useCallback(async () => {
    if (!currentUser) {
      openLoginModal();
      return;
    }
    if (!treeId) return;

    // Branch root, in order of reliability: the spouse we actually followed,
    // then whoever the URL is focused on. If neither exists this is unavoidably
    // a whole-family request, and the button below says so rather than escalating
    // the scope silently.
    const branchRootId = connectedFamilyRootId || highlightedPersonId || null;

    try {
      setPreviewAccessBusy(true);
      await ApiService.createBranchAccessRequest({
        targetTreeId: treeId,
        targetPersonId: branchRootId,
        requestMessage: branchRootId
          ? "Requesting access to this branch after following a marriage link."
          : "Requesting access to this family after following a marriage link.",
      });
      setPreviewAccessRequested(true);
      const rows = await ApiService.getMyLinkRequests();
      setMyPendingRequests((rows || []).filter((request) => request.status === "pending"));
      window.dispatchEvent(new Event("link-requests-updated"));
      offerNotifications(
        "We'll let you know as soon as your access request is reviewed.",
      );
      showSnackbar("Access request sent to this family's admin.", "success");
    } catch (error) {
      showSnackbar(
        `Failed to request access: ${error instanceof Error ? error.message : String(error)}`,
        "error",
      );
    } finally {
      setPreviewAccessBusy(false);
    }
  }, [
    currentUser,
    treeId,
    connectedFamilyRootId,
    highlightedPersonId,
    openLoginModal,
    showSnackbar,
    offerNotifications,
    setMyPendingRequests,
  ]);

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
        showSnackbar("You don't have permission to edit this person.", "warning");
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
    [canEditNode, currentUser, openLoginModal, showSnackbar],
  );

  // Handler for placeholder "add relative" nodes in the tree
  const handleAddRelative = useCallback(
    (
      nodeId: string,
      relType: "father" | "mother" | "spouse" | "son" | "daughter",
    ) => {
      if (!canEditNode(nodeId)) {
        showSnackbar("You don't have permission to add relatives in this branch.", "warning");
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
    [canEditNode, currentUser, openLoginModal, showSnackbar],
  );

  // Calculate tree statistics
  const statistics = useMemo(() => {
    const totalPeople = nodes.length;
    const maleCount = nodes.filter((n) => n.gender === Gender.male).length;
    const femaleCount = nodes.filter((n) => n.gender === Gender.female).length;
    // `hierarchy` is the male-line ancestor chain (root → the node's parent), so its
    // length is the node's depth. The generation count is the deepest chain + 1 (to
    // include the root's own generation). Using max depth — not the count of distinct
    // depths — keeps it correct when a depth level happens to be unpopulated.
    let maxDepth = 0;
    nodes.forEach((node) => {
      const depth = node.hierarchy?.length ?? 0;
      if (depth > maxDepth) maxDepth = depth;
    });

    const generations = totalPeople > 0 ? maxDepth + 1 : 1;

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
        // Only requests about the tree currently on screen.
        //
        // This strip sits in a tree's header, so a pending request against some
        // other family reads as a statement about THIS one — and next to the
        // no-access banner it looks like a contradiction. Requests elsewhere are
        // not lost: they live on /requests and drive the avatar's badge.
        //
        // The second filter drops the request the connected-family banner is
        // already reporting, so the two never stack.
        ...myPendingRequests
          .filter(
            (request) =>
              request.targetTreeId === treeId &&
              !(isPreview && request.id === pendingConnectedFamilyRequest?.id),
          )
          .map((request) => ({
          key: `my-pending-request-${request.id}`,
          severity: "info" as const,
          text:
            request.requestType === "branch_access_request"
              ? `Your branch access request for ${request.targetPersonName || "the selected branch"} in ${request.targetTreeName || "this tree"} is pending review.`
              : request.requestType === "spouse_link_request"
                ? `Your spouse link request for ${request.targetPersonName || "the selected profile"} in ${request.targetTreeName || "the other tree"} is pending review.`
              : `Your profile link request for ${request.targetPersonName || "the selected profile"} in ${request.targetTreeName || "this tree"} is pending review.`,
        })),
        isAdmin() && !isApproved
          ? {
              key: "pending-approval",
              severity: "info" as const,
              text: "Your account is pending approval. You can view trees but cannot make changes until a Super Admin approves your account.",
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
    [
      isAdmin,
      isApproved,
      inviteAccepting,
      myPendingRequests,
      treeId,
      isPreview,
      pendingConnectedFamilyRequest?.id,
    ],
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
      {!isFullscreen && (
      <FamiliesPageHeader
        isMobile={isMobile}
        treeId={treeId}
        treeStatus={treeStatus}
        statusAlerts={statusAlerts}
        hasStats={nodes.length > 0 && !isLoading}
        statCards={statCards}
        onSourceChange={onSourceChange}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        nodes={nodes}
        onSearchSelect={handleSearchSelect}
        pendingRequestsCount={pendingLinkRequests.length}
        onPendingRequestsClick={() => setPendingRequestsDialogOpen(true)}
      />
      )}
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
              // Every new tree starts empty, so run the same guided setup the
              // onboarding flow uses rather than dropping the user on a blank canvas.
              setShowSetupWizard(true);
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
          // No padding: the tree canvas below is full-bleed. Siblings that
          // shouldn't touch the viewport edge carry their own margins.
          px: 0,
          py: 0,
        }}
      >
        {isPreview && (
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{
              mt: { xs: 1, sm: 1.5 },
              mb: 1.5,
              mx: { xs: 1, sm: 2, md: 3 },
              px: 1.5,
              py: 0.75,
              borderRadius: 2,
              border: "1px solid",
              borderColor: "warning.light",
              backgroundColor: alpha(theme.palette.warning.light, 0.12),
            }}
          >
            <LockOutlinedIcon sx={{ fontSize: 18, color: "warning.main", flexShrink: 0 }} />
            <Typography
              variant="body2"
              sx={{ color: "text.secondary", minWidth: 0, flex: 1 }}
            >
              {previewAccessRequested || pendingConnectedFamilyRequest
                ? `${arrivedViaMarriage ? "You're viewing a connected family." : "You don't have access to this family tree yet."} Your access request is waiting for its admin to review it.`
                : `${arrivedViaMarriage ? "You're viewing a connected family." : "You don't have access to this family tree."} Names and relationships are shown; personal details are hidden until you're given access.`}
            </Typography>
            <Button
              size="small"
              variant="outlined"
              color="warning"
              disabled={
                previewAccessBusy ||
                previewAccessRequested ||
                Boolean(pendingConnectedFamilyRequest)
              }
              onClick={() => void handleRequestPreviewAccess()}
              sx={{ flexShrink: 0, whiteSpace: "nowrap", textTransform: "none" }}
            >
              {!currentUser
                ? "Sign in to request"
                : previewAccessRequested || pendingConnectedFamilyRequest
                  ? "Request pending"
                  : previewAccessBusy
                    ? "Sending…"
                    : connectedFamilyRootId || highlightedPersonId
                      ? "Request access to this branch"
                      : "Request access to this family"}
            </Button>
          </Stack>
        )}
        {/* The connected-family banner above already says this, and says more, so
            the two must never stack. */}
        {treeId &&
          !isPreview &&
          !canWriteAnyBranch &&
          !(isAdmin() && !isApproved) &&
          !pendingFullTreeAccessRequest &&
          accessBannerDismissedFor !== treeId && (
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{
                mt: { xs: 1, sm: 1.5 },
                mb: 1.5,
                mx: { xs: 1, sm: 2, md: 3 },
                px: 1.5,
                py: 0.5,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "info.light",
                backgroundColor: alpha(theme.palette.info.light, 0.08),
              }}
            >
              <LockOutlinedIcon sx={{ fontSize: 18, color: "info.main", flexShrink: 0 }} />
              <Typography
                variant="body2"
                sx={{ color: "text.secondary", minWidth: 0, flex: 1 }}
                noWrap
              >
                View-only access
              </Typography>
              <Button
                size="small"
                variant="text"
                color="info"
                disabled={requestingAccess}
                onClick={() => void handleRequestAccess()}
                sx={{ flexShrink: 0, whiteSpace: "nowrap", textTransform: "none" }}
              >
                {!currentUser
                  ? "Sign in to request"
                  : requestingAccess
                    ? "Sending…"
                    : "Request edit access"}
              </Button>
              <IconButton
                size="small"
                aria-label="Dismiss"
                onClick={() => setAccessBannerDismissedFor(treeId)}
                sx={{ flexShrink: 0 }}
              >
                <CloseOutlinedIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Stack>
          )}
        {requiresSignIn ? (
          <Paper
            elevation={0}
            sx={{
              maxWidth: 520,
              mx: "auto",
              mt: { xs: 4, sm: 6 },
              px: { xs: 2.5, sm: 4 },
              py: { xs: 3.5, sm: 4.5 },
              textAlign: "center",
              borderRadius: 4,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <LockOutlinedIcon sx={{ fontSize: 32, color: "text.secondary", mb: 1.5 }} />
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
              Sign in to view family trees
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>
              Family trees are shared with the people in them, so we need to know
              who you are before showing one.
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={() => openLoginModal()}
              sx={{ minHeight: 44, fontWeight: 700 }}
            >
              Sign in
            </Button>
          </Paper>
        ) : isLoading ? (
          <Paper
            elevation={0}
            sx={{
              flex: 1,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              flexDirection: "column",
              gap: 2,
              borderRadius: 0,
              border: "none",
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
              // Square and unframed — a rounded, bordered card around an
              // infinite pannable canvas only ate space and drew a box around
              // something that has no edges.
              borderRadius: 0,
              border: "none",
              backgroundColor: theme.palette.background.paper,
            }}
          >
            <Stack
              direction="row"
              spacing={1}
              sx={{
                position: "absolute",
                left: { xs: 12, sm: 16 },
                bottom: { xs: 12, sm: 16 },
                zIndex: 2,
              }}
            >
              {canManageInvites && (
                <Tooltip title="Invite collaborator">
                  <span>
                    <IconButton
                      aria-label="Invite collaborator"
                      onClick={handleOpenInviteDialog}
                      disabled={!treeId}
                      size={isMobile ? "small" : "medium"}
                      sx={{
                        border: "1px solid",
                        borderColor: "divider",
                        backgroundColor: alpha(theme.palette.background.paper, 0.92),
                        boxShadow: theme.shadows[2],
                        opacity: { xs: 1, sm: 0.62 },
                        transition: "opacity 0.2s ease, background-color 0.2s ease",
                        "&:hover": {
                          opacity: 1,
                          backgroundColor: alpha(theme.palette.background.paper, 1),
                        },
                      }}
                    >
                      <PersonAddAltOutlinedIcon
                        fontSize={isMobile ? "small" : "medium"}
                      />
                    </IconButton>
                  </span>
                </Tooltip>
              )}
              <Tooltip title="Share tree">
                <span>
                  <IconButton
                    aria-label="Share tree"
                    onClick={handleShareTree}
                    disabled={!treeId}
                    size={isMobile ? "small" : "medium"}
                    sx={{
                      border: "1px solid",
                      borderColor: "divider",
                      backgroundColor: alpha(theme.palette.background.paper, 0.92),
                      boxShadow: theme.shadows[2],
                      opacity: { xs: 1, sm: 0.62 },
                      transition: "opacity 0.2s ease, background-color 0.2s ease",
                      "&:hover": {
                        opacity: 1,
                        backgroundColor: alpha(theme.palette.background.paper, 1),
                      },
                    }}
                  >
                    <ShareOutlinedIcon fontSize={isMobile ? "small" : "medium"} />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
            {viewMode === "timeline" ? (
              <TimelineView
                nodes={nodes}
                currentTreeId={treeId}
                youPersonId={userProfile?.peopleId}
                focusPersonId={highlightedPersonId || selectId || userProfile?.peopleId}
                onViewDetails={handleViewDetails}
              />
            ) : rootId && nodes.find((n) => n.id === rootId) ? (
              (() => {
                const initialFocusId = highlightedPersonId || userProfile?.peopleId;
                const isInitialFocusInTree = Boolean(initialFocusId && nodes.find((n) => n.id === initialFocusId));

                return (
                  <DTreeComponent
                    nodes={nodes}
                    rootId={rootId}
                    canEditTree={canWriteAnyBranch}
                    canEditNode={canEditNode}
                    autoExpandNodeId={autoExpandNodeId}
                    onAutoExpandHandled={() => setAutoExpandNodeId(null)}
                    onNodeClick={() => {}}
                    onEditNode={handleEditNode}
                    onDelete={onDelete}
                    onAddRelative={handleAddRelative}
                    onViewDetails={handleViewDetails}
                    currentTreeId={treeId}
                    highlightedPersonId={highlightedPersonId || undefined}
                    onMobileSheetChange={setIsMobileSheetOpen}
                    isFullscreen={isFullscreen}
                    onToggleFullscreen={toggleFullscreen}
                    initialMainId={isInitialFocusInTree ? initialFocusId : null}
                    initialShowFullTree={!isInitialFocusInTree}
                    onExternalTreeClick={(tid, pid) => {
                      setExternalTreeConfirm({
                        open: true,
                        targetTreeId: tid,
                        targetPersonId: pid || null,
                      });
                    }}
                  />
                );
              })()
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
                Let's build your family tree together
              </Typography>
              <Typography
                variant="body1"
                sx={{ color: "text.secondary", maxWidth: 520, mx: "auto" }}
              >
                We'll ask a few short questions — your parents, your grandparents,
                your family — and save each answer as you go. It takes a couple of
                minutes, and you can stop at any point.
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
                  onClick={() => setShowSetupWizard(true)}
                  disabled={!canCreateRootNode}
                >
                  Start guided setup
                </Button>
                <Button
                  variant="text"
                  size="large"
                  onClick={() => setShowAddStartingNode(true)}
                  disabled={!canCreateRootNode}
                >
                  Just add one person
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
      <TreeSetupWizard
        open={showSetupWizard}
        treeId={treeId || ""}
        defaultSelfName={
          (userProfile as any)?.displayName || (userProfile as any)?.name || ""
        }
        defaultSelfGender={(userProfile as any)?.gender || ""}
        onClose={() => setShowSetupWizard(false)}
        onComplete={(createdAnyone) => {
          setShowSetupWizard(false);
          if (createdAnyone) {
            setTreeReloadKey((key) => key + 1);
          }
        }}
      />

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

      {/* Reject link request — capture a reason before rejecting */}
      <Dialog
        open={pendingRequestsDialogOpen}
        onClose={() => setPendingRequestsDialogOpen(false)}
        fullScreen={isMobile}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle
          sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
        >
          Pending link requests
          <IconButton
            size="small"
            aria-label="Close"
            onClick={() => setPendingRequestsDialogOpen(false)}
          >
            <CloseOutlinedIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: { xs: 1.5, sm: 2 } }}>
          <Stack spacing={1.5}>
            {linkRequestReviewError && (
              <Alert severity="error">{linkRequestReviewError}</Alert>
            )}
            {linkRequestReviewSuccess && (
              <Alert severity="success">{linkRequestReviewSuccess}</Alert>
            )}
            {pendingLinkRequests.length === 0 ? (
              <Typography
                variant="body2"
                sx={{ color: "text.secondary", textAlign: "center", py: 3 }}
              >
                No pending requests left to review.
              </Typography>
            ) : (
              pendingLinkRequests.map((request) => (
                <Paper
                  key={request.id}
                  variant="outlined"
                  sx={{
                    p: { xs: 1.25, sm: 1.5 },
                    borderRadius: 3,
                  }}
                >
                  <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={1.5}
                    justifyContent="space-between"
                    alignItems={{ xs: "stretch", md: "center" }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {request.requesterName || request.requesterEmail || "Unknown requester"}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "text.secondary" }}>
                        {request.requestType === "spouse_link_request"
                          ? `Wants to link spouse ${request.payload?.sourcePersonName || "from another branch"} to ${request.targetPersonName || "selected profile"}`
                          : request.requestType === "branch_access_request"
                            ? request.targetPersonName
                              ? `Wants branch access for ${request.targetPersonName}`
                              : "Wants edit access to the whole tree"
                            : `Wants to link to ${request.targetPersonName || "selected profile"}`}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5 }}>
                        Requested {new Date(request.createdAt).toLocaleString()}
                      </Typography>
                    </Box>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1}
                      sx={{ flexShrink: 0 }}
                    >
                      <Button
                        variant="contained"
                        color="success"
                        disabled={reviewingLinkRequestId === request.id}
                        onClick={() => void handleReviewLinkRequest(request.id, "approved")}
                      >
                        {reviewingLinkRequestId === request.id ? "Saving..." : "Approve"}
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        disabled={reviewingLinkRequestId === request.id}
                        onClick={() =>
                          setRejectDialog({
                            open: true,
                            requestId: request.id,
                            note: "",
                          })
                        }
                      >
                        Reject
                      </Button>
                    </Stack>
                  </Stack>
                </Paper>
              ))
            )}
          </Stack>
        </DialogContent>
      </Dialog>

      <Dialog
        open={rejectDialog.open}
        onClose={() => setRejectDialog({ open: false, requestId: null, note: "" })}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Reject request</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Let the requester know why this request is being rejected.
          </DialogContentText>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={2}
            label="Reason for rejection"
            value={rejectDialog.note}
            onChange={(e) =>
              setRejectDialog((prev) => ({ ...prev, note: e.target.value }))
            }
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setRejectDialog({ open: false, requestId: null, note: "" })}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={
              !rejectDialog.note.trim() ||
              reviewingLinkRequestId === rejectDialog.requestId
            }
            onClick={() => void handleConfirmRejectRequest()}
          >
            Reject
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
                  if (tree?.locationId) {
                    setSelectedLocation(tree.locationId);
                  }
                } catch (e) {
                  console.warn("Could not fetch target tree location:", e);
                }
                setConnectedFamilyRootId(pid || null);
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
        lockBranchPerson={inviteBranchPersonLocked}
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
          onChangeOtherParent={onChangeOtherParent}
          onDelete={onDelete}
          canEditNode={canEditNode}
          treeId={treeId}
          onInviteCollaborator={handleInviteForNode}
          initialView={nodeDetailsInitialView}
          initialAddInfo={nodeDetailsAddInfo}
        />
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
