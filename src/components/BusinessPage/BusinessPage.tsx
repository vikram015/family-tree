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
  Dialog,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
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
import ApartmentIcon from "@mui/icons-material/Apartment";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import PhoneIcon from "@mui/icons-material/Phone";
import PersonIcon from "@mui/icons-material/Person";
import { useVillage } from "../context/VillageContext";
import { useAuth } from "../context/AuthContext";
import { db } from "../../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
  getDocs,
  setDoc,
} from "firebase/firestore";

interface Business {
  id: string;
  name: string;
  category: string;
  description: string;
  owner: string;
  contact?: string;
  villageId: string;
  createdAt?: any;
  updatedAt?: any;
}

interface BusinessCategory {
  id: string;
  title: string;
  description: string;
  color: string;
  icon: string;
  displayName: string;
}

export const BusinessPage: React.FC = () => {
  const { selectedVillage, villages } = useVillage();
  const { isAdmin } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [categories, setCategories] = useState<BusinessCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "retail",
    description: "",
    owner: "",
    contact: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Initialize categories in database
  const initializeCategories = async () => {
    try {
      const categoriesRef = collection(db, "businessCategories");
      const snapshot = await getDocs(categoriesRef);

      if (snapshot.empty) {
        // Add default categories if none exist
        const defaultCategories: BusinessCategory[] = [
          {
            id: "retail",
            title: "Retail & Shops",
            description:
              "Family-owned stores, boutiques, and retail businesses",
            color: "#E6A726",
            icon: "StoreIcon",
            displayName: "Retail & Shops",
          },
          {
            id: "agriculture",
            title: "Agriculture & Farming",
            description:
              "Agricultural businesses, farming, and related services",
            color: "#90C43C",
            icon: "AgricultureIcon",
            displayName: "Agriculture & Farming",
          },
          {
            id: "it",
            title: "IT & Technology",
            description:
              "Software development, IT services, and tech professionals",
            color: "#0066cc",
            icon: "ComputerIcon",
            displayName: "IT & Technology",
          },
          {
            id: "education",
            title: "Education",
            description:
              "Teachers, tutors, coaching centers, and educational services",
            color: "#7BC65D",
            icon: "SchoolIcon",
            displayName: "Education",
          },
          {
            id: "healthcare",
            title: "Healthcare",
            description: "Doctors, nurses, clinics, and medical professionals",
            color: "#E74C3C",
            icon: "LocalHospitalIcon",
            displayName: "Healthcare",
          },
          {
            id: "engineering",
            title: "Engineering & Construction",
            description: "Engineers, contractors, and construction businesses",
            color: "#F39C12",
            icon: "EngineeringIcon",
            displayName: "Engineering & Construction",
          },
          {
            id: "properties",
            title: "Properties & Real Estate",
            description:
              "Real estate agents, property management, and property sales",
            color: "#8B7355",
            icon: "ApartmentIcon",
            displayName: "Properties & Real Estate",
          },
        ];

        // Batch add categories
        for (const category of defaultCategories) {
          await setDoc(doc(categoriesRef, category.id), category);
        }
        setCategories(defaultCategories);
      } else {
        const categoriesData: BusinessCategory[] = [];
        snapshot.forEach((doc) => {
          categoriesData.push({ ...doc.data() } as BusinessCategory);
        });
        setCategories(categoriesData);
      }
    } catch (error) {
      console.error("Error initializing categories:", error);
    }
  };

  // Fetch categories from database
  const fetchCategories = () => {
    try {
      const categoriesRef = collection(db, "businessCategories");
      const unsubscribe = onSnapshot(categoriesRef, (snapshot) => {
        const categoriesData: BusinessCategory[] = [];
        snapshot.forEach((doc) => {
          categoriesData.push({ ...doc.data() } as BusinessCategory);
        });
        setCategories(categoriesData);
      });
      return unsubscribe;
    } catch (error) {
      console.error("Error fetching categories:", error);
      return () => {};
    }
  };

  const villageName =
    villages.find((v) => v.id === selectedVillage)?.name || "Select a village";

  useEffect(() => {
    // Initialize categories on component mount
    const initAndFetch = async () => {
      await initializeCategories();
    };

    initAndFetch();

    const unsubscribe = fetchCategories();

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!selectedVillage) {
      setLoading(false);
      setBusinesses([]);
      return;
    }

    setLoading(true);
    const businessRef = collection(db, "businesses");
    const q = query(businessRef, where("villageId", "==", selectedVillage));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const businessList: Business[] = [];
        snapshot.forEach((doc) => {
          businessList.push({ id: doc.id, ...doc.data() } as Business);
        });
        setBusinesses(businessList);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching businesses:", error);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [selectedVillage]);

  const getCategoryCount = (category: string) => {
    return businesses.filter((b) => b.category === category).length;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "retail":
        return <StoreIcon sx={{ fontSize: 24, color: "#E6A726" }} />;
      case "agriculture":
        return <AgricultureIcon sx={{ fontSize: 24, color: "#90C43C" }} />;
      case "it":
        return <ComputerIcon sx={{ fontSize: 24, color: "#0066cc" }} />;
      case "education":
        return <SchoolIcon sx={{ fontSize: 24, color: "#7BC65D" }} />;
      case "healthcare":
        return <LocalHospitalIcon sx={{ fontSize: 24, color: "#E74C3C" }} />;
      case "engineering":
        return <EngineeringIcon sx={{ fontSize: 24, color: "#F39C12" }} />;
      case "properties":
        return <ApartmentIcon sx={{ fontSize: 24, color: "#8B7355" }} />;
      default:
        return <WorkIcon sx={{ fontSize: 24, color: "#666" }} />;
    }
  };

  const getCategoryIconLarge = (category: string) => {
    switch (category) {
      case "retail":
        return <StoreIcon sx={{ fontSize: 48, color: "#E6A726" }} />;
      case "agriculture":
        return <AgricultureIcon sx={{ fontSize: 48, color: "#90C43C" }} />;
      case "it":
        return <ComputerIcon sx={{ fontSize: 48, color: "#0066cc" }} />;
      case "education":
        return <SchoolIcon sx={{ fontSize: 48, color: "#7BC65D" }} />;
      case "healthcare":
        return <LocalHospitalIcon sx={{ fontSize: 48, color: "#E74C3C" }} />;
      case "engineering":
        return <EngineeringIcon sx={{ fontSize: 48, color: "#F39C12" }} />;
      case "properties":
        return <ApartmentIcon sx={{ fontSize: 48, color: "#8B7355" }} />;
      default:
        return <WorkIcon sx={{ fontSize: 48, color: "#666" }} />;
    }
  };

  const handleOpenDialog = (business?: Business) => {
    if (business) {
      setEditingBusiness(business);
      setFormData({
        name: business.name,
        category: business.category,
        description: business.description,
        owner: business.owner,
        contact: business.contact || "",
      });
    } else {
      setEditingBusiness(null);
      setFormData({
        name: "",
        category: "retail",
        description: "",
        owner: "",
        contact: "",
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingBusiness(null);
  };

  const handleFormChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.owner) {
      alert("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    try {
      if (editingBusiness) {
        // Update existing business
        const businessRef = doc(db, "businesses", editingBusiness.id);
        await updateDoc(businessRef, {
          ...formData,
          updatedAt: serverTimestamp(),
        });
      } else {
        // Add new business
        await addDoc(collection(db, "businesses"), {
          ...formData,
          villageId: selectedVillage,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      handleCloseDialog();
    } catch (error) {
      console.error("Error saving business:", error);
      alert("Error saving business. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (businessId: string) => {
    if (window.confirm("Are you sure you want to delete this business?")) {
      try {
        await deleteDoc(doc(db, "businesses", businessId));
      } catch (error) {
        console.error("Error deleting business:", error);
        alert("Error deleting business. Please try again.");
      }
    }
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

  const businessCategories = categories.map((cat) => ({
    icon: getCategoryIconLarge(cat.id),
    title: cat.title,
    description: cat.description,
    count: getCategoryCount(cat.id),
    category: cat.id,
  }));

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
        {loading ? (
          <Box sx={{ textAlign: "center", py: 8 }}>
            <CircularProgress />
            <Typography variant="body1" sx={{ mt: 2 }}>
              Loading businesses...
            </Typography>
          </Box>
        ) : (
          <>
            {/* Introduction */}
            <Box sx={{ mb: 8, textAlign: "center" }}>
              <Stack
                direction="row"
                justifyContent="center"
                alignItems="center"
                spacing={2}
                sx={{ mb: 4 }}
              >
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  Supporting {villageName} Businesses
                </Typography>
                {isAdmin() && (
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                    sx={{
                      background: "linear-gradient(135deg, #0066cc, #00cc99)",
                    }}
                  >
                    Add Business
                  </Button>
                )}
              </Stack>
              <Typography
                variant="body1"
                paragraph
                sx={{ maxWidth: 800, mx: "auto", mb: 4 }}
              >
                Our village has a rich tradition of entrepreneurship and
                professional excellence. This directory helps connect family
                members in business, fostering collaboration, mutual support,
                and shared success.
              </Typography>
              {businesses.length === 0 && (
                <Alert severity="info" sx={{ maxWidth: 800, mx: "auto" }}>
                  No businesses registered yet for {villageName}.{" "}
                  {isAdmin() && "Click 'Add Business' to get started!"}
                </Alert>
              )}
            </Box>

            {/* Registered Businesses Section */}
            {businesses.length > 0 && (
              <Box sx={{ mb: 8 }}>
                <Typography
                  variant="h4"
                  gutterBottom
                  sx={{ textAlign: "center", fontWeight: 700, mb: 6 }}
                >
                  Registered Businesses in {villageName}
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
                  {businesses.map((business) => (
                    <Card
                      key={business.id}
                      sx={{
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        transition: "transform 0.3s, boxShadow 0.3s",
                        "&:hover": {
                          transform: "translateY(-8px)",
                          boxShadow: 4,
                        },
                      }}
                    >
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "flex-start",
                            justifyContent: "space-between",
                            mb: 2,
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            {getCategoryIcon(business.category)}
                            <Chip
                              label={
                                business.category.charAt(0).toUpperCase() +
                                business.category.slice(1)
                              }
                              size="small"
                              variant="outlined"
                            />
                          </Box>
                          {isAdmin() && (
                            <Box>
                              <IconButton
                                size="small"
                                onClick={() => handleOpenDialog(business)}
                                color="primary"
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => handleDelete(business.id)}
                                color="error"
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          )}
                        </Box>

                        <Typography
                          variant="h6"
                          gutterBottom
                          sx={{ fontWeight: 700 }}
                        >
                          {business.name}
                        </Typography>

                        <Typography
                          variant="body2"
                          color="text.secondary"
                          paragraph
                          sx={{ minHeight: 60, mb: 3 }}
                        >
                          {business.description}
                        </Typography>

                        <Stack spacing={1.5}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <PersonIcon sx={{ fontSize: 18, color: "#666" }} />
                            <Typography variant="body2">
                              <strong>Owner:</strong> {business.owner}
                            </Typography>
                          </Box>
                          {business.contact && (
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              <PhoneIcon sx={{ fontSize: 18, color: "#666" }} />
                              <Typography
                                variant="body2"
                                component="a"
                                href={`tel:${business.contact}`}
                                sx={{
                                  textDecoration: "none",
                                  color: "#0066cc",
                                  "&:hover": { textDecoration: "underline" },
                                }}
                              >
                                {business.contact}
                              </Typography>
                            </Box>
                          )}
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </Box>
            )}

            <Divider sx={{ my: 6 }} />

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
                {businessCategories.map((category) => (
                  <Card
                    key={category.category}
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
                        label={`${category.count} ${
                          category.count === 1 ? "business" : "businesses"
                        }`}
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
              <Stack
                direction="row"
                spacing={2}
                alignItems="center"
                sx={{ mb: 4 }}
              >
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
                  <Paper key={`benefit-${index}`} elevation={2} sx={{ p: 3 }}>
                    <Typography
                      variant="h6"
                      gutterBottom
                      sx={{ fontWeight: 700 }}
                    >
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
                {isAdmin() ? (
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                    sx={{
                      background: "linear-gradient(135deg, #0066cc, #00cc99)",
                      fontWeight: "bold",
                    }}
                  >
                    Add a Business
                  </Button>
                ) : (
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
                )}
              </Card>
            </Box>
          </>
        )}
      </Container>

      {/* Add/Edit Business Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
            {editingBusiness ? "Edit Business" : "Add New Business"}
          </Typography>

          <Stack spacing={2} sx={{ mt: 3 }}>
            <TextField
              label="Business Name"
              name="name"
              value={formData.name}
              onChange={handleFormChange}
              fullWidth
              required
              placeholder="Enter business name"
            />

            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                name="category"
                value={formData.category}
                onChange={handleFormChange}
                label="Category"
              >
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.displayName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Business Description"
              name="description"
              value={formData.description}
              onChange={handleFormChange}
              fullWidth
              multiline
              rows={3}
              placeholder="Describe what your business does"
            />

            <TextField
              label="Owner Name"
              name="owner"
              value={formData.owner}
              onChange={handleFormChange}
              fullWidth
              required
              placeholder="Enter owner name"
            />

            <TextField
              label="Contact Number"
              name="contact"
              value={formData.contact}
              onChange={handleFormChange}
              fullWidth
              placeholder="Enter phone number (optional)"
            />

            <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
              <Button variant="outlined" onClick={handleCloseDialog} fullWidth>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={submitting}
                fullWidth
                sx={{ background: "linear-gradient(135deg, #0066cc, #00cc99)" }}
              >
                {submitting
                  ? "Saving..."
                  : editingBusiness
                    ? "Update Business"
                    : "Add Business"}
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Dialog>
    </>
  );
};

export default BusinessPage;
