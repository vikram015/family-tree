import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Container,
  Paper,
  Box,
  Typography,
  Avatar,
  Button,
  List,
  ListItem,
  ListItemText,
  Stack,
  Divider,
  Link,
} from "@mui/material";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import EmailIcon from "@mui/icons-material/Email";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import PhoneIcon from "@mui/icons-material/Phone";
import LanguageIcon from "@mui/icons-material/Language";

interface ProfileData {
  name: string;
  title: string;
  bio: string;
  email: string;
  phone: string;
  linkedin: string;
  github: string;
  website: string;
  avatarUrl: string;
}

const defaultProfile: ProfileData = {
  name: "Vikram Singh",
  title: "Full-Stack Engineer | Builder",
  bio: `I am a software engineer with over 10 years of experience in building scalable and user-friendly applications.

This family tree app is a personal effort to digitally preserve our village’s lineage, relationships, and cultural heritage for future generations.

If you have any feedback, corrections, or suggestions, feel free to contact me. Your input helps keep this data accurate and meaningful.`,
  email: "vikram5909015@gmail.com",
  phone: "+917015697157",
  linkedin: "linkedin.com/in/vikram-singh-17a50463/",
  github: "github.com/your-handle",
  website: "yourportfolio.com",
  avatarUrl:
    "https://firebasestorage.googleapis.com/v0/b/hotelmanager-c833b.firebasestorage.app/o/Screenshot_20251228_173624.jpg?alt=media&token=ed611029-4dcc-478d-8d89-5becaec52788",
};

export const ContactPage: React.FC = () => {
  const [data, setData] = useState<ProfileData>(defaultProfile);

  useEffect(() => {
    const saved = localStorage.getItem("contact-profile");
    if (saved) {
      try {
        setData({ ...defaultProfile, ...JSON.parse(saved) });
      } catch (err) {
        console.warn("Failed to parse saved profile", err);
      }
    }
  }, []);

  const phone = data.phone || defaultProfile.phone;
  const sanitizedPhone = phone.replace(/[^0-9]/g, "");
  const email = data.email || defaultProfile.email;
  const website = data.website || defaultProfile.website;

  return (
    <>
      <Helmet>
        <title>Contact & Connect - Kinvia | Get in Touch</title>
        <meta
          name="description"
          content="Connect with us on Kinvia. Reach out via email, phone, WhatsApp, or visit our website. We're here to help you build your family tree."
        />
        <meta
          name="keywords"
          content="contact us, support, customer service, help, get in touch, family tree help"
        />
        <meta property="og:title" content="Contact & Connect - Kinvia" />
        <meta
          property="og:description"
          content="Get in touch with us via multiple channels. We're here to help with your family tree journey."
        />
      </Helmet>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper elevation={3} sx={{ overflow: "hidden" }}>
          <Box
            sx={{
              textAlign: "center",
              p: 2,
              bgcolor: "primary.main",
              color: "white",
            }}
          >
            <Avatar
              src={data.avatarUrl || defaultProfile.avatarUrl}
              alt="avatar"
              sx={{
                width: 180,
                height: 180,
                mx: "auto",
                mb: 2,
                border: "4px solid white",
              }}
            />
            <Typography variant="h4" gutterBottom>
              {data.name || "Your Name"}
            </Typography>
            <Typography variant="h6" gutterBottom>
              {data.title || defaultProfile.title}
            </Typography>
            <Typography variant="body2">
              Preserving family history through technology.
            </Typography>
          </Box>

          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: "bold" }}>
              About the Creator
            </Typography>
            <Typography
              variant="body1"
              paragraph
              sx={{ whiteSpace: "pre-line" }}
            >
              {data.bio || defaultProfile.bio}
            </Typography>
            <Typography variant="body1" paragraph>
              This app helps preserve lineage, relationships, and community
              stories for future generations.
            </Typography>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom sx={{ fontWeight: "bold" }}>
              Why I Built This App
            </Typography>
            <Typography variant="body1" paragraph>
              Our family history is rich but often lives only in memory. I built
              this to keep our bonds and heritage accessible to everyone.
            </Typography>
            <Typography variant="body1" paragraph>
              If you want a similar experience for your family or community,
              reach out and I will help set it up.
            </Typography>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom sx={{ fontWeight: "bold" }}>
              Contact
            </Typography>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              sx={{ mb: 3 }}
            >
              <Button
                variant="contained"
                startIcon={<WhatsAppIcon />}
                href={sanitizedPhone ? `https://wa.me/${sanitizedPhone}` : "#"}
                target="_blank"
                rel="noreferrer"
                sx={{ bgcolor: "#25D366", "&:hover": { bgcolor: "#1DA851" } }}
                fullWidth
              >
                WhatsApp
              </Button>
              <Button
                variant="contained"
                startIcon={<EmailIcon />}
                href={`mailto:${email}`}
                color="error"
                fullWidth
              >
                Email Me
              </Button>
              <Button
                variant="contained"
                startIcon={<LinkedInIcon />}
                href={
                  data.linkedin
                    ? `https://${data.linkedin.replace(/^https?:\/\//, "")}`
                    : "#"
                }
                target="_blank"
                rel="noreferrer"
                sx={{ bgcolor: "#0077B5", "&:hover": { bgcolor: "#005885" } }}
                fullWidth
              >
                LinkedIn
              </Button>
            </Stack>

            <List>
              <ListItem>
                <PhoneIcon sx={{ mr: 2, color: "text.secondary" }} />
                <ListItemText
                  primary="Mobile"
                  secondary={
                    <Link href={`tel:${phone}`} underline="hover">
                      {phone}
                    </Link>
                  }
                />
              </ListItem>
              <ListItem>
                <EmailIcon sx={{ mr: 2, color: "text.secondary" }} />
                <ListItemText
                  primary="Email"
                  secondary={
                    <Link href={`mailto:${email}`} underline="hover">
                      {email}
                    </Link>
                  }
                />
              </ListItem>
              <ListItem>
                <LanguageIcon sx={{ mr: 2, color: "text.secondary" }} />
                <ListItemText
                  primary="Website"
                  secondary={
                    <Link
                      href={`https://${website.replace(/^https?:\/\//, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      underline="hover"
                    >
                      {website}
                    </Link>
                  }
                />
              </ListItem>
            </List>
          </Box>

          <Box sx={{ p: 3, bgcolor: "grey.100", textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              Built with ❤️ for the family and village community.
            </Typography>
          </Box>
        </Paper>
      </Container>
    </>
  );
};
