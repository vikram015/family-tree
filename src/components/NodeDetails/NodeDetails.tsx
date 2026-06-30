import React, { memo, useCallback, useState, useEffect, useMemo, Suspense } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
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
import PersonAddAlt1OutlinedIcon from "@mui/icons-material/PersonAddAlt1Outlined";
import ShareOutlinedIcon from "@mui/icons-material/ShareOutlined";
import LockOpenOutlinedIcon from "@mui/icons-material/LockOpenOutlined";
import { Relations } from "./Relations";
import { AdditionalDetails } from "../AdditionalDetails/AdditionalDetails";
import { BusinessFormDialog } from "../Business/BusinessFormDialog";
import { businessCategoryLabel } from "../Business/businessCategories";
import { phoneFromCustomFields } from "../Business/businessContact";
import { HindiNameInput } from "../HindiNameInput/HindiNameInput";
import { useAuth } from "../hooks/useAuth";
import { useLoginModal } from "../context/LoginModalContext";
import { ApiService } from "../../services/apiService";
import { PersonSearchField } from "../BusinessPage/PersonSearchField";
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
  const [villages, setVillages] = useState<any[]>([]);
  const [linkExternalVillageId, setLinkExternalVillageId] = useState("");
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
  const [businessDialogOpen, setBusinessDialogOpen] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<any | null>(null);
  const [requestingAccess, setRequestingAccess] = useState(false);
  const [branchAccessRequested, setBranchAccessRequested] = useState(false);
  const [mobileAddSaveAction, setMobileAddSaveAction] = useState<{
    onClick: () => void;
    disabled: boolean;
    saving: boolean;
  } | null>(null);

  const { currentUser, userProfile, isSuperAdmin } = useAuth() as any;
  const { openLoginModal } = useLoginModal();

  useEffect(() => {
    if (view === "link-external" && villages.length === 0) {
      ApiService.getVillages().then((data) => setVillages(data));
    }
  }, [view, villages.length]);

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

      // Fetch this person's businesses for the Business section
      ApiService.getBusinessesByPerson(node.id)
        .then((biz) => setBusinesses(biz || []))
        .catch(() => setBusinesses([]));

      setBranchAccessRequested(false);
    }
  }, [node, initialView, parsePickerValue]);

  const refreshBusinesses = useCallback(async () => {
    if (!node) return;
    try {
      const biz = await ApiService.getBusinessesByPerson(node.id);
      setBusinesses(biz || []);
    } catch {
      setBusinesses([]);
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
        alert("Profile link copied to clipboard.");
      }
    } catch {
      // Share was cancelled or clipboard failed — nothing to do.
    }
  }, [node, treeId]);

  const handleRequestBranchAccess = useCallback(async () => {
    if (!node || !treeId) return;
    setRequestingAccess(true);
    try {
      await ApiService.createBranchAccessRequest({
        targetTreeId: treeId,
        targetPersonId: node.id,
      });
      setBranchAccessRequested(true);
      alert(`Branch access request sent for ${node.name || "this"} branch.`);
    } catch (error: any) {
      alert(error?.message || "Failed to request branch access.");
    } finally {
      setRequestingAccess(false);
    }
  }, [node, treeId]);

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

  const handleLinkExternalClick = useCallback(() => {
    if (!currentUser) {
      openLoginModal(() => {
        setLinkExternalRelationSubtype(RelType.married);
        setLinkExternalStartDate(null);
        setLinkExternalEndDate(null);
        setView("link-external");
      });
      return;
    }
    setLinkExternalRelationSubtype(RelType.married);
    setLinkExternalStartDate(null);
    setLinkExternalEndDate(null);
    setView("link-external");
  }, [currentUser, openLoginModal]);

  const handleConfirmLinkExternal = async () => {
    if (!node || !selectedExternalPerson) return;
    if (
      linkExternalStartDate &&
      linkExternalEndDate &&
      linkExternalEndDate.isBefore(linkExternalStartDate, "day")
    ) {
      alert("Marriage end date cannot be before marriage start date.");
      return;
    }

    // Find spouse of current node
    const spouse =
      node.spouses && node.spouses.length > 0 ? node.spouses[0] : null;

    if (!spouse) {
      alert(
        "This person must have a spouse in the current tree to use this replacement feature.",
      );
      return;
    }

    // Logic: Node (Placeholder) <-> Spouse (Target)
    // We want: New Person <-> Spouse (Target)
    // And delete Node (Placeholder)

    if (
      !window.confirm(
        `Are you sure you want to replace "${node.name}" with "${selectedExternalPerson.name}" from the other tree? This will delete "${node.name}" and transfer children.`,
      )
    ) {
      return;
    }

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
        );

        alert("Successfully linked. The page will reload to reflect changes.");
        window.location.reload();
        return;
      }

      await ApiService.createSpouseLinkRequest({
        personId1: spouse.id,
        personId2: selectedExternalPerson.id,
        relationSubtype: linkExternalRelationSubtype,
        relationStartDate,
        relationEndDate,
        replacePersonId: node.id,
        requestMessage: `Request to replace ${node.name} with ${selectedExternalPerson.name} as spouse of ${
          nodes.find((candidate) => candidate.id === spouse.id)?.name || "the selected person"
        }.`,
      });

      window.dispatchEvent(new Event("link-requests-updated"));
      alert("Spouse link request raised. The other tree owner or a superadmin can approve it.");
      setView("details");
    } catch (error: any) {
      console.error("Link external error:", error);
      alert("Failed to link: " + (error.message || error));
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
      alert("Marriage end date cannot be before marriage start date.");
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
      alert("Failed to update spouse dates: " + (error?.message || error));
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
  const canEditCurrentNode = canEditNode ? canEditNode(node.id) : true;
  const isSuperAdminUser = typeof isSuperAdmin === "function" ? isSuperAdmin() : Boolean(isSuperAdmin);
  // Superadmins already have full access, so they never need to request branch access.
  const canRequestBranchAccess = Boolean(
    currentUser && !isSuperAdminUser && !canEditCurrentNode && treeId,
  );
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
                            Link & Replace
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
                        <Button
                          variant="outlined"
                          color="secondary"
                          startIcon={<LockOpenOutlinedIcon />}
                          onClick={handleRequestBranchAccess}
                          disabled={requestingAccess || branchAccessRequested}
                        >
                          {branchAccessRequested
                            ? "Access Requested"
                            : requestingAccess
                              ? "Requesting…"
                              : "Request Branch Access"}
                        </Button>
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

                <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ mb: businesses.length > 0 ? 1.5 : 0 }}
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
                </Paper>

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
                                alert(
                                  `Failed to upload photo: ${
                                    err instanceof Error
                                      ? err.message
                                      : String(err)
                                  }`,
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
                            previewSize={112}
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
                <Accordion variant="outlined" sx={{ borderRadius: 3, "&:before": { display: "none" } }}>
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
                Link {node.name} to External Tree
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

              <FormControl fullWidth margin="normal" sx={inputWithIconSx}>
                <InputLabel>Village</InputLabel>
                <Select
                  value={linkExternalVillageId}
                  onChange={(e) => setLinkExternalVillageId(e.target.value)}
                  label="Village"
                  startAdornment={adornment(<LocationOnOutlinedIcon fontSize="small" />)}
                >
                  {villages.map((v) => (
                    <MenuItem key={v.id} value={v.id}>
                      {v.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <PersonSearchField
                searchValue={externalSearchValue}
                onSearchValueChange={setExternalSearchValue}
                onPersonSelect={(p) => setSelectedExternalPerson(p)}
                selectedPerson={selectedExternalPerson}
                villageId={linkExternalVillageId}
                disabled={!linkExternalVillageId}
                placeholder="Search for waiting spouse..."
                label="Select Real Person"
                startIcon={<PersonOutlineOutlinedIcon fontSize="small" />}
              />

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
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setView("details")}>Cancel</Button>
              <Button
                onClick={handleConfirmLinkExternal}
                disabled={!selectedExternalPerson || linkExternalSubmitting}
                variant="contained"
                color="primary"
              >
                {linkExternalSubmitting ? "Submitting..." : "Link & Replace"}
              </Button>
            </DialogActions>
          </>
        )}
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
          <Typography>Are you sure you want to delete this person?</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This action cannot be undone. All relationships to this person will
            be removed.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

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
    </>
  );
});
