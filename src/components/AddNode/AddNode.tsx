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
} from "@mui/material";
import { FNode } from "../model/FNode";
import { AdditionalDetails } from "../AdditionalDetails/AdditionalDetails";
import { useAuth } from "../hooks/useAuth";
import { useLoginModal } from "../context/LoginModalContext";
import { SupabaseService } from "../../services/supabaseService";
import { PersonSearchField } from "../BusinessPage/PersonSearchField";

interface AddNodeProps {
  targetId?: string; // id of node in relation to which we add (e.g. parent/child/spouse)
  onAdd?: (
    node: Partial<FNode>,
    relation: "child" | "spouse" | "parent",
    targetId?: string,
    type?: RelType,
    otherParentId?: string, // second parent for children or second spouse
  ) => void;
  onCancel?: () => void;
  nodes?: Readonly<FNode>[];
  noCard?: boolean; // disables card border/background if true
  isFirstNode?: boolean; // if true, hides relation selection fields
}

const EXCLUDED_FIELDS = ["Gotra", "Village"];

const AddNode: React.FC<AddNodeProps> = ({
  targetId,
  onAdd,
  onCancel,
  nodes,
  noCard = false,
  isFirstNode = false,
}) => {
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other" | "">(
    "male",
  );
  const [gotra, setGotra] = useState("");
  const [village, setVillage] = useState("");
  const [relation, setRelation] = useState<"child" | "spouse" | "parent">(
    "child",
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

  // Load villages for the search dropdown
  useEffect(() => {
    SupabaseService.getVillages().then((data) => {
      setVillages(data || []);
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
      setGender("male"); // Reset to default
    } else if (relation === "parent") {
      setRelTypes([RelType.blood, RelType.adopted]);
      setSelectedRelType(RelType.blood);
      setGender("male"); // Reset to default
    }
  }, [relation, targetNode]);

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
  }, [onCancel]);

  const handleSave = useCallback(() => {
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

    if (!currentUser) {
      openLoginModal(() => {
        // After successful login, save the node
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
          children: [],
          parents: parents.length ? parents : undefined,
          spouses: [],
          customFields:
            Object.keys(mergedFields).length > 0 ? mergedFields : undefined,
        };

        onAdd?.(
          newNode,
          relation,
          targetId,
          selectedRelType,
          selectedOtherParentId,
        );
        handleCancel();
      });
      return;
    }

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
      children: [],
      parents: parents.length ? parents : undefined,
      spouses: [],
      customFields:
        Object.keys(mergedFields).length > 0 ? mergedFields : undefined,
    };

    onAdd?.(
      newNode,
      relation,
      targetId,
      selectedRelType,
      selectedOtherParentId,
    );
    handleCancel();
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
      {!noCard && (
        <Typography variant="h6" gutterBottom>
          {isFirstNode
            ? "Add First Family Member"
            : `Add Family Member to ${targetNode ? targetNode.name : "Tree"}`}
        </Typography>
      )}

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
              <Paper variant="outlined" sx={{ p: 2, bgcolor: "action.hover" }}>
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

            <TextField
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              required
              autoFocus
            />

            <TextField
              label="Date of birth (optional)"
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
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
    </Box>
  );
};

export default AddNode;
