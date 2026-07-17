import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Slide,
  Button,
  Box,
  CircularProgress,
  Stack,
  Alert,
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { TransitionProps } from "@mui/material/transitions";
import { DTreeComponent } from "./DTree/DTreeComponent";
import { TreePersonSearch } from "./FamiliesPage/TreePersonSearch";
import { ApiService, LinkRequest, TreeWriteScope } from "../services/apiService";
import { FNode } from "./model/FNode";
import { namesLooselyMatch } from "../utils/nameMatch";
import { Gender, RelType } from "relatives-tree/lib/types";

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

interface OnboardingTreePreviewDialogProps {
  open: boolean;
  onClose: () => void;
  treeId: string | null;
  treeName: string | null;
  personId: string | null;
  /** The name the user searched with (their profile name) — used to warn when
   * the claimed node's name doesn't match. */
  searchName?: string | null;
  myLinkRequests?: LinkRequest[];
  onRequestCompleted?: (input: {
    requestType: "user_to_tree_node" | "branch_access_request";
    treeId: string;
    personId: string;
    personName?: string;
    treeName?: string;
  }) => Promise<void> | void;
}

export const OnboardingTreePreviewDialog: React.FC<
  OnboardingTreePreviewDialogProps
> = ({
  open,
  onClose,
  treeId,
  treeName,
  personId,
  searchName,
  myLinkRequests = [],
  onRequestCompleted,
}) => {
  const [nodes, setNodes] = useState<FNode[]>([]);
  const [rootId, setRootId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [selectedNode, setSelectedNode] = useState<FNode | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState("");
  const [actionError, setActionError] = useState("");
  const [treeWriteScope, setTreeWriteScope] = useState<TreeWriteScope | null>(null);
  const [linkConfirmOpen, setLinkConfirmOpen] = useState(false);
  // Search focus: `focusPersonId` drives the highlight ring; `expandFocusId` triggers
  // the tree to expand + center on the picked person (collapsed-mode focus). Both
  // start from the claimed `personId` and update when a search result is chosen.
  const [focusPersonId, setFocusPersonId] = useState<string | null>(personId);
  const [expandFocusId, setExpandFocusId] = useState<string | null>(null);

  // Keep the highlight in sync with the claimed person whenever the dialog is
  // (re)opened for a different person.
  useEffect(() => {
    setFocusPersonId(personId);
    setExpandFocusId(null);
  }, [personId, open]);

  const handleSearchSelect = (id: string) => {
    if (!id) return;
    setFocusPersonId(id);
    setExpandFocusId(id);
  };

  // Whether the selected node's name diverges from the name the user searched
  // with — drives the warning vs. plain confirmation modal.
  const linkNameMismatch = selectedNode
    ? !namesLooselyMatch(selectedNode.name, searchName)
    : false;

  useEffect(() => {
    if (!open || !treeId) {
      if (!open) {
        const timer = setTimeout(() => {
          setNodes([]);
          setRootId("");
          setError("");
          setSelectedNode(null);
        }, 500); // Wait for transition
        return () => clearTimeout(timer);
      }
      setTreeWriteScope(null);
      return;
    }

    let active = true;
    setLoading(true);
    setError("");

    ApiService.getCompleteTreeById(treeId)
      .then((treeData) => {
        if (!active) return;
        const rawMembers = treeData.members || [];
        
        // Root selection logic identical to FamiliesPage
        const memberMap = new Map(rawMembers.map((m: any) => [m.id, m]));
        const baseCandidates = rawMembers.filter((m: any) => {
          const isInCurrentTree = m.treeId === treeId;
          const hasNoParents = !m.parents || m.parents.length === 0;
          return isInCurrentTree && hasNoParents;
        });

        const validCandidates = baseCandidates.filter((candidate: any) => {
          const spouses = candidate.spouses || [];
          const isDisqualified = spouses.some((s: any) => {
            const spouseNode = memberMap.get(s.id);
            if (!spouseNode) return false;
            if (spouseNode.treeId === treeId) {
              if (spouseNode.parents && spouseNode.parents.length > 0) {
                return true;
              }
            }
            return false;
          });
          return !isDisqualified;
        });

        const newRootId = validCandidates.length > 0 ? validCandidates[0].id : rawMembers[0]?.id || "";
        setRootId(newRootId);

        const fNodes: FNode[] = rawMembers.map(
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
              bloodGroup: person.bloodGroup || undefined,
              isAlive: person.isAlive !== false,
              deceasedDate: person.deceasedDate || undefined,
            }) as FNode,
        );
        setNodes(fNodes);

        if (personId) {
          const autoSelectNode = fNodes.find((n) => n.id === personId);
          if (autoSelectNode) {
            setSelectedNode(autoSelectNode);
          }
        }
      })
      .catch((err: any) => {
        if (!active) return;
        console.error("Failed to load tree for preview:", err);
        setError("Failed to load family tree preview.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, treeId]);

  useEffect(() => {
    if (!open || !treeId) {
      return;
    }

    let active = true;

    ApiService.getTreeWriteScope(treeId)
      .then((scope) => {
        if (!active) return;
        setTreeWriteScope(scope);
      })
      .catch((err: any) => {
        if (!active) return;
        console.warn("Failed to load tree write scope:", err);
        setTreeWriteScope({ treeId, canWriteAll: false, rootPersonIds: [] });
      });

    return () => {
      active = false;
    };
  }, [open, treeId]);

  const handleNodeClick = (id: string) => {
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    setSelectedNode(node);
    setActionSuccess("");
    setActionError("");
  };

  const handleCreateLinkRequest = async () => {
    if (!treeId || !selectedNode) return;
    setLinkConfirmOpen(false);
    setActionLoading(true);
    setActionError("");
    try {
      await ApiService.createUserNodeLinkRequest({
        targetPersonId: selectedNode.id,
      });
      await onRequestCompleted?.({
        requestType: "user_to_tree_node",
        treeId,
        personId: selectedNode.id,
        personName: selectedNode.name,
        treeName: treeName ?? undefined,
      });
      setActionSuccess(`Successfully sent link request to ${selectedNode.name}.`);
    } catch (err: any) {
      setActionError(err?.message || "Failed to submit link request.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateBranchAccessRequest = async () => {
    if (!treeId || !selectedNode) return;
    setActionLoading(true);
    setActionError("");
    try {
      await ApiService.createBranchAccessRequest({
        targetTreeId: treeId,
        targetPersonId: selectedNode.id,
      });
      await onRequestCompleted?.({
        requestType: "branch_access_request",
        treeId,
        personId: selectedNode.id,
        personName: selectedNode.name,
        treeName: treeName ?? undefined,
      });
      setActionSuccess(
        `Successfully sent branch edit access request for ${selectedNode.name}'s branch.`,
      );
    } catch (err: any) {
      setActionError(err?.message || "Failed to request branch access.");
    } finally {
      setActionLoading(false);
    }
  };

  const isLinkRequested = React.useMemo(() => {
    return myLinkRequests.some(
      (req) =>
        req.requestType === "user_to_tree_node" &&
        req.status === "pending"
    );
  }, [myLinkRequests]);

  const isBranchAccessRequested = React.useMemo(() => {
    if (!selectedNode) return false;
    return myLinkRequests.some(
      (req) =>
        req.targetPersonId === selectedNode.id &&
        req.requestType === "branch_access_request" &&
        req.status === "pending"
    );
  }, [selectedNode, myLinkRequests]);

  const editableNodeIds = React.useMemo(() => {
    if (!treeWriteScope || treeWriteScope.canWriteAll) {
      return new Set(nodes.map((node) => node.id));
    }

    const editable = new Set<string>();
    const nodeMap = new Map(nodes.map((node) => [node.id, node]));
    const queue = [...treeWriteScope.rootPersonIds];

    while (queue.length > 0) {
      const currentId = queue.shift();
      if (!currentId || editable.has(currentId)) continue;

      editable.add(currentId);
      const current = nodeMap.get(currentId);

      (current?.spouses || []).forEach((spouse) => {
        if (spouse?.id) {
          editable.add(spouse.id);
        }
      });

      (current?.children || []).forEach((child) => {
        if (child?.id && !editable.has(child.id)) {
          queue.push(child.id);
        }
      });
    }

    return editable;
  }, [nodes, treeWriteScope]);

  const hasSelectedBranchAccess = React.useMemo(() => {
    if (!selectedNode || !treeWriteScope) return false;
    if (treeWriteScope.canWriteAll) return true;
    return editableNodeIds.has(selectedNode.id);
  }, [editableNodeIds, selectedNode, treeWriteScope]);

  const branchAccessStatusMessage = React.useMemo(() => {
    if (!selectedNode || !hasSelectedBranchAccess) {
      return "";
    }

    if (treeWriteScope?.canWriteAll) {
      return "You already have edit access to this entire tree.";
    }

    return `You already have edit access to ${selectedNode.name}'s branch.`;
  }, [hasSelectedBranchAccess, selectedNode, treeWriteScope?.canWriteAll]);

  // Content for the tree's built-in action sheet (the tree resizes to make room
  // for it). This is the single place the Link / Request-access actions live.
  const renderNodeActionSheet = (
    node: { id: string; name?: string },
    close: () => void,
  ) => {
    const name = selectedNode?.name || node.name || "Family member";
    const dismiss = () => {
      if (actionLoading) return;
      setSelectedNode(null);
      setActionSuccess("");
      setActionError("");
      close();
    };

    return (
      <Box sx={{ maxWidth: 620, mx: "auto" }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          sx={{ mb: 1.75 }}
        >
          <Box sx={{ pr: 1 }}>
            <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.2 }}>
              {name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              Link your profile to this person, or request edit access to their branch.
            </Typography>
          </Box>
          <IconButton onClick={dismiss} disabled={actionLoading} size="small" sx={{ mt: -0.5, mr: -0.5 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>

        {actionSuccess && (
          <Alert severity="success" sx={{ mb: 1.75 }}>
            {actionSuccess}
          </Alert>
        )}
        {actionError && (
          <Alert severity="error" sx={{ mb: 1.75 }}>
            {actionError}
          </Alert>
        )}
        {branchAccessStatusMessage && (
          <Alert severity="success" sx={{ mb: 1.75 }}>
            {branchAccessStatusMessage}
          </Alert>
        )}

        {!actionSuccess && (
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <Tooltip
              title={isLinkRequested ? "You already have a pending link request" : ""}
              placement="top"
              arrow
            >
              <span style={{ display: "block", width: "100%" }}>
                <Button
                  variant="outlined"
                  fullWidth
                  size="large"
                  sx={{ fontWeight: 700, borderRadius: 2, py: 1.1 }}
                  onClick={() => setLinkConfirmOpen(true)}
                  disabled={actionLoading || isLinkRequested}
                >
                  {actionLoading ? "Sending..." : isLinkRequested ? "Link Requested" : "Link my profile"}
                </Button>
              </span>
            </Tooltip>

            <Tooltip
              title={
                hasSelectedBranchAccess
                  ? branchAccessStatusMessage
                  : isBranchAccessRequested
                    ? "You have already requested edit access for this branch"
                    : ""
              }
              placement="top"
              arrow
            >
              <span style={{ display: "block", width: "100%" }}>
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  size="large"
                  disableElevation
                  sx={{ fontWeight: 700, borderRadius: 2, py: 1.1 }}
                  onClick={handleCreateBranchAccessRequest}
                  disabled={actionLoading || isBranchAccessRequested || hasSelectedBranchAccess}
                >
                  {actionLoading
                    ? "Sending..."
                    : hasSelectedBranchAccess
                      ? "Already have access"
                      : isBranchAccessRequested
                        ? "Access Requested"
                        : "Request branch access"}
                </Button>
              </span>
            </Tooltip>
          </Stack>
        )}
      </Box>
    );
  };

  return (
    <>
      <Dialog
        fullScreen
        open={open}
        onClose={onClose}
        TransitionComponent={Transition}
        sx={{ zIndex: 1200 }}
      >
        <AppBar sx={{ position: "relative" }}>
          <Toolbar>
            <IconButton
              edge="start"
              color="inherit"
              onClick={onClose}
              aria-label="close"
            >
              <CloseIcon />
            </IconButton>
            <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
              Preview: {treeName || "Family Tree"}
            </Typography>
          </Toolbar>
        </AppBar>
        {!loading && !error && nodes.length > 0 && (
          <Box
            sx={{
              px: { xs: 1.5, sm: 2 },
              py: { xs: 1, sm: 1.25 },
              borderBottom: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
            }}
          >
            <Box sx={{ width: "100%", maxWidth: { sm: 420 }, mx: { xs: 0, sm: "auto" } }}>
              <TreePersonSearch
                nodes={nodes}
                onSelect={handleSearchSelect}
                placeholder="Search this tree…"
              />
            </Box>
          </Box>
        )}
        <Box sx={{ flex: 1, position: "relative", bgcolor: "background.default", overflow: "hidden" }}>
          {loading && (
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "rgba(255, 255, 255, 0.7)",
                zIndex: 10,
              }}
            >
              <CircularProgress />
            </Box>
          )}

          {error && (
            <Box sx={{ p: 4, textAlign: "center" }}>
              <Typography color="error">{error}</Typography>
            </Box>
          )}

          {!loading && !error && nodes.length > 0 && (
            <Box sx={{ width: "100%", height: "100%" }}>
              <DTreeComponent
                nodes={nodes}
                rootId={rootId}
                initialMainId={personId}
                initialShowFullTree={false}
                highlightedPersonId={focusPersonId || undefined}
                autoExpandNodeId={expandFocusId}
                onAutoExpandHandled={() => setExpandFocusId(null)}
                canEditTree={false}
                currentTreeId={treeId || ""}
                onNodeClick={handleNodeClick}
                allowNameDetailsClick={false}
                alwaysShowNodeSheet
                renderNodeSheet={(node, { close }) =>
                  renderNodeActionSheet(node, close)
                }
              />
            </Box>
          )}
        </Box>
      </Dialog>

      <Dialog
        open={linkConfirmOpen}
        onClose={() => !actionLoading && setLinkConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
        sx={{ zIndex: 1400 }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            color: linkNameMismatch ? "warning.main" : undefined,
          }}
        >
          {linkNameMismatch && <WarningAmberRoundedIcon fontSize="small" />}
          {linkNameMismatch ? "Name doesn't match" : "Confirm profile link"}
        </DialogTitle>
        <DialogContent>
          {linkNameMismatch && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <strong>{selectedNode?.name}</strong> doesn't match the name you
              searched
              {searchName ? (
                <>
                  {" "}
                  (<strong>{searchName}</strong>)
                </>
              ) : null}
              .
            </Alert>
          )}
          <DialogContentText>
            Are you sure <strong>{selectedNode?.name}</strong> is you? We'll send a
            link request to the tree owner for approval.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setLinkConfirmOpen(false)}
            disabled={actionLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateLinkRequest}
            variant="contained"
            color={linkNameMismatch ? "warning" : "primary"}
            disabled={actionLoading}
          >
            {linkNameMismatch ? "Yes, link anyway" : "Yes, this is me"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
