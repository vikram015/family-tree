import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Container,
  Typography,
  Box,
  Paper,
  Stack,
  Divider,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Alert,
} from "@mui/material";
import HistoryIcon from "@mui/icons-material/History";
import PublicIcon from "@mui/icons-material/Public";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import { useVillage } from "../context/VillageContext";
import { supabase } from "../../supabase";

interface HeritageData {
  villageOrigin: string;
  foundedYear: string;
  founders: string;
  genealogy: {
    originalName: string;
    evolution: string[];
  };
  monuments: string[];
  culturalPractices: string[];
}

export const HeritagePage: React.FC = () => {
  const { selectedVillage, villages } = useVillage();
  const [heritageData, setHeritageData] = useState<HeritageData | null>(null);
  const [loading, setLoading] = useState(true);

  const villageName =
    villages.find((v) => v.id === selectedVillage)?.name || "Select a village";

  useEffect(() => {
    if (!selectedVillage) {
      console.log("No village selected");
      setLoading(false);
      return;
    }

    console.log("Loading heritage for village ID:", selectedVillage);
    setLoading(true);

    const loadHeritageData = async () => {
      try {
        const { data, error } = await supabase
          .from("heritage")
          .select("*")
          .eq("villageId", selectedVillage)
          .single();

        if (error) {
          console.warn(
            `No heritage document found with villageId: ${selectedVillage}`,
            error,
          );
          setHeritageData(null);
        } else if (data) {
          console.log("Heritage data found:", data);
          setHeritageData(data as HeritageData);
        } else {
          setHeritageData(null);
        }
      } catch (error) {
        console.error("Error loading heritage data:", error);
        setHeritageData(null);
      } finally {
        setLoading(false);
      }
    };

    loadHeritageData();
  }, [selectedVillage]);

  if (!selectedVillage) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Alert severity="info">
          Please select a village from the dropdown above to view its heritage.
        </Alert>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, textAlign: "center" }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!heritageData) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Alert severity="warning">
          No heritage information available for {villageName} yet.
        </Alert>
      </Container>
    );
  }

  return (
    <>
      <Helmet>
        <title>
          Heritage & History - Kinvia | Preserve Your Village Legacy
        </title>
        <meta
          name="description"
          content="Explore and preserve the rich heritage and history of your village. Document ancestral legacy, traditions, and cultural heritage on Kinvia."
        />
        <meta
          name="keywords"
          content="village heritage, history, genealogy, cultural heritage, ancestral legacy, traditions, village history"
        />
        <meta property="og:title" content="Heritage & History - Kinvia" />
        <meta
          property="og:description"
          content="Preserve your village's rich heritage and ancestral legacy."
        />
      </Helmet>
      {/* Hero Section */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #90C43C 0%, #7BC65D 100%)",
          color: "white",
          py: 6,
          textAlign: "center",
        }}
      >
        <Container maxWidth="lg">
          <HistoryIcon sx={{ fontSize: 64, mb: 2 }} />
          <Typography variant="h2" gutterBottom sx={{ fontWeight: 700 }}>
            {villageName} Heritage
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 300 }}>
            Preserving our village's rich history and ancestral legacy
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 8 }}>
        {/* Village History */}
        <Box sx={{ mb: 8 }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
            <LocationOnIcon sx={{ fontSize: 40, color: "#90C43C" }} />
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Village Origin & History
            </Typography>
          </Stack>
          <Paper elevation={2} sx={{ p: 4, bgcolor: "#f9f9f9" }}>
            {heritageData.foundedYear && (
              <Typography
                variant="h6"
                gutterBottom
                sx={{ fontWeight: 700, mb: 2 }}
              >
                Founded: {heritageData.foundedYear}
              </Typography>
            )}
            {heritageData.founders && (
              <Typography
                variant="body2"
                gutterBottom
                sx={{ mb: 2, color: "#666" }}
              >
                <strong>Founders:</strong> {heritageData.founders}
              </Typography>
            )}
            <Typography
              variant="body1"
              paragraph
              sx={{ whiteSpace: "pre-wrap", lineHeight: 1.8 }}
            >
              {heritageData.villageOrigin}
            </Typography>
          </Paper>
        </Box>

        <Divider sx={{ my: 6 }} />

        {/* Family Genealogy */}
        {heritageData.genealogy && (
          <Box sx={{ mb: 8 }}>
            <Stack
              direction="row"
              spacing={2}
              alignItems="center"
              sx={{ mb: 3 }}
            >
              <AccountTreeIcon sx={{ fontSize: 40, color: "#E6A726" }} />
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                Name Evolution
              </Typography>
            </Stack>
            <Typography variant="body1" paragraph sx={{ mb: 4 }}>
              How the village name evolved over generations:
            </Typography>

            {/* Family Tree */}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
              }}
            >
              <Paper
                elevation={2}
                sx={{
                  p: 2,
                  px: 4,
                  bgcolor: "#90C43C",
                  color: "white",
                  fontWeight: 700,
                  textAlign: "center",
                  minWidth: 200,
                }}
              >
                {heritageData.genealogy.originalName}
              </Paper>
              {heritageData.genealogy.evolution.map((name, index) => (
                <React.Fragment key={index}>
                  <Typography sx={{ fontSize: 24, fontWeight: "bold" }}>
                    ↓
                  </Typography>
                  <Paper
                    elevation={2}
                    sx={{
                      p: 2,
                      px: 4,
                      bgcolor:
                        index === heritageData.genealogy.evolution.length - 1
                          ? "#E6A726"
                          : "#7BC65D",
                      color: "white",
                      fontWeight: 700,
                      textAlign: "center",
                      minWidth: 200,
                    }}
                  >
                    {name}
                  </Paper>
                </React.Fragment>
              ))}
            </Box>
          </Box>
        )}

        {heritageData.genealogy && <Divider sx={{ my: 6 }} />}

        {/* Monuments & Landmarks */}
        {heritageData.monuments && heritageData.monuments.length > 0 && (
          <Box sx={{ mb: 8 }}>
            <Stack
              direction="row"
              spacing={2}
              alignItems="center"
              sx={{ mb: 3 }}
            >
              <PublicIcon sx={{ fontSize: 40, color: "#1976d2" }} />
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                Historical Monuments
              </Typography>
            </Stack>
            <List>
              {heritageData.monuments.map((monument, index) => (
                <ListItem key={index}>
                  <ListItemText
                    primary={monument}
                    primaryTypographyProps={{
                      variant: "h6",
                      fontWeight: 600,
                    }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {heritageData.monuments &&
          heritageData.monuments.length > 0 &&
          heritageData.culturalPractices &&
          heritageData.culturalPractices.length > 0 && (
            <Divider sx={{ my: 6 }} />
          )}

        {/* Cultural Practices */}
        {heritageData.culturalPractices &&
          heritageData.culturalPractices.length > 0 && (
            <Box sx={{ mb: 8 }}>
              <Stack
                direction="row"
                spacing={2}
                alignItems="center"
                sx={{ mb: 3 }}
              >
                <MenuBookIcon sx={{ fontSize: 40, color: "#dc004e" }} />
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  Cultural Practices
                </Typography>
              </Stack>
              <List>
                {heritageData.culturalPractices.map((practice, index) => (
                  <ListItem key={index}>
                    <ListItemText
                      primary={practice}
                      primaryTypographyProps={{
                        variant: "body1",
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
      </Container>
    </>
  );
};

export default HeritagePage;
