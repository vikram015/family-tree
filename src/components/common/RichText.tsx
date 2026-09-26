import React, { useMemo } from "react";
import { Box, SxProps, Theme } from "@mui/material";
import DOMPurify from "dompurify";
import { hasRichTextContent, isHtml } from "./richText";

/**
 * Renders a stored description.
 *
 * Two things are load-bearing here. First, the HTML is sanitized on the way to
 * the DOM: it was typed by a user, stored by an API that accepts whatever it is
 * sent, and is shown to strangers — a business profile is public. Second, a
 * value that is NOT html is rendered as text with its line breaks kept, because
 * everything written before the editor existed is plain text.
 *
 * Sanitizing here rather than at save time is deliberate: it is the last step
 * before the browser, so it also covers rows written by an older client, by a
 * direct API call, or before this component existed.
 */

/** Only what the editor can produce. Anything else — scripts, iframes, event
 *  handlers, styles — is dropped rather than escaped. */
const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "blockquote",
  "h1",
  "h2",
  "h3",
  "code",
  "pre",
  "hr",
];

export interface RichTextProps {
  value?: string | null;
  /** Rendered when there is nothing to show. */
  fallback?: React.ReactNode;
  sx?: SxProps<Theme>;
}

export const RichText: React.FC<RichTextProps> = ({ value, fallback = null, sx }) => {
  const html = useMemo(() => {
    if (!isHtml(value)) return null;
    return DOMPurify.sanitize(value || "", { ALLOWED_TAGS, ALLOWED_ATTR: [] });
  }, [value]);

  if (!hasRichTextContent(value)) {
    return <>{fallback}</>;
  }

  const baseSx: SxProps<Theme> = {
    // The surrounding layout owns the outer spacing, so the first and last
    // blocks sit flush the way a plain <Typography> would.
    "& > :first-of-type": { mt: 0 },
    "& > :last-child": { mb: 0 },
    "& p": { my: 1 },
    "& ul, & ol": { my: 1, pl: 3 },
    "& li": { mb: 0.5 },
    "& blockquote": {
      my: 1,
      pl: 2,
      borderLeft: "3px solid",
      borderColor: "divider",
      fontStyle: "italic",
    },
    "& h1, & h2, & h3": { my: 1.5, fontWeight: 800, lineHeight: 1.3 },
    "& h1": { fontSize: "1.35em" },
    "& h2": { fontSize: "1.2em" },
    "& h3": { fontSize: "1.05em" },
    "& code": { px: 0.5, borderRadius: 0.5, bgcolor: "action.hover", fontSize: "0.9em" },
    "& pre": { p: 1.5, borderRadius: 1, bgcolor: "action.hover", overflowX: "auto" },
  };

  if (html === null) {
    // Legacy plain text: keep the line breaks the author typed.
    return <Box sx={[{ whiteSpace: "pre-line" }, ...(Array.isArray(sx) ? sx : [sx])]}>{value}</Box>;
  }

  return (
    <Box
      sx={[baseSx, ...(Array.isArray(sx) ? sx : [sx])] as SxProps<Theme>}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default RichText;
