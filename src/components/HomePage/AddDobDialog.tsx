import React, { Suspense, useEffect, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import dayjs, { Dayjs } from "dayjs";
import { ApiService } from "../../services/apiService";
import { FNode } from "../model/FNode";
import { brand } from "../../theme/brand";
import { avatarTint, initialsOf } from "./homeTheme";

const DatePicker = React.lazy(() =>
  import("@mui/x-date-pickers/DatePicker").then((m) => ({ default: m.DatePicker })),
);

/**
 * Set one person's date of birth, without leaving the dashboard.
 *
 * The worklist row used to navigate to the full profile page, which is a lot of
 * screen for a single field: the user loses their place in the list and has to
 * come back for the next one. A birth date is the gap the tree loses first, so
 * the fastest possible path matters more here than anywhere else on the page.
 *
 * Deliberately only the date. Anything else the profile page still owns.
 */

export interface AddDobDialogProps {
  open: boolean;
  onClose: () => void;
  personId: string;
  name: string;
  photoUrl?: string | null;
  /** Lets the parent drop the row from the worklist once it is filled. */
  onSaved: (personId: string) => void;
}

export const AddDobDialog: React.FC<AddDobDialogProps> = ({
  open,
  onClose,
  personId,
  name,
  photoUrl,
  onSaved,
}) => {
  const [value, setValue] = useState<Dayjs | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Reset per person, so a date typed for one relative can't be saved onto the
  // next one the user opens.
  useEffect(() => {
    if (!open) return;
    setValue(null);
    setError("");
  }, [open, personId]);

  const handleSave = async () => {
    if (!value || !value.isValid()) {
      setError("Pick a date first.");
      return;
    }
    if (value.isAfter(dayjs(), "day")) {
      setError("A birth date can't be in the future.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      // The API stores a plain date; sending an ISO timestamp would let the
      // browser's timezone shift it to the previous day.
      await ApiService.updatePerson(personId, {
        dob: value.format("YYYY-MM-DD"),
      } as Partial<FNode>);
      onSaved(personId);
      onClose();
    } catch (err: any) {
      console.error("Failed to save date of birth:", err);
      setError(err?.message || "We couldn't save that date. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const tint = avatarTint(name || personId);

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ pr: 6, fontWeight: 800 }}>
        Add date of birth
        <IconButton
          onClick={onClose}
          disabled={saving}
          aria-label="Close"
          sx={{ position: "absolute", right: 12, top: 12 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {/* Whose date this is, restated inside the dialog — the row that opened
            it is now behind a backdrop. */}
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2.5 }}>
          <Avatar
            src={photoUrl || undefined}
            alt={name}
            sx={{ width: 44, height: 44, bgcolor: tint.bg, color: tint.fg, fontWeight: 700 }}
          >
            {initialsOf(name) || "?"}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700, color: brand.ink }}>{name}</Typography>
            <Typography sx={{ fontSize: 13, color: brand.slateMuted }}>
              No birth date recorded yet
            </Typography>
          </Box>
        </Stack>

        <Suspense fallback={<TextField fullWidth disabled label="Date of birth" />}>
          <DatePicker
            label="Date of birth"
            value={value}
            onChange={(next: Dayjs | null) => {
              setValue(next);
              setError("");
            }}
            // Nobody in the tree was born tomorrow, and an open-ended calendar
            // makes the year picker scroll past every future year to reach the
            // ones that matter.
            maxDate={dayjs()}
            format="DD/MM/YYYY"
            slotProps={{
              textField: { fullWidth: true, autoFocus: true },
              // Most of these dates are decades back, so the calendar opens on
              // the year rather than making the user page through months.
              field: { clearable: true },
            }}
            openTo="year"
            views={["year", "month", "day"]}
          />
        </Suspense>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={saving} sx={{ textTransform: "none", fontWeight: 700 }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || !value}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
          sx={{
            textTransform: "none",
            fontWeight: 800,
            borderRadius: 2,
            px: 3,
            bgcolor: brand.primaryDark,
            "&:hover": { bgcolor: "#1e40af" },
          }}
        >
          {saving ? "Saving…" : "Save date"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddDobDialog;
