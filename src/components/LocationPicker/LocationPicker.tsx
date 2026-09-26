import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Autocomplete,
  Box,
  CircularProgress,
  InputAdornment,
  TextField,
} from "@mui/material";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import AddLocationAltOutlinedIcon from "@mui/icons-material/AddLocationAltOutlined";
import { ApiService, LocationCombinationOption } from "../../services/apiService";
import { CreateLocationDialog } from "./CreateLocationDialog";

interface LocationPickerProps {
  value: LocationCombinationOption | null;
  onChange: (value: LocationCombinationOption | null) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  size?: "small" | "medium";
  autoFocus?: boolean;
  /**
   * Only list locations that already have a tree created, and show that full
   * list as soon as the picker is opened (no typing required). Used by the
   * header type-ahead. Other usages (e.g. create-tree) keep the default
   * type-to-search behavior over all locations.
   */
  withTreesOnly?: boolean;
  /**
   * Offer an "Add new location" option (opening the shared create dialog) when
   * the typed text has no match. Used by the create-tree flow, like onboarding.
   */
  allowCreate?: boolean;
}

type LocationCreateOption = {
  isCreateOption: true;
  inputValue: string;
  label: string;
};

type PickerOption = LocationCombinationOption | LocationCreateOption;

function isCreateOption(option: any): option is LocationCreateOption {
  return Boolean(option) && option.isCreateOption === true;
}

/**
 * Search-as-you-type location picker showing the full "village, district, state"
 * hierarchy. Backed by GET /api/lookup/location-combinations. Reused across the
 * header, create-tree, business person search, and the link/merge dialogs.
 */
export const LocationPicker: React.FC<LocationPickerProps> = ({
  value,
  onChange,
  label = "Location",
  placeholder = "Search location, district, or state",
  disabled = false,
  size = "medium",
  autoFocus = false,
  withTreesOnly = false,
  allowCreate = false,
}) => {
  const [inputValue, setInputValue] = useState(value?.label || "");
  const [options, setOptions] = useState<LocationCombinationOption[]>([]);
  const [loading, setLoading] = useState(false);
  const latest = useRef(0);

  // Shared "Add a new location" dialog.
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");

  // Keep the visible text in sync when the value is set/cleared externally.
  useEffect(() => {
    setInputValue(value?.label || "");
  }, [value?.locationId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search on typed input. In withTreesOnly mode an empty box (or one
  // still showing the selected label) lists all tree-backed locations instead
  // of skipping the fetch, so the header dropdown is populated on open.
  useEffect(() => {
    const q = inputValue.trim();
    // Invalidate any in-flight search so its result/loading state is ignored.
    const id = ++latest.current;
    const isSelectionLabel = !!value && q === value.label;
    const searchQuery = isSelectionLabel ? "" : q;
    if (!searchQuery && !withTreesOnly) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = window.setTimeout(() => {
      ApiService.searchLocationCombinations({
        query: searchQuery,
        limit: withTreesOnly ? 50 : 12,
        withTreesOnly,
      })
        .then((rows) => {
          if (id === latest.current) setOptions(rows || []);
        })
        .catch(() => {
          if (id === latest.current) setOptions([]);
        })
        .finally(() => {
          if (id === latest.current) setLoading(false);
        });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [inputValue, value, withTreesOnly]);

  const displayOptions = useMemo<PickerOption[]>(() => {
    if (!allowCreate) return options;
    const q = inputValue.trim();
    // Only offer "add" once the user has typed something that isn't the current selection.
    if (!q || (value && q === value.label)) return options;
    return [
      ...options,
      { isCreateOption: true, inputValue: q, label: `Add "${q}" as a new location` },
    ];
  }, [allowCreate, options, inputValue, value]);

  return (
    <>
      <Autocomplete<PickerOption, false, false, false>
        options={displayOptions}
        filterOptions={(x) => x}
        value={value as PickerOption | null}
        inputValue={inputValue}
        onInputChange={(_e, v) => setInputValue(v)}
        onChange={(_e, v) => {
          if (isCreateOption(v)) {
            setCreateName(v.inputValue);
            setCreateOpen(true);
            return;
          }
          onChange((v as LocationCombinationOption) || null);
          setInputValue((v as LocationCombinationOption | null)?.label || "");
        }}
        getOptionLabel={(o) => (o as any)?.label || ""}
        isOptionEqualToValue={(o, v) =>
          !isCreateOption(o) &&
          !isCreateOption(v) &&
          (o as LocationCombinationOption).locationId ===
            (v as LocationCombinationOption).locationId
        }
        renderOption={(props, option) => {
          if (!isCreateOption(option)) {
            return (
              <li {...props} key={(option as LocationCombinationOption).locationId}>
                {(option as LocationCombinationOption).label}
              </li>
            );
          }
          const { key, ...rest } = props as any;
          return (
            <Box
              component="li"
              key="__create-location__"
              {...rest}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                borderTop: "1px solid",
                borderColor: "divider",
                mt: 0.5,
                pt: 1,
                pb: 1,
              }}
            >
              <AddLocationAltOutlinedIcon fontSize="small" color="primary" />
              <Box component="span" sx={{ fontWeight: 700, color: "primary.main" }}>
                {option.label}
              </Box>
            </Box>
          );
        }}
        loading={loading}
        disabled={disabled}
        size={size}
        noOptionsText={
          inputValue.trim()
            ? "No matches"
            : withTreesOnly
              ? "No locations with trees yet"
              : "Type to search"
        }
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            placeholder={placeholder}
            autoFocus={autoFocus}
            InputProps={{
              ...params.InputProps,
              startAdornment: (
                <>
                  <InputAdornment position="start">
                    <LocationOnOutlinedIcon fontSize="small" />
                  </InputAdornment>
                  {params.InputProps.startAdornment}
                </>
              ),
              endAdornment: (
                <>
                  {loading ? <CircularProgress size={16} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
      />

      {allowCreate && (
        <CreateLocationDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          initialName={createName}
          onCreated={(option) => {
            setOptions((prev) => [
              option,
              ...prev.filter((o) => o.locationId !== option.locationId),
            ]);
            onChange(option);
            setInputValue(option.label);
          }}
        />
      )}
    </>
  );
};
