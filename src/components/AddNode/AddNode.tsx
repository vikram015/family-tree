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
} from "@mui/material";
import { FNode } from "../model/FNode";
import { AdditionalDetails } from "../AdditionalDetails/AdditionalDetails";
import { useAuth } from "../context/AuthContext";
import { useLoginModal } from "../context/LoginModalContext";

interface AddNodeProps {
  targetId?: string; // id of node in relation to which we add (e.g. parent/child/spouse)
  onAdd?: (
    node: Partial<Node>,
    relation: "child" | "spouse" | "parent",
    targetId?: string,
    type?: RelType,
    otherParentId?: string, // second parent for children or second spouse
  ) => void;
  onCancel?: () => void;
  nodes?: Readonly<FNode>[];
  noCard?: boolean; // disables card border/background if true
}

const AddNode: React.FC<AddNodeProps> = ({
  targetId,
  onAdd,
  onCancel,
  nodes,
  noCard = false,
}) => {
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other" | "">(
    "male",
  );
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

  // Get the target node to determine opposite gender for spouse
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
    setRelation("child");
    setCustomFields({});
  }, [onCancel]);

  const handleSave = useCallback(() => {
    if (!name.trim()) {
      // minimal validation
      return;
    }

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
            Object.keys(customFields).length > 0 ? customFields : undefined,
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
        Object.keys(customFields).length > 0 ? customFields : undefined,
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
    customFields,
    relation,
    targetId,
    onAdd,
    handleCancel,
    selectedOtherParentId,
    selectedRelType,
  ]);

  return (
    <Box
      component={noCard ? "div" : Paper}
      sx={noCard ? {} : { p: 3, elevation: 2 }}
    >
      <Typography variant="h6" gutterBottom>
        Add Family Member
      </Typography>

      <Stack spacing={3}>
        <FormControl component="fieldset">
          <FormLabel component="legend">Relation</FormLabel>
          <RadioGroup
            row
            value={relation}
            onChange={(e) => setRelation(e.target.value as any)}
          >
            <FormControlLabel value="child" control={<Radio />} label="Child" />
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

        {relation === "child" && (
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
                  {s.name || s.id}
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

        <FormControl fullWidth>
          <InputLabel>Gender</InputLabel>
          <Select
            value={gender}
            onChange={(e) => setGender(e.target.value as any)}
            label="Gender"
          >
            <MenuItem value="">— select —</MenuItem>
            <MenuItem value="male">Male</MenuItem>
            <MenuItem value="female">Female</MenuItem>
            <MenuItem value="other">Other</MenuItem>
          </Select>
        </FormControl>

        <Divider />

        <AdditionalDetails value={customFields} onChange={setCustomFields} />

        <Box
          sx={{ display: "flex", gap: 2, justifyContent: "flex-end", mt: 2 }}
        >
          <Button onClick={handleCancel} variant="outlined">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={!name.trim()}
          >
            Save
          </Button>
        </Box>
      </Stack>
    </Box>
  );
};

export default AddNode;
