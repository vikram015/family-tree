import React, { memo, useCallback, useState, useEffect, Suspense } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  IconButton,
  TextField,
  Button,
  CircularProgress,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
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
import { RelType, Gender } from "relatives-tree/lib/types";
import AddNode from "../AddNode/AddNode";
import { FNode } from "../model/FNode";
import { Relations } from "./Relations";
import { AdditionalDetails } from "../AdditionalDetails/AdditionalDetails";
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
  ) => Promise<string | undefined> | Promise<void> | void;
  onUpdate?: (nodeId: string, updates: Partial<FNode>) => void;
  onDelete?: (nodeId: string) => void;
  canEditNode?: (nodeId: string) => boolean;
  treeId?: string;
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
    onDelete,
    canEditNode,
    treeId,
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
  const [mobileAddSaveAction, setMobileAddSaveAction] = useState<{
    onClick: () => void;
    disabled: boolean;
    saving: boolean;
  } | null>(null);

  const { currentUser } = useAuth() as any;
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
    }
  }, [node, initialView, parsePickerValue]);

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
    ): Promise<string | undefined> => {
      if (!onAdd) {
        return undefined;
      }
      const result = await onAdd(n, r, t, type, op);
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
      // addSpouse(targetId, spouseId, placeholderId)
      // targetId = spouse.id (The person staying in the tree)
      // spouseId = selectedExternalPerson.id (The new person coming in)
      // placeholderId = node.id (The person leaving)
      await ApiService.addSpouse(
        spouse.id,
        selectedExternalPerson.id,
        linkExternalRelationSubtype,
        formatPickerDate(linkExternalStartDate),
        formatPickerDate(linkExternalEndDate),
        node.id,
      );

      alert("Successfully linked. The page will reload to reflect changes.");
      window.location.reload();
    } catch (error: any) {
      console.error("Link external error:", error);
      alert("Failed to link: " + (error.message || error));
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
                      Family profile
                    </Typography>
                  </Box>
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
                  <Typography variant="body2" color="text.secondary">
                    {node.gender === Gender.male
                      ? "Male"
                      : node.gender === Gender.female
                        ? "Female"
                        : "Other"}
                    {node.dob && ` • Born ${formatDisplayDate(node.dob)}`}
                    {node.isAlive === false && ` • Deceased`}
                    {node.isAlive === false &&
                      node.deceasedDate &&
                      ` (${formatDisplayDate(node.deceasedDate)})`}
                  </Typography>
                  {node.bloodGroup && (
                    <Typography variant="body2" color="text.secondary">
                      🩸 Blood Group: <strong>{node.bloodGroup}</strong>
                    </Typography>
                  )}
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
                        slotProps={{ textField: { fullWidth: true } }}
                        format="DD/MM/YYYY"
                      />
                    </Suspense>
                    <FormControl sx={{ m: 0 }}>
                      <FormLabel sx={{ mb: 0.5 }}>Gender</FormLabel>
                      <RadioGroup
                        row
                        sx={{ gap: 1.5 }}
                        value={editedGender}
                        onChange={(e) => setEditedGender(e.target.value as Gender)}
                      >
                        <FormControlLabel
                          value={Gender.male}
                          control={<Radio />}
                          label="Male"
                        />
                        <FormControlLabel
                          value={Gender.female}
                          control={<Radio />}
                          label="Female"
                        />
                        <FormControlLabel
                          value={"other" as Gender}
                          control={<Radio />}
                          label="Other"
                        />
                      </RadioGroup>
                    </FormControl>
                  </Stack>
                </Paper>

                <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700 }}>
                    Life details
                  </Typography>
                  <Stack spacing={2}>
                <FormControl fullWidth>
                  <InputLabel>Blood Group</InputLabel>
                  <Select
                    value={editedBloodGroup}
                    onChange={(e) => setEditedBloodGroup(e.target.value)}
                    label="Blood Group"
                  >
                    <MenuItem value="">Unknown</MenuItem>
                    <MenuItem value="A+">A+</MenuItem>
                    <MenuItem value="A-">A−</MenuItem>
                    <MenuItem value="B+">B+</MenuItem>
                    <MenuItem value="B-">B−</MenuItem>
                    <MenuItem value="AB+">AB+</MenuItem>
                    <MenuItem value="AB-">AB−</MenuItem>
                    <MenuItem value="O+">O+</MenuItem>
                    <MenuItem value="O-">O−</MenuItem>
                  </Select>
                </FormControl>
                <FormControlLabel
                  sx={{ m: 0 }}
                  control={
                    <Switch
                      checked={editedIsAlive}
                      onChange={(e) => {
                        setEditedIsAlive(e.target.checked);
                        if (e.target.checked) setEditedDeceasedDate(null);
                      }}
                    />
                  }
                  label="Is Alive"
                />
                {!editedIsAlive && (
                  <Suspense
                    fallback={<TextField fullWidth label="Deceased Date" />}
                  >
                    <DatePicker
                      label="Deceased Date"
                      value={editedDeceasedDate}
                      onChange={(value) => setEditedDeceasedDate(value)}
                      slotProps={{ textField: { fullWidth: true } }}
                      format="DD/MM/YYYY"
                    />
                  </Suspense>
                )}
                  </Stack>
                </Paper>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700 }}>
                    Additional details
                  </Typography>
                  <AdditionalDetails
                    value={editedCustomFields}
                    onChange={setEditedCustomFields}
                    showUpfrontFields={false}
                  />
                </Paper>
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

              <FormControl fullWidth margin="normal">
                <InputLabel>Village</InputLabel>
                <Select
                  value={linkExternalVillageId}
                  onChange={(e) => setLinkExternalVillageId(e.target.value)}
                  label="Village"
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
              />

              <FormControl fullWidth sx={{ mt: 2 }}>
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
                >
                  <MenuItem value={RelType.married}>married</MenuItem>
                  <MenuItem value={RelType.divorced}>divorced</MenuItem>
                </Select>
              </FormControl>

              <Suspense fallback={<TextField fullWidth label="Marriage Start Date" sx={{ mt: 2 }} />}>
                <DatePicker
                  label="Marriage Start Date (optional)"
                  value={linkExternalStartDate}
                  onChange={(value) => setLinkExternalStartDate(value)}
                  slotProps={{ textField: { fullWidth: true, sx: { mt: 2 } } }}
                  format="DD/MM/YYYY"
                />
              </Suspense>

              {linkExternalRelationSubtype === RelType.divorced && (
                <Suspense fallback={<TextField fullWidth label="Marriage End Date" sx={{ mt: 2 }} />}>
                  <DatePicker
                    label="Marriage End Date (optional)"
                    value={linkExternalEndDate}
                    onChange={(value) => setLinkExternalEndDate(value)}
                    slotProps={{ textField: { fullWidth: true, sx: { mt: 2 } } }}
                    format="DD/MM/YYYY"
                  />
                </Suspense>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setView("details")}>Cancel</Button>
              <Button
                onClick={handleConfirmLinkExternal}
                disabled={!selectedExternalPerson}
                variant="contained"
                color="primary"
              >
                Link & Replace
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
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Spouse</InputLabel>
            <Select
              value={editSpouseId}
              onChange={(e) => handleChangeEditSpouse(e.target.value)}
              label="Spouse"
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

          <FormControl fullWidth sx={{ mb: 2 }}>
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
            >
              <MenuItem value={RelType.married}>married</MenuItem>
              <MenuItem value={RelType.divorced}>divorced</MenuItem>
            </Select>
          </FormControl>

          <Suspense fallback={<TextField fullWidth label="Marriage Start Date" />}>
            <DatePicker
              label="Marriage Start Date (optional)"
              value={editSpouseStartDate}
              onChange={(value) => setEditSpouseStartDate(value)}
              slotProps={{ textField: { fullWidth: true, sx: { mb: 2 } } }}
              format="DD/MM/YYYY"
            />
          </Suspense>

          {editSpouseRelationSubtype === RelType.divorced && (
            <Suspense fallback={<TextField fullWidth label="Marriage End Date" />}>
              <DatePicker
                label="Marriage End Date (optional)"
                value={editSpouseEndDate}
                onChange={(value) => setEditSpouseEndDate(value)}
                slotProps={{ textField: { fullWidth: true } }}
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
    </>
  );
});
