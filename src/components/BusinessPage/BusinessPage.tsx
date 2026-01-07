import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Paper,
  Stack,
  Divider,
  Chip,
  Button,
  CircularProgress,
  Alert,
} from "@mui/material";
import WorkIcon from "@mui/icons-material/Work";
import StoreIcon from "@mui/icons-material/Store";
import AgricultureIcon from "@mui/icons-material/Agriculture";
import SchoolIcon from "@mui/icons-material/School";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import EngineeringIcon from "@mui/icons-material/Engineering";
import ComputerIcon from "@mui/icons-material/Computer";
import BusinessIcon from "@mui/icons-material/Business";
import HandshakeIcon from "@mui/icons-material/Handshake";
import { useVillage } from "../context/VillageContext";
import { db } from "../../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

interface Business {
  id: string;
  name: string;
  category: string;
  description: string;
  owner: string;
  contact?: string;
}

export const BusinessPage: React.FC = () => {
  const { selectedVillage, villages } = useVillage();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);

  const villageName =
    villages.find((v) => v.id === selectedVillage)?.name || "Select a village";

  useEffect(() => {
    if (!selectedVillage) {
      setLoading(false);
      setBusinesses([]);
      return;
    }

    setLoading(true);
    const businessRef = collection(db, "businesses");
    const q = query(businessRef, where("villageId", "==", selectedVillage));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const businessList: Business[] = [];
      snapshot.forEach((doc) => {
        businessList.push({ id: doc.id, ...doc.data() } as Business);
      });
      setBusinesses(businessList);
      setLoading(false);
    });

    return unsubscribe;
  }, [selectedVillage]);

  const getCategoryCount = (category: string) => {
    return businesses.filter((b) => b.category === category).length;
  };

  if (!selectedVillage) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Alert severity="info">
          Please select a village from the dropdown above to view businesses.
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

  const businessCategories = [
    {
      icon: <StoreIcon sx={{ fontSize: 48, color: "#E6A726" }} />,
      title: "Retail & Shops",
      description: "Family-owned stores, boutiques, and retail businesses",
      count: getCategoryCount("retail"),
      category: "retail",
    },
    {
      icon: <AgricultureIcon sx={{ fontSize: 48, color: "#90C43C" }} />,
      title: "Agriculture & Farming",
      description: "Agricultural businesses, farming, and related services",
      count: getCategoryCount("agriculture"),
      category: "agriculture",
    },
    {
      icon: <ComputerIcon sx={{ fontSize: 48, color: "#0066cc" }} />,
      title: "IT & Technology",
      description: "Software development, IT services, and tech professionals",
      count: getCategoryCount("it"),
      category: "it",
    },
    {
      icon: <SchoolIcon sx={{ fontSize: 48, color: "#7BC65D" }} />,
      title: "Education",
      description:
        "Teachers, tutors, coaching centers, and educational services",
      count: getCategoryCount("education"),
      category: "education",
    },
    {
      icon: <LocalHospitalIcon sx={{ fontSize: 48, color: "#E74C3C" }} />,
      title: "Healthcare",
      description: "Doctors, nurses, clinics, and medical professionals",
      count: getCategoryCount("healthcare"),
      category: "healthcare",
    },
    {
      icon: <EngineeringIcon sx={{ fontSize: 48, color: "#F39C12" }} />,
      title: "Engineering & Construction",
      description: "Engineers, contractors, and construction businesses",
      count: getCategoryCount("engineering"),
      category: "engineering",
    },
  ];

  const benefits = [
    {
      title: "Family Network",
      description:
        "Connect with family members in business and build strong professional relationships",
    },
    {
      title: "Mutual Support",
      description:
        "Support each other's businesses, share resources, and collaborate on projects",
    },
    {
      title: "Knowledge Sharing",
      description:
        "Learn from experienced family entrepreneurs and share business insights",
    },
    {
      title: "Trust & Reliability",
      description:
        "Work with trusted family members who share your values and commitment",
    },
  ];

  return (
    <>
      <Helmet>
        <title>Business Directory - Kinvia | Family Business Network</title>
        <meta
          name="description"
          content="Discover and connect with family business members. Explore family-run businesses, build professional networks, and collaborate within your family enterprise community."
        />
        <meta
          name="keywords"
          content="family business, business directory, entrepreneurship, family enterprises, business network, professional connections"
        />
        <meta property="og:title" content="Business Directory - Kinvia" />
        <meta
          property="og:description"
          content="Connect with family members in business and build strong professional relationships."
        />
      </Helmet>
      {/* Hero Section */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #0066cc 0%, #00cc99 100%)",
          color: "white",
          py: 6,
          textAlign: "center",
        }}
      >
        <Container maxWidth="lg">
          <BusinessIcon sx={{ fontSize: 64, mb: 2 }} />
          <Typography variant="h2" gutterBottom sx={{ fontWeight: 700 }}>
            {villageName} Business Network
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 300 }}>
            Connect, Collaborate, and Grow Together
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 8 }}>
        {/* Introduction */}
        <Box sx={{ mb: 8, textAlign: "center" }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
            Supporting {villageName} Businesses
          </Typography>
          <Typography
            variant="body1"
            paragraph
            sx={{ maxWidth: 800, mx: "auto", mb: 4 }}
          >
            Our village has a rich tradition of entrepreneurship and
            professional excellence. This directory helps connect family members
            in business, fostering collaboration, mutual support, and shared
            success.
          </Typography>
          {businesses.length === 0 && (
            <Alert severity="info" sx={{ maxWidth: 800, mx: "auto" }}>
              No businesses registered yet for {villageName}. Be the first to
              add your business!
            </Alert>
          )}
        </Box>

        {/* Business Categories */}
        <Box sx={{ mb: 8 }}>
          <Typography
            variant="h4"
            gutterBottom
            sx={{ textAlign: "center", fontWeight: 700, mb: 6 }}
          >
            Business Categories
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
            }}
          >
            {businessCategories.map((category, index) => (
              <Card
                key={index}
                sx={{
                  height: "100%",
                  transition: "transform 0.3s, boxShadow 0.3s",
                  "&:hover": {
                    transform: "translateY(-8px)",
                    boxShadow: 4,
                  },
                }}
              >
                <CardContent sx={{ textAlign: "center", p: 3 }}>
                  <Box sx={{ mb: 2 }}>{category.icon}</Box>
                  <Typography
                    variant="h6"
                    gutterBottom
                    sx={{ fontWeight: 700 }}
                  >
                    {category.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    paragraph
                    sx={{ minHeight: 48 }}
                  >
                    {category.description}
                  </Typography>
                  <Chip
                    label={category.count}
                    color="primary"
                    variant="outlined"
                  />
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>

        <Divider sx={{ my: 6 }} />

        {/* Benefits Section */}
        <Box sx={{ mb: 8 }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 4 }}>
            <HandshakeIcon sx={{ fontSize: 40, color: "#0066cc" }} />
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Benefits of Family Business Network
            </Typography>
          </Stack>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 3,
            }}
          >
            {benefits.map((benefit, index) => (
              <Paper key={index} elevation={2} sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
                  {benefit.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {benefit.description}
                </Typography>
              </Paper>
            ))}
          </Box>
        </Box>

        <Divider sx={{ my: 6 }} />

        {/* How to Get Listed */}
        <Box sx={{ mb: 8 }}>
          <Card elevation={3} sx={{ p: 4, bgcolor: "#f0f8ff" }}>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
              List Your Business
            </Typography>
            <Typography variant="body1" paragraph>
              Are you a family member running a business or offering
              professional services? We'd love to feature you in our family
              business directory!
            </Typography>
            <Typography variant="body1" paragraph>
              Being listed helps you:
            </Typography>
            <Box component="ul" sx={{ pl: 3, mb: 3 }}>
              <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                Connect with potential customers within the family
              </Typography>
              <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                Build your professional network
              </Typography>
              <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                Find collaboration opportunities
              </Typography>
              <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                Showcase your services to the community
              </Typography>
            </Box>
            <Button
              variant="contained"
              size="large"
              sx={{
                background: "linear-gradient(135deg, #0066cc, #00cc99)",
                fontWeight: "bold",
              }}
              href="/contact"
            >
              Contact Us to Get Listed
            </Button>
          </Card>
        </Box>

        {/* Coming Soon Section */}
        <Box sx={{ textAlign: "center", py: 4 }}>
          <Paper elevation={2} sx={{ p: 4, bgcolor: "#fffbf0" }}>
            <WorkIcon sx={{ fontSize: 48, color: "#E6A726", mb: 2 }} />
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
              Business Directory Coming Soon
            </Typography>
            <Typography variant="body1" color="text.secondary">
              We're currently collecting information about family businesses and
              professionals. Check back soon to see the complete directory, or
              contact us to add your business today!
            </Typography>
          </Paper>
        </Box>
      </Container>
    </>
  );
};

export default BusinessPage;
