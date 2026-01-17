import React, { useState, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  useMediaQuery,
  useTheme,
  Typography,
  Box,
  IconButton,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import { RelType, Gender } from "relatives-tree/lib/types";
import { FNode } from "../model/FNode";
import { AdditionalDetails } from "../AdditionalDetails/AdditionalDetails";

interface AddRelationDialogProps {
  open: boolean;
  targetNode: FNode | null;
  relation: "parent" | "spouse" | "child" | null;
  onClose: () => void;
  onAdd: (
    node: Partial<FNode>,
    relation: "child" | "spouse" | "parent",
    targetId?: string,
    type?: RelType
  ) => void;
}

export const AddRelationDialog: React.FC<AddRelationDialogProps> = ({
  open,
  targetNode,
  relation,
  onClose,
  onAdd,
}) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<Gender>(Gender.male);
  const [customFields, setCustomFields] = useState<Record<string, string>>({});
  const [relTypes, setRelTypes] = useState<RelType[]>([
    RelType.blood,
    RelType.adopted,
  ]);
  const [selectedRelType, setSelectedRelType] = useState<RelType>(
    RelType.blood
  );

  // Set opposite gender for spouse by default
  useEffect(() => {
    if (relation === "spouse" && targetNode) {
      if (targetNode.gender === Gender.male) {
        setGender(Gender.female);
      } else if (targetNode.gender === Gender.female) {
        setGender(Gender.male);
      }
    } else {
      setGender(Gender.male);
    }
  }, [relation, targetNode]);

  // Adjust available relation types based on relation category
  useEffect(() => {
    if (relation === "spouse") {
      setRelTypes([RelType.married, RelType.divorced]);
      setSelectedRelType(RelType.married);
    } else if (relation === "child" || relation === "parent") {
      setRelTypes([RelType.blood, RelType.adopted]);
      setSelectedRelType(RelType.blood);
    } else {
      setRelTypes([RelType.blood]);
      setSelectedRelType(RelType.blood);
    }
  }, [relation]);

  const handleClose = useCallback(() => {
    setName("");
    setDob("");
    setGender(Gender.male);
    setCustomFields({});
    onClose();
  }, [onClose]);

  const handleSave = useCallback(() => {
    if (!name.trim() || !relation || !targetNode) {
      return;
    }

    const newNode: Partial<FNode> = {
      name: name.trim(),
      dob: dob || undefined,
      gender: gender || undefined,
      children: [],
      parents: [],
      spouses: [],
      siblings: [],
      customFields:
        Object.keys(customFields).length > 0 ? customFields : undefined,
    };

    onAdd(newNode, relation, targetNode.id, selectedRelType);
    handleClose();
  }, [
    name,
    dob,
    gender,
    customFields,
    relation,
    targetNode,
    onAdd,
    selectedRelType,
    handleClose,
  ]);

  const getDialogTitle = () => {
    const relationLabel =
      relation === "parent"
        ? "Add Parent"
        : relation === "spouse"
        ? "Add Spouse"
        : relation === "child"
        ? "Add Child"
        : "Add Family Member";

    if (targetNode) {
      return `${relationLabel} to ${targetNode.name}`;
    }

    return relationLabel;
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullScreen={fullScreen}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="h6">{getDialogTitle()}</Typography>
          <IconButton onClick={handleClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Relation
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {relation === "parent"
                ? "Parent"
                : relation === "spouse"
                ? "Spouse"
                : relation === "child"
                ? "Child"
                : "Not selected"}
            </Typography>
          </Box>
          <TextField
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
            autoFocus
          />

          <TextField
            label="Date of Birth"
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />

          <FormControl component="fieldset">
            <FormLabel component="legend">Gender</FormLabel>
            <RadioGroup
              row
              value={gender}
              onChange={(e) => setGender(e.target.value as Gender)}
            >
              <FormControlLabel
                value={Gender.male}
                control={<Radio />}
                label="Male"
              />
              <FormControlLabel
                value={Gender.female}
                control={<Radio />}
                label="Female"
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
                  label={
                    type === RelType.blood
                      ? "Blood"
                      : type === RelType.adopted
                      ? "Adopted"
                      : type === RelType.married
                      ? "Married"
                      : type === RelType.divorced
                      ? "Divorced"
                      : type
                  }
                />
              ))}
            </RadioGroup>
          </FormControl>

          <AdditionalDetails value={customFields} onChange={setCustomFields} />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} variant="outlined">
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!name.trim()}
        >
          Add {relation}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
