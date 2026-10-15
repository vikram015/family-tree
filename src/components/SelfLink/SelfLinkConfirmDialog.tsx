import React, { useEffect, useState } from "react";
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
  Stack,
  Typography,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import LinkIcon from "@mui/icons-material/Link";

import { ApiService, type LinkRequest, type SelfLinkPreview } from "../../services/apiService";
import { useAuth } from "../hooks/useAuth";
import { brand } from "../../theme/brand";

/**
 * "Is this you?" — the confirmation before linking your account to a person.
 *
 * It shows who the person is through the people around them (father, mother,
 * spouse), because that is what tells two Ravi Singhs apart: almost nobody
 * mistakes their own father's name. Then it says plainly what confirming will
 * do — link now (you can already edit this person), send to the tree's editors
 * for a check, or nothing (already claimed).
 */

export interface SelfLinkConfirmDialogProps {
  open: boolean;
  personId: string | null;
  onClose: () => void;
  /** After confirming. `autoLinked` tells linked-now from sent-for-review. */
  onDone: (result: LinkRequest & { autoLinked?: boolean }) => void;
  /** An extra caution from the caller, e.g. the name doesn't match yours. */
  warning?: React.ReactNode;
}

function relationLine(preview: SelfLinkPreview["person"]): string | null {
  const parents = [preview.fatherName, preview.motherName].filter(Boolean).join(" & ");
  if (!parents) return null;
  const gender = String(preview.gender || "").toLowerCase();
  const childOf = gender === "female" ? "Daughter of" : gender === "male" ? "Son of" : "Child of";
  return `${childOf} ${parents}`;
}

export const SelfLinkConfirmDialog: React.FC<SelfLinkConfirmDialogProps> = ({
  open,
  personId,
  onClose,
  onDone,
  warning,
}) => {
  const { refreshUserProfile } = useAuth();
  const [preview, setPreview] = useState<SelfLinkPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !personId) return;
    let active = true;
    setPreview(null);
    setLoadError(null);
    setSubmitError(null);
    setLoading(true);
    ApiService.getSelfLinkPreview(personId)
      .then((result) => active && setPreview(result))
      .catch((error: any) => active && setLoadError(error?.message || "Couldn't load this profile."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [open, personId]);

  const handleConfirm = async () => {
    if (!preview) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await ApiService.createUserNodeLinkRequest({ targetPersonId: preview.person.id });
      if (result.autoLinked) {
        // The account is now linked; let every page that reads it know.
        await refreshUserProfile().catch(() => undefined);
      }
      onDone(result);
    } catch (error: any) {
      setSubmitError(error?.message || "Couldn't link this profile. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const person = preview?.person;
  const relation = person ? relationLine(person) : null;
  const facts = person
    ? [
        person.birthYear ? `Born ${person.birthYear}` : null,
        person.spouseNames.length ? `Spouse: ${person.spouseNames.join(", ")}` : null,
        person.treeName ? `${person.treeName} tree` : null,
      ].filter(Boolean)
    : [];

  return (
    <Dialog open={open} onClose={() => !submitting && onClose()} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>Is this you?</DialogTitle>
      <DialogContent dividers>
        {loading && (
          <Stack alignItems="center" sx={{ py: 4 }}>
            <CircularProgress size={28} />
          </Stack>
        )}

        {loadError && <Alert severity="error">{loadError}</Alert>}

        {person && preview && (
          <Stack spacing={2}>
            <Stack direction="row" spacing={2} alignItems="flex-start">
              <Avatar
                src={person.photoUrl || undefined}
                sx={{ width: 64, height: 64, bgcolor: brand.primary, fontSize: 26, fontWeight: 700 }}
              >
                {(person.name || "?").charAt(0).toUpperCase()}
              </Avatar>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography sx={{ fontWeight: 800, fontSize: 19, color: brand.ink, lineHeight: 1.3 }}>
                  {person.name}
                  {person.nameHindi ? ` (${person.nameHindi})` : ""}
                </Typography>
                {relation && (
                  <Typography sx={{ fontWeight: 600, color: brand.primary, mt: 0.25 }}>
                    {relation}
                  </Typography>
                )}
                {facts.map((fact) => (
                  <Typography key={fact as string} variant="body2" sx={{ color: brand.slateMuted }}>
                    {fact}
                  </Typography>
                ))}
              </Box>
            </Stack>

            {warning && preview.mode !== "blocked" && <Alert severity="warning">{warning}</Alert>}

            {preview.mode === "blocked" && (
              <Alert severity="error">{preview.blockedReason}</Alert>
            )}

            {preview.mode === "instant" && (
              <Alert severity="success" icon={<CheckCircleOutlineIcon fontSize="inherit" />}>
                You can already edit this profile, so it links right away. If it's the wrong
                person, you can unlink it any time from your profile.
              </Alert>
            )}

            {preview.mode === "request" && (
              <Alert severity={preview.concerns.length ? "warning" : "info"}>
                {preview.concerns.length ? (
                  <>
                    One of the tree's editors will check this first:
                    <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2.5 }}>
                      {preview.concerns.map((concern) => (
                        <li key={concern}>{concern}</li>
                      ))}
                    </Box>
                  </>
                ) : (
                  "This goes to the tree's editors to approve. You'll be notified when they do."
                )}
              </Alert>
            )}

            {submitError && <Alert severity="error">{submitError}</Alert>}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={submitting} sx={{ textTransform: "none" }}>
          {preview?.mode === "blocked" ? "Close" : "No, go back"}
        </Button>
        {preview && preview.mode !== "blocked" && (
          <Button
            variant="contained"
            disableElevation
            onClick={() => void handleConfirm()}
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <LinkIcon />}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            {preview.mode === "instant" ? "Yes, this is me" : "Yes, send link request"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default SelfLinkConfirmDialog;
