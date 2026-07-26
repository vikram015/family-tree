import React, { useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Stack,
  Typography,
  Link,
  Divider,
  Snackbar,
  Alert,
} from "@mui/material";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import { brand } from "../../theme/brand";
import { useAuth } from "../hooks/useAuth";
import { FeedbackDialog } from "../Feedback/FeedbackDialog";

const navLinks: { label: string; to: string }[] = [
  { label: "Home", to: "/" },
  { label: "Families", to: "/families" },
  { label: "About", to: "/about" },
  { label: "FAQ", to: "/faq" },
  { label: "Privacy Policy", to: "/privacy-policy" },
];

/**
 * App-wide footer. Rendered below the routed content so it appears on standard
 * content pages. Uses theme palette / brand tokens (no hard-coded hex literals)
 * so it stays on-brand and theme-aware.
 */
export const Footer: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackSnackbarOpen, setFeedbackSnackbarOpen] = useState(false);

  // Feedback is visible to everyone, but only authenticated users can submit;
  // guests are sent to log in first.
  const handleFeedbackClick = () => {
    if (currentUser) setFeedbackOpen(true);
    else navigate("/login");
  };

  return (
    <Box
      component="footer"
      sx={{
        borderTop: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        py: { xs: 3, md: 4 },
        mt: "auto",
      }}
    >
      <Container maxWidth="lg">
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={{ xs: 2.5, sm: 3 }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
        >
          {/* Brand + tagline */}
          <Box sx={{ maxWidth: 360 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <AccountTreeOutlinedIcon sx={{ color: "primary.main" }} />
              <Typography variant="h6" sx={{ fontWeight: 800, color: "text.primary" }}>
                Kinvia
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              A digital family-tree platform that helps communities preserve
              their roots.
            </Typography>
          </Box>

          {/* Navigation links */}
          <Stack
            direction="row"
            spacing={{ xs: 2, sm: 3 }}
            useFlexGap
            flexWrap="wrap"
            sx={{ rowGap: 1 }}
          >
            {navLinks.map((link) => (
              <Link
                key={link.to}
                component={RouterLink}
                to={link.to}
                underline="hover"
                variant="body2"
                sx={{ color: "text.secondary", "&:hover": { color: "primary.main" } }}
              >
                {link.label}
              </Link>
            ))}
            <Link
              component="button"
              type="button"
              onClick={handleFeedbackClick}
              underline="hover"
              variant="body2"
              sx={{
                color: "text.secondary",
                "&:hover": { color: "primary.main" },
              }}
            >
              Feedback
            </Link>
          </Stack>
        </Stack>

        <Divider sx={{ my: { xs: 2, md: 2.5 } }} />

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
        >
          <Typography variant="caption" color="text.secondary">
            © Kinvia. All rights reserved.
          </Typography>
          <Typography variant="caption" sx={{ color: brand.slateMuted }}>
            Questions or corrections?{" "}
            <Link href="mailto:info@kinvia.in" underline="hover">
              info@kinvia.in
            </Link>
          </Typography>
        </Stack>
      </Container>

      <FeedbackDialog
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        onSubmitted={() => setFeedbackSnackbarOpen(true)}
      />
      <Snackbar
        open={feedbackSnackbarOpen}
        autoHideDuration={5000}
        onClose={() => setFeedbackSnackbarOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setFeedbackSnackbarOpen(false)}
        >
          Thanks for your feedback!
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Footer;
