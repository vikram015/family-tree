import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  TextField,
  Stack,
  MenuItem,
} from "@mui/material";
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
      const predefinedRows = availableFields
        .filter((f) => !excludeFields.includes(f.fieldName))
        .sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999) || a.fieldName.localeCompare(b.fieldName));
      const baseRows: CustomFieldValue[] = predefinedRows.map((f) => ({
        fieldName: f.fieldName,
        value: valuesByField.get(f.fieldName) || "",
      }));
      const knownNames = new Set(baseRows.map((row) => row.fieldName.toLowerCase()));
      const extraRows = filteredEntries
        .filter(([fieldName]) => !knownNames.has(fieldName.toLowerCase()))
        .sort(([nameA], [nameB]) => {
          const metaA = getFieldMeta(nameA);
          const metaB = getFieldMeta(nameB);
          const orderA = metaA?.sortOrder ?? 9999;
          const orderB = metaB?.sortOrder ?? 9999;
          return orderA - orderB || nameA.localeCompare(nameB);
        })
        .map(([fieldName, fieldValue]) => ({ fieldName, value: fieldValue }));
      return [...baseRows, ...extraRows];
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

  const handleFieldValueChange = useCallback(
    (index: number, newValue: string) => {
      const newFields = [...fieldValues];
      newFields[index] = { ...newFields[index], value: newValue };
      setFieldValues(newFields);
      notifyChange(newFields);
    },
    [fieldValues, notifyChange],
  );

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

  return (
    <Box>
      <Stack spacing={2}>
        {fieldValues.map((field, index) => {
          return (
            <Box key={`field-${field.fieldName || index}`}>
              {renderValueInput(field, index, {
                label: field.fieldName,
                marginTop: 0,
                size: "medium",
              })}
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
};
