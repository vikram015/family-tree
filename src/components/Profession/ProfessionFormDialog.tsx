import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from "@mui/material";
import { ApiService } from "../../services/apiService";

interface ProfessionFormDialogProps {
  open: boolean;
  onClose: () => void;
  /** Person the profession is assigned to. */
  personId?: string | null;
  /** Called after a profession is successfully added. */
  onSaved?: () => void | Promise<void>;
}

/**
 * Pick an existing profession (or create a new one) and assign it to a person.
 * Reused by the Profile page and node details / add-node flows.
 */
export function ProfessionFormDialog({
  open,
  onClose,
  personId,
  onSaved,
}: ProfessionFormDialogProps) {
  const [allProfessions, setAllProfessions] = useState<any[]>([]);
  const [selectedProfessionId, setSelectedProfessionId] = useState("");
  const [newName, setNewName] = useState("");
  const [newContact, setNewContact] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setSelectedProfessionId("");
    setNewName("");
    setNewContact("");
    setError("");

    let active = true;
    ApiService.getAllProfessions()
      .then((rows) => {
        if (active) setAllProfessions(rows || []);
      })
      .catch(() => {
        if (active) setAllProfessions([]);
      });
    return () => {
      active = false;
    };
  }, [open]);

  const handleSave = async () => {
    if (!personId) return;
    setSaving(true);
    setError("");
    try {
      let profId = selectedProfessionId;
      if (!profId && newName.trim()) {
        const created = await ApiService.createProfession({
          name: newName.trim(),
          category: "Other",
          description: newContact.trim() ? `Contact: ${newContact.trim()}` : undefined,
        });
        profId = created?.id;
      }
      if (profId) {
        await ApiService.addProfessionToPerson(personId, profId);
        await onSaved?.();
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || "Failed to add profession.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Add profession</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="node-prof-select-label">Select profession</InputLabel>
            <Select
              labelId="node-prof-select-label"
              value={selectedProfessionId}
              label="Select profession"
              onChange={(e) => setSelectedProfessionId(e.target.value)}
            >
              <MenuItem value="">
                <em>None (create new)</em>
              </MenuItem>
              {allProfessions.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {!selectedProfessionId && (
            <Stack spacing={2}>
              <TextField
                fullWidth
                label="New profession name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                helperText="Enter a new profession if it isn't in the list"
              />
              <TextField
                fullWidth
                label="Contact number"
                value={newContact}
                onChange={(e) => setNewContact(e.target.value)}
                placeholder="Optional"
              />
            </Stack>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving || (!selectedProfessionId && !newName.trim())}
        >
          {saving ? "Adding..." : "Add"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ProfessionFormDialog;
