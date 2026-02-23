import React, { memo, useCallback, useState, useEffect, Suspense } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  IconButton,
  Divider,
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
} from "@mui/material";
import dayjs from "dayjs";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import LinkIcon from "@mui/icons-material/Link";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { RelType, Gender } from "relatives-tree/lib/types";
import AddNode from "../AddNode/AddNode";
import { FNode } from "../model/FNode";
import { Relations } from "./Relations";
import { AdditionalDetails } from "../AdditionalDetails/AdditionalDetails";
import { useAuth } from "../hooks/useAuth";
import { useLoginModal } from "../context/LoginModalContext";
import { SupabaseService } from "../../services/supabaseService";
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
  treeId?: string;
  /** Open directly in a specific view (e.g. "add" when clicking a placeholder) */
  initialView?: "details" | "edit" | "add";
  /** Pre-selected relation info when opening in "add" view from a placeholder */
  initialAddInfo?: {
    relation: "child" | "spouse" | "parent";
    gender?: string;
  };
}

const EXCLUDED_FIELDS = ["Gotra", "Village", "Note"];

export const NodeDetails = memo(function NodeDetails({
  node,
  nodes,
  className,
  initialView,
  initialAddInfo,
  ...props
}: NodeDetailsProps) {
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

  // Edit State
  const [editedName, setEditedName] = useState("");
  const [editedDob, setEditedDob] = useState("");
  const [editedNotes, setEditedNotes] = useState("");
  const [editedGender, setEditedGender] = useState<Gender>(Gender.male);
  const [editedGotra, setEditedGotra] = useState("");
  const [editedVillage, setEditedVillage] = useState("");
  const [editedCustomFields, setEditedCustomFields] = useState<
    Record<string, string>
  >({});

  // New fields state
  const [editedBloodGroup, setEditedBloodGroup] = useState("");
  const [editedIsAlive, setEditedIsAlive] = useState(true);
  const [editedDeceasedDate, setEditedDeceasedDate] = useState("");

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

  const { currentUser } = useAuth() as any;
  const { openLoginModal } = useLoginModal();

  useEffect(() => {
    if (view === "link-external" && villages.length === 0) {
      SupabaseService.getVillages().then((data) => setVillages(data));
    }
  }, [view, villages.length]);

  // Reset view and values when node changes
  useEffect(() => {
    if (node) {
      setView(initialView || "details");
      setEditedName(node.name || "");
      setEditedDob(node.dob || "");
      setEditedNotes(node.notes || "");
      setEditedGender(node.gender || Gender.male);

      // Initial values from node (will be updated by fetch)
      setEditedGotra(node.customFields?.["Gotra"] || "");
      setEditedVillage(node.customFields?.["Village"] || "");
      setEditedCustomFields(node.customFields || {});
      setDisplayCustomFields(node.customFields || {});
      setEditedBloodGroup(node.bloodGroup || "");
      setEditedIsAlive(node.isAlive !== false);
      setEditedDeceasedDate(node.deceasedDate || "");
      setEditedPhotoPreview(node.photo || undefined);

      // Fetch latest custom fields separately
      SupabaseService.getPersonCustomFields(node.id).then((fields) => {
        setEditedCustomFields(fields);
        setEditedGotra(fields["Gotra"] || "");
        setEditedVillage(fields["Village"] || "");
        // Check local property first, then fallback to custom field "Note"
        setEditedNotes(node.notes || fields["Note"] || "");
        setDisplayCustomFields(fields);
      });
    }
  }, [node, initialView]);

  const isOpen = !!node;
  useEffect(() => {
    if (isOpen) {
      window.history.pushState({ nodeDetailsOpen: true }, "");

      const handlePopState = () => {
        props.onSelect(undefined);
        setView("details");
      };

      window.addEventListener("popstate", handlePopState);

      return () => {
        window.removeEventListener("popstate", handlePopState);
      };
    }
  }, [isOpen, props]);

  const closeHandler = useCallback(() => {
    if (window.history.state?.nodeDetailsOpen) {
      window.history.back();
    } else {
      props.onSelect(undefined);
      setView("details");
    }
  }, [props]);

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
    if (node && props.onUpdate) {
      try {
        setIsSavingEdit(true);
        const updates: Partial<FNode> = {
          name: editedName.trim(),
          dob: editedDob.trim(),
          gender: editedGender,
          bloodGroup: editedBloodGroup || undefined,
          isAlive: editedIsAlive,
          deceasedDate:
            !editedIsAlive && editedDeceasedDate
              ? editedDeceasedDate
              : undefined,
          // We save notes into customFields under "Note" now, not as a core property
          customFields: {
            ...editedCustomFields,
            Gotra: editedGotra.trim(),
            Village: editedVillage.trim(),
            Note: editedNotes.trim(),
          },
        };
        await props.onUpdate(node.id, updates);
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
    editedDob,
    editedNotes,
    editedGender,
    editedCustomFields,
    editedGotra,
    editedVillage,
    editedBloodGroup,
    editedIsAlive,
    editedDeceasedDate,
    props,
  ]);

  const handleConfirmDelete = useCallback(() => {
    if (node && props.onDelete) {
      props.onDelete(node.id);
      closeHandler();
    }
  }, [node, props, closeHandler]);

  const handleLinkExternalClick = useCallback(() => {
    if (!currentUser) {
      openLoginModal(() => {
        setView("link-external");
      });
      return;
    }
    setView("link-external");
  }, [currentUser, openLoginModal]);

  const handleConfirmLinkExternal = async () => {
    if (!node || !selectedExternalPerson) return;

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
      await SupabaseService.addSpouse(
        spouse.id,
        selectedExternalPerson.id,
        node.id,
      );

      alert("Successfully linked. The page will reload to reflect changes.");
      window.location.reload();
    } catch (error: any) {
      console.error("Link external error:", error);
      alert("Failed to link: " + (error.message || error));
    }
  };

  const relNodeMapper = useCallback(
    (rel: any) => {
      const foundNode = nodes.find((n) => n.id === rel.id);
      if (!foundNode) return null;
      return {
        ...foundNode,
        type: rel.type,
      };
    },
    [nodes],
  );

  if (!node) return null;

  const parents = node.parents?.map(relNodeMapper).filter(Boolean) || [];
  const children = node.children?.map(relNodeMapper).filter(Boolean) || [];
  const siblings = node.siblings?.map(relNodeMapper).filter(Boolean) || [];
  const spouses = node.spouses?.map(relNodeMapper).filter(Boolean) || [];

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
                {/* Photo & Basic Info */}
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    mb: 2,
                  }}
                >
                  {node.photo ? (
                    <img
                      src={node.photo}
                      alt={node.name}
                      style={{
                        width: 120,
                        height: 120,
                        borderRadius: "50%",
                        objectFit: "cover",
                        marginBottom: 16,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      }}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: 120,
                        height: 120,
                        borderRadius: "50%",
                        bgcolor: "action.hover",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        mb: 2,
                        fontSize: 48,
                        fontWeight: "bold",
                        color: "text.secondary",
                      }}
                    >
                      {node.name.charAt(0)}
                    </Box>
                  )}
                  <Typography variant="subtitle1" color="text.secondary">
                    {node.gender === Gender.male
                      ? "Male"
                      : node.gender === Gender.female
                        ? "Female"
                        : "Other"}
                    {node.dob && ` • Born ${node.dob}`}
                    {node.isAlive === false && ` • Deceased`}
                    {node.isAlive === false &&
                      node.deceasedDate &&
                      ` (${node.deceasedDate})`}
                  </Typography>
                  {node.bloodGroup && (
                    <Typography variant="body2" color="text.secondary">
                      🩸 Blood Group: <strong>{node.bloodGroup}</strong>
                    </Typography>
                  )}
                </Box>

                {/* Action Buttons */}
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
                  >
                    Edit
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleAddClick}
                  >
                    Add Relative
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={handleDeleteClick}
                  >
                    Delete
                  </Button>
                  {/* Only show "Link & Replace" if the node belongs to the current tree (is local/placeholder) 
                    AND is a spouse (has accumulated no parents in this tree, but has a spouse) */}
                  {(!props.treeId || node.treeId === props.treeId) &&
                    (!node.parents || node.parents.length === 0) &&
                    node.spouses &&
                    node.spouses.length > 0 && (
                      <Button
                        variant="outlined"
                        color="info"
                        startIcon={<LinkIcon />}
                        onClick={handleLinkExternalClick}
                      >
                        Link & Replace
                      </Button>
                    )}
                </Box>

                {/* Details List */}
                <Stack spacing={1}>
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
                        Notes:
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ whiteSpace: "pre-wrap", color: "text.secondary" }}
                      >
                        {node.notes}
                      </Typography>
                    </Box>
                  )}
                  {displayCustomFields &&
                    Object.keys(displayCustomFields).length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Typography
                          variant="subtitle2"
                          color="text.secondary"
                          sx={{ mb: 1 }}
                        >
                          Additional Details
                        </Typography>
                        {Object.entries(displayCustomFields || {}).map(
                          ([key, value]) => (
                            <Typography key={key} variant="body2">
                              <strong>{key}:</strong> {value}
                            </Typography>
                          ),
                        )}
                      </Box>
                    )}
                </Stack>

                {/* Ancestry */}
                {node.hierarchy && node.hierarchy.length > 0 && (
                  <Box>
                    <Typography
                      variant="subtitle2"
                      sx={{ mb: 1, color: "primary.main" }}
                    >
                      Ancestry
                    </Typography>
                    <Box sx={{ pl: 1, borderLeft: 2, borderColor: "divider" }}>
                      {node.hierarchy.map((ancestor, i) => (
                        <Typography
                          key={ancestor.id}
                          variant="caption"
                          display="block"
                          sx={{ ml: i * 1 }}
                        >
                          {i > 0 && "↳ "} {ancestor.name}
                        </Typography>
                      ))}
                    </Box>
                  </Box>
                )}

                <Divider />

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
              <IconButton onClick={() => setView("details")} size="small">
                <ArrowBackIcon />
              </IconButton>
              Edit {node.name}
            </DialogTitle>
            <DialogContent dividers>
              <Stack spacing={3} sx={{ pt: 1 }}>
                {/* Photo Upload with Cropper */}
                <Suspense fallback={<Box sx={{ height: 96 }} />}>
                  <ImageCropper
                    currentPhoto={editedPhotoPreview}
                    onCropped={async (blob) => {
                      if (!node) return;
                      try {
                        setPhotoUploading(true);
                        const url = await SupabaseService.uploadPersonPhoto(
                          node.id,
                          blob,
                        );
                        setEditedPhotoPreview(url);
                      } catch (err) {
                        console.error("Photo upload failed:", err);
                        alert("Failed to upload photo. Please try again.");
                      } finally {
                        setPhotoUploading(false);
                      }
                    }}
                    onRemove={async () => {
                      if (!node) return;
                      try {
                        setPhotoUploading(true);
                        await SupabaseService.removePersonPhoto(node.id);
                        setEditedPhotoPreview(undefined);
                      } catch (err) {
                        console.error("Photo remove failed:", err);
                      } finally {
                        setPhotoUploading(false);
                      }
                    }}
                    uploading={photoUploading}
                    previewSize={80}
                  />
                </Suspense>

                <TextField
                  label="Name"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  fullWidth
                  required
                />
                <Suspense
                  fallback={<TextField fullWidth label="Date of Birth" />}
                >
                  <DatePicker
                    label="Date of Birth"
                    value={editedDob ? dayjs(editedDob) : null}
                    onChange={(val) =>
                      setEditedDob(val ? val.format("YYYY-MM-DD") : "")
                    }
                    slotProps={{ textField: { fullWidth: true } }}
                    format="DD/MM/YYYY"
                  />
                </Suspense>
                <TextField
                  label="Gotra"
                  value={editedGotra}
                  onChange={(e) => setEditedGotra(e.target.value)}
                  fullWidth
                />
                <TextField
                  label="Village"
                  value={editedVillage}
                  onChange={(e) => setEditedVillage(e.target.value)}
                  fullWidth
                />
                <TextField
                  label="Notes"
                  value={editedNotes}
                  onChange={(e) => setEditedNotes(e.target.value)}
                  fullWidth
                  multiline
                  rows={3}
                />
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
                  control={
                    <Switch
                      checked={editedIsAlive}
                      onChange={(e) => {
                        setEditedIsAlive(e.target.checked);
                        if (e.target.checked) setEditedDeceasedDate("");
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
                      value={
                        editedDeceasedDate ? dayjs(editedDeceasedDate) : null
                      }
                      onChange={(val) =>
                        setEditedDeceasedDate(
                          val ? val.format("YYYY-MM-DD") : "",
                        )
                      }
                      slotProps={{ textField: { fullWidth: true } }}
                      format="DD/MM/YYYY"
                    />
                  </Suspense>
                )}
                <FormControl>
                  <FormLabel>Gender</FormLabel>
                  <RadioGroup
                    row
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
                  </RadioGroup>
                </FormControl>
                <Divider />
                <AdditionalDetails
                  value={editedCustomFields}
                  onChange={setEditedCustomFields}
                  excludeFields={EXCLUDED_FIELDS}
                />
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
                onAdd={async (
                  n,
                  r,
                  t,
                  type,
                  op,
                ): Promise<string | undefined> => {
                  if (props.onAdd) {
                    const result = await props.onAdd(n, r, t, type, op);
                    return typeof result === "string" ? result : undefined;
                  }
                  return undefined;
                }}
                onCancel={closeHandler}
                onComplete={() => props.onSelect(undefined)}
                noCard
              />
            </DialogContent>
          </>
        )}

        {/* View delete block moved to separate Dialog */}

        {view === "link-external" && (
          <>
            <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <IconButton onClick={() => setView("details")} size="small">
                <ArrowBackIcon />
              </IconButton>
              Link {node.name} to External Tree
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
