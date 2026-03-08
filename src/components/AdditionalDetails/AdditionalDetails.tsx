import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Autocomplete,
  Stack,
  Paper,
  MenuItem,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { ApiService, PredefinedPeopleField } from "../../services/apiService";

interface CustomFieldValue {
  fieldName: string;
  value: string;
}

interface AdditionalDetailsProps {
  value: Record<string, string>; // Current custom fields as key-value pairs
  onChange: (fields: Record<string, string>) => void;
  excludeFields?: string[];
  showUpfrontFields?: boolean;
  showAdditionalSection?: boolean;
}

const DEFAULT_EXCLUDE_FIELDS: string[] = [];

export const AdditionalDetails: React.FC<AdditionalDetailsProps> = ({
  value,
  onChange,
  excludeFields = DEFAULT_EXCLUDE_FIELDS,
  showUpfrontFields = true,
  showAdditionalSection = true,
}) => {
  const [availableFields, setAvailableFields] = useState<PredefinedPeopleField[]>([]);
  const [fieldValues, setFieldValues] = useState<CustomFieldValue[]>([]);

  useEffect(() => {
    const loadFields = async () => {
      try {
        const fields = await ApiService.getPredefinedFields();
        const normalizedFields = (fields || [])
          .map((field: any) => {
            if (typeof field === "string") {
              return {
                fieldName: field,
                type: "text",
                sortOrder: 9999,
                showUpfront: false,
              } as PredefinedPeopleField;
            }
            return {
              fieldName: field?.fieldName || "",
              type: field?.type || "text",
              sortOrder: Number(field?.sortOrder ?? 9999),
              showUpfront: Boolean(field?.showUpfront),
            } as PredefinedPeopleField;
          })
          .filter((field) => !!field.fieldName);

        setAvailableFields(normalizedFields);
      } catch (error) {
        console.error("Failed to load predefined fields:", error);
        setAvailableFields([]);
      }
    };

    loadFields();
  }, [excludeFields]);

  const getFieldMeta = useCallback(
    (fieldName: string) =>
      availableFields.find(
        (f) => f.fieldName === fieldName || f.fieldName.toLowerCase() === fieldName.toLowerCase(),
      ),
    [availableFields],
  );

  const buildRows = useCallback(
    (source: Record<string, string>): CustomFieldValue[] => {
      const filteredEntries = Object.entries(source).filter(([key]) => !excludeFields.includes(key));
      const valuesByField = new Map(filteredEntries);

      const upfrontFields = availableFields
        .filter((f) => f.showUpfront && !excludeFields.includes(f.fieldName))
        .sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999) || a.fieldName.localeCompare(b.fieldName));

      const upfrontRows: CustomFieldValue[] = upfrontFields.map((f) => ({
        fieldName: f.fieldName,
        value: valuesByField.get(f.fieldName) || "",
      }));

      const upfrontNames = new Set(upfrontRows.map((row) => row.fieldName.toLowerCase()));

      const dynamicRows = filteredEntries
        .filter(([fieldName]) => !upfrontNames.has(fieldName.toLowerCase()))
        .sort(([nameA], [nameB]) => {
          const metaA = getFieldMeta(nameA);
          const metaB = getFieldMeta(nameB);
          const orderA = metaA?.sortOrder ?? 9999;
          const orderB = metaB?.sortOrder ?? 9999;
          return orderA - orderB || nameA.localeCompare(nameB);
        })
        .map(([fieldName, fieldValue]) => ({ fieldName, value: fieldValue }));

      return [...upfrontRows, ...dynamicRows];
    },
    [availableFields, excludeFields, getFieldMeta],
  );

  useEffect(() => {
    setFieldValues(buildRows(value));
  }, [value, buildRows]);

  const notifyChange = useCallback(
    (fields: CustomFieldValue[]) => {
      const fieldsObject: Record<string, string> = {};
      fields.forEach((field) => {
        if (field.fieldName) {
          fieldsObject[field.fieldName] = field.value || "";
        }
      });
      onChange(fieldsObject);
    },
    [onChange],
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
    [fieldValues, notifyChange],
  );

  const handleFieldNameChange = useCallback(
    (index: number, newName: string | null) => {
      const newFields = [...fieldValues];
      newFields[index] = { ...newFields[index], fieldName: newName || "" };
      setFieldValues(newFields);
      notifyChange(newFields);
    },
    [fieldValues, notifyChange],
  );

  const handleFieldValueChange = useCallback(
    (index: number, newValue: string) => {
      const newFields = [...fieldValues];
      newFields[index] = { ...newFields[index], value: newValue };
      setFieldValues(newFields);
      notifyChange(newFields);
    },
    [fieldValues, notifyChange],
  );

  const isUpfrontField = useCallback(
    (fieldName: string) => {
      const meta = getFieldMeta(fieldName);
      return !!meta?.showUpfront;
    },
    [getFieldMeta],
  );

  const fieldOptions = availableFields
    .filter((f) => !excludeFields.includes(f.fieldName))
    .sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999) || a.fieldName.localeCompare(b.fieldName))
    .map((f) => f.fieldName);

  const renderValueInput = (
    field: CustomFieldValue,
    index: number,
    options?: { label?: string; marginTop?: number; size?: "small" | "medium" },
  ) => {
    const label = options?.label || "Value";
    const marginTop = options?.marginTop ?? 1;
    const size = options?.size || "small";
    const fieldType = getFieldMeta(field.fieldName)?.type || "text";

    if (fieldType === "boolean") {
      return (
        <TextField
          label={label}
          value={field.value}
          onChange={(e) => handleFieldValueChange(index, e.target.value)}
          fullWidth
          size={size}
          sx={{ mt: marginTop }}
          select
        >
          <MenuItem value="">Select value</MenuItem>
          <MenuItem value="true">True</MenuItem>
          <MenuItem value="false">False</MenuItem>
        </TextField>
      );
    }

    const inputType =
      fieldType === "number"
        ? "number"
        : fieldType === "date"
          ? "date"
          : fieldType === "email"
            ? "email"
            : fieldType === "phone"
              ? "tel"
              : "text";

    if (fieldType === "textarea") {
      return (
        <TextField
          label={label}
          value={field.value}
          onChange={(e) => handleFieldValueChange(index, e.target.value)}
          fullWidth
          size={size}
          sx={{ mt: marginTop }}
          placeholder="Enter value"
          multiline
          minRows={3}
        />
      );
    }

    return (
      <TextField
        label={label}
        value={field.value}
        onChange={(e) => handleFieldValueChange(index, e.target.value)}
        fullWidth
        size={size}
        sx={{ mt: marginTop }}
        placeholder="Enter value"
        type={inputType}
        InputLabelProps={inputType === "date" ? { shrink: true } : undefined}
      />
    );
  };

  const upfrontRows = fieldValues.filter((field) => isUpfrontField(field.fieldName));
  const additionalRows = fieldValues.filter((field) => !isUpfrontField(field.fieldName));

  return (
    <Box>
      {showUpfrontFields && upfrontRows.length > 0 && (
        <Stack spacing={2} sx={{ mb: 3 }}>
          {upfrontRows.map((field) => {
            const index = fieldValues.findIndex((f) => f === field);
            if (index < 0) return null;
            return (
              <Box key={`upfront-${field.fieldName}`}>
                {renderValueInput(field, index, {
                  label: field.fieldName,
                  marginTop: 0,
                  size: "medium",
                })}
              </Box>
            );
          })}
        </Stack>
      )}

      {showAdditionalSection && (
        <>
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
            {additionalRows.map((field) => {
              const index = fieldValues.findIndex((f) => f === field);
              if (index < 0) return null;
              return (
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
                      options={fieldOptions}
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
                    {renderValueInput(field, index, { marginTop: 1 })}
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
              );
            })}

            {additionalRows.length === 0 && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ textAlign: "center", py: 2 }}
              >
                No additional details added. Click + to add custom fields.
              </Typography>
            )}
          </Stack>
        </>
      )}
    </Box>
  );
};

