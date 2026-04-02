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
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Select,
  MenuItem,
  InputLabel,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Switch,
  Chip,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import PersonAddAlt1OutlinedIcon from "@mui/icons-material/PersonAddAlt1Outlined";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import WorkOutlineOutlinedIcon from "@mui/icons-material/WorkOutlineOutlined";
import dayjs, { Dayjs } from "dayjs";
import { FNode } from "../model/FNode";
import { AdditionalDetails } from "../AdditionalDetails/AdditionalDetails";
import { HindiNameInput } from "../HindiNameInput/HindiNameInput";
import { useAuth } from "../hooks/useAuth";
import { useLoginModal } from "../context/LoginModalContext";
import { ApiService } from "../../services/apiService";
import { PersonSearchField } from "../BusinessPage/PersonSearchField";
const DatePicker = React.lazy(() =>
  import("@mui/x-date-pickers/DatePicker").then((m) => ({
    default: m.DatePicker,
  })),
);
const ImageCropper = React.lazy(() => import("../ImageCropper/ImageCropper"));

interface AddNodeProps {
  targetId?: string; // id of node in relation to which we add (e.g. parent/child/spouse)
  onAdd?: (
    node: Partial<FNode>,
    relation: "child" | "spouse" | "parent",
    targetId?: string,
    type?: RelType,
    otherParentId?: string, // second parent for children or second spouse
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
  const [villages, setVillages] = useState<any[]>([]);
  const [searchVillageId, setSearchVillageId] = useState("");
  const [selectedPerson, setSelectedPerson] = useState<any | null>(null);
  const [personSearchValue, setPersonSearchValue] = useState("");

  // Step 2 State (Business/Profession)
  const [step, setStep] = useState(1);
  const [savedNodeId, setSavedNodeId] = useState<string | null>(null);
  const [flowTargetId, setFlowTargetId] = useState<string | undefined>(targetId);
  const [occupationType, setOccupationType] = useState<
    "business" | "job" | "other"
  >("business");

  // Business Fields
  const [businessName, setBusinessName] = useState("");
  const [businessCategory, setBusinessCategory] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessContact, setBusinessContact] = useState("");

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

  useEffect(() => {
    setFlowTargetId(targetId);
  }, [targetId]);

  const effectiveTargetId = flowTargetId ?? targetId;

  const formatPickerDate = useCallback((value: Dayjs | null) => {
    if (!value || !value.isValid()) return undefined;
    return value.format("YYYY-MM-DD");
  }, []);

  // Load villages for the search dropdown
  useEffect(() => {
    ApiService.getVillages().then((data) => {
      setVillages(data || []);
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

  // other-parent selection for child relation
  const spouseOptions = useMemo(() => {
    if (!nodes || !effectiveTargetId) return [];
    const target = nodes.find((n) => n.id === effectiveTargetId);
    if (!target || !Array.isArray(target.spouses)) return [];
    return target.spouses
      .map((s) => nodes.find((n) => n.id === s.id))
      .filter(Boolean) as FNode[];
  }, [effectiveTargetId, nodes]);

  const [selectedOtherParentId, setSelectedOtherParentId] = useState<string>(
    () => "",
  );
  useEffect(() => {
    // default to first spouse if available
    if (spouseOptions.length > 0) {
      setSelectedOtherParentId(spouseOptions[0].id);
    } else {
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
    setSelectedPerson(null);
    setSearchVillageId("");
    setPersonSearchValue("");
    setBloodGroup("");
    setIsAlive(true);
    setDeceasedDate(null);
    setPhotoBlob(null);
    setPhotoPreview(undefined);

    // Reset Step 2
    setStep(1);
    setSavedNodeId(null);
    setBusinessName("");
    setBusinessCategory("");
    setBusinessAddress("");
    setBusinessContact("");
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
    setSelectedPerson(null);
    setSearchVillageId("");
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
    setBusinessName("");
    setBusinessCategory("");
    setBusinessAddress("");
    setBusinessContact("");
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
    setSelectedPerson(null);
    setSearchVillageId("");
    setPersonSearchValue("");
    setBloodGroup("");
    setIsAlive(true);
    setDeceasedDate(null);
    setPhotoBlob(null);
    setPhotoPreview(undefined);

    setStep(1);
    setSavedNodeId(null);
    setFlowTargetId(targetId);
    setBusinessName("");
    setBusinessCategory("");
    setBusinessAddress("");
    setBusinessContact("");
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
      if (occupationType === "business") {
        if (businessName) {
          await ApiService.createBusiness({
            name: businessName,
            category: businessCategory,
            address: businessAddress,
            description: businessAddress,
            contact: businessContact || null,
            peopleId: savedNodeId,
          });
        }
      } else if (occupationType === "job") {
        if (jobTitle) {
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
    businessAddress,
    businessCategory,
    businessContact,
    businessName,
    handleContinueWithSon,
    handleFlowComplete,
    isSavingDetails,
    jobContact,
    jobTitle,
    occupationType,
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
        disabled:
          isSavingDetails ||
          (occupationType === "business" && !businessName) ||
          (occupationType === "job" && !jobTitle),
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
    businessName,
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
            <Stack spacing={2.25}>
              <FormControl fullWidth>
                <InputLabel>Occupation Type</InputLabel>
                <Select
                  value={occupationType}
                  onChange={(e) => setOccupationType(e.target.value as any)}
                  label="Occupation Type"
                >
                  <MenuItem value="business">Business Owner</MenuItem>
                  <MenuItem value="job">Salaried / Professional</MenuItem>
                  <MenuItem value="other">Student / Homemaker / Other</MenuItem>
                </Select>
              </FormControl>

          {occupationType === "business" && (
            <>
              <TextField
                label="Business Name"
                fullWidth
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Shop or Company Name"
              />
              <TextField
                label="Category"
                fullWidth
                value={businessCategory}
                onChange={(e) => setBusinessCategory(e.target.value)}
                placeholder="e.g. Retail, Agriculture, Tech"
              />
              <TextField
                label="Location / Village"
                fullWidth
                value={businessAddress}
                onChange={(e) => setBusinessAddress(e.target.value)}
                placeholder="Where is it located?"
              />
              <TextField
                label="Contact Number"
                fullWidth
                value={businessContact}
                onChange={(e) => setBusinessContact(e.target.value)}
                placeholder="Phone number (optional)"
              />
            </>
          )}

          {occupationType === "job" && (
            <>
              <TextField
                label="Job Title / Profession"
                fullWidth
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Software Engineer, Doctor, Teacher"
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
              />
            </>
          )}
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
              disabled={
                isSavingDetails ||
                (occupationType === "business" && !businessName) ||
                (occupationType === "job" && !jobTitle)
              }
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
              <FormControl component="fieldset">
                <FormLabel component="legend">Relation</FormLabel>
                <RadioGroup
                  row
                  value={relation}
                  onChange={(e) => setRelation(e.target.value as any)}
                >
                  <FormControlLabel
                    value="child"
                    control={<Radio />}
                    label="Child"
                  />
                  <FormControlLabel
                    value="spouse"
                    control={<Radio />}
                    label="Spouse"
                  />
                  <FormControlLabel
                    value="parent"
                    control={<Radio />}
                    label="Parent"
                  />
                </RadioGroup>
              </FormControl>
            </Paper>
          )}

          {!isFirstNode && (
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
              <FormControl component="fieldset">
                <FormLabel component="legend">Relation Type</FormLabel>
                <RadioGroup
                  row
                  value={selectedRelType}
                  onChange={(e) => {
                    const nextType = e.target.value as RelType;
                    setSelectedRelType(nextType);
                    if (nextType !== RelType.divorced) {
                      setRelationEndDate(null);
                    }
                  }}
                >
                  {relTypes.map((type) => (
                    <FormControlLabel
                      key={type}
                      value={type}
                      control={<Radio />}
                      label={type}
                    />
                  ))}
                </RadioGroup>
              </FormControl>
            </Paper>
          )}

          {!isFirstNode && relation === "spouse" && (
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
              <Stack spacing={2} sx={{ mb: 1 }}>
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Action
                  </Typography>
                  <ToggleButtonGroup
                    color="primary"
                    value={mode}
                    exclusive
                    onChange={(_, newMode) => newMode && setMode(newMode)}
                    size="small"
                    fullWidth
                  >
                    <ToggleButton value="create">Create New Profile</ToggleButton>
                    <ToggleButton value="link">Link Existing Profile</ToggleButton>
                  </ToggleButtonGroup>
                </Box>

                <Suspense fallback={<TextField fullWidth label="Marriage Start Date" />}>
                  <DatePicker
                    label="Marriage Start Date (optional)"
                    value={relationStartDate}
                    onChange={(value) => setRelationStartDate(value)}
                    slotProps={{ textField: { fullWidth: true } }}
                    format="DD/MM/YYYY"
                  />
                </Suspense>
                {selectedRelType === RelType.divorced && (
                  <Suspense fallback={<TextField fullWidth label="Marriage End Date" />}>
                    <DatePicker
                      label="Marriage End Date (optional)"
                      value={relationEndDate}
                      onChange={(value) => setRelationEndDate(value)}
                      slotProps={{ textField: { fullWidth: true } }}
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
              <FormControl fullWidth>
                <InputLabel>Select Village (Required)</InputLabel>
                <Select
                  value={searchVillageId}
                  onChange={(e) => {
                    setSearchVillageId(e.target.value);
                    setPersonSearchValue("");
                    setSelectedPerson(null);
                  }}
                  label="Select Village (Required)"
                >
                  <MenuItem value="">-- Select Village --</MenuItem>
                  {villages.map((v) => (
                    <MenuItem key={v.id} value={v.id}>
                      {v.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {searchVillageId ? (
                <PersonSearchField
                  villageId={searchVillageId}
                  searchValue={personSearchValue}
                  onSearchValueChange={setPersonSearchValue}
                  onPersonSelect={setSelectedPerson}
                  selectedPerson={selectedPerson}
                  label="Search Person"
                  placeholder="Type name to search..."
                />
              ) : (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontStyle: "italic", display: "block", mt: -0.5 }}
                >
                  Please select a village first to search for people.
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
                    {[selectedPerson.villageName, selectedPerson.casteName]
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
                <Stack spacing={2}>
                  {!isFirstNode && relation === "child" && (
                    <FormControl fullWidth>
                      <InputLabel>Other parent</InputLabel>
                      <Select
                        value={selectedOtherParentId}
                        onChange={(e) => setSelectedOtherParentId(e.target.value)}
                        label="Other parent"
                      >
                        <MenuItem value="">None</MenuItem>
                        {spouseOptions.map((s) => (
                          <MenuItem key={s.id} value={s.id}>
                            {s.name ||
                              (targetNode?.name
                                ? `${targetNode.name}'s Spouse`
                                : s.id)}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}

                  <Box
                    sx={{
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
                      slotProps={{ textField: { fullWidth: true } }}
                      format="DD/MM/YYYY"
                    />
                  </Suspense>

                  <FormControl sx={{ m: 0 }}>
                    <FormLabel sx={{ mb: 0.5 }}>Gender</FormLabel>
                    <RadioGroup
                      row
                      sx={{ gap: 1.5 }}
                      value={gender}
                      onChange={(e) =>
                        setGender(e.target.value as "male" | "female" | "other")
                      }
                    >
                      <FormControlLabel
                        value="male"
                        control={<Radio />}
                        label="Male"
                      />
                      <FormControlLabel
                        value="female"
                        control={<Radio />}
                        label="Female"
                      />
                      <FormControlLabel
                        value="other"
                        control={<Radio />}
                        label="Other"
                      />
                    </RadioGroup>
                  </FormControl>
                </Stack>
              </Paper>

              <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700 }}>
                  Life details
                </Typography>
                <Stack spacing={2}>
                  <FormControl fullWidth>
                    <InputLabel>Blood Group</InputLabel>
                    <Select
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value)}
                      label="Blood Group"
                    >
                      <MenuItem value="">Unknown</MenuItem>
                      <MenuItem value="A+">A+</MenuItem>
                      <MenuItem value="A-">A−</MenuItem>
                      <MenuItem value="B+">B+</MenuItem>
                      <MenuItem value="B-">B−</MenuItem>
                      <MenuItem value="AB+">AB+</MenuItem>
                      <MenuItem value="AB-">AB−</MenuItem>
                      <MenuItem value="O+">O+</MenuItem>
                      <MenuItem value="O-">O−</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControlLabel
                    sx={{ m: 0 }}
                    control={
                      <Switch
                        checked={isAlive}
                        onChange={(e) => {
                          setIsAlive(e.target.checked);
                          if (e.target.checked) setDeceasedDate(null);
                        }}
                      />
                    }
                    label="Is Alive"
                  />

                  {!isAlive && (
                    <Suspense fallback={<TextField fullWidth label="Deceased Date" />}>
                      <DatePicker
                        label="Deceased Date"
                        value={deceasedDate}
                        onChange={(value) => setDeceasedDate(value)}
                        slotProps={{ textField: { fullWidth: true } }}
                        format="DD/MM/YYYY"
                      />
                    </Suspense>
                  )}
                </Stack>
              </Paper>

              <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700 }}>
                  Additional details
                </Typography>
                <AdditionalDetails
                  value={customFields}
                  onChange={setCustomFields}
                  showUpfrontFields={false}
                  showAdditionalSection
                />
              </Paper>
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
    </Box>
  );
}
