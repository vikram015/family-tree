import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Autocomplete,
  Stack,
  Paper,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { db } from "../../firebase";
import { collection, onSnapshot } from "firebase/firestore";

interface CustomFieldValue {
  fieldName: string;
  value: string;
}

interface AdditionalDetailsProps {
  value: Record<string, string>; // Current custom fields as key-value pairs
  onChange: (fields: Record<string, string>) => void;
}

export const AdditionalDetails: React.FC<AdditionalDetailsProps> = ({
  value,
  onChange,
}) => {
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const [fieldValues, setFieldValues] = useState<CustomFieldValue[]>([]);

  // Load available field names from Firestore
  useEffect(() => {
    const nodeFieldsCollection = collection(db, "node_fields");
    const unsubscribe = onSnapshot(nodeFieldsCollection, (snapshot) => {
      const fields: string[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.name) {
          fields.push(data.name);
        }
      });
      setAvailableFields(fields.sort());
    });

    return unsubscribe;
  }, []);

  // Convert value prop to array format for editing
  // Update whenever the value prop genuinely changes (not when we're just typing)
  useEffect(() => {
    const entries = Object.entries(value);
    const fieldsArray = entries.map(([fieldName, val]) => ({
      fieldName,
      value: val,
    }));
    setFieldValues(fieldsArray);
  }, [value]);

  // Convert array back to object and notify parent
  // Only include complete fields (both fieldName and value)
  const notifyChange = useCallback(
    (fields: CustomFieldValue[]) => {
      const fieldsObject: Record<string, string> = {};
      fields.forEach((field) => {
        if (field.fieldName && field.value) {
          fieldsObject[field.fieldName] = field.value;
        }
      });
      onChange(fieldsObject);
    },
    [onChange]
  );

  const handleAddField = useCallback(() => {
    const newFields = [...fieldValues, { fieldName: "", value: "" }];
    setFieldValues(newFields);
  }, [fieldValues]);

  const handleRemoveField = useCallback(
    (index: number) => {
      const newFields = fieldValues.filter((_, i) => i !== index);
      setFieldValues(newFields);
      notifyChange(newFields);
    },
    [fieldValues, notifyChange]
  );

  const handleFieldNameChange = useCallback(
    (index: number, newName: string | null) => {
      const newFields = [...fieldValues];
      newFields[index] = { ...newFields[index], fieldName: newName || "" };
      setFieldValues(newFields);
      notifyChange(newFields);
    },
    [fieldValues, notifyChange]
  );

  const handleFieldValueChange = useCallback(
    (index: number, newValue: string) => {
      const newFields = [...fieldValues];
      newFields[index] = { ...newFields[index], value: newValue };
      setFieldValues(newFields);
      notifyChange(newFields);
    },
    [fieldValues, notifyChange]
  );

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
        }}
      >
        <Typography variant="subtitle1" fontWeight="bold">
          Additional Details
        </Typography>
        <IconButton size="small" color="primary" onClick={handleAddField}>
          <AddIcon />
        </IconButton>
      </Box>

      <Stack spacing={2}>
        {fieldValues.map((field, index) => (
          <Paper
            key={index}
            elevation={1}
            sx={{
              p: 2,
              display: "flex",
              gap: 1,
              alignItems: "flex-start",
            }}
          >
            <Box sx={{ flex: 1 }}>
              <Autocomplete
                options={availableFields}
                value={field.fieldName || null}
                onChange={(_, newValue) =>
                  handleFieldNameChange(index, newValue)
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Field Name"
                    size="small"
                    placeholder="Select a field"
                  />
                )}
              />
              <TextField
                label="Value"
                value={field.value}
                onChange={(e) => handleFieldValueChange(index, e.target.value)}
                fullWidth
                size="small"
                sx={{ mt: 1 }}
                placeholder="Enter value"
              />
            </Box>
            <IconButton
              size="small"
              color="error"
              onClick={() => handleRemoveField(index)}
              sx={{ mt: 0.5 }}
            >
              <DeleteIcon />
            </IconButton>
          </Paper>
        ))}

        {fieldValues.length === 0 && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ textAlign: "center", py: 2 }}
          >
            No additional details added. Click + to add custom fields.
          </Typography>
        )}
      </Stack>
    </Box>
  );
};
