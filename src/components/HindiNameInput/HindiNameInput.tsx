import React, { useEffect, useMemo, useState } from "react";
import {
  CircularProgress,
  InputAdornment,
  TextField,
  Typography,
} from "@mui/material";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { FullScreenMobileAutocomplete } from "../FullScreenMobilePicker";

interface HindiNameInputProps {
  sourceText: string;
  value: string;
  onChange: (value: string) => void;
  label?: string;
  disabled?: boolean;
  startIcon?: React.ReactNode;
}

function parseHindiSuggestions(payload: unknown): string[] {
  if (!Array.isArray(payload) || payload[0] !== "SUCCESS" || !Array.isArray(payload[1])) {
    return [];
  }

  const transliterations = payload[1] as unknown[];
  const suggestions = transliterations.flatMap((entry) => {
    if (!Array.isArray(entry) || !Array.isArray(entry[1])) {
      return [];
    }
    return entry[1].filter((value): value is string => typeof value === "string");
  });

  return Array.from(new Set(suggestions));
}

export function HindiNameInput({
  sourceText,
  value,
  onChange,
  label = "Hindi Name",
  disabled = false,
  startIcon,
}: HindiNameInputProps) {
  // Default to a Devanagari glyph so the field reads as "Hindi" rather than the
  // generic translate icon (whose 文 glyph looks like a Chinese character).
  const leadingAdornment = startIcon ?? (
    <Typography
      component="span"
      aria-hidden
      sx={{ fontWeight: 700, fontSize: 18, lineHeight: 1, color: "text.secondary" }}
    >
      अ
    </Typography>
  );
  const [options, setOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const trimmedSourceText = sourceText.trim();

  useEffect(() => {
    if (!trimmedSourceText || disabled) {
      setOptions([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          text: trimmedSourceText,
          itc: "hi-t-i0-und",
          num: "8",
          cp: "0",
          cs: "1",
          ie: "utf-8",
          oe: "utf-8",
          app: "kinvia",
        });
        const response = await fetch(
          `https://inputtools.google.com/request?${params.toString()}`,
          { signal: controller.signal },
        );
        if (!response.ok) {
          throw new Error(`Failed to fetch Hindi suggestions: ${response.status}`);
        }
        const data = (await response.json()) as unknown;
        setOptions(parseHindiSuggestions(data));
      } catch (error) {
        if (controller.signal.aborted) return;
        console.warn("Failed to load Hindi name suggestions:", error);
        setOptions([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [disabled, trimmedSourceText]);

  const mergedOptions = useMemo(() => {
    if (!value) return options;
    return options.includes(value) ? options : [value, ...options];
  }, [options, value]);

  return (
    <FullScreenMobileAutocomplete<string, false, false, true>
      pickerTitle={label}
      closeLabel={`Close ${label}`}
      freeSolo
      options={mergedOptions}
      value={value}
      inputValue={value}
      openOnFocus
      selectOnFocus
      clearOnBlur={false}
      handleHomeEndKeys
      forcePopupIcon
      popupIcon={<ArrowDropDownIcon />}
      onChange={(_, newValue) => onChange(typeof newValue === "string" ? newValue : "")}
      onInputChange={(_, newInputValue, reason) => {
        if (reason === "input" || reason === "clear") {
          onChange(newInputValue);
        }
      }}
      loading={loading}
      disabled={disabled || !trimmedSourceText}
      noOptionsText={
        trimmedSourceText
          ? "No Hindi suggestions found"
          : "Type a name in English first"
      }
      renderOption={(props, option) => (
        <li {...props}>
          <Typography variant="body1" sx={{ fontWeight: 500 }}>
            {option}
          </Typography>
        </li>
      )}
      sx={{
        "& .MuiAutocomplete-popupIndicator": {
          transform: "none",
        },
        // Match the rounded radius used by the other form fields (inputWithIconSx).
        "& .MuiOutlinedInput-root": {
          borderRadius: 2,
        },
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          fullWidth
          placeholder={trimmedSourceText ? "Choose Hindi name" : "Type English name first"}
          helperText="Select a Hindi transliteration or type your own"
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <>
                <InputAdornment position="start">{leadingAdornment}</InputAdornment>
                {params.InputProps.startAdornment}
              </>
            ),
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={18} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
}
