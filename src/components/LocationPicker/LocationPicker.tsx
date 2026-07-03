import React, { useEffect, useRef, useState } from "react";
import {
  Autocomplete,
  TextField,
  InputAdornment,
  CircularProgress,
} from "@mui/material";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import { ApiService, LocationCombinationOption } from "../../services/apiService";

interface LocationPickerProps {
  value: LocationCombinationOption | null;
  onChange: (value: LocationCombinationOption | null) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  size?: "small" | "medium";
  autoFocus?: boolean;
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
}) => {
  const [inputValue, setInputValue] = useState(value?.label || "");
  const [options, setOptions] = useState<LocationCombinationOption[]>([]);
  const [loading, setLoading] = useState(false);
  const latest = useRef(0);

  // Keep the visible text in sync when the value is set/cleared externally.
  useEffect(() => {
    setInputValue(value?.label || "");
  }, [value?.locationId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search on typed input (skip when the input equals the selection).
  useEffect(() => {
    const q = inputValue.trim();
    // Invalidate any in-flight search so its result/loading state is ignored.
    const id = ++latest.current;
    if (!q || (value && q === value.label)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = window.setTimeout(() => {
      ApiService.searchLocationCombinations({ query: q, limit: 12 })
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
  }, [inputValue, value]);

  return (
    <Autocomplete
      options={options}
      filterOptions={(x) => x}
      value={value}
      inputValue={inputValue}
      onInputChange={(_e, v) => setInputValue(v)}
      onChange={(_e, v) => {
        onChange(v);
        setInputValue(v?.label || "");
      }}
      getOptionLabel={(o) => o.label || ""}
      isOptionEqualToValue={(o, v) => o.locationId === v.locationId}
      loading={loading}
      disabled={disabled}
      size={size}
      noOptionsText={inputValue.trim() ? "No matches" : "Type to search"}
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
  );
};
