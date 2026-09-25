import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Autocomplete,
  Box,
  CircularProgress,
  InputAdornment,
  SxProps,
  TextField,
  Theme,
  Typography,
} from "@mui/material";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import { ApiService, PlaceDetails, PlaceSuggestion } from "../../services/apiService";
import { brand } from "../../theme/brand";

/**
 * Search-as-you-type place picker backed by Google Places.
 *
 * Distinct from `LocationPicker`, which searches Kinvia's own
 * village/district/state taxonomy — that says which village a *tree* belongs
 * to. This answers "where is this actually", for a shop or a person who has
 * moved, and it returns coordinates, which is what lets business search rank
 * by distance.
 *
 * Requests go through our backend (`/api/places/*`) so the Google key stays
 * server-side. Coordinates are resolved only when a suggestion is chosen — one
 * details call per selection, not per keystroke.
 */

export interface PlaceValue {
  placeId?: string | null;
  /** The short label, e.g. "Gangwa". */
  name?: string | null;
  /** The full line, e.g. "Gangwa, Hisar, Haryana, India". */
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

interface PlacePickerProps {
  value: PlaceValue | null;
  onChange: (value: PlaceValue | null) => void;
  label?: string;
  placeholder?: string;
  helperText?: string;
  /** Marks the field required — the asterisk only; the form still validates. */
  required?: boolean;
  disabled?: boolean;
  size?: "small" | "medium";
  /**
   * Applied to the underlying TextField, so a form can hand the picker the same
   * styling token it gives its other inputs. Without this the field renders at
   * MUI's defaults and reads as a foreign control in a styled form.
   */
  sx?: SxProps<Theme>;
}

/** What the field shows for a chosen place. */
function labelOf(value: PlaceValue | null | undefined): string {
  if (!value) return "";
  return value.address || value.name || "";
}

/**
 * Groups the keystrokes of one search with the details call that follows.
 *
 * Google bills an autocomplete session as a unit when the same token spans it;
 * without one, every keystroke is charged separately. A fresh token is minted
 * after each selection, which is what ends the session.
 */
function newSessionToken(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export const PlacePicker: React.FC<PlacePickerProps> = ({
  value,
  onChange,
  label = "Location",
  placeholder = "Search for a place",
  helperText,
  required = false,
  disabled = false,
  size = "medium",
  sx,
}) => {
  const [inputValue, setInputValue] = useState(labelOf(value));
  const [options, setOptions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const sessionTokenRef = useRef(newSessionToken());
  // Only the newest response may write to state; a slow earlier one would
  // otherwise repopulate the list under the user's cursor.
  const latestRequestRef = useRef(0);

  // Keep the field in step when the form loads or resets the value.
  useEffect(() => {
    setInputValue(labelOf(value));
  }, [value?.placeId, value?.address, value?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  const search = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setOptions([]);
      return;
    }
    const requestId = latestRequestRef.current + 1;
    latestRequestRef.current = requestId;
    setLoading(true);
    try {
      const results = await ApiService.searchPlaces(trimmed, sessionTokenRef.current);
      if (latestRequestRef.current !== requestId) return;
      setOptions(Array.isArray(results) ? results : []);
    } catch (error) {
      // No suggestions is a survivable state — the user can still type an
      // address into the other fields and save.
      console.warn("Place search failed:", error);
      if (latestRequestRef.current === requestId) setOptions([]);
    } finally {
      if (latestRequestRef.current === requestId) setLoading(false);
    }
  }, []);

  // Debounced: Places is billed per request, and a keystroke is not a query.
  useEffect(() => {
    const trimmed = inputValue.trim();
    if (!trimmed || trimmed === labelOf(value)) return;
    const timer = setTimeout(() => void search(trimmed), 350);
    return () => clearTimeout(timer);
  }, [inputValue, search]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = async (suggestion: PlaceSuggestion | null) => {
    if (!suggestion) {
      onChange(null);
      setOptions([]);
      return;
    }

    // Show the choice immediately; coordinates arrive a moment later.
    onChange({
      placeId: suggestion.placeId,
      name: suggestion.name,
      address: suggestion.address,
      latitude: null,
      longitude: null,
    });
    setInputValue(suggestion.address || suggestion.name);

    setResolving(true);
    try {
      const details: PlaceDetails = await ApiService.getPlaceDetails(
        suggestion.placeId,
        sessionTokenRef.current,
      );
      onChange({
        placeId: details.placeId,
        // The clicked suggestion's own short label wins: the details call no
        // longer requests `displayName`, so its `name` is the full address.
        name: suggestion.name || details.name,
        address: details.address || suggestion.address,
        latitude: details.latitude,
        longitude: details.longitude,
      });
    } catch (error) {
      // Keep the selection without coordinates: the place is still recorded and
      // readable, it just won't take part in distance ranking.
      console.warn("Could not resolve place details:", error);
    } finally {
      setResolving(false);
      // One session ends with the selection; the next search starts a new one.
      sessionTokenRef.current = newSessionToken();
    }
  };

  return (
    <Autocomplete
      fullWidth
      disabled={disabled}
      size={size}
      options={options}
      loading={loading}
      filterOptions={(x) => x}
      // The list is already a server-side match; filtering it again locally
      // would drop results whose match is in a field we don't display.
      isOptionEqualToValue={(option, selected) => option.placeId === selected.placeId}
      getOptionLabel={(option) =>
        typeof option === "string" ? option : option.address || option.name
      }
      value={
        value?.placeId
          ? { placeId: value.placeId, name: value.name || "", address: labelOf(value) }
          : null
      }
      inputValue={inputValue}
      onInputChange={(_event, next, reason) => {
        setInputValue(next);
        // Clearing the field clears the stored place — otherwise an emptied box
        // would still save the old one.
        if (reason === "clear" || (reason === "input" && next.trim() === "")) {
          onChange(null);
        }
      }}
      onChange={(_event, selected) => void handleSelect(selected as PlaceSuggestion | null)}
      noOptionsText={
        inputValue.trim().length < 2 ? "Type to search for a place" : "No places found"
      }
      renderOption={(props, option) => (
        <Box component="li" {...props} key={option.placeId}>
          <PlaceOutlinedIcon sx={{ fontSize: 18, color: brand.slateMuted, mr: 1.25 }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: brand.ink }}>
              {option.name}
            </Typography>
            {option.address && option.address !== option.name && (
              <Typography sx={{ fontSize: 12, color: brand.slateMuted }}>
                {option.address}
              </Typography>
            )}
          </Box>
        </Box>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          required={required}
          placeholder={placeholder}
          helperText={helperText}
          sx={sx}
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <InputAdornment position="start">
                <PlaceOutlinedIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: (
              <>
                {(loading || resolving) && <CircularProgress size={16} sx={{ mr: 1 }} />}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
};

export default PlacePicker;
