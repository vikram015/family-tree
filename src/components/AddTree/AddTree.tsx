import React, { useState } from "react";
import { db } from "../../firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const { selectedVillage } = useVillage();
  const { currentUser } = useAuth() as any;
  const { openLoginModal } = useLoginModal();

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      // create tree doc with villageId
      const treeRef = await addDoc(collection(db, "tree"), {
        treeName: name || "Default Tree",
        villageId: selectedVillage || "",
        createdAt: serverTimestamp(),
      });
      const treeId = treeRef.id;

      setCreatedId(treeId);
      setName("");
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
            disabled={loading}
            sx={{ mt: 1 }}
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
