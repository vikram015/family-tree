import React from "react";
import { Helmet } from "react-helmet-async";
import { Box, Container, Paper, Stack, Typography } from "@mui/material";

export const PrivacyPolicyPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Privacy Policy - Kinvia</title>
        <meta
          name="description"
          content="Privacy Policy for Kinvia and its family tree services."
        />
      </Helmet>

      <Box sx={{ py: { xs: 3, md: 5 } }}>
        <Container maxWidth="md">
          <Paper
            variant="outlined"
            sx={{ p: { xs: 2.5, md: 4 }, borderRadius: 2 }}
          >
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
              Privacy Policy
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Last updated: March 4, 2026
            </Typography>

            <Stack spacing={2}>
              <Typography variant="body1">
                Kinvia collects basic account details (such as phone number,
                name, and email) to provide login, profile management, and
                access control features in the app.
              </Typography>
              <Typography variant="body1">
                Kinvia also collects family tree information that users add,
                such as names, relationships, and related profile details for
                people in the tree.
              </Typography>
              <Typography variant="body1">
                Important: family tree and profile information provided in
                Kinvia may be publicly accessible to other users through the
                app&apos;s read-only view. This means information you submit can
                be viewed by users who have access to browse the platform.
              </Typography>
              <Typography variant="body1">
                Please share only information that you are comfortable making
                visible to others. Do not submit confidential or sensitive
                personal data unless you are fully aware it may be viewable in
                read-only mode.
              </Typography>
              <Typography variant="body1">
                We use your information to operate and improve Kinvia services,
                including account verification, family tree management, access
                review workflows, and user support.
              </Typography>
              <Typography variant="body1">
                Access to location-level management actions is permission-based
                and reviewed by authorized administrators, while read-only
                access is available as configured by the platform.
              </Typography>
              <Typography variant="body1">
                If you need data correction, removal support, or account-related
                help, contact us at support@kinvia.in.
              </Typography>
            </Stack>
          </Paper>
        </Container>
      </Box>
    </>
  );
};
