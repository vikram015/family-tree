import React from "react";
import { Helmet } from "react-helmet-async";
import { Alert, Box, Button, Container, Link, Paper, Stack, Typography } from "@mui/material";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { DeleteAccountButton } from "./DeleteAccountButton";

const SUPPORT_EMAIL = "support@kinvia.in";

const DELETED = [
  "Your account and your phone sign-in",
  "Your phone number, name, email, gender and date of birth on the account",
  "Login history, notification devices, settings and onboarding answers",
  "Your tree access and any pending access or link requests",
  "Your career profile and business listings",
  "Wishes and reactions you wrote",
  "Photos you uploaded",
  "Feedback you sent",
];

const KEPT = [
  "Family trees and the people in them, including your own card — relatives added and rely on that data. Your card is unlinked from your account.",
  "An anonymous placeholder (no name, phone or email) so that records showing who created or edited an entry stay consistent.",
];

/**
 * Public account-deletion page — this URL is what the Play Store listing links
 * to, so it must work signed out: it explains what happens and how to ask.
 */
export const DeleteAccountPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [params] = useSearchParams();
  const justDeleted = params.get("deleted") === "1";

  return (
    <Box sx={{ py: { xs: 3, md: 5 } }}>
      <Helmet>
        <title>Delete your account - Kinvia</title>
        <meta name="description" content="How to delete your Kinvia account and what data is removed." />
      </Helmet>
      <Container maxWidth="md">
        <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 4 }, borderRadius: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
            Delete your Kinvia account
          </Typography>

          {justDeleted ? (
            <Alert severity="success" sx={{ mb: 3 }}>
              Your account has been deleted. Thank you for using Kinvia.
            </Alert>
          ) : (
            <Stack spacing={1.5} sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                How to delete
              </Typography>
              {currentUser ? (
                <>
                  <Typography variant="body1">
                    You are signed in. Deletion is immediate and cannot be undone.
                  </Typography>
                  <Box>
                    <DeleteAccountButton variant="contained" />
                  </Box>
                </>
              ) : (
                <>
                  <Typography variant="body1">
                    In the Kinvia app or at kinvia.in: sign in, open <strong>Profile</strong>,
                    scroll to <strong>Account</strong>, and tap <strong>Delete my account</strong>.
                    You can also sign in and return to this page.
                  </Typography>
                  <Box>
                    <Button
                      component={RouterLink}
                      to="/login"
                      state={{ from: { pathname: "/delete-account" } }}
                      variant="contained"
                    >
                      Sign in to delete
                    </Button>
                  </Box>
                  <Typography variant="body1">
                    Can't sign in? Email{" "}
                    <Link href={`mailto:${SUPPORT_EMAIL}?subject=Delete%20my%20account`}>{SUPPORT_EMAIL}</Link>{" "}
                    from any address with the phone number on your account. We will confirm
                    it is yours and delete it within 30 days.
                  </Typography>
                </>
              )}
            </Stack>
          )}

          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            What is deleted
          </Typography>
          <Box component="ul" sx={{ mt: 0, mb: 3, pl: 3 }}>
            {DELETED.map((item) => (
              <Typography component="li" variant="body1" key={item} sx={{ mb: 0.5 }}>
                {item}
              </Typography>
            ))}
          </Box>

          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            What is kept
          </Typography>
          <Box component="ul" sx={{ mt: 0, mb: 3, pl: 3 }}>
            {KEPT.map((item) => (
              <Typography component="li" variant="body1" key={item} sx={{ mb: 0.5 }}>
                {item}
              </Typography>
            ))}
          </Box>

          <Typography variant="body2" color="text.secondary">
            Want a specific person or entry removed from a tree, with or without an account?
            Email <Link href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</Link> — see our{" "}
            <Link component={RouterLink} to="/privacy-policy">Privacy Policy</Link>.
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default DeleteAccountPage;
