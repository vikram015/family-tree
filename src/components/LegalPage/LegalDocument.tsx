import React from "react";
import { Box, Container, Divider, Link, Paper, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

export type LegalSection = {
  heading: string;
  /** Each entry is one paragraph. Strings only — no markup in the content. */
  paragraphs?: string[];
  /** Rendered as a bulleted list under the paragraphs. */
  bullets?: string[];
};

interface LegalDocumentProps {
  title: string;
  lastUpdated: string;
  intro: string;
  sections: LegalSection[];
  /** The sibling document, linked at the foot so the pair is navigable. */
  siblingLabel: string;
  siblingTo: string;
}

/**
 * Shared shell for the Terms of Use and Privacy Policy pages, so the two read as
 * one document set rather than two separately-styled pages.
 */
export const LegalDocument: React.FC<LegalDocumentProps> = ({
  title,
  lastUpdated,
  intro,
  sections,
  siblingLabel,
  siblingTo,
}) => (
  <Box sx={{ py: { xs: 3, md: 5 } }}>
    <Container maxWidth="md">
      <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 4 }, borderRadius: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Last updated: {lastUpdated}
        </Typography>

        <Typography variant="body1" sx={{ mb: 3 }}>
          {intro}
        </Typography>

        <Stack spacing={3.5}>
          {sections.map((section) => (
            <Box key={section.heading}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                {section.heading}
              </Typography>
              <Stack spacing={1.5}>
                {(section.paragraphs || []).map((paragraph, index) => (
                  <Typography key={index} variant="body1">
                    {paragraph}
                  </Typography>
                ))}
                {section.bullets && section.bullets.length > 0 && (
                  <Box component="ul" sx={{ pl: 3, m: 0 }}>
                    {section.bullets.map((bullet, index) => (
                      <Typography key={index} component="li" variant="body1" sx={{ mb: 0.75 }}>
                        {bullet}
                      </Typography>
                    ))}
                  </Box>
                )}
              </Stack>
            </Box>
          ))}
        </Stack>

        <Divider sx={{ my: 4 }} />
        <Typography variant="body2" color="text.secondary">
          See also:{" "}
          <Link component={RouterLink} to={siblingTo} underline="hover" sx={{ fontWeight: 700 }}>
            {siblingLabel}
          </Link>
        </Typography>
      </Paper>
    </Container>
  </Box>
);

export default LegalDocument;
