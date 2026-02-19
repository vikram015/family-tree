import React, { useState, useEffect } from "react";
import { SupabaseService } from "../../services/supabaseService";
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
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Autocomplete,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useVillage } from "../hooks/useVillage";
import { useAuth } from "../hooks/useAuth";
import { useLoginModal } from "../context/LoginModalContext";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  fetchCastes,
  fetchSubCastes,
  selectCastes,
  selectSubCastes,
} from "../../store/slices/casteSlice";

interface AddTreeProps {
  onCreate?: (treeId: string) => void;
}

export const AddTree: React.FC<AddTreeProps> = ({ onCreate }) => {
  const dispatch = useAppDispatch();

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
  const [selectedVillageId, setSelectedVillageId] = useState<string>("");
  const { villages, selectedVillage, setSelectedVillage } = useVillage();
  const { currentUser } = useAuth() as any;
  const { openLoginModal } = useLoginModal();

  // Load castes when modal opens
  useEffect(() => {
    if (showModal && castes.length === 0) {
      dispatch(fetchCastes());
    }
  }, [showModal, castes.length, dispatch]);

  // Load sub-castes when caste is selected
  useEffect(() => {
    if (selectedCaste) {
      dispatch(fetchSubCastes(selectedCaste));
      setSelectedSubCaste(""); // Reset sub-caste when caste changes
    }
  }, [selectedCaste, dispatch]);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      // Create tree in Supabase - store caste and sub_caste as UUIDs
      const treeData = {
        name: name || "Default Tree",
        village_id: selectedVillageId || selectedVillage || null,
        description: description || null,
        caste: selectedCaste || null,
        sub_caste: selectedSubCaste || null,
      };

      const newTree = await SupabaseService.createTree(treeData);
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
  };

  const isValid =
    name.trim().length >= 4 &&
    name.trim().length <= 64 &&
    !!selectedCaste &&
    !!selectedSubCaste;

  return (
    <Box>
      <Button
        variant="contained"
        color="primary"
        startIcon={<AddIcon />}
        onClick={openModal}
      >
        Create tree
      </Button>

      <Dialog open={showModal} onClose={closeModal} maxWidth="sm" fullWidth>
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
              {subCastes.map((subCaste) => (
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
