import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import BusinessIcon from "@mui/icons-material/Business";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import NotesOutlinedIcon from "@mui/icons-material/NotesOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import { ApiService } from "../../services/apiService";
import {
  BUSINESS_CATEGORY_OPTIONS,
  isPresetCategory,
} from "./businessCategories";
import { PersonSearchField } from "../BusinessPage/PersonSearchField";

const CUSTOM_CATEGORY = "__custom__";

export interface BusinessFormValue {
  id?: string;
  name?: string;
  category?: string | null;
  description?: string | null;
  contact?: string | null;
  owner?: string | null;
  ownerId?: string | null;
}

interface BusinessFormDialogProps {
  open: boolean;
  onClose: () => void;
  /** Business being edited; omit or null to create a new one. */
  business?: BusinessFormValue | null;
  /** Owner person id when the owner is fixed (Profile, node details, add-node flow). */
  personId?: string | null;
  /** Show an owner search/select field (used on the Business page). */
  enableOwnerSelect?: boolean;
  /** Location scope for the owner search. */
  locationId?: string;
  /** Contact number prefilled for NEW businesses (e.g. the person's phone). */
  defaultContact?: string;
  /** Called after a successful create/update with the API result. */
  onSaved?: (result: any) => void;
}

export function BusinessFormDialog({
  open,
  onClose,
  business,
  personId,
  enableOwnerSelect = false,
  locationId,
  defaultContact,
  onSaved,
}: BusinessFormDialogProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const isEdit = Boolean(business?.id);

  const [name, setName] = useState("");
  const [categorySelect, setCategorySelect] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [description, setDescription] = useState("");
  const [contact, setContact] = useState("");
  const [owner, setOwner] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const b = business || {};
    setName(b.name || "");
    setDescription(b.description || "");
    setContact(b.id ? b.contact || "" : b.contact || defaultContact || "");
    setOwner(b.owner || "");
    setOwnerId(b.ownerId || "");

    const cat = (b.category || "").trim();
    if (!cat) {
      setCategorySelect("");
      setCustomCategory("");
    } else if (isPresetCategory(cat)) {
      setCategorySelect(cat);
      setCustomCategory("");
    } else {
      setCategorySelect(CUSTOM_CATEGORY);
      setCustomCategory(cat);
    }
    setError("");
  }, [open, business, defaultContact]);

  const resolvedCategory = useMemo(() => {
    if (categorySelect === CUSTOM_CATEGORY) {
      return customCategory.trim() || null;
    }
    return categorySelect || null;
  }, [categorySelect, customCategory]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Business name is required.");
      return;
    }
    const resolvedPersonId = enableOwnerSelect ? ownerId || null : personId || null;
    if (enableOwnerSelect && !resolvedPersonId) {
      setError("Please select an owner for this business.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const payload = {
        name: name.trim(),
        category: resolvedCategory,
        description: description.trim() || null,
        contact: contact.trim() || null,
        peopleId: resolvedPersonId,
      };
      const result = business?.id
        ? await ApiService.updateBusiness(business.id, payload)
        : await ApiService.createBusiness(payload);
      onSaved?.(result);
      onClose();
    } catch (e: any) {
      console.error("Failed to save business:", e);
      setError(e?.message || "Failed to save business. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const adornment = (icon: React.ReactNode) => (
    <InputAdornment position="start">{icon}</InputAdornment>
  );

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={fullScreen}
    >
      <DialogTitle sx={{ fontWeight: 700 }}>
        {isEdit ? "Edit Business" : "Add Business"}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2.25} sx={{ pt: 1 }}>
          <TextField
            label="Business Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
            autoFocus
            placeholder="Shop or company name"
            InputProps={{ startAdornment: adornment(<BusinessIcon fontSize="small" />) }}
          />

          <FormControl fullWidth>
            <InputLabel shrink>Category (optional)</InputLabel>
            <Select
              value={categorySelect}
              onChange={(e) => setCategorySelect(e.target.value)}
              label="Category (optional)"
              displayEmpty
              startAdornment={adornment(<CategoryOutlinedIcon fontSize="small" />)}
            >
              <MenuItem value="">No category</MenuItem>
              {BUSINESS_CATEGORY_OPTIONS.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {category.displayName}
                </MenuItem>
              ))}
              <MenuItem value={CUSTOM_CATEGORY}>Other (type your own)</MenuItem>
            </Select>
          </FormControl>

          {categorySelect === CUSTOM_CATEGORY && (
            <TextField
              label="Custom Category"
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              fullWidth
              placeholder="e.g. Catering, Transport"
              InputProps={{
                startAdornment: adornment(<CategoryOutlinedIcon fontSize="small" />),
              }}
            />
          )}

          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={3}
            placeholder="Describe what the business does"
            InputProps={{ startAdornment: adornment(<NotesOutlinedIcon fontSize="small" />) }}
          />

          {enableOwnerSelect && (
            <PersonSearchField
              label="Owner Name"
              placeholder="Enter owner name and search"
              searchValue={owner}
              onSearchValueChange={(value) => setOwner(value)}
              onPersonSelect={(person) => {
                setOwner(person?.name || "");
                setOwnerId(person?.id || "");
              }}
              selectedPerson={ownerId ? { id: ownerId, name: owner } : null}
              locationId={locationId}
              writableOnly
              startIcon={<PersonOutlineIcon fontSize="small" />}
            />
          )}

          <TextField
            label="Contact Number"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            fullWidth
            placeholder="Phone number (optional)"
            InputProps={{ startAdornment: adornment(<PhoneOutlinedIcon fontSize="small" />) }}
          />

          {error && <FormHelperText error>{error}</FormHelperText>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving} color="inherit">
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={saving || !name.trim()}>
          {saving ? "Saving…" : isEdit ? "Update Business" : "Add Business"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
