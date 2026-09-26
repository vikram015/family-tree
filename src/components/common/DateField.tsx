import React, { Suspense, useMemo } from "react";
import { TextField } from "@mui/material";
import dayjs, { Dayjs } from "dayjs";

/**
 * A date field backed by the MUI picker, for forms that keep dates as strings.
 *
 * The app already uses `@mui/x-date-pickers` where the form state is a `Dayjs`
 * (AddNode, NodeDetails, the profile and onboarding pages). Everywhere else was
 * still using `<TextField type="date">`, which renders the browser's own
 * calendar — a different control on every platform, month-first on US locales
 * regardless of where the user is, and unstyleable. This adapts the picker to a
 * plain "YYYY-MM-DD" string so those forms keep their existing state shape.
 *
 * The picker is lazy, matching how AddNode loads it: the date libraries are a
 * meaningful chunk and most screens never show a date field.
 */

const DatePicker = React.lazy(() =>
  import("@mui/x-date-pickers/DatePicker").then((m) => ({ default: m.DatePicker })),
);

export interface DateFieldProps {
  label: string;
  /** "YYYY-MM-DD", a full ISO timestamp, or "" when unset. */
  value: string;
  /** Receives "YYYY-MM-DD", or "" when cleared. */
  onChange: (value: string) => void;
  disabled?: boolean;
  fullWidth?: boolean;
  helperText?: React.ReactNode;
  /** Blocks dates after today — birth dates, founding dates and the like. */
  disableFuture?: boolean;
  minDate?: string;
  maxDate?: string;
  startAdornment?: React.ReactNode;
}

function toDayjs(value?: string): Dayjs | null {
  if (!value) return null;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed : null;
}

export const DateField: React.FC<DateFieldProps> = ({
  label,
  value,
  onChange,
  disabled = false,
  fullWidth = true,
  helperText,
  disableFuture = false,
  minDate,
  maxDate,
  startAdornment,
}) => {
  const parsed = useMemo(() => toDayjs(value), [value]);

  return (
    <Suspense
      fallback={
        <TextField
          fullWidth={fullWidth}
          label={label}
          value={parsed ? parsed.format("DD/MM/YYYY") : ""}
          helperText={helperText}
          disabled
        />
      }
    >
      <DatePicker
        label={label}
        value={parsed}
        disabled={disabled}
        disableFuture={disableFuture}
        minDate={toDayjs(minDate) || undefined}
        maxDate={toDayjs(maxDate) || undefined}
        // Day-first, like the rest of the app's pickers and like the audience
        // this is built for.
        format="DD/MM/YYYY"
        onChange={(next: Dayjs | null) =>
          onChange(next && next.isValid() ? next.format("YYYY-MM-DD") : "")
        }
        slotProps={{
          textField: {
            fullWidth,
            helperText,
            InputProps: startAdornment ? { startAdornment } : undefined,
          },
          field: { clearable: true, onClear: () => onChange("") },
        }}
      />
    </Suspense>
  );
};

export default DateField;
