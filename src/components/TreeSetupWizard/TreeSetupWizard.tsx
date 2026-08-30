import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  LinearProgress,
  Stack,
  Switch,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { ApiService } from "../../services/apiService";
import { HindiNameInput } from "../HindiNameInput/HindiNameInput";
import { brand } from "../../theme/brand";

/**
 * Guided first-run setup for a brand-new tree.
 *
 * Replaces the old "Create First Node" dialog. A blank tree with one "add a
 * person" button asks the user to think in database terms; this asks the
 * questions they already know the answers to — who your parents are, who your
 * grandparents were — and turns each answer into a node.
 *
 * Every answer is written to the server the moment it is given, so closing the
 * tab half way through loses nothing. That is why there is no "review and
 * submit" step: there is no draft state to lose.
 */

type StepKey =
  | "self"
  | "spouse"
  | "father"
  | "mother"
  | "dada"
  | "dadi"
  | "nana"
  | "nani"
  | "children";

type StepDef = {
  key: StepKey;
  /** Heading, in the user's own vocabulary. */
  title: string;
  /** The Hindi kinship term, which is what most users actually call this person. */
  hindi: string;
  helper: string;
  gender?: "male" | "female";
  /** Whose record this person attaches to. Undefined = tree root. */
  anchor?: StepKey;
  /** How the new person relates to the anchor. */
  relation: "root" | "parent-of-anchor" | "child-of-anchor" | "spouse-of-anchor";
  /** Offer the "no longer with us" toggle — worth asking for older generations. */
  offerDeceased?: boolean;
  /** Offer a wedding date — only meaningful on a marriage. */
  offerAnniversary?: boolean;
  /** Keep asking until the user says they are done. */
  repeatable?: boolean;
};

const STEPS: StepDef[] = [
  {
    key: "self",
    title: "Start with yourself",
    hindi: "आप",
    helper: "You are the anchor of this tree. Everyone else is added around you.",
    relation: "root",
  },
  {
    key: "father",
    title: "Your father",
    hindi: "पिता",
    helper: "Add his name as your family knows it.",
    gender: "male",
    anchor: "self",
    relation: "parent-of-anchor",
    offerDeceased: true,
  },
  {
    key: "mother",
    title: "Your mother",
    hindi: "माता",
    helper: "She will be linked to your father automatically.",
    gender: "female",
    anchor: "self",
    relation: "parent-of-anchor",
    offerDeceased: true,
  },
  {
    key: "dada",
    title: "Your father's father",
    hindi: "दादा",
    helper: "Grandparents are the hardest details to recover later — add what you know now.",
    gender: "male",
    anchor: "father",
    relation: "parent-of-anchor",
    offerDeceased: true,
  },
  {
    key: "dadi",
    title: "Your father's mother",
    hindi: "दादी",
    helper: "Even a first name is worth recording.",
    gender: "female",
    anchor: "father",
    relation: "parent-of-anchor",
    offerDeceased: true,
  },
  {
    key: "nana",
    title: "Your mother's father",
    hindi: "नाना",
    helper: "Even a first name is worth recording.",
    gender: "male",
    anchor: "mother",
    relation: "parent-of-anchor",
    offerDeceased: true,
  },
  {
    key: "nani",
    title: "Your mother's mother",
    hindi: "नानी",
    helper: "Even a first name is worth recording.",
    gender: "female",
    anchor: "mother",
    relation: "parent-of-anchor",
    offerDeceased: true,
  },
  {
    key: "spouse",
    title: "Your husband or wife",
    hindi: "जीवनसाथी",
    helper: "Skip this if it does not apply.",
    anchor: "self",
    relation: "spouse-of-anchor",
    offerAnniversary: true,
  },
  {
    key: "children",
    title: "Your children",
    hindi: "संतान",
    helper: "Add them one at a time. You can keep going or finish here.",
    anchor: "self",
    relation: "child-of-anchor",
    repeatable: true,
  },
];

type FormState = {
  name: string;
  nameHindi: string;
  dob: string;
  gender: "male" | "female" | "";
  deceased: boolean;
  deceasedDate: string;
  anniversary: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  nameHindi: "",
  dob: "",
  gender: "",
  deceased: false,
  deceasedDate: "",
  anniversary: "",
};

export interface TreeSetupWizardProps {
  open: boolean;
  treeId: string;
  /** Prefills the first question so the user is not retyping their own name. */
  defaultSelfName?: string;
  defaultSelfGender?: string;
  onClose: () => void;
  /** Fired once at the end so the caller can reload the tree in one go. */
  onComplete: (createdAnyone: boolean) => void;
}

export const TreeSetupWizard: React.FC<TreeSetupWizardProps> = ({
  open,
  treeId,
  defaultSelfName,
  defaultSelfGender,
  onClose,
  onComplete,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [stepIndex, setStepIndex] = useState(0);
  const [createdIds, setCreatedIds] = useState<Partial<Record<StepKey, string>>>({});
  const [childCount, setChildCount] = useState(0);
  const [form, setForm] = useState<FormState>({
    ...EMPTY_FORM,
    name: defaultSelfName || "",
    gender: (defaultSelfGender as FormState["gender"]) || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Read through a ref so a late-arriving user profile can refresh the defaults
  // for the NEXT run without wiping what the user is typing in the current one.
  const defaultsRef = useRef({ name: defaultSelfName, gender: defaultSelfGender });
  defaultsRef.current = { name: defaultSelfName, gender: defaultSelfGender };

  // Each run belongs to one specific, empty tree. The dialog stays mounted
  // between runs, so without this a second tree would inherit the first run's
  // step position and "N saved" count.
  useEffect(() => {
    if (!open) return;
    setStepIndex(0);
    setCreatedIds({});
    setChildCount(0);
    setSaving(false);
    setError(null);
    setForm({
      ...EMPTY_FORM,
      name: defaultsRef.current.name || "",
      gender: (defaultsRef.current.gender as FormState["gender"]) || "",
    });
  }, [open, treeId]);

  // A step is only reachable once the person it hangs off exists. Skipping your
  // father therefore silently skips both paternal grandparents — asking for them
  // would produce nodes with nothing to attach to.
  const visibleSteps = useMemo(
    () => STEPS.filter((s) => !s.anchor || s.anchor === "self" || createdIds[s.anchor]),
    [createdIds],
  );

  const step = visibleSteps[stepIndex];
  const isLast = stepIndex >= visibleSteps.length - 1;
  const createdCount = Object.keys(createdIds).length + childCount;

  const resetForm = useCallback(() => {
    setForm({ ...EMPTY_FORM });
    setError(null);
  }, []);

  const goNext = useCallback(() => {
    if (isLast) {
      onComplete(createdCount > 0);
      return;
    }
    setStepIndex((i) => i + 1);
    resetForm();
  }, [isLast, onComplete, createdCount, resetForm]);

  const handleSave = useCallback(async () => {
    if (!step) return;
    const name = form.name.trim();
    if (!name) {
      setError("A name is needed to save this person.");
      return;
    }

    const anchorId = step.anchor ? createdIds[step.anchor] : undefined;
    if (step.relation !== "root" && !anchorId) {
      setError("The related person is missing. Skip this question and continue.");
      return;
    }

    const gender = step.gender || (form.gender || undefined);

    setSaving(true);
    setError(null);
    try {
      const result = await ApiService.addPersonToTree(
        treeId,
        name,
        form.nameHindi.trim() || undefined,
        gender,
        form.dob || undefined,
        step.relation === "root" ? undefined : step.relation === "spouse-of-anchor" ? "spouse" : "parent",
        step.relation === "root" ? undefined : anchorId,
        step.relation === "spouse-of-anchor" ? "married" : step.relation === "root" ? undefined : "blood",
        undefined,
        // "parent-of-anchor" inverts the relation: the person being added is the
        // PARENT of the anchor, not their child.
        step.relation === "parent-of-anchor",
        // A child gets its second parent from the spouse recorded earlier, when
        // there is one, so the couple renders as a pair rather than two singles.
        step.relation === "child-of-anchor" ? createdIds.spouse : undefined,
        undefined,
        step.offerDeceased ? !form.deceased : undefined,
        step.offerDeceased && form.deceased ? form.deceasedDate || undefined : undefined,
        undefined,
        step.offerAnniversary ? form.anniversary || undefined : undefined,
        undefined,
        step.relation === "child-of-anchor" && createdIds.spouse ? "existing" : undefined,
      );

      if (!result?.success || !result?.personId) {
        throw new Error((result as any)?.error || "Could not save this person.");
      }

      if (step.repeatable) {
        setChildCount((c) => c + 1);
        resetForm();
      } else {
        setCreatedIds((prev) => ({ ...prev, [step.key]: result.personId as string }));
        goNext();
      }
    } catch (err: any) {
      setError(err?.message || "Could not save this person.");
    } finally {
      setSaving(false);
    }
  }, [step, form, createdIds, treeId, goNext, resetForm]);

  if (!open || !step) return null;

  const progress = ((stepIndex + 1) / visibleSteps.length) * 100;

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
    >
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{ height: 3, bgcolor: "transparent" }}
      />

      <DialogTitle sx={{ pb: 1, pr: 6 }}>
        <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 0.5 }}>
          <Typography
            variant="overline"
            sx={{ color: "text.secondary", letterSpacing: "0.1em" }}
          >
            Step {stepIndex + 1} of {visibleSteps.length}
          </Typography>
          {createdCount > 0 && (
            <Chip
              size="small"
              icon={<CheckCircleIcon />}
              label={`${createdCount} saved`}
              sx={{ bgcolor: brand.primarySoft, color: brand.primary, fontWeight: 600 }}
            />
          )}
        </Stack>

        <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.25 }}>
          {step.title}{" "}
          <Box component="span" sx={{ color: brand.primary, fontWeight: 700 }}>
            ({step.hindi})
          </Box>
        </Typography>

        <IconButton
          onClick={onClose}
          disabled={saving}
          sx={{ position: "absolute", right: 8, top: 8 }}
          aria-label="Close setup"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 2.5 }}>
          {step.helper}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Stack spacing={2}>
          <TextField
            autoFocus
            fullWidth
            label="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            disabled={saving}
          />
          {/* Same transliterating field the node editor uses: suggestions are
              derived from the English name typed above, so the user picks a
              spelling rather than switching keyboards. */}
          <HindiNameInput
            sourceText={form.name}
            value={form.nameHindi}
            onChange={(nameHindi) => setForm((f) => ({ ...f, nameHindi }))}
            label="Name in Hindi (optional)"
            disabled={saving}
          />

          {!step.gender && (
            <TextField
              select
              fullWidth
              label="Gender"
              SelectProps={{ native: true }}
              value={form.gender}
              onChange={(e) =>
                setForm((f) => ({ ...f, gender: e.target.value as FormState["gender"] }))
              }
              disabled={saving}
              InputLabelProps={{ shrink: true }}
            >
              <option value="">Not specified</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </TextField>
          )}

          <TextField
            fullWidth
            type="date"
            label="Date of birth (optional)"
            value={form.dob}
            onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))}
            InputLabelProps={{ shrink: true }}
            disabled={saving}
          />

          {step.offerAnniversary && (
            <TextField
              fullWidth
              type="date"
              label="Wedding anniversary (optional)"
              value={form.anniversary}
              onChange={(e) => setForm((f) => ({ ...f, anniversary: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              disabled={saving}
            />
          )}

          {step.offerDeceased && (
            <>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.deceased}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, deceased: e.target.checked }))
                    }
                    disabled={saving}
                  />
                }
                label="No longer with us"
              />
              {form.deceased && (
                <TextField
                  fullWidth
                  type="date"
                  label="Date of passing (optional)"
                  value={form.deceasedDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, deceasedDate: e.target.value }))
                  }
                  InputLabelProps={{ shrink: true }}
                  disabled={saving}
                />
              )}
            </>
          )}
        </Stack>

        {step.repeatable && childCount > 0 && (
          <Typography variant="body2" sx={{ mt: 2, color: brand.primary, fontWeight: 600 }}>
            {childCount} {childCount === 1 ? "child" : "children"} added. Add another, or finish.
          </Typography>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, gap: 1, flexWrap: "wrap" }}>
        <Button onClick={goNext} disabled={saving} color="inherit">
          {step.relation === "root" ? "Skip setup" : isLast ? "Finish" : "Skip"}
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || !form.name.trim()}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {saving
            ? "Saving..."
            : step.repeatable
              ? "Save and add another"
              : "Save and continue"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TreeSetupWizard;
