import React, { memo, useCallback, useState, useEffect, useMemo, Suspense } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Divider,
  Typography,
  IconButton,
  Tooltip,
  TextField,
  Button,
  CircularProgress,
  FormControl,
  Stack,
  useTheme,
  useMediaQuery,
  AppBar,
  Toolbar,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  Paper,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  InputAdornment,
  FormControlLabel,
  Alert,
  Snackbar,
  Radio,
  RadioGroup,
  FormLabel,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import dayjs, { Dayjs } from "dayjs";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import LinkIcon from "@mui/icons-material/Link";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import CakeOutlinedIcon from "@mui/icons-material/CakeOutlined";
import FavoriteBorderOutlinedIcon from "@mui/icons-material/FavoriteBorderOutlined";
import BloodtypeOutlinedIcon from "@mui/icons-material/BloodtypeOutlined";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MaleOutlinedIcon from "@mui/icons-material/MaleOutlined";
import FemaleOutlinedIcon from "@mui/icons-material/FemaleOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import { RelType, Gender } from "relatives-tree/lib/types";
import AddNode from "../AddNode/AddNode";
import { FNode } from "../model/FNode";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import WorkOutlineOutlinedIcon from "@mui/icons-material/WorkOutlineOutlined";
import PersonAddAlt1OutlinedIcon from "@mui/icons-material/PersonAddAlt1Outlined";
import ShareOutlinedIcon from "@mui/icons-material/ShareOutlined";
import LockOpenOutlinedIcon from "@mui/icons-material/LockOpenOutlined";
import HowToRegOutlinedIcon from "@mui/icons-material/HowToRegOutlined";
import HourglassTopOutlinedIcon from "@mui/icons-material/HourglassTopOutlined";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { Relations } from "./Relations";
import { AdditionalDetails } from "../AdditionalDetails/AdditionalDetails";
import { BusinessFormDialog } from "../Business/BusinessFormDialog";
import { ProfessionFormDialog } from "../Profession/ProfessionFormDialog";
import { businessCategoryLabel } from "../Business/businessCategories";
import { phoneFromCustomFields } from "../Business/businessContact";
import { HindiNameInput } from "../HindiNameInput/HindiNameInput";
import { useAuth } from "../hooks/useAuth";
import { useLoginModal } from "../context/LoginModalContext";
import { useNotificationPrompt } from "../context/NotificationPromptContext";
import { ApiService, LocationCombinationOption, LinkRequest } from "../../services/apiService";
import { namesLooselyMatch } from "../../utils/nameMatch";
import { LocationPicker } from "../LocationPicker/LocationPicker";
import { PersonSearchField } from "../BusinessPage/PersonSearchField";
import { brand } from "../../theme/brand";
const DatePicker = React.lazy(() =>
  import("@mui/x-date-pickers/DatePicker").then((m) => ({
    default: m.DatePicker,
  })),
);

const ImageCropper = React.lazy(() => import("../ImageCropper/ImageCropper"));

const BLOOD_GROUP_OPTIONS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const GENDER_OPTIONS = [
  { value: Gender.male, label: "Male", icon: <MaleOutlinedIcon sx={{ fontSize: 18 }} /> },
  { value: Gender.female, label: "Female", icon: <FemaleOutlinedIcon sx={{ fontSize: 18 }} /> },
  { value: "other" as Gender, label: "Other", icon: <PersonOutlineOutlinedIcon sx={{ fontSize: 18 }} /> },
] as const;

const inputWithIconSx = {
  "& .MuiInputAdornment-root": {
    color: "text.secondary",
  },
  "& .MuiOutlinedInput-root": {
    borderRadius: 2,
  },
} as const;

const adornment = (icon: React.ReactNode) => (
  <InputAdornment position="start">{icon}</InputAdornment>
);

function titleCaseRelationType(value: string) {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

interface NodeDetailsProps {
  node: Readonly<FNode> | null;
  nodes: Readonly<FNode>[];
  className?: string; // Kept for compatibility but unused
  onSelect: (nodeId: string | undefined) => void;
  onAdd?: (
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
  ) => Promise<string | undefined> | Promise<void> | void;
  onUpdate?: (nodeId: string, updates: Partial<FNode>) => void;
  onChangeOtherParent?: (
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
  ) => Promise<void> | void;
  onDelete?: (nodeId: string) => void;
  canEditNode?: (nodeId: string) => boolean;
  treeId?: string;
  /** Open the invite-collaborator dialog scoped to this person's branch. */
  onInviteCollaborator?: (personId: string) => void;
  /** Open directly in a specific view (e.g. "add" when clicking a placeholder) */
  initialView?: "details" | "edit" | "add";
  /** Pre-selected relation info when opening in "add" view from a placeholder */
  initialAddInfo?: {
    relation: "child" | "spouse" | "parent";
    gender?: string;
  };
}

export const NodeDetails = memo(function NodeDetails({
  node,
  nodes,
  className,
  initialView,
  initialAddInfo,
  ...props
}: NodeDetailsProps) {
  const {
    onSelect,
    onAdd,
    onUpdate,
    onChangeOtherParent,
    onDelete,
    canEditNode,
    treeId,
    onInviteCollaborator,
  } = props;
  const formatDisplayDate = (value?: string) => {
    if (!value) return "";
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed.format("DD/MM/YYYY") : value;
  };
  const formatDisplayDateTime = (value?: string) => {
    if (!value) return "";
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed.format("DD/MM/YYYY hh:mm A") : value;
  };
  const createdByLabel =
    node?.createdByName?.trim() || node?.createdBy?.trim() || "";
  const parsePickerValue = useCallback((value?: string) => {
    if (!value) return null;
    const parsed = dayjs(value);
    return parsed;
  }, []);
  const formatPickerDate = useCallback((value: Dayjs | null) => {
    if (!value || !value.isValid()) return undefined;
    return value.format("YYYY-MM-DD");
  }, []);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [view, setView] = useState<
    "details" | "edit" | "add" | "delete" | "link-external"
  >(initialView || "details");

  // Link External State
  const [locations, setLocations] = useState<any[]>([]);
  const [linkExternalLocationId, setLinkExternalLocationId] = useState("");
  const [linkExternalLocationOption, setLinkExternalLocationOption] =
    useState<LocationCombinationOption | null>(null);
  const [selectedExternalPerson, setSelectedExternalPerson] =
    useState<any>(null);
  const [externalSearchValue, setExternalSearchValue] = useState("");
  const [linkExternalRelationSubtype, setLinkExternalRelationSubtype] =
    useState<RelType>(RelType.married);
  const [linkExternalStartDate, setLinkExternalStartDate] = useState<Dayjs | null>(
    null,
  );
  const [linkExternalEndDate, setLinkExternalEndDate] = useState<Dayjs | null>(
    null,
  );
  const [linkExternalSubmitting, setLinkExternalSubmitting] = useState(false);
  // Full profile of the selected external person, used to warn about an
  // existing spouse and to render the before/after replacement preview.
  const [externalPersonDetails, setExternalPersonDetails] = useState<any>(null);
  const [loadingExternalDetails, setLoadingExternalDetails] = useState(false);
  // When the selected person already has spouse(s): decide whether this is a
  // separate/additional marriage ("new") or the same person as the tree-A
  // spouse to be merged ("merge", picking which existing spouse via mergeSpouseId).
  const [linkMode, setLinkMode] = useState<"" | "new" | "merge">("");
  const [mergeSpouseId, setMergeSpouseId] = useState("");
  const [linkExternalConfirmOpen, setLinkExternalConfirmOpen] = useState(false);
  // Transient feedback (replaces native alert()).
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
  const [editSpouseDatesOpen, setEditSpouseDatesOpen] = useState(false);
  const [editSpouseId, setEditSpouseId] = useState("");
  const [editSpouseRelationSubtype, setEditSpouseRelationSubtype] =
    useState<RelType>(RelType.married);
  const [editSpouseStartDate, setEditSpouseStartDate] = useState<Dayjs | null>(
    null,
  );
  const [editSpouseEndDate, setEditSpouseEndDate] = useState<Dayjs | null>(null);
  const [isSavingSpouseDates, setIsSavingSpouseDates] = useState(false);

  // Edit State
  const [editedName, setEditedName] = useState("");
  const [editedNameHindi, setEditedNameHindi] = useState("");
  const [editedDob, setEditedDob] = useState<Dayjs | null>(null);
  const [editedGender, setEditedGender] = useState<Gender>(Gender.male);
  const [editedCustomFields, setEditedCustomFields] = useState<
    Record<string, string>
  >({});

  // New fields state
  const [editedBloodGroup, setEditedBloodGroup] = useState("");
  const [editedIsAlive, setEditedIsAlive] = useState(true);
  const [editedDeceasedDate, setEditedDeceasedDate] = useState<Dayjs | null>(null);

  // Other-parent edit state
  const [editOtherParentMode, setEditOtherParentMode] = useState<
    "existing" | "new" | "unknown"
  >("unknown");
  const [editSelectedOtherParentId, setEditSelectedOtherParentId] = useState("");
  const [editNewOtherParentName, setEditNewOtherParentName] = useState("");
  const [editNewOtherParentNameHindi, setEditNewOtherParentNameHindi] = useState("");
  const [editNewOtherParentGender, setEditNewOtherParentGender] = useState<
    "male" | "female" | "other" | ""
  >("");
  const [editNewOtherParentDob, setEditNewOtherParentDob] = useState<Dayjs | null>(
    null,
  );

  // The node's parents resolved to full nodes.
  const nodeParentNodes = useMemo(() => {
    if (!node?.parents) return [] as FNode[];
    return node.parents
      .map((p) => nodes.find((n) => n.id === p.id))
      .filter(Boolean) as FNode[];
  }, [node, nodes]);

  // The "anchor" parent stays fixed; we offer its spouses as the other-parent choices.
  // Per product decision, the male parent is the anchor (falling back to the first parent).
  const anchorParent = useMemo(() => {
    if (nodeParentNodes.length === 0) return null;
    return (
      nodeParentNodes.find((p) => p.gender === Gender.male) || nodeParentNodes[0]
    );
  }, [nodeParentNodes]);

  // The parent that is currently recorded as the "other parent" (not the anchor).
  const currentOtherParent = useMemo(() => {
    if (!anchorParent) return null;
    return nodeParentNodes.find((p) => p.id !== anchorParent.id) || null;
  }, [nodeParentNodes, anchorParent]);

  // Candidate other parents = the anchor's spouses (plus the current other parent,
  // defensively, in case the spouse link is missing).
  const otherParentOptions = useMemo(() => {
    if (!anchorParent) return [] as FNode[];
    const byId = new Map<string, FNode>();
    (anchorParent.spouses || []).forEach((s) => {
      const spouseNode = nodes.find((n) => n.id === s.id);
      if (spouseNode) byId.set(spouseNode.id, spouseNode);
    });
    if (currentOtherParent) byId.set(currentOtherParent.id, currentOtherParent);
    return Array.from(byId.values());
  }, [anchorParent, currentOtherParent, nodes]);

  // Seed the other-parent selection:
  // - a current other parent -> preselect it
  // - exactly one candidate -> preselect it
  // - multiple candidates -> require the user to pick
  // - none -> default to "no other parent"
  useEffect(() => {
    if (currentOtherParent) {
      setEditOtherParentMode("existing");
      setEditSelectedOtherParentId(currentOtherParent.id);
    } else if (otherParentOptions.length === 1) {
      setEditOtherParentMode("existing");
      setEditSelectedOtherParentId(otherParentOptions[0].id);
    } else if (otherParentOptions.length > 1) {
      setEditOtherParentMode("existing");
      setEditSelectedOtherParentId("");
    } else {
      setEditOtherParentMode("unknown");
      setEditSelectedOtherParentId("");
    }
    setEditNewOtherParentName("");
    setEditNewOtherParentNameHindi("");
    setEditNewOtherParentGender("");
    setEditNewOtherParentDob(null);
  }, [node?.id, currentOtherParent, otherParentOptions]);

  // Photo edit state
  const [editedPhotoPreview, setEditedPhotoPreview] = useState<
    string | undefined
  >(undefined);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete Dialog State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Display State (for when not editing)
  const [displayCustomFields, setDisplayCustomFields] = useState<
    Record<string, string>
  >({});
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [professions, setProfessions] = useState<any[]>([]);
  const [businessDialogOpen, setBusinessDialogOpen] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<any | null>(null);
  const [professionDialogOpen, setProfessionDialogOpen] = useState(false);
  const [requestingAccess, setRequestingAccess] = useState(false);
  const [mobileAddSaveAction, setMobileAddSaveAction] = useState<{
    onClick: () => void;
    disabled: boolean;
    saving: boolean;
  } | null>(null);

  const { currentUser, userProfile, isSuperAdmin } = useAuth() as any;
  const { openLoginModal } = useLoginModal();
  const { offerNotifications } = useNotificationPrompt();

  // Self-link ("This is me"): a logged-in user not yet linked to any person node
  // can request the tree owner to link their account to this profile.
  const isUnlinkedUser = Boolean(currentUser && !userProfile?.peopleId);
  const [selfLinkConfirmOpen, setSelfLinkConfirmOpen] = useState(false);
  const [selfLinkRequesting, setSelfLinkRequesting] = useState(false);
  // The signed-in user's own pending link requests (self-link + branch-access),
  // used to reflect already-requested state on the relevant buttons.
  const [myPendingRequests, setMyPendingRequests] = useState<LinkRequest[]>([]);
  const myPendingSelfLinkRequest =
    myPendingRequests.find((r) => r.requestType === "user_to_tree_node") || null;

  useEffect(() => {
    if (view === "link-external" && locations.length === 0) {
      ApiService.getLocations().then((data) => setLocations(data));
    }
  }, [view, locations.length]);

  // Reset view and values when node changes
  useEffect(() => {
    if (node) {
      setView(initialView || "details");
      setEditedName(node.name || "");
      setEditedNameHindi(node.nameHindi || "");
      setEditedDob(parsePickerValue(node.dob));
      setEditedGender(node.gender || Gender.male);

      setEditedCustomFields(node.customFields || {});
      setDisplayCustomFields(node.customFields || {});
      setEditedBloodGroup(node.bloodGroup || "");
      setEditedIsAlive(node.isAlive !== false);
      setEditedDeceasedDate(parsePickerValue(node.deceasedDate));
      setEditedPhotoPreview(node.photo || undefined);

      // Fetch latest custom fields separately
      ApiService.getPersonCustomFields(node.id).then((fields) => {
        setEditedCustomFields(fields);
        setDisplayCustomFields(fields);
      });

      // Fetch businesses & professions so we know whether the person has any to
      // reveal; the details themselves stay behind the login prompt for guests.
      ApiService.getBusinessesByPerson(node.id)
        .then((biz) => setBusinesses(biz || []))
        .catch(() => setBusinesses([]));
      ApiService.getProfessionsByPerson(node.id)
        .then((profs) => setProfessions(profs || []))
        .catch(() => setProfessions([]));
    }
  }, [node, initialView, parsePickerValue, currentUser]);

  const refreshBusinesses = useCallback(async () => {
    if (!node) return;
    try {
      const biz = await ApiService.getBusinessesByPerson(node.id);
      setBusinesses(biz || []);
    } catch {
      setBusinesses([]);
    }
  }, [node]);

  const refreshProfessions = useCallback(async () => {
    if (!node) return;
    try {
      const profs = await ApiService.getProfessionsByPerson(node.id);
      setProfessions(profs || []);
    } catch {
      setProfessions([]);
    }
  }, [node]);

  const handleShareNode = useCallback(async () => {
    if (!node) return;
    const base = window.location.origin;
    const linkTreeId = treeId || node.treeId || "";
    const url = `${base}/families?tree=${encodeURIComponent(linkTreeId)}&personId=${encodeURIComponent(node.id)}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: node.name || "Family member",
          text: `View ${node.name || "this profile"} on the family tree:`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        showSnackbar("Profile link copied to clipboard.", "success");
      }
    } catch {
      // Share was cancelled or clipboard failed — nothing to do.
    }
  }, [node, treeId, showSnackbar]);

  const handleRequestBranchAccess = useCallback(async () => {
    if (!node || !treeId) return;
    setRequestingAccess(true);
    try {
      const created = await ApiService.createBranchAccessRequest({
        targetTreeId: treeId,
        targetPersonId: node.id,
      });
      setMyPendingRequests((prev) => [...prev, created]);
      offerNotifications(
        "We'll let you know as soon as your branch access request is reviewed.",
      );
      showSnackbar(`Branch access request sent for ${node.name || "this"} branch.`, "success");
    } catch (error: any) {
      showSnackbar(error?.message || "Failed to request branch access.", "error");
    } finally {
      setRequestingAccess(false);
    }
  }, [node, treeId, showSnackbar]);

  // Load the user's pending link requests so the self-link icon and the
  // "Request Branch Access" button can reflect an already-requested state (both
  // survive a reload, not just an in-session click).
  useEffect(() => {
    if (!node || !currentUser) {
      setMyPendingRequests([]);
      return;
    }
    let cancelled = false;
    ApiService.getMyLinkRequests()
      .then((rows) => {
        if (cancelled) return;
        setMyPendingRequests((rows || []).filter((r) => r.status === "pending"));
      })
      .catch(() => {
        if (!cancelled) setMyPendingRequests([]);
      });
    return () => {
      cancelled = true;
    };
    // node.id keeps this fresh when navigating between nodes in the open dialog.
  }, [node?.id, currentUser]);

  const handleSelfLinkClick = useCallback(() => {
    if (!node) return;
    if (!currentUser) {
      openLoginModal(() => setSelfLinkConfirmOpen(true));
      return;
    }
    setSelfLinkConfirmOpen(true);
  }, [node, currentUser, openLoginModal]);

  const handleConfirmSelfLink = useCallback(async () => {
    if (!node) return;
    setSelfLinkRequesting(true);
    try {
      const created = await ApiService.createUserNodeLinkRequest({
        targetPersonId: node.id,
      });
      setMyPendingRequests((prev) => [...prev, created]);
      setSelfLinkConfirmOpen(false);
      offerNotifications(
        "We'll let you know as soon as your profile link request is reviewed.",
      );
      showSnackbar(
        "Profile link request sent. It's pending owner approval.",
        "success",
      );
    } catch (error: any) {
      showSnackbar(
        error?.message || "Failed to send profile link request.",
        "error",
      );
    } finally {
      setSelfLinkRequesting(false);
    }
  }, [node, showSnackbar]);

  const isOpen = !!node;
  useEffect(() => {
    if (isOpen) {
      window.history.pushState({ nodeDetailsOpen: true }, "");

      const handlePopState = () => {
        onSelect(undefined);
        setView("details");
      };

      window.addEventListener("popstate", handlePopState);

      return () => {
        window.removeEventListener("popstate", handlePopState);
      };
    }
  }, [isOpen, onSelect]);

  const closeHandler = useCallback(() => {
    if (window.history.state?.nodeDetailsOpen) {
      window.history.back();
    } else {
      onSelect(undefined);
      setView("details");
    }
  }, [onSelect]);

  const handleEditClick = useCallback(() => {
    if (!currentUser) {
      openLoginModal(() => {
        setView("edit");
      });
      return;
    }
    setView("edit");
  }, [currentUser, openLoginModal]);

  const handleAddClick = useCallback(() => {
    if (!currentUser) {
      openLoginModal(() => {
        setView("add");
      });
      return;
    }
    setView("add");
  }, [currentUser, openLoginModal]);

  const handleDeleteClick = useCallback(() => {
    if (!currentUser) {
      openLoginModal(() => {
        setDeleteDialogOpen(true);
      });
      return;
    }
    setDeleteDialogOpen(true);
  }, [currentUser, openLoginModal]);

  const handleSaveEdit = useCallback(async () => {
    if (isSavingEdit) return;
    if (node && onUpdate) {
      try {
        setIsSavingEdit(true);
        const updates: Partial<FNode> = {
          name: editedName.trim(),
          nameHindi: editedNameHindi.trim(),
          dob: formatPickerDate(editedDob),
          gender: editedGender,
          bloodGroup: editedBloodGroup || undefined,
          isAlive: editedIsAlive,
          deceasedDate:
            !editedIsAlive && editedDeceasedDate
              ? formatPickerDate(editedDeceasedDate)
              : undefined,
          customFields: editedCustomFields,
        };

        // Persist a change to the "other parent" (co-parent of the anchor), if any.
        if (anchorParent && onChangeOtherParent) {
          const originalOtherParentId = currentOtherParent?.id || "";
          const otherParentChanged =
            (editOtherParentMode === "existing" &&
              !!editSelectedOtherParentId &&
              editSelectedOtherParentId !== originalOtherParentId) ||
            editOtherParentMode === "new" ||
            (editOtherParentMode === "unknown" && !!originalOtherParentId);

          if (otherParentChanged) {
            await onChangeOtherParent(
              node.id,
              anchorParent.id,
              editOtherParentMode,
              editOtherParentMode === "existing"
                ? editSelectedOtherParentId
                : undefined,
              editOtherParentMode === "new"
                ? {
                    name: editNewOtherParentName.trim(),
                    nameHindi: editNewOtherParentNameHindi.trim() || undefined,
                    gender: editNewOtherParentGender || undefined,
                    dob: formatPickerDate(editNewOtherParentDob),
                  }
                : undefined,
            );
          }
        }

        await onUpdate(node.id, updates);
        setView("details");
      } catch (err) {
        console.error("NodeDetails: Error during update:", err);
      } finally {
        setIsSavingEdit(false);
      }
    }
  }, [
    isSavingEdit,
    node,
    editedName,
    editedNameHindi,
    editedDob,
    editedGender,
    editedCustomFields,
    editedBloodGroup,
    editedIsAlive,
    editedDeceasedDate,
    anchorParent,
    currentOtherParent,
    onChangeOtherParent,
    editOtherParentMode,
    editSelectedOtherParentId,
    editNewOtherParentName,
    editNewOtherParentNameHindi,
    editNewOtherParentGender,
    editNewOtherParentDob,
    formatPickerDate,
    onUpdate,
  ]);

  const handleConfirmDelete = useCallback(() => {
    if (node && onDelete) {
      onDelete(node.id);
      closeHandler();
    }
  }, [node, onDelete, closeHandler]);

  const handleAddNode = useCallback(
    async (
      n: Partial<FNode>,
      r: "child" | "spouse" | "parent",
      t?: string,
      type?: RelType,
      op?: string,
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
      if (!onAdd) {
        return undefined;
      }
      const result = await onAdd(n, r, t, type, op, childOptions);
      return typeof result === "string" ? result : undefined;
    },
    [onAdd],
  );

  const handleAddComplete = useCallback(() => {
    onSelect(undefined);
  }, [onSelect]);

  const openLinkExternalDialog = useCallback(() => {
    setLinkExternalRelationSubtype(RelType.married);
    setLinkExternalStartDate(null);
    setLinkExternalEndDate(null);
    setSelectedExternalPerson(null);
    setExternalSearchValue("");
    setExternalPersonDetails(null);
    setLinkExternalLocationId("");
    setLinkExternalLocationOption(null);
    setLinkMode("");
    setMergeSpouseId("");
    setLinkExternalConfirmOpen(false);
    setView("link-external");
  }, []);

  const handleLinkExternalClick = useCallback(() => {
    if (!currentUser) {
      openLoginModal(() => {
        openLinkExternalDialog();
      });
      return;
    }
    openLinkExternalDialog();
  }, [currentUser, openLoginModal, openLinkExternalDialog]);

  // Fetch the full profile of the chosen external person so we can detect an
  // existing spouse and show the replacement preview before submitting.
  const handleSelectExternalPerson = useCallback(async (person: any) => {
    setSelectedExternalPerson(person);
    setLinkMode("");
    setMergeSpouseId("");
    setExternalPersonDetails(null);
    if (!person?.id) return;
    try {
      setLoadingExternalDetails(true);
      const spouses = await ApiService.getPersonSpouses(person.id);
      setExternalPersonDetails({ spouses: spouses || [] });
    } catch (error) {
      console.error("Failed to load external person details:", error);
      setExternalPersonDetails(null);
    } finally {
      setLoadingExternalDetails(false);
    }
  }, []);

  const handleConfirmLinkExternal = () => {
    if (!node || !selectedExternalPerson) return;
    if (
      linkExternalStartDate &&
      linkExternalEndDate &&
      linkExternalEndDate.isBefore(linkExternalStartDate, "day")
    ) {
      showSnackbar("Marriage end date cannot be before marriage start date.", "warning");
      return;
    }

    // Find spouse of current node
    const spouse =
      node.spouses && node.spouses.length > 0 ? node.spouses[0] : null;

    if (!spouse) {
      showSnackbar(
        "This person must have a spouse in the current tree to use this replacement feature.",
        "warning",
      );
      return;
    }

    // Defer the destructive action to an explicit confirmation dialog.
    setLinkExternalConfirmOpen(true);
  };

  const performLinkExternal = async () => {
    if (!node || !selectedExternalPerson) return;

    // Logic: Node (Placeholder) <-> Spouse (Target)
    // We want: New Person <-> Spouse (Target)
    // And delete Node (Placeholder)
    const spouse =
      node.spouses && node.spouses.length > 0 ? node.spouses[0] : null;
    if (!spouse) return;

    // Existing-spouse decision: choosing a mode is itself the acknowledgement.
    const hasExistingSpouses = Boolean(externalPersonDetails?.spouses?.length);
    const effectiveMergeSpouseId =
      hasExistingSpouses && linkMode === "merge" ? mergeSpouseId || undefined : undefined;
    const effectiveConfirm = hasExistingSpouses || undefined;

    try {
      setLinkExternalSubmitting(true);
      const relationStartDate = formatPickerDate(linkExternalStartDate);
      const relationEndDate = formatPickerDate(linkExternalEndDate);
      const canLinkDirectly =
        typeof isSuperAdmin === "function"
          ? isSuperAdmin()
          : userProfile?.role === "superadmin";

      if (canLinkDirectly) {
        // addSpouse(targetId, spouseId, placeholderId)
        // targetId = spouse.id (The person staying in the tree)
        // spouseId = selectedExternalPerson.id (The new person coming in)
        // placeholderId = node.id (The person leaving)
        await ApiService.addSpouse(
          spouse.id,
          selectedExternalPerson.id,
          linkExternalRelationSubtype,
          relationStartDate,
          relationEndDate,
          node.id,
          effectiveConfirm,
          effectiveMergeSpouseId,
        );

        setLinkExternalConfirmOpen(false);
        showSnackbar(
          effectiveMergeSpouseId ? "Merged successfully. Refreshing…" : "Successfully linked. Refreshing…",
          "success",
        );
        window.setTimeout(() => window.location.reload(), 900);
        return;
      }

      await ApiService.createSpouseLinkRequest({
        personId1: spouse.id,
        personId2: selectedExternalPerson.id,
        relationSubtype: linkExternalRelationSubtype,
        relationStartDate,
        relationEndDate,
        replacePersonId: node.id,
        confirmExistingSpouse: effectiveConfirm,
        mergeSpouseId: effectiveMergeSpouseId,
        requestMessage: `Request to replace ${node.name} with ${selectedExternalPerson.name} as spouse of ${
          nodes.find((candidate) => candidate.id === spouse.id)?.name || "the selected person"
        }.`,
      });

      window.dispatchEvent(new Event("link-requests-updated"));
      offerNotifications(
        "We'll let you know as soon as your request is approved or declined.",
      );
      showSnackbar(
        "Spouse link request raised. The other tree owner or a superadmin can approve it.",
        "success",
      );
      setLinkExternalConfirmOpen(false);
      setView("details");
    } catch (error: any) {
      console.error("Link external error:", error);
      // Return to the link dialog (where the "additional marriage" checkbox
      // lives) so the user can adjust rather than being stuck on the confirm.
      setLinkExternalConfirmOpen(false);
      showSnackbar("Failed to link: " + (error?.message || error), "error");
    } finally {
      setLinkExternalSubmitting(false);
    }
  };

  const handleOpenSpouseDateEditor = useCallback(() => {
    if (!node) return;

    const openEditor = () => {
      const spouseList = node.spouses || [];
      if (spouseList.length === 0) return;
      const firstSpouse: any = spouseList[0];
      setEditSpouseId(firstSpouse.id || "");
      setEditSpouseRelationSubtype(
        (firstSpouse.relationSubtype || firstSpouse.type || RelType.married) as RelType,
      );
      setEditSpouseStartDate(parsePickerValue(firstSpouse.startDate));
      setEditSpouseEndDate(parsePickerValue(firstSpouse.endDate));
      setEditSpouseDatesOpen(true);
    };

    if (!currentUser) {
      openLoginModal(() => {
        openEditor();
      });
      return;
    }

    openEditor();
  }, [node, currentUser, openLoginModal, parsePickerValue]);

  const handleChangeEditSpouse = useCallback(
    (spouseId: string) => {
      if (!node) return;
      const relation: any = (node.spouses || []).find((s: any) => s.id === spouseId);
      setEditSpouseId(spouseId);
      setEditSpouseRelationSubtype(
        (relation?.relationSubtype || relation?.type || RelType.married) as RelType,
      );
      setEditSpouseStartDate(parsePickerValue(relation?.startDate));
      setEditSpouseEndDate(parsePickerValue(relation?.endDate));
    },
    [node, parsePickerValue],
  );

  const handleSaveSpouseDates = useCallback(async () => {
    if (!node || !editSpouseId || isSavingSpouseDates) return;
    if (
      editSpouseStartDate &&
      editSpouseEndDate &&
      editSpouseEndDate.isBefore(editSpouseStartDate, "day")
    ) {
      showSnackbar("Marriage end date cannot be before marriage start date.", "warning");
      return;
    }

    try {
      setIsSavingSpouseDates(true);
      await ApiService.updateSpouseRelationDates(
        node.id,
        editSpouseId,
        editSpouseRelationSubtype,
        formatPickerDate(editSpouseStartDate),
        formatPickerDate(editSpouseEndDate),
      );
      setEditSpouseDatesOpen(false);
      window.location.reload();
    } catch (error: any) {
      showSnackbar("Failed to update spouse dates: " + (error?.message || error), "error");
    } finally {
      setIsSavingSpouseDates(false);
    }
  }, [
    node,
    editSpouseId,
    editSpouseRelationSubtype,
    editSpouseStartDate,
    editSpouseEndDate,
    formatPickerDate,
    isSavingSpouseDates,
    showSnackbar,
  ]);

  const relNodeMapper = useCallback(
    (rel: any) => {
      const foundNode = nodes.find((n) => n.id === rel.id);
      if (!foundNode) return null;
      return {
        ...foundNode,
        type: rel.type,
        relationSubtype: rel.relationSubtype || rel.type,
        startDate: rel.startDate,
        endDate: rel.endDate,
      };
    },
    [nodes],
  );

  if (!node) return null;

  const parents = node.parents?.map(relNodeMapper).filter(Boolean) || [];
  const children = node.children?.map(relNodeMapper).filter(Boolean) || [];
  const siblings = node.siblings?.map(relNodeMapper).filter(Boolean) || [];
  const spouses = node.spouses?.map(relNodeMapper).filter(Boolean) || [];
  // The tree-A person the placeholder is married to — the "surviving" spouse in
  // a Link Real Profile / merge. Used for wording in the link-external dialog.
  const anchorSpouseName =
    (spouses[0] as any)?.name ||
    nodes.find((n) => n.id === (node.spouses?.[0] as any)?.id)?.name ||
    "the current spouse";
  const canEditCurrentNode = canEditNode ? canEditNode(node.id) : true;
  const isSuperAdminUser = typeof isSuperAdmin === "function" ? isSuperAdmin() : Boolean(isSuperAdmin);
  // If the user already has a pending self-link request for this node (or an
  // ancestor of it, meaning this node is within that pending branch), hide the
  // "Request Branch Access" button — approving the link already grants that
  // branch. `node.hierarchy` is the male-parent chain, matching how branch
  // access is scoped. The button returns once the link request is rejected.
  const pendingSelfLinkTargetId = myPendingSelfLinkRequest?.targetPersonId;
  const isNodeInPendingLinkBranch = Boolean(
    pendingSelfLinkTargetId &&
      (node.id === pendingSelfLinkTargetId ||
        (node.hierarchy || []).some((h) => h.id === pendingSelfLinkTargetId)),
  );
  // Whether a branch-access request already covers this node — either it targets
  // this node directly or it targets an ancestor (so this node is within that
  // pending branch). `node.hierarchy` is the male-parent chain, matching how
  // branch access is scoped. The button stays visible but disabled with a tooltip.
  const pendingBranchAccessTargetIds = new Set(
    myPendingRequests
      .filter((r) => r.requestType === "branch_access_request" && r.targetPersonId)
      .map((r) => r.targetPersonId as string),
  );
  const hasPendingBranchAccessForNode =
    pendingBranchAccessTargetIds.has(node.id) ||
    (node.hierarchy || []).some((h) => pendingBranchAccessTargetIds.has(h.id));
  // Superadmins already have full access, so they never need to request branch access.
  // A user who already has (edit) access to this node or its descendants also
  // never sees it, via `!canEditCurrentNode`.
  const canRequestBranchAccess = Boolean(
    currentUser &&
      !isSuperAdminUser &&
      !canEditCurrentNode &&
      treeId &&
      !isNodeInPendingLinkBranch,
  );
  // When the profile being claimed doesn't match the signed-in user's name, the
  // self-link confirm dialog becomes a warning instead of a plain confirmation.
  const selfLinkNameMismatch = !namesLooselyMatch(node.name, userProfile?.name);
  const summaryItems = [
    {
      key: "gender",
      label:
        node.gender === Gender.male
          ? "Male"
          : node.gender === Gender.female
            ? "Female"
            : "Other",
    },
    node.dob
      ? {
          key: "dob",
          label: `Born ${formatDisplayDate(node.dob)}`,
          icon: <CakeOutlinedIcon sx={{ fontSize: 16 }} />,
        }
      : null,
    {
      key: "alive",
      label:
        node.isAlive === false
          ? node.deceasedDate
            ? `Deceased ${formatDisplayDate(node.deceasedDate)}`
            : "Deceased"
          : "Living",
      icon: <FavoriteBorderOutlinedIcon sx={{ fontSize: 16 }} />,
    },
    node.bloodGroup
      ? {
          key: "blood",
          label: `Blood ${node.bloodGroup}`,
          icon: <BloodtypeOutlinedIcon sx={{ fontSize: 16 }} />,
        }
      : null,
  ].filter(Boolean) as Array<{ key: string; label: string; icon?: React.ReactNode }>;

  return (
    <>
      <Dialog
        open={!!node}
        onClose={closeHandler}
        fullScreen={isMobile}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            height: isMobile ? "100%" : "auto",
            maxHeight: isMobile ? "100%" : "90vh",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        {view === "details" && (
          <>
            <AppBar
              position="relative"
              color="default"
              elevation={0}
              sx={{ borderBottom: 1, borderColor: "divider" }}
            >
              <Toolbar sx={{ justifyContent: "space-between" }}>
                <Typography variant="h6" noWrap sx={{ flex: 1 }}>
                  {node.name}
                </Typography>
                <IconButton edge="end" color="inherit" onClick={closeHandler}>
                  <CloseIcon />
                </IconButton>
              </Toolbar>
            </AppBar>
            <DialogContent>
              <Stack spacing={2}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: { xs: 2, sm: 2.5 },
                    borderRadius: 3,
                    background: (muiTheme) =>
                      `linear-gradient(180deg, ${alpha(muiTheme.palette.primary.main, 0.06)} 0%, ${muiTheme.palette.background.paper} 100%)`,
                  }}
                >
                  <Stack spacing={2} alignItems="center" sx={{ textAlign: "center" }}>
                  {node.photo ? (
                    <img
                      src={node.photo}
                      alt={node.name}
                      style={{
                        width: 112,
                        height: 112,
                        borderRadius: "24px",
                        objectFit: "cover",
                        boxShadow: "0 10px 24px rgba(0,0,0,0.12)",
                      }}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: 112,
                        height: 112,
                        borderRadius: "24px",
                        bgcolor: "action.hover",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 44,
                        fontWeight: "bold",
                        color: "text.secondary",
                      }}
                    >
                      {node.name.charAt(0)}
                    </Box>
                  )}
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 800 }}>
                      {node.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                      {node.nameHindi || "Family profile"}
                    </Typography>
                  </Box>

                  <Stack
                    direction="row"
                    spacing={1.5}
                    useFlexGap
                    justifyContent="center"
                  >
                    {canEditCurrentNode && onInviteCollaborator && (
                      <Tooltip title="Invite collaborator">
                        <IconButton
                          size="large"
                          color="primary"
                          onClick={() => onInviteCollaborator(node.id)}
                          sx={{
                            border: 1,
                            borderColor: "divider",
                            width: 48,
                            height: 48,
                          }}
                        >
                          <PersonAddAlt1OutlinedIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Share">
                      <IconButton
                        size="large"
                        color="primary"
                        onClick={handleShareNode}
                        sx={{
                          border: 1,
                          borderColor: "divider",
                          width: 48,
                          height: 48,
                        }}
                      >
                        <ShareOutlinedIcon />
                      </IconButton>
                    </Tooltip>
                    {isUnlinkedUser && (
                      <Tooltip
                        title={
                          myPendingSelfLinkRequest
                            ? myPendingSelfLinkRequest.targetPersonId === node.id
                              ? "Your request to link this profile is pending owner approval."
                              : "You already have a profile link request pending owner approval."
                            : "This is me — request to link this profile to my account"
                        }
                      >
                        {/* span wrapper lets the tooltip show while the button is disabled */}
                        <span>
                          <IconButton
                            size="large"
                            color="primary"
                            onClick={handleSelfLinkClick}
                            disabled={
                              Boolean(myPendingSelfLinkRequest) ||
                              selfLinkRequesting
                            }
                            sx={{
                              border: 1,
                              borderColor: "divider",
                              width: 48,
                              height: 48,
                            }}
                          >
                            {myPendingSelfLinkRequest ? (
                              <HourglassTopOutlinedIcon />
                            ) : (
                              <HowToRegOutlinedIcon />
                            )}
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                  </Stack>
                  <Stack
                    direction="row"
                    spacing={1}
                    useFlexGap
                    flexWrap="wrap"
                    justifyContent="center"
                  >
                    {summaryItems.map((item) => (
                      <Chip
                        key={item.key}
                        icon={item.icon as any}
                        label={item.label}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                  </Stack>
                  </Stack>
                </Paper>

                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1.25, fontWeight: 700 }}>
                    Quick actions
                  </Typography>
                  <Stack spacing={1.25}>
                    {!canEditCurrentNode && (
                      <Typography variant="body2" color="text.secondary">
                        You can view this profile, but editing is restricted for this branch.
                      </Typography>
                    )}
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "center",
                        gap: 1,
                        flexWrap: "wrap",
                      }}
                    >
                      <Button
                        variant="outlined"
                        startIcon={<EditIcon />}
                        onClick={handleEditClick}
                        disabled={!canEditCurrentNode}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={handleAddClick}
                        disabled={!canEditCurrentNode}
                      >
                        Add Relative
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={handleDeleteClick}
                        disabled={!canEditCurrentNode}
                      >
                        Delete
                      </Button>
                      {/* Only show "Link & Replace" if the node belongs to the current tree (is local/placeholder)
                        AND is a spouse (has accumulated no parents in this tree, but has a spouse) */}
                      {(!treeId || node.treeId === treeId) &&
                        (!node.parents || node.parents.length === 0) &&
                        node.spouses &&
                        node.spouses.length > 0 && (
                          <Button
                            variant="outlined"
                            color="info"
                            startIcon={<LinkIcon />}
                            onClick={handleLinkExternalClick}
                            disabled={!canEditCurrentNode}
                          >
                            Link Real Profile
                          </Button>
                        )}
                      {node.spouses && node.spouses.length > 0 && (
                        <Button
                          variant="outlined"
                          onClick={handleOpenSpouseDateEditor}
                          disabled={!canEditCurrentNode}
                        >
                          Edit Marriage Dates
                        </Button>
                      )}
                      {canRequestBranchAccess && (
                        <Tooltip
                          title={
                            hasPendingBranchAccessForNode
                              ? "Your branch access request is pending owner approval."
                              : ""
                          }
                        >
                          {/* span wrapper lets the tooltip show while the button is disabled */}
                          <span>
                            <Button
                              variant="outlined"
                              color="secondary"
                              startIcon={<LockOpenOutlinedIcon />}
                              onClick={handleRequestBranchAccess}
                              disabled={
                                requestingAccess || hasPendingBranchAccessForNode
                              }
                            >
                              {hasPendingBranchAccessForNode
                                ? "Access Requested"
                                : requestingAccess
                                  ? "Requesting…"
                                  : "Request Branch Access"}
                            </Button>
                          </span>
                        </Tooltip>
                      )}
                    </Box>
                  </Stack>
                </Paper>

                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1.25, fontWeight: 700 }}>
                    Profile details
                  </Typography>
                  <Stack spacing={1.25}>
                    {node.createdAt && (
                      <Typography variant="body2">
                        <strong>Created on:</strong> {formatDisplayDateTime(node.createdAt)}
                      </Typography>
                    )}
                    {createdByLabel && (
                      <Typography variant="body2">
                        <strong>Created by:</strong> {createdByLabel}
                      </Typography>
                    )}
                    {node.dod && (
                      <Typography variant="body2">
                        <strong>Died:</strong> {node.dod}
                      </Typography>
                    )}
                    {node.place && (
                      <Typography variant="body2">
                        <strong>Place:</strong> {node.place}
                      </Typography>
                    )}
                    {node.notes && (
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          Notes
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ whiteSpace: "pre-wrap", color: "text.secondary", mt: 0.5 }}
                        >
                          {node.notes}
                        </Typography>
                      </Box>
                    )}
                    {displayCustomFields && Object.keys(displayCustomFields).length > 0 ? (
                      <Box>
                        <Typography
                          variant="subtitle2"
                          color="text.secondary"
                          sx={{ mb: 1 }}
                        >
                          Additional details
                        </Typography>
                        <Stack spacing={0.75}>
                          {Object.entries(displayCustomFields || {}).map(([key, value]) => (
                            <Typography key={key} variant="body2">
                              <strong>{key}:</strong> {value}
                            </Typography>
                          ))}
                        </Stack>
                      </Box>
                    ) : (
                      !node.dod &&
                      !node.place &&
                      !node.notes && (
                        <Typography variant="body2" color="text.secondary">
                          No extra profile details have been added yet.
                        </Typography>
                      )
                    )}
                  </Stack>
                </Paper>

                {(currentUser || businesses.length > 0 || professions.length > 0) && (
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                  {!currentUser ? (
                    <Box sx={{ textAlign: "center", py: 1.5 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Log in to see this person's businesses and professions.
                      </Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() =>
                          openLoginModal(() => {
                            void refreshBusinesses();
                            void refreshProfessions();
                          })
                        }
                      >
                        Log in
                      </Button>
                    </Box>
                  ) : (
                    <Stack spacing={2.5}>
                      {/* Businesses */}
                      <Box>
                        <Stack
                          direction="row"
                          alignItems="center"
                          justifyContent="space-between"
                          sx={{ mb: businesses.length > 0 ? 1.5 : 0.5 }}
                        >
                          <Stack direction="row" spacing={1} alignItems="center">
                            <BusinessOutlinedIcon fontSize="small" color="action" />
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                              Businesses
                            </Typography>
                          </Stack>
                          {canEditCurrentNode && (
                            <Button
                              size="small"
                              startIcon={<AddIcon fontSize="small" />}
                              onClick={() => {
                                setEditingBusiness(null);
                                setBusinessDialogOpen(true);
                              }}
                            >
                              Add
                            </Button>
                          )}
                        </Stack>

                        {businesses.length > 0 ? (
                          <Stack spacing={1}>
                            {businesses.map((biz) => (
                              <Box
                                key={biz.id}
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  gap: 1,
                                  p: 1,
                                  borderRadius: 2,
                                  bgcolor: "action.hover",
                                }}
                              >
                                <Box sx={{ minWidth: 0 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                                    {biz.name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {[businessCategoryLabel(biz.category), biz.contact]
                                      .filter(Boolean)
                                      .join(" • ")}
                                  </Typography>
                                </Box>
                                {canEditCurrentNode && (
                                  <IconButton
                                    size="small"
                                    aria-label="Edit business"
                                    onClick={() => {
                                      setEditingBusiness(biz);
                                      setBusinessDialogOpen(true);
                                    }}
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                )}
                              </Box>
                            ))}
                          </Stack>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            No businesses added yet.
                          </Typography>
                        )}
                      </Box>

                      <Divider />

                      {/* Professions */}
                      <Box>
                        <Stack
                          direction="row"
                          alignItems="center"
                          justifyContent="space-between"
                          sx={{ mb: professions.length > 0 ? 1.5 : 0.5 }}
                        >
                          <Stack direction="row" spacing={1} alignItems="center">
                            <WorkOutlineOutlinedIcon fontSize="small" color="action" />
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                              Professions
                            </Typography>
                          </Stack>
                          {canEditCurrentNode && (
                            <Button
                              size="small"
                              startIcon={<AddIcon fontSize="small" />}
                              onClick={() => setProfessionDialogOpen(true)}
                            >
                              Add
                            </Button>
                          )}
                        </Stack>

                        {professions.length > 0 ? (
                          <Stack spacing={1}>
                            {professions.map((prof) => (
                              <Box
                                key={prof.id}
                                sx={{
                                  p: 1,
                                  borderRadius: 2,
                                  bgcolor: "action.hover",
                                  minWidth: 0,
                                }}
                              >
                                <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                                  {prof.name}
                                </Typography>
                                {(prof.category || prof.description) && (
                                  <Typography variant="caption" color="text.secondary">
                                    {[prof.category, prof.description]
                                      .filter(Boolean)
                                      .join(" • ")}
                                  </Typography>
                                )}
                              </Box>
                            ))}
                          </Stack>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            No professions added yet.
                          </Typography>
                        )}
                      </Box>
                    </Stack>
                  )}
                </Paper>
                )}

                <Accordion defaultExpanded={true} sx={{ borderRadius: 3, "&:before": { display: "none" } }}>
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    aria-controls="ancestry-content"
                    id="ancestry-header"
                  >
                    <Typography>
                      Ancestry
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{ pl: 1.5, borderLeft: 2, borderColor: "divider" }}>
                      {node.hierarchy.map((ancestor, i) => (
                        <Typography
                          key={ancestor.id}
                          variant="body2"
                          display="block"
                          sx={{ ml: i * 1.25 }}
                        >
                          {i > 0 && "↳ "} {ancestor.name}
                        </Typography>
                      ))}
                    </Box>
                  </AccordionDetails>
                </Accordion>

                <Typography variant="subtitle2" color="text.secondary" sx={{ px: 0.5 }}>
                  Family connections
                </Typography>

                {/* Relations */}
                <Relations {...props} title="Parents" items={parents} />
                <Relations {...props} title="Spouses" items={spouses} />
                <Relations {...props} title="Children" items={children} />
                <Relations {...props} title="Siblings" items={siblings} />
              </Stack>
            </DialogContent>
          </>
        )}

        {view === "edit" && (
          <>
            <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                Edit {node.name}
              </Typography>
              {isMobile && (
                <IconButton
                  onClick={handleSaveEdit}
                  size="small"
                  color="primary"
                  disabled={isSavingEdit || !editedName.trim()}
                >
                  {isSavingEdit ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : (
                    <SaveOutlinedIcon />
                  )}
                </IconButton>
              )}
              <IconButton onClick={closeHandler} size="small">
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers>
              <Stack spacing={2.5} sx={{ pt: 1 }}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700 }}>
                    Identity
                  </Typography>
                  <Stack spacing={2}>
                    <Box
                      sx={{
                        p: { xs: 1.5, sm: 2 },
                        borderRadius: 3,
                        textAlign: "center",
                        background: (muiTheme) =>
                          `linear-gradient(180deg, ${alpha(muiTheme.palette.primary.main, 0.06)} 0%, ${muiTheme.palette.background.paper} 100%)`,
                      }}
                    >
                      <Stack spacing={1.5} alignItems="center">
                        <Suspense fallback={<Box sx={{ height: 96 }} />}>
                          <ImageCropper
                            currentPhoto={editedPhotoPreview}
                            previewVariant="rounded"
                            onCropped={async (blob) => {
                              if (!node) return;
                              try {
                                setPhotoUploading(true);
                                const url = await ApiService.uploadPersonPhoto(
                                  node.id,
                                  blob,
                                );
                                setEditedPhotoPreview(url);
                              } catch (err) {
                                console.error("Photo upload failed:", err);
                                showSnackbar(
                                  `Failed to upload photo: ${
                                    err instanceof Error
                                      ? err.message
                                      : String(err)
                                  }`,
                                  "error",
                                );
                              } finally {
                                setPhotoUploading(false);
                              }
                            }}
                            onRemove={async () => {
                              if (!node) return;
                              try {
                                setPhotoUploading(true);
                                await ApiService.removePersonPhoto(node.id);
                                setEditedPhotoPreview(undefined);
                              } catch (err) {
                                console.error("Photo remove failed:", err);
                              } finally {
                                setPhotoUploading(false);
                              }
                            }}
                            uploading={photoUploading}
                            previewSize={isMobile ? 112 : 160}
                          />
                        </Suspense>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 800 }}>
                            {editedName || node.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            Update the basic identity details and photo for this profile.
                          </Typography>
                        </Box>
                      </Stack>
                    </Box>

	                    <TextField
	                      label="Name"
	                      value={editedName}
	                      onChange={(e) => setEditedName(e.target.value)}
	                      fullWidth
	                      required
	                      sx={inputWithIconSx}
	                      InputProps={{
	                        startAdornment: adornment(
	                          <PersonOutlineOutlinedIcon fontSize="small" />,
	                        ),
	                      }}
	                    />
	                    <HindiNameInput
	                      sourceText={editedName}
	                      value={editedNameHindi}
	                      onChange={setEditedNameHindi}
	                    />
                    <Suspense fallback={<TextField fullWidth label="Date of Birth" />}>
                      <DatePicker
	                        label="Date of Birth"
	                        value={editedDob}
	                        onChange={(value) => setEditedDob(value)}
	                        slotProps={{
	                          field: { clearable: true },
	                          textField: {
	                            fullWidth: true,
	                            sx: inputWithIconSx,
	                            InputProps: {
	                              startAdornment: adornment(<CakeOutlinedIcon fontSize="small" />),
	                            },
	                          },
	                        }}
	                        format="DD/MM/YYYY"
	                      />
                    </Suspense>
                    <Box>
                      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                        Gender
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {GENDER_OPTIONS.map((option) => (
                          <Chip
                            key={String(option.value)}
                            icon={option.icon}
                            label={option.label}
                            clickable
                            color={editedGender === option.value ? "primary" : "default"}
                            variant={editedGender === option.value ? "filled" : "outlined"}
                            onClick={() => setEditedGender(option.value)}
                            sx={{ height: 36, px: 0.75 }}
                          />
                        ))}
                      </Stack>
                    </Box>
                  </Stack>
                </Paper>

                <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700 }}>
                    Life details
                  </Typography>
                  <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                    Blood Group
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip
                      label="Unknown"
                      clickable
                      color={!editedBloodGroup ? "primary" : "default"}
                      variant={!editedBloodGroup ? "filled" : "outlined"}
                      onClick={() => setEditedBloodGroup("")}
                    />
                    {BLOOD_GROUP_OPTIONS.map((option) => (
                      <Chip
                        key={option}
                        label={option}
                        clickable
                        color={editedBloodGroup === option ? "primary" : "default"}
                        variant={editedBloodGroup === option ? "filled" : "outlined"}
                        onClick={() => setEditedBloodGroup(option)}
                      />
                    ))}
                  </Stack>
                </Box>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Typography
                    variant="body2"
                    color={editedIsAlive ? "text.secondary" : "text.primary"}
                    sx={{ fontWeight: editedIsAlive ? 500 : 800 }}
                  >
                    Dead
                  </Typography>
                  <Switch
                    checked={editedIsAlive}
                    onChange={(e) => {
                      setEditedIsAlive(e.target.checked);
                      if (e.target.checked) setEditedDeceasedDate(null);
                    }}
                  />
                  <Typography
                    variant="body2"
                    color={editedIsAlive ? "text.primary" : "text.secondary"}
                    sx={{ fontWeight: editedIsAlive ? 800 : 500 }}
                  >
                    Alive
                  </Typography>
                </Stack>
                {!editedIsAlive && (
                  <Suspense
                    fallback={<TextField fullWidth label="Deceased Date" />}
                  >
                    <DatePicker
	                      label="Deceased Date"
	                      value={editedDeceasedDate}
	                      onChange={(value) => setEditedDeceasedDate(value)}
	                      slotProps={{
	                        field: { clearable: true },
	                        textField: {
	                          fullWidth: true,
	                          sx: inputWithIconSx,
	                          InputProps: {
	                            startAdornment: adornment(<CakeOutlinedIcon fontSize="small" />),
	                          },
	                        },
	                      }}
	                      format="DD/MM/YYYY"
	                    />
                  </Suspense>
                )}
                  </Stack>
                </Paper>
                {anchorParent && (
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                    <Stack spacing={1.5}>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          Other parent
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Co-parent with {anchorParent.name || "this parent"}.
                        </Typography>
                      </Box>

                      {otherParentOptions.length > 0 && (
                        <FormControl fullWidth size="small">
                          <InputLabel id="other-parent-select-label">
                            Other parent
                          </InputLabel>
                          <Select
                            labelId="other-parent-select-label"
                            label="Other parent"
                            value={
                              editOtherParentMode === "existing"
                                ? editSelectedOtherParentId
                                : ""
                            }
                            onChange={(e) => {
                              setEditOtherParentMode("existing");
                              setEditSelectedOtherParentId(
                                e.target.value as string,
                              );
                            }}
                          >
                            {otherParentOptions.map((opt) => (
                              <MenuItem key={opt.id} value={opt.id}>
                                {opt.name || "Unnamed"}
                                {opt.gender ? ` (${opt.gender})` : ""}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}

                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Chip
                          label="Add new other parent"
                          clickable
                          color={
                            editOtherParentMode === "new" ? "primary" : "default"
                          }
                          variant={
                            editOtherParentMode === "new" ? "filled" : "outlined"
                          }
                          onClick={() => setEditOtherParentMode("new")}
                        />
                        <Chip
                          label="No other parent"
                          clickable
                          color={
                            editOtherParentMode === "unknown"
                              ? "primary"
                              : "default"
                          }
                          variant={
                            editOtherParentMode === "unknown"
                              ? "filled"
                              : "outlined"
                          }
                          onClick={() => {
                            setEditOtherParentMode("unknown");
                            setEditSelectedOtherParentId("");
                          }}
                        />
                      </Stack>

                      {editOtherParentMode === "new" && (
                        <Stack spacing={1.5}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Name"
                            value={editNewOtherParentName}
                            onChange={(e) =>
                              setEditNewOtherParentName(e.target.value)
                            }
                          />
                          <TextField
                            fullWidth
                            size="small"
                            label="Name (Hindi)"
                            value={editNewOtherParentNameHindi}
                            onChange={(e) =>
                              setEditNewOtherParentNameHindi(e.target.value)
                            }
                          />
                          <FormControl fullWidth size="small">
                            <InputLabel id="new-other-parent-gender-label">
                              Gender
                            </InputLabel>
                            <Select
                              labelId="new-other-parent-gender-label"
                              label="Gender"
                              value={editNewOtherParentGender}
                              onChange={(e) =>
                                setEditNewOtherParentGender(
                                  e.target.value as
                                    | "male"
                                    | "female"
                                    | "other"
                                    | "",
                                )
                              }
                            >
                              <MenuItem value="">
                                Auto (
                                {anchorParent.gender === Gender.male
                                  ? "female"
                                  : "male"}
                                )
                              </MenuItem>
                              <MenuItem value="male">Male</MenuItem>
                              <MenuItem value="female">Female</MenuItem>
                              <MenuItem value="other">Other</MenuItem>
                            </Select>
                          </FormControl>
                          <Suspense
                            fallback={
                              <TextField
                                fullWidth
                                size="small"
                                label="Date of birth"
                              />
                            }
                          >
                            <DatePicker
                              label="Date of birth"
                              value={editNewOtherParentDob}
                              onChange={(value) =>
                                setEditNewOtherParentDob(value)
                              }
                              slotProps={{
                                textField: { fullWidth: true, size: "small" },
                              }}
                              format="DD/MM/YYYY"
                            />
                          </Suspense>
                        </Stack>
                      )}
                    </Stack>
                  </Paper>
                )}
                <Accordion defaultExpanded variant="outlined" sx={{ borderRadius: 3, "&:before": { display: "none" } }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Additional details
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <AdditionalDetails
                      value={editedCustomFields}
                      onChange={setEditedCustomFields}
                      showUpfrontFields={false}
                    />
                  </AccordionDetails>
                </Accordion>
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setView("details")}>Cancel</Button>
              <Button
                onClick={handleSaveEdit}
                variant="contained"
                disabled={isSavingEdit || !editedName.trim()}
                startIcon={
                  isSavingEdit ? (
                    <CircularProgress size={14} color="inherit" />
                  ) : undefined
                }
              >
                {isSavingEdit ? "Saving..." : "Save Changes"}
              </Button>
            </DialogActions>
          </>
        )}

        {view === "add" && (
          <>
            <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                Add Relative to {node.name}
              </Typography>
              {isMobile && mobileAddSaveAction && (
                <IconButton
                  onClick={mobileAddSaveAction.onClick}
                  size="small"
                  color="primary"
                  disabled={mobileAddSaveAction.disabled}
                >
                  {mobileAddSaveAction.saving ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : (
                    <SaveOutlinedIcon />
                  )}
                </IconButton>
              )}
              <IconButton onClick={closeHandler} size="small">
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers>
              <AddNode
                targetId={node.id}
                nodes={nodes}
                initialRelation={initialAddInfo?.relation}
                initialGender={initialAddInfo?.gender as any}
                onMobileSaveActionChange={setMobileAddSaveAction}
                onAdd={handleAddNode}
                onCancel={closeHandler}
                onComplete={handleAddComplete}
                noCard
              />
            </DialogContent>
          </>
        )}

        {/* View delete block moved to separate Dialog */}

        {view === "link-external" && (
          <>
            <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                Link {node.name} to a Real Profile
              </Typography>
              <IconButton onClick={closeHandler} size="small">
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Use this to replace the current placeholder person with a
                detailed profile from another tree. This handles merging and
                child reassignment automatically.
              </Typography>

              <Box sx={{ my: 2 }}>
                <LocationPicker
                  value={linkExternalLocationOption}
                  onChange={(option) => {
                    setLinkExternalLocationOption(option);
                    setLinkExternalLocationId(option?.locationId || "");
                  }}
                  label="Location"
                />
              </Box>

              <PersonSearchField
                searchValue={externalSearchValue}
                onSearchValueChange={setExternalSearchValue}
                onPersonSelect={handleSelectExternalPerson}
                selectedPerson={selectedExternalPerson}
                locationId={linkExternalLocationId}
                filterGender={node.gender}
                disabled={!linkExternalLocationId}
                placeholder={`Search for a ${
                  node.gender === Gender.female
                    ? "woman"
                    : node.gender === Gender.male
                      ? "man"
                      : "person"
                }...`}
                label="Select Real Person"
                startIcon={<PersonOutlineOutlinedIcon fontSize="small" />}
              />
              {node.gender && (
                <Typography variant="caption" sx={{ display: "block", mb: 1, color: brand.slateMuted }}>
                  Only {node.gender === Gender.female ? "female" : node.gender === Gender.male ? "male" : node.gender}{" "}
                  profiles are shown, matching the placeholder being replaced.
                </Typography>
              )}

              <FormControl fullWidth sx={{ ...inputWithIconSx, mt: 2 }}>
                <InputLabel>Relation Type</InputLabel>
                <Select
                  value={linkExternalRelationSubtype}
                  onChange={(e) => {
                    const next = e.target.value as RelType;
                    setLinkExternalRelationSubtype(next);
                    if (next !== RelType.divorced) {
                      setLinkExternalEndDate(() => null);
                    }
                  }}
                  label="Relation Type"
                  startAdornment={adornment(<FavoriteBorderOutlinedIcon fontSize="small" />)}
                >
                  <MenuItem value={RelType.married}>
                    {titleCaseRelationType(RelType.married)}
                  </MenuItem>
                  <MenuItem value={RelType.divorced}>
                    {titleCaseRelationType(RelType.divorced)}
                  </MenuItem>
                </Select>
              </FormControl>

              <Suspense fallback={<TextField fullWidth label="Marriage Start Date" sx={{ mt: 2 }} />}>
                <DatePicker
	                  label="Marriage Start Date (optional)"
	                  value={linkExternalStartDate}
	                  onChange={(value) => setLinkExternalStartDate(value)}
	                  slotProps={{
	                    textField: {
	                      fullWidth: true,
	                      sx: { ...inputWithIconSx, mt: 2 },
	                      InputProps: {
	                        startAdornment: adornment(
	                          <FavoriteBorderOutlinedIcon fontSize="small" />,
	                        ),
	                      },
	                    },
	                  }}
	                  format="DD/MM/YYYY"
	                />
              </Suspense>

              {linkExternalRelationSubtype === RelType.divorced && (
                <Suspense fallback={<TextField fullWidth label="Marriage End Date" sx={{ mt: 2 }} />}>
                  <DatePicker
	                    label="Marriage End Date (optional)"
	                    value={linkExternalEndDate}
	                    onChange={(value) => setLinkExternalEndDate(value)}
	                    slotProps={{
	                      textField: {
	                        fullWidth: true,
	                        sx: { ...inputWithIconSx, mt: 2 },
	                        InputProps: {
	                          startAdornment: adornment(
	                            <FavoriteBorderOutlinedIcon fontSize="small" />,
	                          ),
	                        },
	                      },
	                    }}
	                    format="DD/MM/YYYY"
	                  />
                </Suspense>
              )}

              {selectedExternalPerson && (
                <Box
                  sx={{
                    mt: 2.5,
                    p: 1.75,
                    borderRadius: 2,
                    border: `1px solid ${brand.border}`,
                    bgcolor: brand.canvas,
                  }}
                >
                  <Typography variant="subtitle2" sx={{ mb: 1, color: brand.slate }}>
                    Review this change
                  </Typography>
                  {loadingExternalDetails ? (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <CircularProgress size={16} />
                      <Typography variant="body2" color="textSecondary">
                        Loading profile…
                      </Typography>
                    </Stack>
                  ) : (
                    <Typography variant="body2" sx={{ color: brand.slate }}>
                      Replacing placeholder <strong>{node.name}</strong> with{" "}
                      <strong>{selectedExternalPerson.name}</strong>
                      {selectedExternalPerson?.locationName
                        ? ` from ${selectedExternalPerson.locationName}`
                        : ""}
                      . This deletes <strong>{node.name}</strong>, connects{" "}
                      {selectedExternalPerson.name} as spouse
                      {node.children && node.children.length > 0
                        ? `, and moves ${node.children.length} child${
                            node.children.length === 1 ? "" : "ren"
                          } to them`
                        : ""}
                      .
                    </Typography>
                  )}

                  {!loadingExternalDetails &&
                    externalPersonDetails?.spouses &&
                    externalPersonDetails.spouses.length > 0 && (
                      <Box sx={{ mt: 1.5 }}>
                        <Alert severity="warning" sx={{ mb: 1 }}>
                          {selectedExternalPerson.name} already has a spouse in the
                          other tree:{" "}
                          <strong>
                            {externalPersonDetails.spouses
                              .map((s: any) => s.name)
                              .filter(Boolean)
                              .join(", ")}
                          </strong>
                          . How should we handle this?
                        </Alert>
                        <FormControl>
                          <RadioGroup
                            value={linkMode}
                            onChange={(e) => {
                              setLinkMode(e.target.value as "new" | "merge");
                              setMergeSpouseId("");
                            }}
                          >
                            <FormControlLabel
                              value="new"
                              control={<Radio size="small" />}
                              label={`Separate marriage — add ${selectedExternalPerson.name} as an additional spouse of ${anchorSpouseName}`}
                            />
                            <FormControlLabel
                              value="merge"
                              control={<Radio size="small" />}
                              label={`Same person — one of these is actually ${anchorSpouseName}; merge them`}
                            />
                          </RadioGroup>
                        </FormControl>

                        {linkMode === "merge" && (
                          <FormControl sx={{ mt: 1, ml: 3.5 }}>
                            <FormLabel sx={{ fontSize: 13 }}>
                              Which one is {anchorSpouseName}?
                            </FormLabel>
                            <RadioGroup
                              value={mergeSpouseId}
                              onChange={(e) => setMergeSpouseId(e.target.value)}
                            >
                              {externalPersonDetails.spouses.map((s: any) => (
                                <FormControlLabel
                                  key={s.id}
                                  value={s.id}
                                  control={<Radio size="small" />}
                                  label={`${s.name || "Unnamed"}${
                                    s.gender ? ` (${s.gender})` : ""
                                  }`}
                                />
                              ))}
                            </RadioGroup>
                            <Typography variant="caption" sx={{ color: "warning.main", mt: 0.5 }}>
                              Merging removes the selected person from the other
                              tree and moves their children/parents onto{" "}
                              {anchorSpouseName}.
                            </Typography>
                          </FormControl>
                        )}
                      </Box>
                    )}
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setView("details")}>Cancel</Button>
              <Button
                onClick={handleConfirmLinkExternal}
                disabled={
                  !selectedExternalPerson ||
                  linkExternalSubmitting ||
                  loadingExternalDetails ||
                  (externalPersonDetails?.spouses?.length > 0 &&
                    (linkMode === "" ||
                      (linkMode === "merge" && !mergeSpouseId)))
                }
                variant="contained"
                color="primary"
              >
                {linkExternalSubmitting ? "Submitting..." : "Link Real Profile"}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Dialog
        open={linkExternalConfirmOpen}
        onClose={() =>
          !linkExternalSubmitting && setLinkExternalConfirmOpen(false)
        }
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Confirm link</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2">
            This will delete the placeholder{" "}
            <strong>{node?.name}</strong> and replace it with{" "}
            <strong>{selectedExternalPerson?.name}</strong> from the other tree
            {node?.children && node.children.length > 0
              ? `, transferring ${node.children.length} child${
                  node.children.length === 1 ? "" : "ren"
                }`
              : ""}
            . This can’t be undone.
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, color: brand.slateMuted }}>
            {anchorSpouseName} and {selectedExternalPerson?.name}’s shared children
            (and their father’s-line descendants) will be moved into{" "}
            {anchorSpouseName}’s tree. Children from any other marriage stay where
            they are.
          </Typography>
          {externalPersonDetails?.spouses?.length > 0 && linkMode === "merge" && (
            <Alert severity="warning" sx={{ mt: 1.5 }}>
              <strong>
                {externalPersonDetails.spouses.find((s: any) => s.id === mergeSpouseId)
                  ?.name || "The selected spouse"}
              </strong>{" "}
              will be merged into <strong>{anchorSpouseName}</strong> and removed
              from the other tree — their children and parents move to{" "}
              {anchorSpouseName}, and any other marriages they have are removed.
            </Alert>
          )}
          {externalPersonDetails?.spouses?.length > 0 && linkMode === "new" && (
            <Alert severity="info" sx={{ mt: 1.5 }}>
              {selectedExternalPerson?.name} will be recorded as an additional
              spouse of {anchorSpouseName} (their existing marriage is kept).
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setLinkExternalConfirmOpen(false)}
            disabled={linkExternalSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={performLinkExternal}
            disabled={linkExternalSubmitting}
            variant="contained"
            color="error"
          >
            {linkExternalSubmitting ? "Replacing..." : "Replace"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={editSpouseDatesOpen}
        onClose={() => setEditSpouseDatesOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Edit Marriage Dates
          </Typography>
          <IconButton onClick={() => setEditSpouseDatesOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <FormControl fullWidth sx={{ ...inputWithIconSx, mb: 2 }}>
            <InputLabel>Spouse</InputLabel>
            <Select
              value={editSpouseId}
              onChange={(e) => handleChangeEditSpouse(e.target.value)}
              label="Spouse"
              startAdornment={adornment(<PersonOutlineOutlinedIcon fontSize="small" />)}
            >
              {(node?.spouses || []).map((rel: any) => {
                const spouseNode = nodes.find((n) => n.id === rel.id);
                return (
                  <MenuItem key={rel.id} value={rel.id}>
                    {spouseNode?.name || rel.id}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ ...inputWithIconSx, mb: 2 }}>
            <InputLabel>Relation Type</InputLabel>
            <Select
              value={editSpouseRelationSubtype}
              onChange={(e) => {
                const next = e.target.value as RelType;
                setEditSpouseRelationSubtype(next);
                if (next !== RelType.divorced) {
                  setEditSpouseEndDate(() => null);
                }
              }}
              label="Relation Type"
              startAdornment={adornment(<FavoriteBorderOutlinedIcon fontSize="small" />)}
            >
              <MenuItem value={RelType.married}>
                {titleCaseRelationType(RelType.married)}
              </MenuItem>
              <MenuItem value={RelType.divorced}>
                {titleCaseRelationType(RelType.divorced)}
              </MenuItem>
            </Select>
          </FormControl>

          <Suspense fallback={<TextField fullWidth label="Marriage Start Date" />}>
            <DatePicker
	              label="Marriage Start Date (optional)"
	              value={editSpouseStartDate}
	              onChange={(value) => setEditSpouseStartDate(value)}
	              slotProps={{
	                textField: {
	                  fullWidth: true,
	                  sx: { ...inputWithIconSx, mb: 2 },
	                  InputProps: {
	                    startAdornment: adornment(
	                      <FavoriteBorderOutlinedIcon fontSize="small" />,
	                    ),
	                  },
	                },
	              }}
	              format="DD/MM/YYYY"
	            />
          </Suspense>

          {editSpouseRelationSubtype === RelType.divorced && (
            <Suspense fallback={<TextField fullWidth label="Marriage End Date" />}>
              <DatePicker
	                label="Marriage End Date (optional)"
	                value={editSpouseEndDate}
	                onChange={(value) => setEditSpouseEndDate(value)}
	                slotProps={{
	                  textField: {
	                    fullWidth: true,
	                    sx: inputWithIconSx,
	                    InputProps: {
	                      startAdornment: adornment(
	                        <FavoriteBorderOutlinedIcon fontSize="small" />,
	                      ),
	                    },
	                  },
	                }}
	                format="DD/MM/YYYY"
	              />
            </Suspense>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditSpouseDatesOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSaveSpouseDates}
            variant="contained"
            disabled={!editSpouseId || isSavingSpouseDates}
          >
            {isSavingSpouseDates ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle
          sx={{
            color: "error.main",
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Confirm Delete
          </Typography>
          <IconButton onClick={() => setDeleteDialogOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, mb: 2 }}>
            <Typography variant="h6" color="text.primary">
              {node.name}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              display="block"
              sx={{
                mt: 0.5,
                fontStyle: "italic",
                bgcolor: "rgba(0,0,0,0.03)",
                p: 0.5,
                borderRadius: 1,
              }}
            >
              {node.hierarchy && node.hierarchy.length > 0
                ? `Hierarchy: ${node.hierarchy.map((h) => h.name).join(" > ")} > ${
                    node.name
                  }`
                : "Hierarchy: (Root Node)"}
            </Typography>
          </Box>
          {(node.children?.length || 0) > 0 ? (
            <Alert severity="warning" sx={{ mt: 1 }}>
              {node.name || "This person"} has{" "}
              <strong>
                {node.children!.length} child
                {node.children!.length === 1 ? "" : "ren"}
              </strong>{" "}
              and can’t be deleted. Only people with no children can be removed —
              remove or reattach the {node.children!.length === 1 ? "child" : "children"} first.
            </Alert>
          ) : (
            <>
              <Typography>Are you sure you want to delete this person?</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                This action cannot be undone. All relationships, custom details,
                business/profession links, and account linking for this person
                will be removed.
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
            disabled={(node.children?.length || 0) > 0}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {node && (
        <Dialog
          open={selfLinkConfirmOpen}
          onClose={() => !selfLinkRequesting && setSelfLinkConfirmOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {selfLinkNameMismatch && (
              <WarningAmberRoundedIcon fontSize="small" color="warning" />
            )}
            <Typography
              variant="h6"
              component="div"
              sx={{ flexGrow: 1, color: selfLinkNameMismatch ? "warning.main" : undefined }}
            >
              {selfLinkNameMismatch ? "Name doesn't match" : "Link this profile?"}
            </Typography>
            <IconButton
              onClick={() => setSelfLinkConfirmOpen(false)}
              size="small"
              disabled={selfLinkRequesting}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 1, mb: 2 }}>
              <Typography variant="h6" color="text.primary">
                {node.name}
              </Typography>
            </Box>
            {selfLinkNameMismatch && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                <strong>{node.name}</strong> doesn't match your name
                {userProfile?.name ? (
                  <>
                    {" "}
                    (<strong>{userProfile.name}</strong>)
                  </>
                ) : null}
                .
              </Alert>
            )}
            <Typography>Are you sure this is you?</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              We'll send a request to the tree owner to link your account to this
              profile. You'll be able to manage your branch once it's approved.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setSelfLinkConfirmOpen(false)}
              disabled={selfLinkRequesting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmSelfLink}
              variant="contained"
              color={selfLinkNameMismatch ? "warning" : "primary"}
              disabled={selfLinkRequesting}
              startIcon={
                selfLinkRequesting ? (
                  <CircularProgress size={16} color="inherit" />
                ) : undefined
              }
            >
              {selfLinkRequesting
                ? "Sending…"
                : selfLinkNameMismatch
                  ? "Yes, link anyway"
                  : "Yes, this is me"}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {node && (
        <BusinessFormDialog
          open={businessDialogOpen}
          onClose={() => setBusinessDialogOpen(false)}
          business={editingBusiness}
          personId={node.id}
          defaultContact={phoneFromCustomFields(displayCustomFields)}
          onSaved={() => void refreshBusinesses()}
        />
      )}

      {node && (
        <ProfessionFormDialog
          open={professionDialogOpen}
          onClose={() => setProfessionDialogOpen(false)}
          personId={node.id}
          onSaved={() => void refreshProfessions()}
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
    </>
  );
});
