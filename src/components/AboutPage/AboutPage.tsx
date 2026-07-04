import React from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Paper,
  Box,
  Typography,
  Stack,
  Button,
  Card,
  CardContent,
  Divider,
  Link,
} from "@mui/material";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import HubOutlinedIcon from "@mui/icons-material/HubOutlined";
import HistoryEduOutlinedIcon from "@mui/icons-material/HistoryEduOutlined";
import PhoneIphoneOutlinedIcon from "@mui/icons-material/PhoneIphoneOutlined";

const features = [
  {
    icon: <AccountTreeOutlinedIcon />,
    title: "Build family trees",
    text: "Create and grow multi-generation trees — add parents, spouses, and children, with relationships, dates, and photos.",
  },
  {
    icon: <HubOutlinedIcon />,
    title: "Link across families",
    text: "Connect a placeholder relative to a real person from another family tree, so shared relatives stay in sync instead of duplicated.",
  },
  {
    icon: <LocationOnOutlinedIcon />,
    title: "Organized by location",
    text: "Browse families by location — village, district, and state — so you can find and follow the community you belong to.",
  },
  {
    icon: <BusinessOutlinedIcon />,
    title: "Family businesses",
    text: "Discover and list family-run businesses and professions within a location, tied to the people in the tree.",
  },
  {
    icon: <SearchOutlinedIcon />,
    title: "Search people & businesses",
    text: "Quickly find family members or businesses by name, with their lineage and location shown for context.",
  },
  {
    icon: <HistoryEduOutlinedIcon />,
    title: "Preserve heritage",
    text: "Capture lineage, relationships, and stories so a family's history is preserved for future generations.",
  },
];

export const AboutPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>About - Kinvia</title>
        <meta
          name="description"
          content="Kinvia is a digital family-tree platform to build and explore family trees, link relatives across families, browse by location, and discover family businesses."
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
            {/* Hero */}
            <Box
              sx={{
                p: { xs: 3, md: 5 },
                background:
                  "linear-gradient(135deg, rgba(180,83,9,0.12), rgba(15,118,110,0.12))",
              }}
            >
              <Typography variant="h3" sx={{ fontWeight: 800, lineHeight: 1.15 }}>
                About Kinvia
              </Typography>
              <Typography
                variant="h6"
                sx={{ mt: 1.5, color: "text.secondary", fontWeight: 500, maxWidth: 760 }}
              >
                Kinvia is a digital family-tree platform that helps communities
                preserve their roots — build family trees, connect relatives
                across families, and keep a living record of lineage, location,
                and legacy.
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 3 }}>
                <Button
                  variant="contained"
                  onClick={() => navigate("/families")}
                  sx={{ bgcolor: "#b45309", "&:hover": { bgcolor: "#92400e" } }}
                >
                  Explore family trees
                </Button>
                <Button variant="outlined" onClick={() => navigate("/business")}>
                  Explore family businesses
                </Button>
              </Stack>
            </Box>

            {/* Body */}
            <Box sx={{ p: { xs: 3, md: 5 } }}>
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
                What Kinvia does
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 820 }}>
                A family's story is spread across memories, documents, and
                different branches of the family. Kinvia brings it together in
                one place: a shared, searchable family tree that stays accurate
                as families link to one another and grows richer over time.
              </Typography>

              <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>
                What it offers
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" },
                  gap: 2,
                }}
              >
                {features.map((f) => (
                  <Card key={f.title} variant="outlined" sx={{ borderRadius: 2.5, height: "100%" }}>
                    <CardContent>
                      <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 1, color: "#0f766e" }}>
                        {f.icon}
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "text.primary" }}>
                          {f.title}
                        </Typography>
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        {f.text}
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mt: 3, maxWidth: 820 }}>
                Kinvia is growing — we're adding new features day by day to make
                preserving and exploring your family's story even better.
              </Typography>

              <Divider sx={{ my: 4 }} />

              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={2}
                alignItems={{ md: "center" }}
                justifyContent="space-between"
              >
                <Stack direction="row" spacing={1.2} alignItems="center">
                  <PhoneIphoneOutlinedIcon sx={{ color: "#0f766e" }} />
                  <Typography variant="body2" color="text.secondary">
                    Works on any device and can be installed to your home screen
                    like an app.
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1.2} alignItems="center">
                  <GroupsOutlinedIcon sx={{ color: "#b45309" }} />
                  <Typography variant="body2" color="text.secondary">
                    Questions or corrections?{" "}
                    <Link href="mailto:info@kinvia.in" underline="hover">
                      info@kinvia.in
                    </Link>
                  </Typography>
                </Stack>
              </Stack>
            </Box>
          </Paper>
        </Container>
      </Box>
    </>
  );
};
