import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import LinkIcon from "@mui/icons-material/Link";
import { PersonSearchField } from "../BusinessPage/PersonSearchField";
import { useAuth } from "../hooks/useAuth";
import { useVillage } from "../hooks/useVillage";

interface SelectedPerson {
  id: string;
  name: string;
  treeId: string;
  [key: string]: any;
}

/**
 * Dialog shown to admin users who haven't linked themselves to a person node yet.
 * Uses PersonSearchField to find themselves in the tree, then links their user account.
 */
export const LinkNodeDialog: React.FC = () => {
  const { needsNodeLink, linkUserToNode, userProfile } = useAuth();
  const { selectedVillage, setSelectedVillage, villages } = useVillage();
  const [searchValue, setSearchValue] = useState("");
  const [selectedPerson, setSelectedPerson] = useState<SelectedPerson | null>(
    null,
  );
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState("");
  const [dismissed, setDismissed] = useState(false);
  const [success, setSuccess] = useState(false);

  // Auto-select first village if none selected
  useEffect(() => {
    if (!selectedVillage && villages.length > 0) {
      setSelectedVillage(villages[0].id);
    }
  }, [selectedVillage, villages, setSelectedVillage]);

  // Don't show if not needed or already dismissed
  if (!needsNodeLink || dismissed || success) return null;

  const handleLink = async () => {
    if (!selectedPerson) return;
    setLinking(true);
    setError("");
    try {
      await linkUserToNode(selectedPerson.id, selectedPerson.treeId);
      setSuccess(true);
    } catch (e: any) {
      setError(e.message || "Failed to link. Please try again.");
    } finally {
      setLinking(false);
    }
  };

  return (
    <Dialog open={true} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <LinkIcon color="primary" />
        Link Yourself to the Family Tree
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Welcome, <strong>{userProfile?.name || "Admin"}</strong>! To get
          started, please find and select your name in the family tree. This
          links your account to your node.
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          After linking, a superadmin will review and approve your access. Until
          approved, you can view trees but not edit them.
        </Typography>

        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel id="village-select-label">Select Village</InputLabel>
          <Select
            labelId="village-select-label"
            value={selectedVillage || ""}
            label="Select Village"
            onChange={(e) => setSelectedVillage(e.target.value)}
          >
            {villages.map((village) => (
              <MenuItem key={village.id} value={village.id}>
                {village.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <PersonSearchField
          label="Search Your Name"
          placeholder="Type your name and press Enter or click Search"
          searchValue={searchValue}
          onSearchValueChange={(value) => {
            setSearchValue(value);
            if (!value) setSelectedPerson(null);
          }}
          onPersonSelect={(person) => {
            setSelectedPerson(person as SelectedPerson);
            setSearchValue(person.name);
          }}
          selectedPerson={selectedPerson}
          villageId={selectedVillage}
          disabled={!selectedVillage}
        />

        {selectedPerson && (
          <Alert severity="info" sx={{ mt: 2 }}>
            You selected: <strong>{selectedPerson.name}</strong>
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={() => setDismissed(true)} color="inherit">
          Skip for Now
        </Button>
        <Button
          variant="contained"
          onClick={handleLink}
          disabled={!selectedPerson || linking}
          startIcon={linking ? <CircularProgress size={16} /> : <LinkIcon />}
          sx={{ background: "linear-gradient(135deg, #0066cc, #00cc99)" }}
        >
          {linking ? "Linking..." : "Link My Account"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
