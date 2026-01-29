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
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useVillage } from "../context/VillageContext";
import { useAuth } from "../context/AuthContext";
import { useLoginModal } from "../context/LoginModalContext";

interface AddTreeProps {
  onCreate?: (treeId: string) => void;
}

export const AddTree: React.FC<AddTreeProps> = ({ onCreate }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCaste, setSelectedCaste] = useState<string>("");
  const [selectedSubCaste, setSelectedSubCaste] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [castes, setCastes] = useState<any[]>([]);
  const [subCastes, setSubCastes] = useState<any[]>([]);
  const { selectedVillage } = useVillage();
  const { currentUser } = useAuth() as any;
  const { openLoginModal } = useLoginModal();

  // Load castes when modal opens
  useEffect(() => {
    if (showModal && castes.length === 0) {
      loadCastes();
    }
  }, [showModal, castes.length]);

  // Load sub-castes when caste is selected
  useEffect(() => {
    if (selectedCaste) {
      loadSubCastes(selectedCaste);
      setSelectedSubCaste(""); // Reset sub-caste when caste changes
    } else {
      setSubCastes([]);
      setSelectedSubCaste("");
    }
  }, [selectedCaste]);

  const loadCastes = async () => {
    try {
      setLoadingData(true);
      const data = await SupabaseService.getCastes();
      setCastes(data);
    } catch (err) {
      console.error("Failed to load castes:", err);
    } finally {
      setLoadingData(false);
    }
  };

  const loadSubCastes = async (casteId: string) => {
    try {
      const data = await SupabaseService.getSubCastes(casteId);
      setSubCastes(data);
    } catch (err) {
      console.error("Failed to load sub-castes:", err);
    }
  };

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      // Create tree in Supabase - store caste and sub_caste as UUIDs
      const treeData = {
        name: name || "Default Tree",
        village_id: selectedVillage || null,
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
    setShowModal(true);
  };

  const closeModal = () => {
    if (loading) return;
    setShowModal(false);
  };

  const isValid = name.trim().length >= 4 && name.trim().length <= 64;

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
          <TextField
            autoFocus
            margin="dense"
            label="Tree name"
            placeholder="e.g. Sharma Family"
            fullWidth
            variant="outlined"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading || loadingData}
            sx={{ mt: 1, mb: 2 }}
          />

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
            disabled={loading || loadingData}
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="caste-select-label">Caste (Optional)</InputLabel>
            <Select
              labelId="caste-select-label"
              id="caste-select"
              value={selectedCaste}
              label="Caste (Optional)"
              onChange={(e) => setSelectedCaste(e.target.value)}
              disabled={loading || loadingData}
            >
              <MenuItem value="">— None —</MenuItem>
              {castes.map((caste) => (
                <MenuItem key={caste.id} value={caste.id}>
                  {caste.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {selectedCaste && (
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="subcaste-select-label">
                Sub-Caste (Optional)
              </InputLabel>
              <Select
                labelId="subcaste-select-label"
                id="subcaste-select"
                value={selectedSubCaste}
                label="Sub-Caste (Optional)"
                onChange={(e) => setSelectedSubCaste(e.target.value)}
                disabled={loading || loadingData}
              >
                <MenuItem value="">— None —</MenuItem>
                {subCastes.map((subCaste) => (
                  <MenuItem key={subCaste.id} value={subCaste.id}>
                    {subCaste.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Error: {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeModal} disabled={loading || loadingData}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={!isValid || loading || loadingData}
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
