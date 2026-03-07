import React, { useState, useEffect, useRef, useMemo } from "react";
import { ApiService } from "../../services/apiService";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Box,
  Fab,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Autocomplete,
  Tooltip,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useVillage } from "../hooks/useVillage";
import { useAuth } from "../hooks/useAuth";
import { useLoginModal } from "../context/LoginModalContext";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  fetchAllSubCastes,
  fetchCastes,
  selectCastes,
  selectSubCastes,
} from "../../store/slices/casteSlice";

interface AddTreeProps {
  onCreate?: (treeId: string) => void;
  variant?: "button" | "fab";
}

export const AddTree: React.FC<AddTreeProps> = ({
  onCreate,
  variant = "button",
}) => {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Redux state
  const castes = useAppSelector(selectCastes);
  const subCastes = useAppSelector(selectSubCastes);

  // Local state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCaste, setSelectedCaste] = useState<string>("");
  const [selectedSubCaste, setSelectedSubCaste] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const modalHistoryRef = useRef(false);
  const [selectedVillageId, setSelectedVillageId] = useState<string>("");
  const filteredSubCastes = useMemo(
    () => subCastes.filter((s) => !selectedCaste || s.casteId === selectedCaste),
    [subCastes, selectedCaste],
  );
  const { villages, selectedVillage, setSelectedVillage } = useVillage();
  const { currentUser } = useAuth() as any;
  const { openLoginModal } = useLoginModal();

  // Load castes when modal opens
  useEffect(() => {
    if (showModal) {
      if (castes.length === 0) {
        dispatch(fetchCastes());
      }
      if (subCastes.length === 0) {
        dispatch(fetchAllSubCastes());
      }
    }
  }, [showModal, castes.length, subCastes.length, dispatch]);

  // Reset selected sub-caste when caste changes
  useEffect(() => {
    setSelectedSubCaste("");
  }, [selectedCaste]);

  useEffect(() => {
    if (!showModal) return;

    if (!modalHistoryRef.current) {
      window.history.pushState({ modal: "create-tree" }, "");
      modalHistoryRef.current = true;
    }

    const handlePopState = () => {
      if (!modalHistoryRef.current) return;
      setShowModal(false);
      modalHistoryRef.current = false;
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [showModal]);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      // Create tree and store caste/subCaste as UUIDs
      const treeData = {
        name: name || "Default Tree",
        villageId: selectedVillageId || selectedVillage || null,
        description: description || null,
        caste: selectedCaste || null,
        subCaste: selectedSubCaste || null,
      };

      const newTree = await ApiService.createTree(treeData);
      const treeId = newTree.id;

      setCreatedId(treeId);
      setName("");
      setDescription("");
      setSelectedCaste("");
      setSelectedSubCaste("");
      setShowModal(false);
      if (onCreate) onCreate(treeId);
    } catch (err: any) {
      setError(err?.message ?? String(err));
      console.error("Failed to create tree:", err);
    } finally {
      setLoading(false);
    }
  };

  const openModal = () => {
    if (!currentUser) {
      openLoginModal(() => {
        // After successful login, open the modal
        setShowModal(true);
      });
      return;
    }
    setError(null);
    setCreatedId(null);
    setName("");
    setDescription("");
    setSelectedCaste("");
    setSelectedSubCaste("");
    setSelectedVillageId(selectedVillage || "");
    setShowModal(true);
  };

  const closeModal = () => {
    if (loading) return;
    setShowModal(false);
    if (modalHistoryRef.current) {
      modalHistoryRef.current = false;
      window.history.back();
    }
  };

  const isValid =
    name.trim().length >= 4 &&
    name.trim().length <= 64 &&
    !!selectedCaste &&
    !!selectedSubCaste;

  return (
    <Box>
      {variant === "fab" ? (
        <>
          <Tooltip title="Create tree" placement="left">
            <Fab
              color="primary"
              aria-label="Create tree"
              onClick={openModal}
              sx={{ display: { xs: "inline-flex", sm: "none" } }}
            >
              <AddIcon />
            </Fab>
          </Tooltip>
          <Tooltip title="Create tree" placement="left">
            <Fab
              variant="extended"
              color="primary"
              onClick={openModal}
              sx={{ display: { xs: "none", sm: "inline-flex" } }}
            >
              <AddIcon sx={{ mr: 1 }} />
              Create tree
            </Fab>
          </Tooltip>
        </>
      ) : (
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={openModal}
        >
          Create tree
        </Button>
      )}

      <Dialog
        open={showModal}
        onClose={closeModal}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>Create a new tree</DialogTitle>
        <DialogContent>
          <Autocomplete
            options={villages}
            getOptionLabel={(option) => option.name}
            value={villages.find((v) => v.id === selectedVillageId) || null}
            onChange={(_e, newValue) => {
              const id = newValue?.id || "";
              setSelectedVillageId(id);
              if (id) {
                setSelectedVillage(id);
              }
            }}
            disabled={loading}
            renderInput={(params) => (
              <TextField
                {...params}
                margin="dense"
                label="Village"
                placeholder="Search village..."
                variant="outlined"
              />
            )}
            sx={{ mt: 1, mb: 2 }}
          />

          <TextField
            autoFocus
            margin="dense"
            label="Tree name"
            placeholder="e.g. Sharma Family"
            fullWidth
            variant="outlined"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
            sx={{ mt: 1, mb: 2 }}
          />

          <FormControl fullWidth sx={{ mb: 2 }} required>
            <InputLabel id="caste-select-label">Caste</InputLabel>
            <Select
              labelId="caste-select-label"
              id="caste-select"
              value={selectedCaste}
              label="Caste"
              onChange={(e) => setSelectedCaste(e.target.value)}
              disabled={loading}
            >
              {castes.map((caste) => (
                <MenuItem key={caste.id} value={caste.id}>
                  {caste.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }} required>
            <InputLabel id="subcaste-select-label">Sub-Caste</InputLabel>
            <Select
              labelId="subcaste-select-label"
              id="subcaste-select"
              value={selectedSubCaste}
              label="Sub-Caste"
              onChange={(e) => setSelectedSubCaste(e.target.value)}
              disabled={loading || !selectedCaste}
            >
              {filteredSubCastes.map((subCaste) => (
                <MenuItem key={subCaste.id} value={subCaste.id}>
                  {subCaste.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            margin="dense"
            label="Description (Optional)"
            placeholder="e.g. A detailed description about the family"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={loading}
            sx={{ mb: 2 }}
          />

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Error: {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeModal} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={!isValid || loading}
            variant="contained"
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? "Creating..." : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {createdId && !showModal && (
        <Alert severity="success" sx={{ mt: 1 }}>
          Created: {createdId}
        </Alert>
      )}
      {error && !showModal && (
        <Alert severity="error" sx={{ mt: 1 }}>
          Error: {error}
        </Alert>
      )}
    </Box>
  );
};

export default AddTree;

