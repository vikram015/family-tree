import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { RelType } from "relatives-tree/lib/types";
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Divider,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Switch,
  Chip,
  Autocomplete,
  Avatar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  InputAdornment,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import PersonAddAlt1OutlinedIcon from "@mui/icons-material/PersonAddAlt1Outlined";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import WorkOutlineOutlinedIcon from "@mui/icons-material/WorkOutlineOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import MaleOutlinedIcon from "@mui/icons-material/MaleOutlined";
import FemaleOutlinedIcon from "@mui/icons-material/FemaleOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import ChildCareOutlinedIcon from "@mui/icons-material/ChildCareOutlined";
import FavoriteBorderOutlinedIcon from "@mui/icons-material/FavoriteBorderOutlined";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import BusinessIcon from "@mui/icons-material/Business";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CakeOutlinedIcon from "@mui/icons-material/CakeOutlined";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import dayjs, { Dayjs } from "dayjs";
import { FNode } from "../model/FNode";
import { AdditionalDetails } from "../AdditionalDetails/AdditionalDetails";
import { HindiNameInput } from "../HindiNameInput/HindiNameInput";
import { useAuth } from "../hooks/useAuth";
import { useLoginModal } from "../context/LoginModalContext";
import { ApiService } from "../../services/apiService";
import { PersonSearchField } from "../BusinessPage/PersonSearchField";
import { BusinessFormDialog } from "../Business/BusinessFormDialog";
import { phoneFromCustomFields } from "../Business/businessContact";
const DatePicker = React.lazy(() =>
  import("@mui/x-date-pickers/DatePicker").then((m) => ({
    default: m.DatePicker,
  })),
);
const ImageCropper = React.lazy(() => import("../ImageCropper/ImageCropper"));

const BLOOD_GROUP_OPTIONS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const GENDER_OPTIONS = [
  { value: "male", label: "Male", icon: <MaleOutlinedIcon sx={{ fontSize: 18 }} /> },
  { value: "female", label: "Female", icon: <FemaleOutlinedIcon sx={{ fontSize: 18 }} /> },
  { value: "other", label: "Other", icon: <PersonOutlineOutlinedIcon sx={{ fontSize: 18 }} /> },
] as const;
const RELATION_OPTIONS = [
  { value: "child", label: "Child", icon: <ChildCareOutlinedIcon sx={{ fontSize: 18 }} /> },
  { value: "spouse", label: "Spouse", icon: <FavoriteBorderOutlinedIcon sx={{ fontSize: 18 }} /> },
  { value: "parent", label: "Parent", icon: <AccountTreeOutlinedIcon sx={{ fontSize: 18 }} /> },
] as const;

function titleCaseRelationType(value: string) {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

interface AddNodeProps {
  targetId?: string; // id of node in relation to which we add (e.g. parent/child/spouse)
  onAdd?: (
    node: Partial<FNode>,
    relation: "child" | "spouse" | "parent",
    targetId?: string,
    type?: RelType,
    otherParentId?: string, // second parent for children or second spouse
    childOptions?: {
      // How to resolve the other parent when adding a child.
      otherParentMode?: "existing" | "new" | "unknown";
      newSpouse?: {
        name?: string;
        nameHindi?: string;
        gender?: string;
        dob?: string;
      };
    },
  ) => Promise<string | undefined> | Promise<void> | void;
  onCancel?: () => void;
  /** Called when the full add flow is complete (after Step 2 save or skip).
   *  If not provided, onCancel is used as fallback. */
  onComplete?: () => void;
  nodes?: Readonly<FNode>[];
  noCard?: boolean; // disables card border/background if true
  isFirstNode?: boolean; // if true, hides relation selection fields
  /** Pre-select a relation type when opened from a placeholder node */
  initialRelation?: "child" | "spouse" | "parent";
  /** Pre-select a gender when opened from a placeholder node */
  initialGender?: "male" | "female" | "other" | "";
  onMobileSaveActionChange?: (
    action: { onClick: () => void; disabled: boolean; saving: boolean } | null,
  ) => void;
}

export default function AddNode({
  targetId,
  onAdd,
  onCancel,
  onComplete,
  nodes,
  noCard = false,
  isFirstNode = false,
  initialRelation,
  initialGender,
  onMobileSaveActionChange,
}: AddNodeProps) {
  const [name, setName] = useState("");
  const [nameHindi, setNameHindi] = useState("");
  const [dob, setDob] = useState<Dayjs | null>(null);
  const [gender, setGender] = useState<"male" | "female" | "other" | "">(
    initialGender || "male",
  );
  const [relation, setRelation] = useState<"child" | "spouse" | "parent">(
    initialRelation || "child",
  );
  const [relationStartDate, setRelationStartDate] = useState<Dayjs | null>(null);
  const [relationEndDate, setRelationEndDate] = useState<Dayjs | null>(null);
  const [selectedRelType, setSelectedRelType] = useState<RelType>(
    RelType.blood,
  );
  const [relTypes, setRelTypes] = useState<RelType[]>([
    RelType.blood,
    RelType.adopted,
  ]);
  const [customFields, setCustomFields] = useState<Record<string, string>>({});
  const { currentUser } = useAuth() as any;
  const { openLoginModal } = useLoginModal();

  // Mode state: 'create' or 'link' (only relevant for spouse currently)
  const [mode, setMode] = useState<"create" | "link">("create");
  const [locations, setLocations] = useState<any[]>([]);
  const [searchLocationId, setSearchLocationId] = useState("");
  const [selectedPerson, setSelectedPerson] = useState<any | null>(null);
  const [personSearchValue, setPersonSearchValue] = useState("");

  // Step 2 State (Business/Profession)
  const [step, setStep] = useState(1);
  const [savedNodeId, setSavedNodeId] = useState<string | null>(null);
  const [flowTargetId, setFlowTargetId] = useState<string | undefined>(targetId);
  const [occupationType, setOccupationType] = useState<
    "business" | "job" | "other"
  >("business");

  // Business is captured via the shared BusinessFormDialog (same modal used on the
  // Business page, Profile page, and node details).
  const [businessDialogOpen, setBusinessDialogOpen] = useState(false);
  const [businessAdded, setBusinessAdded] = useState(false);

  // Profession Fields
  const [jobTitle, setJobTitle] = useState("");
  const [jobContact, setJobContact] = useState("");
  const [allProfessions, setAllProfessions] = useState<any[]>([]);

  // New person fields
  const [bloodGroup, setBloodGroup] = useState("");
  const [isAlive, setIsAlive] = useState(true);
  const [deceasedDate, setDeceasedDate] = useState<Dayjs | null>(null);

  // Photo state
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | undefined>(
    undefined,
  );
  const [photoUploading, setPhotoUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingDetails, setIsSavingDetails] = useState(false);

  const stickyFooterSx = {
    position: "sticky",
    bottom: 0,
    zIndex: 2,
    display: "flex",
    gap: 2,
    justifyContent: "flex-end",
    mt: 2,
    pt: 2,
    pb: 0.5,
    background: (theme: any) =>
      `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0)} 0%, ${alpha(
        theme.palette.background.paper,
        0.94,
      )} 24%, ${theme.palette.background.paper} 100%)`,
    backdropFilter: "blur(6px)",
  } as const;

  const inputIconSx = { color: "text.secondary" } as const;
  const inputWithIconSx = {
    "& .MuiInputAdornment-root": inputIconSx,
    "& .MuiOutlinedInput-root": {
      borderRadius: 2,
    },
  } as const;

  /** Two fields per row once the drawer is wide enough — mirrors the edit form
 *  in NodeDetails so both halves of the panel lay out the same way. */
const fieldGridSx = {
  display: "grid",
  gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
  columnGap: 2,
  rowGap: 2,
  alignItems: "start",
} as const;

const spanBothColumnsSx = { gridColumn: { md: "1 / -1" } } as const;

const adornment = (icon: React.ReactNode) => (
    <InputAdornment position="start">{icon}</InputAdornment>
  );

  useEffect(() => {
    setFlowTargetId(targetId);
  }, [targetId]);

  const effectiveTargetId = flowTargetId ?? targetId;

  const formatPickerDate = useCallback((value: Dayjs | null) => {
    if (!value || !value.isValid()) return undefined;
    return value.format("YYYY-MM-DD");
  }, []);

  // Load locations for the search dropdown
  useEffect(() => {
    ApiService.getLocations().then((data) => {
      setLocations(data || []);
    });
    ApiService.getAllProfessions().then((data) => {
      setAllProfessions(data || []);
    });
  }, []);

  // Update mode defaults when relation changes
  useEffect(() => {
    if (relation !== "spouse") {
      setMode("create");
      setRelationStartDate(null);
      setRelationEndDate(null);
    }
  }, [relation]);
  const targetNode = useMemo(() => {
    if (!nodes || !effectiveTargetId) return null;
    return nodes.find((n) => n.id === effectiveTargetId);
  }, [effectiveTargetId, nodes]);

  // A person can have at most two parents (the tree only renders two). When the
  // target already has both, adding another "parent" would create an invisible,
  // search-only orphan — so the parent option is disabled.
  const hasBothParents = useMemo(
    () => (targetNode?.parents?.length ?? 0) >= 2,
    [targetNode],
  );

  useEffect(() => {
    if (hasBothParents && relation === "parent") {
      setRelation("child");
    }
  }, [hasBothParents, relation]);

  // other-parent selection for child relation
  const spouseOptions = useMemo(() => {
    if (!nodes || !effectiveTargetId) return [];
    const target = nodes.find((n) => n.id === effectiveTargetId);
    if (!target || !Array.isArray(target.spouses)) return [];
    return target.spouses
      .map((s) => nodes.find((n) => n.id === s.id))
      .filter(Boolean) as FNode[];
  }, [effectiveTargetId, nodes]);

  const selectedSearchLocation = useMemo(
    () => locations.find((v) => v.id === searchLocationId) || null,
    [searchLocationId, locations],
  );

  const [selectedOtherParentId, setSelectedOtherParentId] = useState<string>(
    () => "",
  );
  // How the user wants to set the child's other parent (spouse of the target).
  const [otherParentMode, setOtherParentMode] = useState<
    "existing" | "new" | "unknown"
  >("unknown");
  // Details for the "create new spouse" option.
  const [newSpouseName, setNewSpouseName] = useState("");
  const [newSpouseNameHindi, setNewSpouseNameHindi] = useState("");
  const [newSpouseGender, setNewSpouseGender] = useState<
    "male" | "female" | "other" | ""
  >("");
  const [newSpouseDob, setNewSpouseDob] = useState<Dayjs | null>(null);

  useEffect(() => {
    // Choose a sensible default for the other parent:
    // - exactly one existing spouse -> preselect it
    // - multiple existing spouses -> default to "existing" but make the user pick which one
    // - no existing spouse -> default to "unknown" (user can switch to "create new")
    if (spouseOptions.length === 1) {
      setOtherParentMode("existing");
      setSelectedOtherParentId(spouseOptions[0].id);
    } else if (spouseOptions.length > 1) {
      setOtherParentMode("existing");
      setSelectedOtherParentId("");
    } else {
      setOtherParentMode("unknown");
      setSelectedOtherParentId("");
    }
  }, [spouseOptions]);

  // Sync initialRelation / initialGender props into state when they change
  // (e.g. when user taps a different placeholder node while the dialog stays mounted)
  useEffect(() => {
    if (initialRelation) {
      setRelation(initialRelation);
    }
    if (initialGender) {
      setGender(initialGender as "male" | "female" | "other");
    }
  }, [initialRelation, initialGender]);

  useEffect(() => {
    if (relation === "spouse") {
      setRelTypes([RelType.married, RelType.divorced]);
      setSelectedRelType(RelType.married); // Default to married for spouse

      // Set opposite gender of target node
      if (targetNode?.gender === "male") {
        setGender("female");
      } else if (targetNode?.gender === "female") {
        setGender("male");
      }
    } else if (relation === "child") {
      setRelTypes([RelType.blood, RelType.adopted]);
      setSelectedRelType(RelType.blood);
      // Only reset gender if no explicit initialGender was provided
      if (!initialGender) {
        setGender("male");
      }
    } else if (relation === "parent") {
      setRelTypes([RelType.blood, RelType.adopted]);
      setSelectedRelType(RelType.blood);
      // Only reset gender if no explicit initialGender was provided
      if (!initialGender) {
        setGender("male");
      }
    }
  }, [relation, targetNode, initialGender]);

  const handleCancel = useCallback(() => {
    onCancel?.();
    // reset local form
    setName("");
    setDob(null);
    setNameHindi("");
    setGender("");
    setRelation("child");
    setRelationStartDate(null);
    setRelationEndDate(null);
    setCustomFields({});
    setMode("create");
    setOtherParentMode("unknown");
    setSelectedOtherParentId("");
    setNewSpouseName("");
    setNewSpouseNameHindi("");
    setNewSpouseGender("");
    setNewSpouseDob(null);
    setSelectedPerson(null);
    setSearchLocationId("");
    setPersonSearchValue("");
    setBloodGroup("");
    setIsAlive(true);
    setDeceasedDate(null);
    setPhotoBlob(null);
    setPhotoPreview(undefined);

    // Reset Step 2
    setStep(1);
    setSavedNodeId(null);
    setBusinessAdded(false);
    setBusinessDialogOpen(false);
    setJobTitle("");
    setJobContact("");
    setOccupationType("business");
  }, [onCancel]);

  /** Called when the full add flow is done (Step 2 skip or save).
   *  Uses onComplete to close the entire dialog, falling back to onCancel. */
  const handleFlowComplete = useCallback(() => {
    // reset local form
    setName("");
    setDob(null);
    setNameHindi("");
    setGender("");
    setRelation("child");
    setRelationStartDate(null);
    setRelationEndDate(null);
    setCustomFields({});
    setMode("create");
    setOtherParentMode("unknown");
    setSelectedOtherParentId("");
    setNewSpouseName("");
    setNewSpouseNameHindi("");
    setNewSpouseGender("");
    setNewSpouseDob(null);
    setSelectedPerson(null);
    setSearchLocationId("");
    setPersonSearchValue("");
    setBloodGroup("");
    setIsAlive(true);
    setDeceasedDate(null);
    setPhotoBlob(null);
    setPhotoPreview(undefined);

    // Reset Step 2
    setStep(1);
    setSavedNodeId(null);
    setFlowTargetId(targetId);
    setBusinessAdded(false);
    setBusinessDialogOpen(false);
    setJobTitle("");
    setJobContact("");
    setOccupationType("business");

    // Close the dialog — prefer onComplete, fallback to onCancel
    if (onComplete) {
      onComplete();
    } else {
      onCancel?.();
    }
  }, [onComplete, onCancel, targetId]);

  const handleContinueWithSon = useCallback(() => {
    setName("");
    setDob(null);
    setNameHindi("");
    setGender("male");
    setRelation("child");
    setRelationStartDate(null);
    setRelationEndDate(null);
    setSelectedRelType(RelType.blood);
    setCustomFields({});
    setMode("create");
    setOtherParentMode("unknown");
    setSelectedOtherParentId("");
    setNewSpouseName("");
    setNewSpouseNameHindi("");
    setNewSpouseGender("");
    setNewSpouseDob(null);
    setSelectedPerson(null);
    setSearchLocationId("");
    setPersonSearchValue("");
    setBloodGroup("");
    setIsAlive(true);
    setDeceasedDate(null);
    setPhotoBlob(null);
    setPhotoPreview(undefined);

    setStep(1);
    setSavedNodeId(null);
    setFlowTargetId(targetId);
    setBusinessAdded(false);
    setBusinessDialogOpen(false);
    setJobTitle("");
    setJobContact("");
    setOccupationType("business");
  }, [targetId]);

  const handleSaveDetails = useCallback(async (nextAction?: "add-son") => {
    if (isSavingDetails) return;
    setIsSavingDetails(true);
    if (!savedNodeId) {
      setIsSavingDetails(false);
      handleFlowComplete();
      return;
    }

    try {
      if (jobTitle.trim()) {
        const existing = allProfessions.find(
          (p) => p.name.toLowerCase() === jobTitle.trim().toLowerCase(),
        );

        let profId = existing?.id;

        if (!profId) {
          const newProf = await ApiService.createProfession({
            name: jobTitle.trim(),
            description: jobContact ? `Contact: ${jobContact}` : undefined,
          });
          profId = newProf?.id || (Array.isArray(newProf) && newProf[0]?.id);
        }

        if (profId) {
          await ApiService.addProfessionToPerson(savedNodeId, profId);
        }
      }
    } catch (error) {
      console.error("Error saving details:", error);
    } finally {
      setIsSavingDetails(false);
    }

    if (nextAction === "add-son") {
      handleContinueWithSon();
      return;
    }

    handleFlowComplete();
  }, [
    allProfessions,
    handleContinueWithSon,
    handleFlowComplete,
    isSavingDetails,
    jobContact,
    jobTitle,
    savedNodeId,
  ]);

  const handleSave = useCallback(async () => {
    if (isSaving) return;

    // If linking existing person
    if (mode === "link") {
      if (!selectedPerson) return;
      if (
        relation === "spouse" &&
        relationStartDate &&
        relationEndDate &&
        relationEndDate.isBefore(relationStartDate, "day")
      ) {
        alert("Marriage end date cannot be before marriage start date.");
        return;
      }
      setIsSaving(true);
      try {
        await onAdd?.(
          {
            id: selectedPerson.id,
            name: selectedPerson.name,
            relationSubtype: selectedRelType,
            relationStartDate: formatPickerDate(relationStartDate),
            relationEndDate: formatPickerDate(relationEndDate),
          } as unknown as Partial<FNode>, // Pass existing ID
          relation,
          effectiveTargetId,
          selectedRelType,
          selectedOtherParentId,
        );
        handleCancel();
      } finally {
        setIsSaving(false);
      }
      return;
    }

    if (!name.trim()) {
      // minimal validation
      return;
    }

    if (
      relation === "spouse" &&
      relationStartDate &&
      relationEndDate &&
      relationEndDate.isBefore(relationStartDate, "day")
    ) {
      alert("Marriage end date cannot be before marriage start date.");
      return;
    }

    // Validate the other-parent choice when adding a child.
    if (relation === "child" && !isFirstNode) {
      if (otherParentMode === "existing" && !selectedOtherParentId) {
        alert("Please select the other parent for this child.");
        return;
      }
      if (otherParentMode === "new" && !newSpouseName.trim()) {
        alert("Please enter a name for the new spouse, or choose another option.");
        return;
      }
    }

    const childOptions =
      relation === "child"
        ? {
            otherParentMode,
            newSpouse:
              otherParentMode === "new"
                ? {
                    name: newSpouseName.trim(),
                    nameHindi: newSpouseNameHindi.trim() || undefined,
                    gender: newSpouseGender || undefined,
                    dob: formatPickerDate(newSpouseDob),
                  }
                : undefined,
          }
        : undefined;

    const processAdd = async () => {
      setIsSaving(true);
      // prepare parents array: include targetId (if adding child) and optional other parent
      try {
        let parents: Array<{ id: string; type?: RelType }> = [];
        if (relation === "child" && effectiveTargetId) {
          parents.push({ id: effectiveTargetId, type: selectedRelType });
          if (selectedOtherParentId && selectedOtherParentId !== effectiveTargetId) {
            parents.push({ id: selectedOtherParentId, type: selectedRelType });
          }
        }

        const newNode: Partial<any> = {
          name: name.trim(),
          nameHindi: nameHindi.trim() || undefined,
          dob: formatPickerDate(dob),
          gender: (gender as any) || undefined,
          bloodGroup: bloodGroup || undefined,
          isAlive: isAlive,
          deceasedDate:
            !isAlive && deceasedDate ? formatPickerDate(deceasedDate) : undefined,
          children: [],
          parents: parents.length ? parents : undefined,
          spouses: [],
          customFields:
            Object.keys(customFields).length > 0 ? customFields : undefined,
          relationStartDate:
            relation === "spouse"
              ? formatPickerDate(relationStartDate)
              : undefined,
          relationEndDate:
            relation === "spouse"
              ? formatPickerDate(relationEndDate)
              : undefined,
        };

        const resultId = await onAdd?.(
          newNode,
          relation,
          effectiveTargetId,
          selectedRelType,
          selectedOtherParentId,
          childOptions,
        );

        if (resultId && typeof resultId === "string") {
          // Upload photo if one was cropped
          if (photoBlob) {
            try {
              setPhotoUploading(true);
              await ApiService.uploadPersonPhoto(resultId, photoBlob);
            } catch (err) {
              console.error("Photo upload failed:", err);
              alert(
                `Photo upload failed: ${
                  err instanceof Error ? err.message : String(err)
                }`,
              );
            } finally {
              setPhotoUploading(false);
            }
          }
          setSavedNodeId(resultId);
          setStep(2);
        } else {
          handleCancel();
        }
      } finally {
        setIsSaving(false);
      }
    };

    if (!currentUser) {
      openLoginModal(() => {
        // After successful login, save the node
        processAdd();
      });
      return;
    }

    await processAdd();
  }, [
    currentUser,
    openLoginModal,
    name,
    dob,
    formatPickerDate,
    nameHindi,
    gender,
    bloodGroup,
    isAlive,
    deceasedDate,
    customFields,
    relation,
    effectiveTargetId,
    onAdd,
    handleCancel,
    selectedOtherParentId,
    otherParentMode,
    newSpouseName,
    newSpouseNameHindi,
    newSpouseGender,
    newSpouseDob,
    isFirstNode,
    selectedRelType,
    mode,
    selectedPerson,
    relationStartDate,
    relationEndDate,
    photoBlob,
    isSaving,
  ]);

  useEffect(() => {
    if (!onMobileSaveActionChange) return;

    if (step === 2) {
      onMobileSaveActionChange({
        onClick: handleSaveDetails,
        disabled: isSavingDetails,
        saving: isSavingDetails,
      });
      return () => onMobileSaveActionChange(null);
    }

    onMobileSaveActionChange({
      onClick: handleSave,
      disabled: isSaving || (mode === "create" ? !name.trim() : !selectedPerson),
      saving: isSaving,
    });

    return () => onMobileSaveActionChange(null);
  }, [
    handleSave,
    handleSaveDetails,
    isSaving,
    isSavingDetails,
    jobTitle,
    mode,
    name,
    occupationType,
    onMobileSaveActionChange,
    selectedPerson,
    step,
  ]);

  return (
    <Box
      component={noCard ? "div" : Paper}
      sx={
        noCard
          ? {}
          : {
              p: { xs: 2, sm: 3 },
              borderRadius: 3,
            }
      }
    >
      {!noCard && step === 1 && (
        <Box sx={{ mb: 2.5 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 800 }}>
            {isFirstNode
              ? "Add First Family Member"
              : `Add Family Member to ${targetNode ? targetNode.name : "Tree"}`}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Start with the essentials first. Extra details can be completed after the profile is created.
          </Typography>
        </Box>
      )}

      {step === 2 ? (
        <Stack spacing={3}>
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 2, sm: 2.5 },
              borderRadius: 3,
              textAlign: "center",
              background: (theme) =>
                `linear-gradient(180deg, ${alpha(theme.palette.success.main, 0.08)} 0%, ${theme.palette.background.paper} 100%)`,
            }}
          >
            <Chip
              icon={<WorkOutlineOutlinedIcon sx={{ fontSize: 16 }} />}
              label="Step 2 of 2"
              color="success"
              size="small"
              sx={{ mb: 1.5 }}
            />
            <Typography variant="body2" color="text.secondary">
              Add optional professional details now, or skip and come back later.
            </Typography>
          </Paper>
          <Box sx={{ textAlign: "center", mb: 1 }}>
            <Typography variant="h6" color="primary" gutterBottom>
              👍 Person Added!
            </Typography>
            <Typography variant="subtitle1" fontWeight="bold">
              Add Professional Details?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Helping the community grow by adding business or career info.
            </Typography>
          </Box>

          <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
            <Stack spacing={2.5}>
              {/* Business — optional, added immediately via the shared dialog */}
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                  <BusinessIcon fontSize="small" color="action" />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Business
                  </Typography>
                </Stack>
                {businessAdded ? (
                  <Paper
                    variant="outlined"
                    sx={{ p: 1.5, borderRadius: 2, display: "flex", alignItems: "center", gap: 1 }}
                  >
                    <CheckCircleOutlineIcon color="success" fontSize="small" />
                    <Typography variant="body2">Business details saved.</Typography>
                    <Button
                      size="small"
                      onClick={() => setBusinessDialogOpen(true)}
                      sx={{ ml: "auto" }}
                    >
                      Add another
                    </Button>
                  </Paper>
                ) : (
                  <Button
                    variant="outlined"
                    startIcon={<BusinessIcon fontSize="small" />}
                    onClick={() => setBusinessDialogOpen(true)}
                    disabled={!savedNodeId}
                  >
                    Add Business Details
                  </Button>
                )}
              </Box>

              <Divider />

              {/* Profession — optional, saved on finish */}
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                  <WorkOutlineOutlinedIcon fontSize="small" color="action" />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Profession
                  </Typography>
                </Stack>
                <Stack spacing={2}>
                  <TextField
                    label="Job Title / Profession"
                    fullWidth
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Software Engineer, Doctor, Teacher"
                    sx={inputWithIconSx}
                    InputProps={{
                      startAdornment: adornment(<BadgeOutlinedIcon fontSize="small" />),
                    }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    We will link this to the unified list of professions.
                  </Typography>
                  <TextField
                    label="Contact Number"
                    fullWidth
                    value={jobContact}
                    onChange={(e) => setJobContact(e.target.value)}
                    placeholder="Phone number (optional)"
                    sx={inputWithIconSx}
                    InputProps={{
                      startAdornment: adornment(<PhoneOutlinedIcon fontSize="small" />),
                    }}
                  />
                </Stack>
              </Box>
            </Stack>
          </Paper>

          <Box
            sx={{
              ...stickyFooterSx,
              mt: 4,
            }}
          >
            <Button onClick={handleFlowComplete} color="inherit">
              Skip
            </Button>
            <Button
              onClick={() => {
                if (savedNodeId) {
                  handleContinueWithSon();
                }
              }}
              variant="outlined"
            >
              Add Another Son
            </Button>
            <Button
              onClick={() => void handleSaveDetails()}
              variant="contained"
              startIcon={
                isSavingDetails ? (
                  <CircularProgress size={14} color="inherit" />
                ) : undefined
              }
              disabled={isSavingDetails}
            >
              {isSavingDetails ? "Saving..." : "Save & Finish"}
            </Button>
          </Box>
        </Stack>
      ) : (
        <Stack spacing={3}>
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 1.5, sm: 2 },
              borderRadius: 3,
              background: (theme) =>
                `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${theme.palette.background.paper} 100%)`,
            }}
          >
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              alignItems={{ xs: "flex-start", sm: "center" }}
              justifyContent="space-between"
            >
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  {isFirstNode ? "Create a root person" : "Create or link a relative"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Fill the core profile first. Extra details can be added after save.
                </Typography>
              </Box>
              <Chip
                icon={
                  mode === "link" ? (
                    <LinkOutlinedIcon sx={{ fontSize: 16 }} />
                  ) : (
                    <PersonAddAlt1OutlinedIcon sx={{ fontSize: 16 }} />
                  )
                }
                label={mode === "link" ? "Link existing profile" : "Create new profile"}
                color={mode === "link" ? "info" : "primary"}
                size="small"
                variant="outlined"
              />
            </Stack>
          </Paper>

          {!isFirstNode && (
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 1.25, fontWeight: 700 }}>
                Relation
              </Typography>
              <ToggleButtonGroup
                color="primary"
                value={relation}
                exclusive
                onChange={(_event, value) => value && setRelation(value)}
                size="small"
                fullWidth
              >
                {RELATION_OPTIONS.map((option) => (
                  <ToggleButton
                    key={option.value}
                    value={option.value}
                    disabled={option.value === "parent" && hasBothParents}
                  >
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      {option.icon}
                      <Box component="span">{option.label}</Box>
                    </Stack>
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
              {hasBothParents && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mt: 1 }}
                >
                  {targetNode?.name || "This person"} already has two parents, so a
                  new parent can't be added.
                </Typography>
              )}
            </Paper>
          )}

          {!isFirstNode && (
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 1.25, fontWeight: 700 }}>
                Relation Type
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {relTypes.map((type) => (
                  <Chip
                    key={type}
                    label={titleCaseRelationType(type)}
                    clickable
                    color={selectedRelType === type ? "primary" : "default"}
                    variant={selectedRelType === type ? "filled" : "outlined"}
                    onClick={() => {
                      const nextType = type;
                      setSelectedRelType(nextType);
                      if (nextType !== RelType.divorced) {
                        setRelationEndDate(null);
                      }
                    }}
                  />
                ))}
              </Stack>
            </Paper>
          )}

          {!isFirstNode && relation === "spouse" && (
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
              <Stack spacing={2} sx={{ mb: 1 }}>
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Action
                  </Typography>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
                    {[
                      {
                        value: "create" as const,
                        label: "Create New Profile",
                        icon: <PersonAddAlt1OutlinedIcon sx={{ fontSize: 20 }} />,
                      },
                      {
                        value: "link" as const,
                        label: "Link Existing Profile",
                        icon: <LinkOutlinedIcon sx={{ fontSize: 20 }} />,
                      },
                    ].map((option) => {
                      const selected = mode === option.value;
                      return (
                        <Paper
                          key={option.value}
                          role="button"
                          tabIndex={0}
                          variant="outlined"
                          onClick={() => setMode(option.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setMode(option.value);
                            }
                          }}
                          sx={{
                            flex: 1,
                            p: 1.5,
                            borderRadius: 2,
                            cursor: "pointer",
                            borderColor: selected ? "primary.main" : "divider",
                            bgcolor: (muiTheme) =>
                              selected
                                ? alpha(muiTheme.palette.primary.main, 0.08)
                                : muiTheme.palette.background.paper,
                          }}
                        >
                          <Stack direction="row" spacing={1} alignItems="center">
                            {option.icon}
                            <Typography variant="body2" sx={{ fontWeight: 800 }}>
                              {option.label}
                            </Typography>
                          </Stack>
                        </Paper>
                      );
                    })}
                  </Stack>
                </Box>

                <Suspense fallback={<TextField fullWidth label="Marriage Start Date" />}>
	                    <DatePicker
	                      label="Marriage Start Date (optional)"
	                      value={relationStartDate}
	                      onChange={(value) => setRelationStartDate(value)}
	                      slotProps={{
	                        textField: {
	                          fullWidth: true,
	                          sx: inputWithIconSx,
	                          InputProps: {
	                            startAdornment: adornment(
	                              <FavoriteBorderOutlinedIcon fontSize="small" />,
	                            ),
	                          },
	                        },
	                      }}
	                      format="DD/MM/YYYY"
	                    />
                </Suspense>
                {selectedRelType === RelType.divorced && (
                  <Suspense fallback={<TextField fullWidth label="Marriage End Date" />}>
                    <DatePicker
	                      label="Marriage End Date (optional)"
	                      value={relationEndDate}
	                      onChange={(value) => setRelationEndDate(value)}
	                      slotProps={{
	                        textField: {
	                          fullWidth: true,
	                          sx: inputWithIconSx,
	                          InputProps: {
	                            startAdornment: adornment(
	                              <FavoriteBorderOutlinedIcon fontSize="small" />,
	                            ),
	                          },
	                        },
	                      }}
	                      format="DD/MM/YYYY"
	                    />
                  </Suspense>
                )}
              </Stack>
            </Paper>
          )}

          {mode === "link" && relation === "spouse" ? (
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
              <Stack spacing={2.25}>
              <Autocomplete
                options={locations}
                value={selectedSearchLocation}
                onChange={(_event, value) => {
                    setSearchLocationId(value?.id || "");
                    setPersonSearchValue("");
                    setSelectedPerson(null);
                  }}
                getOptionLabel={(option) => option?.name || ""}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                noOptionsText={
                  locations.length === 0 ? "Loading locations..." : "No locations found"
                }
                renderInput={(params) => (
	                  <TextField
	                    {...params}
	                    label="Select Location (Required)"
	                    placeholder="Search location"
	                    sx={inputWithIconSx}
	                    InputProps={{
	                      ...params.InputProps,
	                      startAdornment: (
	                        <>
	                          {adornment(<LocationOnOutlinedIcon fontSize="small" />)}
	                          {params.InputProps.startAdornment}
	                        </>
	                      ),
	                    }}
	                  />
                )}
              />

              {searchLocationId ? (
                <PersonSearchField
                  locationId={searchLocationId}
                  searchValue={personSearchValue}
                  onSearchValueChange={setPersonSearchValue}
                  onPersonSelect={setSelectedPerson}
	                  selectedPerson={selectedPerson}
	                  label="Search Person"
	                  placeholder="Type name to search..."
	                  startIcon={<PersonOutlineOutlinedIcon fontSize="small" />}
	                />
              ) : (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontStyle: "italic", display: "block", mt: -0.5 }}
                >
                  Please select a location first to search for people.
                </Typography>
              )}

              {selectedPerson && (
                <Paper
                  variant="outlined"
                  sx={{ p: 2, bgcolor: "action.hover", borderRadius: 2.5 }}
                >
                  <Typography variant="subtitle2">Selected Spouse:</Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {selectedPerson.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {[selectedPerson.locationName, selectedPerson.casteName]
                      .filter(Boolean)
                      .join(" • ")}
                  </Typography>
                </Paper>
              )}
              </Stack>
            </Paper>
          ) : (
            <Stack spacing={2.25}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700 }}>
                  Identity
                </Typography>
                <Box sx={fieldGridSx}>
                  {/* The other-parent picker carries its own toggle group and
                      nested form, so it takes the full width. */}
                  {!isFirstNode && relation === "child" && (
                    <Box sx={spanBothColumnsSx}>
                      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                        Other parent
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block", mb: 1.25 }}
                      >
                        Who is the child's other parent (spouse of {targetNode?.name || "this person"})?
                      </Typography>
                      <ToggleButtonGroup
                        color="primary"
                        value={otherParentMode}
                        exclusive
                        onChange={(_event, value) => value && setOtherParentMode(value)}
                        size="small"
                        fullWidth
                        sx={{ mb: 1.5 }}
                      >
                        <ToggleButton
                          value="existing"
                          disabled={spouseOptions.length === 0}
                        >
                          Existing
                        </ToggleButton>
                        <ToggleButton value="new">Create new</ToggleButton>
                        <ToggleButton value="unknown">Unknown</ToggleButton>
                      </ToggleButtonGroup>

                      {otherParentMode === "existing" && (
                        <FormControl fullWidth sx={inputWithIconSx}>
                          <InputLabel>Select existing spouse</InputLabel>
                          <Select
                            value={selectedOtherParentId}
                            onChange={(e) => setSelectedOtherParentId(e.target.value)}
                            label="Select existing spouse"
                            startAdornment={adornment(<PersonOutlineOutlinedIcon fontSize="small" />)}
                          >
                            {spouseOptions.map((s) => (
                              <MenuItem key={s.id} value={s.id}>
                                <Stack direction="row" spacing={1.25} alignItems="center">
                                  <Avatar
                                    src={s.photo || undefined}
                                    sx={{ width: 28, height: 28, fontSize: 12 }}
                                  >
                                    {(s.name || "?").charAt(0).toUpperCase()}
                                  </Avatar>
                                  <Box>
                                    <Typography variant="body2">
                                      {s.name ||
                                        (targetNode?.name
                                          ? `${targetNode.name}'s Spouse`
                                          : s.id)}
                                    </Typography>
                                    {s.gender && (
                                      <Typography variant="caption" color="text.secondary">
                                        {s.gender}
                                      </Typography>
                                    )}
                                  </Box>
                                </Stack>
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}

                      {otherParentMode === "new" && (
                        <Stack spacing={2}>
                          <TextField
                            label="Spouse name"
                            value={newSpouseName}
                            onChange={(e) => setNewSpouseName(e.target.value)}
                            fullWidth
                            required
                            sx={inputWithIconSx}
                            InputProps={{
                              startAdornment: adornment(
                                <PersonOutlineOutlinedIcon fontSize="small" />,
                              ),
                            }}
                          />
                          <HindiNameInput
                            sourceText={newSpouseName}
                            value={newSpouseNameHindi}
                            onChange={setNewSpouseNameHindi}
                          />
                          <Suspense fallback={<TextField fullWidth label="Date of birth" />}>
                            <DatePicker
                              label="Spouse date of birth (optional)"
                              value={newSpouseDob}
                              onChange={(value) => setNewSpouseDob(value)}
                              slotProps={{
                                textField: {
                                  fullWidth: true,
                                  sx: inputWithIconSx,
                                  InputProps: {
                                    startAdornment: adornment(
                                      <CakeOutlinedIcon fontSize="small" />,
                                    ),
                                  },
                                },
                              }}
                              format="DD/MM/YYYY"
                            />
                          </Suspense>
                          <Box>
                            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                              Spouse gender
                            </Typography>
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                              {GENDER_OPTIONS.map((option) => (
                                <Chip
                                  key={option.value}
                                  icon={option.icon}
                                  label={option.label}
                                  clickable
                                  color={
                                    newSpouseGender === option.value ? "primary" : "default"
                                  }
                                  variant={
                                    newSpouseGender === option.value ? "filled" : "outlined"
                                  }
                                  onClick={() => setNewSpouseGender(option.value)}
                                  sx={{ height: 36, px: 0.75 }}
                                />
                              ))}
                            </Stack>
                          </Box>
                        </Stack>
                      )}

                      {otherParentMode === "unknown" && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontStyle: "italic", display: "block" }}
                        >
                          The child will be added with only {targetNode?.name || "this person"} as a
                          known parent. You can add the other parent later.
                        </Typography>
                      )}
                    </Box>
                  )}

                  <Box
                    sx={{
                      ...spanBothColumnsSx,
                      p: { xs: 1.5, sm: 2 },
                      borderRadius: 3,
                      textAlign: "center",
                      background: (muiTheme) =>
                        `linear-gradient(180deg, ${alpha(muiTheme.palette.primary.main, 0.06)} 0%, ${muiTheme.palette.background.paper} 100%)`,
                    }}
                  >
                    <Stack spacing={1.5} alignItems="center">
                      <Suspense fallback={<Box sx={{ height: 88 }} />}>
                        <ImageCropper
                          currentPhoto={photoPreview}
                          previewVariant="rounded"
                          onCropped={(blob) => {
                            setPhotoBlob(blob);
                            setPhotoPreview(URL.createObjectURL(blob));
                          }}
                          onRemove={() => {
                            setPhotoBlob(null);
                            setPhotoPreview(undefined);
                          }}
                          uploading={photoUploading}
                          previewSize={88}
                        />
                      </Suspense>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>
                          {name.trim() || "New family member"}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          Add the basic identity details and photo for this profile.
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>

	                  <TextField
	                    label="Name"
	                    value={name}
	                    onChange={(e) => setName(e.target.value)}
	                    fullWidth
	                    required
	                    autoFocus
	                    sx={inputWithIconSx}
	                    InputProps={{
	                      startAdornment: adornment(<PersonOutlineOutlinedIcon fontSize="small" />),
	                    }}
	                  />
	                  <HindiNameInput
	                    sourceText={name}
	                    value={nameHindi}
	                    onChange={setNameHindi}
	                    disabled={mode === "link"}
	                  />

	                  <Suspense fallback={<TextField fullWidth label="Date of birth" />}>
	                    <DatePicker
	                      label="Date of birth (optional)"
	                      value={dob}
	                      onChange={(value) => setDob(value)}
	                      slotProps={{
	                        textField: {
	                          fullWidth: true,
	                          sx: inputWithIconSx,
	                          InputProps: {
	                            startAdornment: adornment(<CakeOutlinedIcon fontSize="small" />),
	                          },
	                        },
	                      }}
	                      format="DD/MM/YYYY"
	                    />
	                  </Suspense>

                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                      Gender
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {GENDER_OPTIONS.map((option) => (
                        <Chip
                          key={option.value}
                          icon={option.icon}
                          label={option.label}
                          clickable
                          color={gender === option.value ? "primary" : "default"}
                          variant={gender === option.value ? "filled" : "outlined"}
                          onClick={() => setGender(option.value)}
                          sx={{ height: 36, px: 0.75 }}
                        />
                      ))}
                    </Stack>
                  </Box>
                </Box>
              </Paper>

              <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700 }}>
                  Life details
                </Typography>
                <Box sx={fieldGridSx}>
                  <Box sx={spanBothColumnsSx}>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                      Blood Group
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Chip
                        label="Unknown"
                        clickable
                        color={!bloodGroup ? "primary" : "default"}
                        variant={!bloodGroup ? "filled" : "outlined"}
                        onClick={() => setBloodGroup("")}
                      />
                      {BLOOD_GROUP_OPTIONS.map((option) => (
                        <Chip
                          key={option}
                          label={option}
                          clickable
                          color={bloodGroup === option ? "primary" : "default"}
                          variant={bloodGroup === option ? "filled" : "outlined"}
                          onClick={() => setBloodGroup(option)}
                        />
                      ))}
                    </Stack>
                  </Box>

                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Typography
                      variant="body2"
                      color={isAlive ? "text.secondary" : "text.primary"}
                      sx={{ fontWeight: isAlive ? 500 : 800 }}
                    >
                      Dead
                    </Typography>
                    <Switch
                      checked={isAlive}
                      onChange={(e) => {
                        setIsAlive(e.target.checked);
                        if (e.target.checked) setDeceasedDate(null);
                      }}
                    />
                    <Typography
                      variant="body2"
                      color={isAlive ? "text.primary" : "text.secondary"}
                      sx={{ fontWeight: isAlive ? 800 : 500 }}
                    >
                      Alive
                    </Typography>
                  </Stack>

                  {!isAlive && (
                    <Suspense fallback={<TextField fullWidth label="Deceased Date" />}>
	                      <DatePicker
	                        label="Deceased Date"
	                        value={deceasedDate}
	                        onChange={(value) => setDeceasedDate(value)}
	                        slotProps={{
	                          textField: {
	                            fullWidth: true,
	                            sx: inputWithIconSx,
	                            InputProps: {
	                              startAdornment: adornment(<CakeOutlinedIcon fontSize="small" />),
	                            },
	                          },
	                        }}
	                        format="DD/MM/YYYY"
	                      />
                    </Suspense>
                  )}
                </Box>
              </Paper>

              <Accordion defaultExpanded variant="outlined" sx={{ borderRadius: 3, "&:before": { display: "none" } }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Additional details
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <AdditionalDetails
                    value={customFields}
                    onChange={setCustomFields}
                    showUpfrontFields={false}
                    showAdditionalSection
                  />
                </AccordionDetails>
              </Accordion>
            </Stack>
          )}

          <Box
            sx={stickyFooterSx}
          >
            <Button onClick={handleCancel} variant="outlined">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              variant="contained"
              disabled={
                isSaving ||
                (mode === "create" ? !name.trim() : !selectedPerson)
              }
              startIcon={
                isSaving ? (
                  <CircularProgress size={14} color="inherit" />
                ) : undefined
              }
            >
              {isSaving ? "Saving..." : mode === "link" ? "Link" : "Save"}
            </Button>
          </Box>
        </Stack>
      )}

      <BusinessFormDialog
        open={businessDialogOpen}
        onClose={() => setBusinessDialogOpen(false)}
        personId={savedNodeId}
        defaultContact={phoneFromCustomFields(customFields)}
        onSaved={() => setBusinessAdded(true)}
      />
    </Box>
  );
}
