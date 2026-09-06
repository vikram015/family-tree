import React, { Suspense } from "react";
import { Box, FormHelperText, Skeleton, Typography } from "@mui/material";

/**
 * A labelled rich-text field, shaped like an MUI outlined TextField so it sits
 * beside real TextFields without looking foreign.
 *
 * The editor itself (TipTap/ProseMirror) is a large dependency that most
 * screens never need, so it is behind `React.lazy` — this wrapper is the only
 * thing the rest of the app imports. The fallback is the same size as the
 * loaded editor, so nothing jumps when it arrives.
 */

const RichTextEditorImpl = React.lazy(() => import("./RichTextEditorImpl"));

export interface RichTextEditorProps {
  label?: string;
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  helperText?: React.ReactNode;
  minHeight?: number;
  disabled?: boolean;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  label,
  value,
  onChange,
  placeholder,
  helperText,
  minHeight = 180,
  disabled = false,
}) => (
  <Box>
    {label && (
      <Typography
        component="label"
        sx={{ display: "block", mb: 0.75, fontSize: 12.5, color: "text.secondary" }}
      >
        {label}
      </Typography>
    )}
    <Box
      sx={{
        borderRadius: 1,
        border: "1px solid",
        borderColor: "divider",
        overflow: "hidden",
        bgcolor: disabled ? "action.disabledBackground" : "background.paper",
        transition: "border-color 150ms ease",
        "&:focus-within": { borderColor: "primary.main" },
      }}
    >
      <Suspense
        fallback={
          <Box sx={{ p: 1.5 }}>
            <Skeleton variant="rounded" height={32} sx={{ mb: 1.5 }} />
            <Skeleton variant="rectangular" height={minHeight - 56} />
          </Box>
        }
      >
        <RichTextEditorImpl
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          minHeight={minHeight}
          disabled={disabled}
        />
      </Suspense>
    </Box>
    {helperText && <FormHelperText sx={{ mx: 1.75 }}>{helperText}</FormHelperText>}
  </Box>
);

export default RichTextEditor;
