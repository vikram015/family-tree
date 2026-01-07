import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Container,
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Divider,
  TextField,
  InputAdornment,
} from "@mui/material";
import { Link } from "react-router-dom";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import SchoolIcon from "@mui/icons-material/School";
import WorkIcon from "@mui/icons-material/Work";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import SearchIcon from "@mui/icons-material/Search";

export const HomePage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const features = [
    {
      icon: <AccountTreeIcon sx={{ fontSize: 48, color: "#90C43C" }} />,
      title: "Build Your Family Tree",
      description:
        "Create and visualize your complete family structure with ease. Add members, relationships, and track generations.",
      action: "/families",
      label: "Explore",
    },
    {
      icon: <SchoolIcon sx={{ fontSize: 48, color: "#E6A726" }} />,
      title: "Explore Heritage",
      description:
        "Discover and preserve your family's rich history, cultural heritage, and ancestral stories for future generations.",
      action: "/heritage",
      label: "Learn More",
    },
    {
      icon: <WorkIcon sx={{ fontSize: 48, color: "#7BC65D" }} />,
      title: "Connect Professionals",
      description:
        "Network with family members in business, build professional connections, and collaborate within your family.",
      action: "/business",
      label: "Connect",
    },
  ];

  const steps = [
    {
      number: "1",
      title: "Create Your Profile",
      description: "Start by adding yourself to the family tree",
    },
    {
      number: "2",
      title: "Add Family Members",
      description:
        "Invite and add relatives to build your complete family structure",
    },
    {
      number: "3",
      title: "Build Connections",
      description: "Link relationships and create your family network",
    },
    {
      number: "4",
      title: "Preserve History",
      description: "Document stories, heritage, and preserve for generations",
    },
  ];

  return (
    <>
      <Helmet>
        <title>
          Kinvia - Digital Family Tree Builder | Create Your Family Heritage
          Online
        </title>
        <meta
          name="description"
          content="Build and preserve your family history with Kinvia. Create interactive family trees, document relationships, add photos and custom details. Free online genealogy tool for Indian families."
        />
        <meta
          name="keywords"
          content="family tree, genealogy, family history, family tree maker, Indian family tree, वंशावली, परिवार वृक्ष, family heritage, ancestry, lineage"
        />
        <meta
          property="og:title"
          content="Kinvia - Digital Family Tree Builder"
        />
        <meta
          property="og:description"
          content="Build and preserve your family history with Kinvia. Create interactive family trees online."
        />
      </Helmet>
      {/* Hero Section */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #0066cc 0%, #00cc99 100%)",
          color: "white",
          py: 8,
          textAlign: "center",
        }}
      >
        <Container maxWidth="lg">
          <Typography variant="h2" gutterBottom sx={{ fontWeight: 700 }}>
            Welcome to Kinvia
          </Typography>
          <Typography variant="h5" gutterBottom sx={{ mb: 4, fontWeight: 300 }}>
            Preserve, Connect, and Celebrate Your Family Legacy
          </Typography>

          {/* Search Bar */}
          <Box sx={{ mb: 4, maxWidth: 600, mx: "auto" }}>
            <TextField
              fullWidth
              placeholder="Search family members, heritage, businesses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && searchQuery.trim()) {
                  // You can add search functionality here
                  console.log("Search query:", searchQuery);
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "#0066cc", mr: 1 }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                backgroundColor: "white",
                borderRadius: 1,
                "& .MuiOutlinedInput-root": {
                  fontSize: "1rem",
                },
              }}
            />
          </Box>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            justifyContent="center"
          >
            <Button
              variant="contained"
              size="large"
              component={Link}
              to="/families"
              sx={{
                bgcolor: "white",
                color: "#0066cc",
                fontWeight: "bold",
                "&:hover": { bgcolor: "#f0f0f0" },
              }}
            >
              Build Your Tree
            </Button>
            <Button
              variant="outlined"
              size="large"
              component={Link}
              to="/heritage"
              sx={{
                borderColor: "white",
                color: "white",
                fontWeight: "bold",
                "&:hover": { bgcolor: "rgba(255,255,255,0.1)" },
              }}
            >
              Explore Heritage
            </Button>
          </Stack>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography
          variant="h4"
          gutterBottom
          sx={{ textAlign: "center", fontWeight: 700, mb: 6 }}
        >
          What Kinvia Offers
        </Typography>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "1fr 1fr",
              md: "1fr 1fr 1fr",
            },
            gap: 3,
            mb: 6,
          }}
        >
          {features.map((feature, index) => (
            <Card
              key={index}
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                boxShadow: 2,
                transition: "transform 0.3s, boxShadow 0.3s",
                "&:hover": {
                  transform: "translateY(-8px)",
                  boxShadow: 4,
                },
              }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ mb: 2 }}>{feature.icon}</Box>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
                  {feature.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  {feature.description}
                </Typography>
              </CardContent>
              <Box sx={{ p: 2, pt: 0 }}>
                <Button
                  component={Link}
                  to={feature.action}
                  endIcon={<ArrowForwardIcon />}
                  sx={{ color: "#0066cc", fontWeight: "bold" }}
                >
                  {feature.label}
                </Button>
              </Box>
            </Card>
          ))}
        </Box>

        <Divider sx={{ my: 6 }} />

        {/* About Kinvia */}
        <Box sx={{ mb: 8, textAlign: "center" }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
            About Kinvia
          </Typography>
          <Typography
            variant="body1"
            paragraph
            sx={{ maxWidth: 600, mx: "auto" }}
          >
            Kinvia is a modern platform dedicated to preserving family heritage
            and strengthening family connections. We believe that every family
            has a unique story worth preserving for future generations.
          </Typography>
          <Typography variant="body1" sx={{ maxWidth: 600, mx: "auto" }}>
            Whether you're documenting your lineage, celebrating your cultural
            heritage, or connecting with family members professionally, Kinvia
            provides the tools you need to build and maintain your family
            network.
          </Typography>
        </Box>

        <Divider sx={{ my: 6 }} />

        {/* How It Works */}
        <Box>
          <Typography
            variant="h4"
            gutterBottom
            sx={{ textAlign: "center", fontWeight: 700, mb: 6 }}
          >
            Getting Started with Kinvia
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "1fr 1fr",
                md: "1fr 1fr 1fr 1fr",
              },
              gap: 3,
            }}
          >
            {steps.map((step, index) => (
              <Box key={index} sx={{ textAlign: "center" }}>
                <Box
                  sx={{
                    width: 60,
                    height: 60,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #90C43C, #7BC65D)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mx: "auto",
                    mb: 2,
                    color: "white",
                    fontWeight: "bold",
                    fontSize: 24,
                  }}
                >
                  {step.number}
                </Box>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
                  {step.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {step.description}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        <Divider sx={{ my: 6 }} />

        {/* Call to Action */}
        <Box sx={{ textAlign: "center", py: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
            Ready to Start Your Family Journey?
          </Typography>
          <Typography variant="body1" paragraph sx={{ mb: 4 }}>
            Join Kinvia today and begin building your family legacy.
          </Typography>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            justifyContent="center"
          >
            <Button
              variant="contained"
              size="large"
              component={Link}
              to="/families"
              sx={{
                background: "linear-gradient(135deg, #90C43C, #7BC65D)",
                fontWeight: "bold",
              }}
            >
              Start Building
            </Button>
            <Button
              variant="outlined"
              size="large"
              component={Link}
              to="/contact"
              sx={{ fontWeight: "bold" }}
            >
              Get in Touch
            </Button>
          </Stack>
        </Box>
      </Container>
    </>
  );
};
