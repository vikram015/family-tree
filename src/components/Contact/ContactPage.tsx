import React from "react";
import { Helmet } from "react-helmet-async";
import {
  Container,
  Paper,
  Box,
  Typography,
  Avatar,
  Button,
  Stack,
  Divider,
  Link,
  Card,
  CardContent,
} from "@mui/material";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import EmailIcon from "@mui/icons-material/Email";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import PhoneIcon from "@mui/icons-material/Phone";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import FamilyRestroomIcon from "@mui/icons-material/FamilyRestroom";
import HistoryEduIcon from "@mui/icons-material/HistoryEdu";

interface ProfileData {
  name: string;
  title: string;
  bio: string;
  email: string;
  phone: string;
  linkedin: string;
  github: string;
  avatarUrl: string;
}

const defaultProfile: ProfileData = {
  name: "Vikram Singh",
  title: "Full-Stack Engineer | Builder",
  bio: `I am a software engineer with over 10 years of experience in building scalable and user-friendly applications.

This family tree app is a personal effort to digitally preserve our village’s lineage, relationships, and cultural heritage for future generations.

If you have any feedback, corrections, or suggestions, feel free to contact me. Your input helps keep this data accurate and meaningful.`,
  email: "vikram@kinvia.in",
  phone: "+917015697157",
  linkedin: "linkedin.com/in/vikram-singh-17a50463/",
  github: "github.com/your-handle",
  avatarUrl:
    "https://firebasestorage.googleapis.com/v0/b/hotelmanager-c833b.firebasestorage.app/o/Screenshot_20251228_173624.jpg?alt=media&token=ed611029-4dcc-478d-8d89-5becaec52788",
};

export const ContactPage: React.FC = () => {
  const data = defaultProfile;

  const phone = data.phone || defaultProfile.phone;
  const sanitizedPhone = phone.replace(/[^0-9]/g, "");
  const email = data.email || defaultProfile.email;
  const linkedInUrl = data.linkedin
    ? `https://${data.linkedin.replace(/^https?:\/\//, "")}`
    : "#";

  return (
    <>
      <Helmet>
        <title>Contact - Kinvia</title>
        <meta
          name="description"
          content="Connect with Kinvia support and creator. Reach out via email, WhatsApp, phone, or LinkedIn."
        />
      </Helmet>

      <Box
        sx={{
          background:
            "linear-gradient(130deg, #fff7ed 0%, #ecfdf5 45%, #eff6ff 100%)",
          minHeight: "100%",
          py: { xs: 4, md: 6 },
        }}
      >
        <Container maxWidth="lg">
          <Paper
            elevation={0}
            sx={{
              borderRadius: 4,
              overflow: "hidden",
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Box
              sx={{
                p: { xs: 3, md: 4 },
                color: "#1f2937",
                background:
                  "linear-gradient(135deg, rgba(180,83,9,0.12), rgba(15,118,110,0.12))",
              }}
            >
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={3}
                alignItems={{ xs: "flex-start", md: "center" }}
                justifyContent="space-between"
              >
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar
                    src={data.avatarUrl || defaultProfile.avatarUrl}
                    alt={data.name}
                    sx={{
                      width: { xs: 72, md: 92 },
                      height: { xs: 72, md: 92 },
                      border: "3px solid #fff",
                    }}
                  />
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1.15 }}>
                      {data.name}
                    </Typography>
                    <Typography variant="body1" sx={{ color: "text.secondary", mt: 0.5 }}>
                      {data.title}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1, color: "text.secondary" }}>
                      Preserving family history through technology.
                    </Typography>
                  </Box>
                </Stack>

                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1.2}
                  sx={{ width: { xs: "100%", md: "auto" } }}
                >
                  <Button
                    variant="contained"
                    startIcon={<EmailIcon />}
                    href={`mailto:${email}`}
                    fullWidth
                    sx={{
                      minWidth: { sm: 120 },
                      bgcolor: "#b45309",
                      "&:hover": { bgcolor: "#92400e" },
                    }}
                  >
                    Email
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<WhatsAppIcon />}
                    href={sanitizedPhone ? `https://wa.me/${sanitizedPhone}` : "#"}
                    target="_blank"
                    rel="noreferrer"
                    fullWidth
                    sx={{
                      minWidth: { sm: 120 },
                      bgcolor: "#16a34a",
                      "&:hover": { bgcolor: "#15803d" },
                    }}
                  >
                    WhatsApp
                  </Button>
                </Stack>
              </Stack>
            </Box>

            <Box sx={{ p: { xs: 3, md: 4 } }}>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", lg: "1.25fr 0.75fr" },
                  gap: 3,
                }}
              >
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5 }}>
                    Why Kinvia Exists
                  </Typography>
                  <Typography variant="body1" sx={{ color: "text.secondary", whiteSpace: "pre-line" }}>
                    {data.bio}
                  </Typography>

                  <Divider sx={{ my: 3 }} />

                  <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5 }}>
                    What You Can Reach Out For
                  </Typography>
                  <Stack spacing={1.3}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <FamilyRestroomIcon fontSize="small" sx={{ color: "#0f766e" }} />
                      <Typography variant="body2" color="text.secondary">
                        Family profile corrections and lineage updates
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <HistoryEduIcon fontSize="small" sx={{ color: "#0f766e" }} />
                      <Typography variant="body2" color="text.secondary">
                        Story and heritage documentation support
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <VerifiedUserIcon fontSize="small" sx={{ color: "#0f766e" }} />
                      <Typography variant="body2" color="text.secondary">
                        Account, access, and admin workflow help
                      </Typography>
                    </Stack>
                  </Stack>
                </Box>

                <Stack spacing={1.8}>
                  <Card variant="outlined" sx={{ borderRadius: 2.5 }}>
                    <CardContent>
                      <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 0.5 }}>
                        <EmailIcon sx={{ color: "#b45309" }} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          Email
                        </Typography>
                      </Stack>
                      <Link href={`mailto:${email}`} underline="hover">
                        {email}
                      </Link>
                    </CardContent>
                  </Card>

                  <Card variant="outlined" sx={{ borderRadius: 2.5 }}>
                    <CardContent>
                      <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 0.5 }}>
                        <PhoneIcon sx={{ color: "#0f766e" }} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          Mobile
                        </Typography>
                      </Stack>
                      <Link href={`tel:${phone}`} underline="hover">
                        {phone}
                      </Link>
                    </CardContent>
                  </Card>

                  <Card variant="outlined" sx={{ borderRadius: 2.5 }}>
                    <CardContent>
                      <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 0.5 }}>
                        <LinkedInIcon sx={{ color: "#0a66c2" }} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          LinkedIn
                        </Typography>
                      </Stack>
                      <Link href={linkedInUrl} target="_blank" rel="noreferrer" underline="hover">
                        {data.linkedin}
                      </Link>
                    </CardContent>
                  </Card>

                </Stack>
              </Box>

              <Divider sx={{ my: 3 }} />

              <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center" }}>
                Built for families who want to preserve memory, roots, and belonging across generations.
              </Typography>
            </Box>
          </Paper>
        </Container>
      </Box>
    </>
  );
};
