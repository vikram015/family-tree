import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddLocationAltOutlinedIcon from "@mui/icons-material/AddLocationAltOutlined";
import LocationCityOutlinedIcon from "@mui/icons-material/LocationCityOutlined";
import { ApiService, LocationCombinationOption } from "../../services/apiService";

interface CreateLocationDialogProps {
  open: boolean;
  onClose: () => void;
  /** Prefill the location name (e.g. what the user typed in the picker). */
  initialName?: string;
  /** Called with the freshly created location combination. */
  onCreated: (option: LocationCombinationOption) => void | Promise<void>;
}

/**
 * Shared "Add a new location" dialog — searchable State/District plus a name.
 * Used by both the create-tree LocationPicker and the onboarding flow so the
 * add-location experience is identical everywhere.
 */
export const CreateLocationDialog: React.FC<CreateLocationDialogProps> = ({
  open,
  onClose,
  initialName = "",
  onCreated,
}) => {
  const [name, setName] = useState("");
  const [stateId, setStateId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [states, setStates] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Reset the form each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setName(initialName);
    setStateId("");
    setDistrictId("");
    setError("");
  }, [open, initialName]);

  // Load states when opened.
  useEffect(() => {
    if (!open || states.length > 0) return;
    let active = true;
    setLoadingStates(true);
    ApiService.getStates()
      .then((rows) => active && setStates(rows || []))
      .catch((e: any) => active && setError(e?.message || "Failed to load states."))
      .finally(() => active && setLoadingStates(false));
    return () => {
      active = false;
    };
  }, [open, states.length]);

  // Load districts when the state changes.
  useEffect(() => {
    if (!open || !stateId) {
      setDistricts([]);
      setDistrictId("");
      return;
    }
    let active = true;
    setLoadingDistricts(true);
    ApiService.getDistricts(stateId)
      .then((rows) => active && setDistricts(rows || []))
      .catch((e: any) => active && setError(e?.message || "Failed to load districts."))
      .finally(() => active && setLoadingDistricts(false));
    return () => {
      active = false;
    };
  }, [open, stateId]);

  const selectedState = useMemo(
    () => states.find((s) => s.id === stateId) || null,
    [states, stateId],
  );
  const selectedDistrict = useMemo(
    () => districts.find((d) => d.id === districtId) || null,
    [districts, districtId],
  );

  const handleClose = () => {
    if (saving) return;
    onClose();
  };

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!stateId || !districtId || !trimmed) {
      setError("State, district, and location name are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const created = await ApiService.createLocation({
        name: trimmed,
        districtId,
      });
      const option: LocationCombinationOption = {
        stateId,
        stateName: selectedState?.name || "",
        districtId,
        districtName: selectedDistrict?.name || "",
        locationId: created.id,
        locationName: created.name,
        label: [created.name, selectedDistrict?.name, selectedState?.name]
          .filter(Boolean)
          .join(", "),
      };
      await onCreated(option);
      onClose();
    } catch (e: any) {
      setError(e?.message || "Failed to create location.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="xs"
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" spacing={1.25} alignItems="center">
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "primary.light",
              color: "primary.main",
            }}
          >
            <AddLocationAltOutlinedIcon fontSize="small" />
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              Add a new location
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Pick the state and district, then name the location.
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <Autocomplete
            options={states}
            value={selectedState}
            loading={loadingStates}
            getOptionLabel={(o: any) => o?.name || ""}
            isOptionEqualToValue={(o: any, v: any) => o.id === v.id}
            onChange={(_e, v: any | null) => {
              setStateId(v?.id || "");
              setDistrictId("");
              setError("");
            }}
            disabled={saving}
            renderInput={(params) => (
              <TextField
                {...params}
                label="State"
                placeholder="Search state"
                size="small"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {loadingStates ? <CircularProgress size={16} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />
          <Autocomplete
            options={districts}
            value={selectedDistrict}
            loading={loadingDistricts}
            getOptionLabel={(o: any) => o?.name || ""}
            isOptionEqualToValue={(o: any, v: any) => o.id === v.id}
            onChange={(_e, v: any | null) => {
              setDistrictId(v?.id || "");
              setError("");
            }}
            disabled={saving || !stateId}
            renderInput={(params) => (
              <TextField
                {...params}
                label="District"
                placeholder={stateId ? "Search district" : "Select a state first"}
                size="small"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {loadingDistricts ? <CircularProgress size={16} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />
          <TextField
            label="Location name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            disabled={saving}
            size="small"
            fullWidth
            placeholder="e.g. village / city name"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LocationCityOutlinedIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={handleClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleCreate}
          disabled={saving || !stateId || !districtId || !name.trim()}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {saving ? "Adding…" : "Add location"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateLocationDialog;
