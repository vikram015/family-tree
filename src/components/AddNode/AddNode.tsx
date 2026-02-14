import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Node, RelType } from "relatives-tree/lib/types";
import {
  Box,
  Typography,
  TextField,
  Button,
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
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  Switch,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import { FNode } from "../model/FNode";
import { AdditionalDetails } from "../AdditionalDetails/AdditionalDetails";
import { useAuth } from "../hooks/useAuth";
import { useLoginModal } from "../context/LoginModalContext";
import { SupabaseService } from "../../services/supabaseService";
import { PersonSearchField } from "../BusinessPage/PersonSearchField";
import ImageCropper from "../ImageCropper/ImageCropper";

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
}

const EXCLUDED_FIELDS = ["Gotra", "Village"];

const AddNode: React.FC<AddNodeProps> = ({
  targetId,
  onAdd,
  onCancel,
  onComplete,
  nodes,
  noCard = false,
  isFirstNode = false,
  initialRelation,
  initialGender,
}) => {
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other" | "">(
    initialGender || "male",
  );
  const [gotra, setGotra] = useState("");
  const [village, setVillage] = useState("");
  const [relation, setRelation] = useState<"child" | "spouse" | "parent">(
    initialRelation || "child",
  );
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
  const [occupationType, setOccupationType] = useState<
    "business" | "job" | "other"
  >("business");

  // Business Fields
  const [businessName, setBusinessName] = useState("");
  const [businessCategory, setBusinessCategory] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");

  // Profession Fields
  const [jobTitle, setJobTitle] = useState("");
  const [allProfessions, setAllProfessions] = useState<any[]>([]);

  // New person fields
  const [bloodGroup, setBloodGroup] = useState("");
  const [isAlive, setIsAlive] = useState(true);
  const [deceasedDate, setDeceasedDate] = useState("");

  // Photo state
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | undefined>(
    undefined,
  );
  const [photoUploading, setPhotoUploading] = useState(false);

  // Load villages for the search dropdown
  useEffect(() => {
    SupabaseService.getVillages().then((data) => {
      setVillages(data || []);
    });
    SupabaseService.getAllProfessions().then((data) => {
      setAllProfessions(data || []);
    });
  }, []);

  // Update mode defaults when relation changes
  useEffect(() => {
    if (relation !== "spouse") {
      setMode("create");
    }
  }, [relation]);
  const targetNode = useMemo(() => {
    if (!nodes || !targetId) return null;
    return nodes.find((n) => n.id === targetId);
  }, [nodes, targetId]);

  // other-parent selection for child relation
  const spouseOptions = useMemo(() => {
    if (!nodes || !targetId) return [];
    const target = nodes.find((n) => n.id === targetId);
    if (!target || !Array.isArray(target.spouses)) return [];
    return target.spouses
      .map((s) => nodes.find((n) => n.id === s.id))
      .filter(Boolean) as FNode[];
  }, [nodes, targetId]);

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
    setDob("");
    setGender("");
    setGotra("");
    setVillage("");
    setRelation("child");
    setCustomFields({});
    setMode("create");
    setSelectedPerson(null);
    setSearchVillageId("");
    setPersonSearchValue("");
    setBloodGroup("");
    setIsAlive(true);
    setDeceasedDate("");
    setPhotoBlob(null);
    setPhotoPreview(undefined);

    // Reset Step 2
    setStep(1);
    setSavedNodeId(null);
    setBusinessName("");
    setBusinessCategory("");
    setBusinessAddress("");
    setJobTitle("");
    setOccupationType("business");
  }, [onCancel]);

  /** Called when the full add flow is done (Step 2 skip or save).
   *  Uses onComplete to close the entire dialog, falling back to onCancel. */
  const handleFlowComplete = useCallback(() => {
    // reset local form
    setName("");
    setDob("");
    setGender("");
    setGotra("");
    setVillage("");
    setRelation("child");
    setCustomFields({});
    setMode("create");
    setSelectedPerson(null);
    setSearchVillageId("");
    setPersonSearchValue("");
    setBloodGroup("");
    setIsAlive(true);
    setDeceasedDate("");
    setPhotoBlob(null);
    setPhotoPreview(undefined);

    // Reset Step 2
    setStep(1);
    setSavedNodeId(null);
    setBusinessName("");
    setBusinessCategory("");
    setBusinessAddress("");
    setJobTitle("");
    setOccupationType("business");

    // Close the dialog — prefer onComplete, fallback to onCancel
    if (onComplete) {
      onComplete();
    } else {
      onCancel?.();
    }
  }, [onComplete, onCancel]);

  const handleSaveDetails = async () => {
    if (!savedNodeId) {
      handleFlowComplete();
      return;
    }

    try {
      if (occupationType === "business") {
        if (businessName) {
          await SupabaseService.createBusiness({
            name: businessName,
            category: businessCategory,
            address: businessAddress, // Use description or separate field if available, SupabaseService uses description
            description: businessAddress,
            people_id: savedNodeId,
          });
        }
      } else if (occupationType === "job") {
        if (jobTitle) {
          // Try to find existing profession
          const existing = allProfessions.find(
            (p) => p.name.toLowerCase() === jobTitle.trim().toLowerCase(),
          );

          let profId = existing?.id;

          if (!profId) {
            const newProf = await SupabaseService.createProfession({
              name: jobTitle.trim(),
            });
            // Handle response which might be object or array
            profId = newProf?.id || (Array.isArray(newProf) && newProf[0]?.id);
          }

          if (profId) {
            await SupabaseService.addProfessionToPerson(savedNodeId, profId);
          }
        }
      }
    } catch (error) {
      console.error("Error saving details:", error);
    }

    handleFlowComplete();
  };

  const handleSave = useCallback(async () => {
    // If linking existing person
    if (mode === "link") {
      if (!selectedPerson) return;
      onAdd?.(
        {
          id: selectedPerson.id,
          name: selectedPerson.name,
        } as unknown as Partial<FNode>, // Pass existing ID
        relation,
        targetId,
        selectedRelType,
        selectedOtherParentId,
      );
      handleCancel();
      return;
    }

    if (!name.trim()) {
      // minimal validation
      return;
    }

    const mergedFields = {
      ...customFields,
      Gotra: gotra.trim(),
      Village: village.trim(),
    };

    const processAdd = async () => {
      // prepare parents array: include targetId (if adding child) and optional other parent
      let parents: Array<{ id: string; type?: RelType }> = [];
      if (relation === "child" && targetId) {
        parents.push({ id: targetId, type: selectedRelType });
        if (selectedOtherParentId && selectedOtherParentId !== targetId) {
          parents.push({ id: selectedOtherParentId, type: selectedRelType });
        }
      }

      const newNode: Partial<any> = {
        name: name.trim(),
        dob: dob || undefined,
        gender: (gender as any) || undefined,
        bloodGroup: bloodGroup || undefined,
        isAlive: isAlive,
        deceasedDate: !isAlive && deceasedDate ? deceasedDate : undefined,
        children: [],
        parents: parents.length ? parents : undefined,
        spouses: [],
        customFields:
          Object.keys(mergedFields).length > 0 ? mergedFields : undefined,
      };

      const resultId = await onAdd?.(
        newNode,
        relation,
        targetId,
        selectedRelType,
        selectedOtherParentId,
      );

      if (resultId && typeof resultId === "string") {
        // Upload photo if one was cropped
        if (photoBlob) {
          try {
            setPhotoUploading(true);
            await SupabaseService.uploadPersonPhoto(resultId, photoBlob);
          } catch (err) {
            console.error("Photo upload failed:", err);
          } finally {
            setPhotoUploading(false);
          }
        }
        setSavedNodeId(resultId);
        setStep(2);
      } else {
        handleCancel();
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
    gender,
    gotra,
    village,
    customFields,
    relation,
    targetId,
    onAdd,
    handleCancel,
    selectedOtherParentId,
    selectedRelType,
    mode,
    selectedPerson,
  ]);

  return (
    <Box
      component={noCard ? "div" : Paper}
      sx={noCard ? {} : { p: 3, elevation: 2 }}
    >
      {!noCard && step === 1 && (
        <Typography variant="h6" gutterBottom>
          {isFirstNode
            ? "Add First Family Member"
            : `Add Family Member to ${targetNode ? targetNode.name : "Tree"}`}
        </Typography>
      )}

      {step === 2 ? (
        <Stack spacing={3}>
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
            </>
          )}

          <Box
            sx={{ display: "flex", gap: 2, justifyContent: "flex-end", mt: 4 }}
          >
            <Button onClick={handleFlowComplete} color="inherit">
              Skip
            </Button>
            <Button
              onClick={handleSaveDetails}
              variant="contained"
              disabled={
                (occupationType === "business" && !businessName) ||
                (occupationType === "job" && !jobTitle)
              }
            >
              Save & Finish
            </Button>
          </Box>
        </Stack>
      ) : (
        <Stack spacing={3}>
          {!isFirstNode && (
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
          )}

          {!isFirstNode && (
            <FormControl component="fieldset">
              <FormLabel component="legend">Relation Type</FormLabel>
              <RadioGroup
                row
                value={selectedRelType}
                onChange={(e) => setSelectedRelType(e.target.value as RelType)}
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
          )}

          {!isFirstNode && relation === "spouse" && (
            <Box sx={{ mb: 2 }}>
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
          )}

          {mode === "link" && relation === "spouse" ? (
            <Stack spacing={2}>
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
                  sx={{ fontStyle: "italic", display: "block", my: 1 }}
                >
                  Please select a village first to search for people.
                </Typography>
              )}

              {selectedPerson && (
                <Paper
                  variant="outlined"
                  sx={{ p: 2, bgcolor: "action.hover" }}
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
          ) : (
            <>
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

              <ImageCropper
                currentPhoto={photoPreview}
                onCropped={(blob) => {
                  setPhotoBlob(blob);
                  setPhotoPreview(URL.createObjectURL(blob));
                }}
                onRemove={() => {
                  setPhotoBlob(null);
                  setPhotoPreview(undefined);
                }}
                uploading={photoUploading}
                previewSize={70}
              />

              <TextField
                label="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                fullWidth
                required
                autoFocus
              />

              <DatePicker
                label="Date of birth (optional)"
                value={dob ? dayjs(dob) : null}
                onChange={(val) => setDob(val ? val.format("YYYY-MM-DD") : "")}
                slotProps={{ textField: { fullWidth: true } }}
                format="DD/MM/YYYY"
              />

              <TextField
                label="Gotra"
                value={gotra}
                onChange={(e) => setGotra(e.target.value)}
                fullWidth
              />

              <TextField
                label="Village"
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                fullWidth
              />

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
                control={
                  <Switch
                    checked={isAlive}
                    onChange={(e) => {
                      setIsAlive(e.target.checked);
                      if (e.target.checked) setDeceasedDate("");
                    }}
                  />
                }
                label="Is Alive"
              />

              {!isAlive && (
                <DatePicker
                  label="Deceased Date"
                  value={deceasedDate ? dayjs(deceasedDate) : null}
                  onChange={(val) =>
                    setDeceasedDate(val ? val.format("YYYY-MM-DD") : "")
                  }
                  slotProps={{ textField: { fullWidth: true } }}
                  format="DD/MM/YYYY"
                />
              )}

              <FormControl>
                <FormLabel>Gender</FormLabel>
                <RadioGroup
                  row
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

              <Divider />

              <AdditionalDetails
                value={customFields}
                onChange={setCustomFields}
                excludeFields={EXCLUDED_FIELDS}
              />
            </>
          )}

          <Box
            sx={{ display: "flex", gap: 2, justifyContent: "flex-end", mt: 2 }}
          >
            <Button onClick={handleCancel} variant="outlined">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              variant="contained"
              disabled={mode === "create" ? !name.trim() : !selectedPerson}
            >
              {mode === "link" ? "Link" : "Save"}
            </Button>
          </Box>
        </Stack>
      )}
    </Box>
  );
};

export default AddNode;
