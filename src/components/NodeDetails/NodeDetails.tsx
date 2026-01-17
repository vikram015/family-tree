import React, { memo, useCallback, useState, useEffect } from "react";
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Divider,
  TextField,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Stack,
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import DeleteIcon from "@mui/icons-material/Delete";
import { Gender } from "relatives-tree/lib/types";
import { FNode } from "../model/FNode";
import { Relations } from "./Relations";
import { AdditionalDetails } from "../AdditionalDetails/AdditionalDetails";
import { useAuth } from "../context/AuthContext";
import { useLoginModal } from "../context/LoginModalContext";

interface NodeDetailsProps {
  node: Readonly<FNode> | null;
  nodes: Readonly<FNode>[];
  className?: string;
  onSelect: (nodeId: string | undefined) => void;
  onHover: (nodeId: string) => void;
  onClear: () => void;
  // callback to update node details
  onUpdate?: (nodeId: string, updates: Partial<FNode>) => void;
  // callback to delete node and its relations
  onDelete?: (nodeId: string) => void;
}

export const NodeDetails = memo(function NodeDetails({
  node,
  nodes,
  className,
  ...props
}: NodeDetailsProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [editedDob, setEditedDob] = useState("");
  const [editedDod, setEditedDod] = useState("");
  const [editedPlace, setEditedPlace] = useState("");
  const [editedNotes, setEditedNotes] = useState("");
  const [editedPhoto, setEditedPhoto] = useState("");
  const [editedGender, setEditedGender] = useState<Gender>(Gender.male);
  const [editedCustomFields, setEditedCustomFields] = useState<
    Record<string, string>
  >({});
  const { currentUser } = useAuth() as any;
  const { openLoginModal } = useLoginModal();

  // Reset edit mode when node changes
  useEffect(() => {
    if (node) {
      setEditedName(node.name || "");
      setEditedDob(node.dob || "");
      setEditedDod(node.dod || "");
      setEditedPlace(node.place || "");
      setEditedNotes(node.notes || "");
      setEditedPhoto(node.photo || "");
      setEditedGender(node.gender || Gender.male);
      setEditedCustomFields(node.customFields || {});
      setIsEditMode(false);
    }
  }, [node]);

  // Handle back button to close drawer on mobile
  useEffect(() => {
    if (!node) return;

    // Push a new history state when drawer opens
    window.history.pushState({ drawerOpen: true }, "");

    const handlePopState = (event: PopStateEvent) => {
      // Close the drawer when back button is pressed
      props.onSelect(undefined);
      setIsEditMode(false);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [node, props]);

  const closeHandler = useCallback(() => {
    props.onSelect(undefined);
    setIsEditMode(false);
  }, [props]);

  const handleEditClick = useCallback(() => {
    if (!currentUser) {
      openLoginModal(() => {
        // After successful login, enter edit mode
        setIsEditMode(true);
      });
      return;
    }
    setIsEditMode(true);
  }, [currentUser, openLoginModal]);

  const handleSaveClick = useCallback(async () => {
    if (node && props.onUpdate) {
      try {
        const updates = {
          name: editedName.trim(),
          dob: editedDob.trim(),
          dod: editedDod.trim() || undefined,
          place: editedPlace.trim() || undefined,
          notes: editedNotes.trim() || undefined,
          photo: editedPhoto.trim() || undefined,
          gender: editedGender,
          customFields: editedCustomFields, // Always include, even if empty
        };
        console.log("NodeDetails: Calling onUpdate with:", updates);
        await props.onUpdate(node.id, updates);
        console.log("NodeDetails: Update completed");
      } catch (err) {
        console.error("NodeDetails: Error during update:", err);
      }
    }
    setIsEditMode(false);
  }, [
    node,
    editedName,
    editedDob,
    editedDod,
    editedPlace,
    editedNotes,
    editedPhoto,
    editedGender,
    editedCustomFields,
    props,
  ]);

  const handleCancelEdit = useCallback(() => {
    if (node) {
      setEditedName(node.name || "");
      setEditedDob(node.dob || "");
      setEditedDod(node.dod || "");
      setEditedPlace(node.place || "");
      setEditedNotes(node.notes || "");
      setEditedPhoto(node.photo || "");
      setEditedGender(node.gender || Gender.male);
      setEditedCustomFields(node.customFields || {});
    }
    setIsEditMode(false);
  }, [node]);

  const handleDeleteClick = useCallback(() => {
    if (!node) return;

    if (!currentUser) {
      openLoginModal(() => {
        // After successful login, prompt for delete confirmation
        const confirmDelete = window.confirm(
          `Are you sure you want to delete ${node.name}? This will remove them from the tree and unlink all their relationships.`
        );
        if (confirmDelete && props.onDelete) {
          props.onDelete(node.id);
          closeHandler();
        }
      });
      return;
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${node.name}? This will remove them from the tree and unlink all their relationships.`
    );

    if (confirmDelete && props.onDelete) {
      props.onDelete(node.id);
      closeHandler();
    }
  }, [node, props, closeHandler, currentUser, openLoginModal]);

  const relNodeMapper = useCallback(
    (rel: any) => {
      const foundNode = nodes.find((n) => n.id === rel.id);
      if (!foundNode) return null;
      return {
        ...foundNode,
        type: rel.type,
      };
    },
    [nodes]
  );

  if (!node) return null;

  // Filter and map relations, removing any null entries
  const parents = node.parents?.map(relNodeMapper).filter(Boolean) || [];
  const children = node.children?.map(relNodeMapper).filter(Boolean) || [];
  const siblings = node.siblings?.map(relNodeMapper).filter(Boolean) || [];
  const spouses = node.spouses?.map(relNodeMapper).filter(Boolean) || [];

  return (
    <Drawer
      anchor="right"
      open={!!node}
      onClose={closeHandler}
      sx={{
        "& .MuiDrawer-paper": {
          width: { xs: "100%", sm: 400 },
          boxSizing: "border-box",
          top: "64px",
          height: "calc(100% - 64px)",
        },
      }}
      ModalProps={{
        keepMounted: true,
      }}
    >
      <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            p: 2,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Typography variant="h5" component="h3">
            {node.name}
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            {!isEditMode ? (
              <>
                <Tooltip title="Delete this person (relationships will be unlinked)">
                  <IconButton
                    onClick={handleDeleteClick}
                    edge="end"
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Edit details">
                  <IconButton onClick={handleEditClick} edge="end">
                    <EditIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Close panel">
                  <IconButton onClick={closeHandler}>
                    <CloseIcon />
                  </IconButton>
                </Tooltip>
              </>
            ) : (
              <>
                <Tooltip title="Save changes">
                  <IconButton
                    onClick={handleSaveClick}
                    color="primary"
                    edge="end"
                  >
                    <SaveIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Cancel editing">
                  <IconButton onClick={handleCancelEdit} edge="end">
                    <CancelIcon />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </Box>
        </Box>

        <Box sx={{ flexGrow: 1, overflowY: "auto", p: 2 }}>
          {!node ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                textAlign: "center",
              }}
            >
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No family member selected
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Click on a family member in the tree to view their details, edit
                information, or add new family members as parents, spouses, or
                children.
              </Typography>
            </Box>
          ) : isEditMode ? (
            <Stack spacing={3}>
              <TextField
                label="Name"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                fullWidth
                required
                autoFocus
              />
              <TextField
                label="Date of Birth"
                value={editedDob}
                onChange={(e) => setEditedDob(e.target.value)}
                fullWidth
                placeholder="e.g., 1990-05-15 or 15 May 1990"
              />
              <TextField
                label="Date of Death"
                value={editedDod}
                onChange={(e) => setEditedDod(e.target.value)}
                fullWidth
                placeholder="e.g., 2020-12-31 (optional)"
              />
              <TextField
                label="Place"
                value={editedPlace}
                onChange={(e) => setEditedPlace(e.target.value)}
                fullWidth
                placeholder="e.g., Birthplace or Current Location (optional)"
              />
              <TextField
                label="Photo URL"
                value={editedPhoto}
                onChange={(e) => setEditedPhoto(e.target.value)}
                fullWidth
                placeholder="e.g., https://example.com/photo.jpg (optional)"
              />
              <TextField
                label="Notes"
                value={editedNotes}
                onChange={(e) => setEditedNotes(e.target.value)}
                fullWidth
                multiline
                rows={4}
                placeholder="Additional notes or information (optional)"
              />
              <FormControl component="fieldset">
                <FormLabel component="legend">Gender</FormLabel>
                <RadioGroup
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
              />
              <Divider />
              <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
                <Button
                  variant="outlined"
                  onClick={handleCancelEdit}
                  startIcon={<CancelIcon />}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSaveClick}
                  startIcon={<SaveIcon />}
                  disabled={!editedName.trim()}
                >
                  Save Changes
                </Button>
              </Box>
            </Stack>
          ) : (
            <>
              {node.photo && (
                <Box sx={{ mb: 3, textAlign: "center" }}>
                  <img
                    src={node.photo}
                    alt={node.name}
                    style={{
                      maxWidth: "100%",
                      maxHeight: "200px",
                      borderRadius: "8px",
                      objectFit: "cover",
                    }}
                  />
                </Box>
              )}
              {node.dob && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Date of Birth
                  </Typography>
                  <Typography variant="body1">{node.dob}</Typography>
                </Box>
              )}
              {node.dod && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Date of Death
                  </Typography>
                  <Typography variant="body1">{node.dod}</Typography>
                </Box>
              )}
              {node.place && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Place
                  </Typography>
                  <Typography variant="body1">{node.place}</Typography>
                </Box>
              )}
              {node.notes && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Notes
                  </Typography>
                  <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
                    {node.notes}
                  </Typography>
                </Box>
              )}
              {(parents.length > 0 ||
                children.length > 0 ||
                siblings.length > 0 ||
                spouses.length > 0) && <Divider sx={{ my: 2 }} />}
            </>
          )}
          {!isEditMode && parents.length > 0 && (
            <Relations {...props} title="Parents" items={parents} />
          )}
          {!isEditMode &&
            parents.length > 0 &&
            (children.length > 0 ||
              siblings.length > 0 ||
              spouses.length > 0) && <Divider sx={{ my: 2 }} />}
          {!isEditMode && children.length > 0 && (
            <Relations {...props} title="Children" items={children} />
          )}
          {!isEditMode &&
            children.length > 0 &&
            (siblings.length > 0 || spouses.length > 0) && (
              <Divider sx={{ my: 2 }} />
            )}
          {!isEditMode && siblings.length > 0 && (
            <Relations {...props} title="Siblings" items={siblings} />
          )}
          {!isEditMode && siblings.length > 0 && spouses.length > 0 && (
            <Divider sx={{ my: 2 }} />
          )}
          {!isEditMode && spouses.length > 0 && (
            <Relations {...props} title="Spouses" items={spouses} />
          )}
          {!isEditMode &&
            (parents.length > 0 ||
              children.length > 0 ||
              siblings.length > 0 ||
              spouses.length > 0) && <Divider sx={{ my: 2 }} />}
          {!isEditMode &&
            node.customFields &&
            Object.keys(node.customFields).length > 0 && (
              <>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ mb: 2 }}>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    sx={{ mb: 1 }}
                  >
                    Additional Details
                  </Typography>
                  {Object.entries(node.customFields).map(([key, value]) => (
                    <Box key={key} sx={{ mb: 1, pl: 1 }}>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        component="span"
                      >
                        {key}:
                      </Typography>
                      <Typography
                        variant="body1"
                        component="span"
                        sx={{ ml: 1 }}
                      >
                        {value}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </>
            )}
        </Box>
      </Box>
    </Drawer>
  );
});
