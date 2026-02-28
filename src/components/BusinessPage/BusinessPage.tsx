import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  Tooltip,
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
import { useVillage } from "../hooks/useVillage";
import { useAuth } from "../hooks/useAuth";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  fetchBusinessesByVillage,
  selectBusinesses,
  selectBusinessLoading,
  clearBusinesses,
} from "../../store/slices/businessSlice";
import {
  fetchProfessionsData,
  selectProfessions,
  selectPeopleWithProfessions,
  selectProfessionsWithCount,
  clearProfessions,
} from "../../store/slices/professionSlice";
import { SupabaseService } from "../../services/supabaseService";
import { PersonSearchField } from "./PersonSearchField";
import { FNode } from "../model/FNode";

interface Business {
  id: string;
  name: string;
  category: string;
  description: string;
  owner: string;
  ownerId?: string; // Link to person in family tree
  ownerName?: string; // Display name of owner
  contact?: string;
  villageId: string;
  createdAt?: any;
  updatedAt?: any;
  treeId?: string; // Tree ID for family page navigation
  gender?: string; // Owner gender
  dob?: string; // Owner date of birth
  hierarchy?: any[]; // Parent hierarchy
  casteName?: string; // Caste name
  subCasteName?: string; // Sub-caste name
}

interface BusinessCategory {
  id: string;
  title: string;
  description: string;
  color: string;
  icon: string;
  displayName: string;
}

interface Profession {
  id: string;
  name: string;
  description?: string;
  category?: string;
}

interface PersonSearchResult {
  id: string;
  name: string;
  gender?: string;
  dob?: string;
  treeId: string;
  hierarchy: any[];
  villageName?: string;
  casteName?: string;
  subCasteName?: string;
}

// Owner link component with hierarchy tooltip
const OwnerLink: React.FC<{
  business: Business;
  onNavigate: (path: string) => void;
}> = ({ business, onNavigate }) => {
  const hierarchyText =
    business.hierarchy && business.hierarchy.length > 0
      ? business.hierarchy
          .slice(-5)
          .map((a: any) => a.name)
          .join(" → ")
      : "No ancestry data";

  const tooltipContent = (
    <Box sx={{ p: 1 }}>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {business.owner}
      </Typography>
      {business.casteName && (
        <Typography variant="caption" display="block">
          Caste: {business.casteName}
        </Typography>
      )}
      {business.subCasteName && (
        <Typography variant="caption" display="block">
          Sub-Caste: {business.subCasteName}
        </Typography>
      )}
      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
        🧬 {hierarchyText}
      </Typography>
    </Box>
  );

  return (
    <Tooltip title={tooltipContent}>
      <Box
        component="span"
        onClick={() => onNavigate(`/families?tree=${business.treeId}`)}
        sx={{
          color: "#0066cc",
          cursor: "pointer",
          textDecoration: "underline",
          "&:hover": { color: "#0052a3", fontWeight: 600 },
          transition: "all 0.2s",
        }}
      >
        {business.owner}
      </Box>
    </Tooltip>
  );
};

export const BusinessPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { selectedVillage, villages } = useVillage();
  const { isAdmin } = useAuth();

  // Redux state
  const businesses = useAppSelector(selectBusinesses);
  const loading = useAppSelector(selectBusinessLoading);
  const professions = useAppSelector(selectProfessions);
  const peopleWithProfessions = useAppSelector(selectPeopleWithProfessions);
  const professionsWithCount = useAppSelector(selectProfessionsWithCount);

  // Local component state
  const [categories, setCategories] = useState<BusinessCategory[]>([]);
  const [people, setPeople] = useState<PersonSearchResult[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openProfessionDialog, setOpenProfessionDialog] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [selectedPersonForProfession, setSelectedPersonForProfession] =
    useState<FNode | null>(null);
  const [selectedProfession, setSelectedProfession] =
    useState<Profession | null>(null);
  const [newProfessionName, setNewProfessionName] = useState("");
  const [professionSearchInput, setProfessionSearchInput] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    category: "retail",
    description: "",
    owner: "",
    ownerId: "",
    contact: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Initialize default categories (static - no need to fetch from DB)
  const initializeCategories = () => {
    const defaultCategories: BusinessCategory[] = [
      {
        id: "retail",
        title: "Retail & Shops",
        description: "Family-owned stores, boutiques, and retail businesses",
        color: "#E6A726",
        icon: "StoreIcon",
        displayName: "Retail & Shops",
      },
      {
        id: "agriculture",
        title: "Agriculture & Farming",
        description: "Agricultural businesses, farming, and related services",
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
    setCategories(defaultCategories);
  };

  const villageName =
    villages.find((v) => v.id === selectedVillage)?.name || "Select a village";

  useEffect(() => {
    // Initialize categories on component mount
    initializeCategories();
  }, []);

  // Fetch businesses when village changes - dispatches Redux action
  useEffect(() => {
    if (!selectedVillage) {
      dispatch(clearBusinesses());
      return;
    }

    dispatch(fetchBusinessesByVillage(selectedVillage));
  }, [selectedVillage, dispatch]);

  // Fetch professions and people with their professions - dispatches Redux action
  useEffect(() => {
    if (!selectedVillage) {
      dispatch(clearProfessions());
      return;
    }

    dispatch(fetchProfessionsData(selectedVillage));
  }, [selectedVillage, dispatch]);

  const handleOpenProfessionDialog = (person: FNode) => {
    setSelectedPersonForProfession(person);
    setOpenProfessionDialog(true);
  };

  const handleCloseProfessionDialog = () => {
    setOpenProfessionDialog(false);
    setSelectedPersonForProfession(null);
    setSelectedProfession(null);
    setNewProfessionName("");
    setProfessionSearchInput("");
  };

  const handleAddProfession = async () => {
    if (!selectedPersonForProfession || !selectedProfession) {
      alert("Please select a profession");
      return;
    }

    try {
      await SupabaseService.addProfessionToPerson(
        selectedPersonForProfession.id,
        selectedProfession.id,
      );

      // Refresh professions data by dispatching Redux action
      if (selectedVillage) {
        dispatch(fetchProfessionsData(selectedVillage));
      }
      handleCloseProfessionDialog();
    } catch (error) {
      console.error("Error adding profession:", error);
      alert("Error adding profession. Please try again.");
    }
  };

  const handleRemoveProfession = async (
    personId: string,
    professionId: string,
  ) => {
    try {
      await SupabaseService.removeProfessionFromPerson(personId, professionId);

      // Refresh professions data by dispatching Redux action
      if (selectedVillage) {
        dispatch(fetchProfessionsData(selectedVillage));
      }
    } catch (error) {
      console.error("Error removing profession:", error);
      alert("Error removing profession");
    }
  };

  const handleCreateNewProfession = async () => {
    if (!newProfessionName.trim()) {
      alert("Please enter a profession name");
      return;
    }

    try {
      const newProf = await SupabaseService.createProfession({
        name: newProfessionName,
        category: "General",
      });

      // Refresh professions data by dispatching Redux action
      if (selectedVillage) {
        dispatch(fetchProfessionsData(selectedVillage));
      }
      setSelectedProfession(newProf);
      setNewProfessionName("");
    } catch (error) {
      console.error("Error creating profession:", error);
      alert("Error creating profession");
    }
  };

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
        ownerId: business.ownerId || "",
        contact: business.contact || "",
      });
    } else {
      setEditingBusiness(null);
      setFormData({
        name: "",
        category: "retail",
        description: "",
        owner: "",
        ownerId: "",
        contact: "",
      });
    }
    setPeople([]);
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
      const businessData = {
        name: formData.name,
        category: formData.category,
        description: formData.description,
        people_id: formData.ownerId || null,
        contact: formData.contact || null,
      };

      if (editingBusiness) {
        // Update existing business
        await SupabaseService.updateBusiness(editingBusiness.id, businessData);
      } else {
        // Add new business
        await SupabaseService.createBusiness(businessData);
      }
      handleCloseDialog();

      // Refresh businesses list by dispatching Redux action
      if (selectedVillage) {
        dispatch(fetchBusinessesByVillage(selectedVillage));
      }
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
        await SupabaseService.deleteBusiness(businessId);
        // Refresh businesses list by dispatching Redux action
        if (selectedVillage) {
          dispatch(fetchBusinessesByVillage(selectedVillage));
        }
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
                              <strong>Owner:</strong>{" "}
                              {business.ownerId && business.treeId ? (
                                <OwnerLink
                                  business={business}
                                  onNavigate={navigate}
                                />
                              ) : (
                                business.owner
                              )}
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

            {/* Professions & Occupations */}
            <Box sx={{ mb: 8 }}>
              <Stack
                direction="row"
                justifyContent="center"
                alignItems="center"
                spacing={2}
                sx={{ mb: 6 }}
              >
                <Typography
                  variant="h4"
                  gutterBottom
                  sx={{ textAlign: "center", fontWeight: 700, mb: 0 }}
                >
                  Professions & Occupations
                </Typography>
                {isAdmin() && (
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<AddIcon />}
                    sx={{
                      background: "linear-gradient(135deg, #0066cc, #00cc99)",
                    }}
                    onClick={() => {
                      // Open profession dialog for selecting a person
                      setSelectedPersonForProfession(null);
                      setSelectedProfession(null);
                      setNewProfessionName("");
                      setOpenProfessionDialog(true);
                    }}
                  >
                    Add Profession
                  </Button>
                )}
              </Stack>

              <Typography variant="body1" sx={{ mb: 4, textAlign: "center" }}>
                Browse the professions and occupations of our family members
              </Typography>

              {peopleWithProfessions.length > 0 ? (
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "1fr 1fr",
                      md: "repeat(3, 1fr)",
                    },
                    gap: 2,
                  }}
                >
                  {peopleWithProfessions.map((item) => (
                    <Card
                      key={item.person.id}
                      sx={{
                        p: 2,
                        transition: "transform 0.2s, boxShadow 0.2s",
                        "&:hover": {
                          transform: "translateY(-4px)",
                          boxShadow: 3,
                        },
                      }}
                    >
                      <Stack spacing={2}>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            {item.person.name}
                          </Typography>
                        </Box>

                        <Box>
                          {item.professions.length > 0 ? (
                            <Box>
                              <Typography
                                variant="subtitle2"
                                sx={{ mb: 1, fontWeight: 600 }}
                              >
                                Professions:
                              </Typography>
                              <Stack
                                direction="row"
                                spacing={1}
                                sx={{ flexWrap: "wrap" }}
                              >
                                {item.professions.map((prof) => (
                                  <Chip
                                    key={prof.id}
                                    label={prof.name}
                                    onDelete={
                                      isAdmin()
                                        ? () =>
                                            handleRemoveProfession(
                                              item.person.id,
                                              prof.id,
                                            )
                                        : undefined
                                    }
                                    variant="outlined"
                                    size="small"
                                  />
                                ))}
                              </Stack>
                            </Box>
                          ) : (
                            <Typography
                              variant="body2"
                              sx={{ color: "text.secondary" }}
                            >
                              No professions added yet
                            </Typography>
                          )}
                        </Box>

                        {isAdmin() && (
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() =>
                              handleOpenProfessionDialog(item.person)
                            }
                            startIcon={<AddIcon />}
                          >
                            Add Profession
                          </Button>
                        )}
                      </Stack>
                    </Card>
                  ))}
                </Box>
              ) : (
                <Paper sx={{ p: 3, textAlign: "center" }}>
                  <Typography variant="body1" color="text.secondary">
                    No people data available
                  </Typography>
                </Paper>
              )}
            </Box>

            <Divider sx={{ my: 6 }} />

            {/* Professions Categories with People */}
            {professionsWithCount.length > 0 && (
              <Box sx={{ mb: 8 }}>
                <Typography
                  variant="h4"
                  gutterBottom
                  sx={{ textAlign: "center", fontWeight: 700, mb: 6 }}
                >
                  Professions Directory
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
                  {professionsWithCount.map((professionData: any) => {
                    // Group people by profession
                    const peopleInProfession = professionData.people || [];

                    return (
                      <Card
                        key={professionData.profession_id}
                        sx={{
                          height: "100%",
                          transition: "transform 0.3s, boxShadow 0.3s",
                          "&:hover": {
                            transform: "translateY(-8px)",
                            boxShadow: 4,
                          },
                        }}
                      >
                        <CardContent>
                          <Typography
                            variant="h6"
                            gutterBottom
                            sx={{ fontWeight: 700, mb: 2 }}
                          >
                            {professionData.profession_name}
                          </Typography>
                          {professionData.profession_description && (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              paragraph
                              sx={{ minHeight: 40, mb: 2 }}
                            >
                              {professionData.profession_description}
                            </Typography>
                          )}
                          <Stack spacing={1}>
                            {peopleInProfession.map((person: any) => {
                              const hierarchyText =
                                person.parent_hierarchy &&
                                person.parent_hierarchy.length > 0
                                  ? person.parent_hierarchy
                                      .slice(-5)
                                      .map((a: any) => a.name)
                                      .join(" → ")
                                  : "No ancestry data";

                              const tooltipContent = (
                                <Box sx={{ p: 1 }}>
                                  <Typography
                                    variant="body2"
                                    sx={{ fontWeight: 600 }}
                                  >
                                    {person.person_name}
                                  </Typography>
                                  {person.caste_name && (
                                    <Typography
                                      variant="caption"
                                      display="block"
                                    >
                                      Caste: {person.caste_name}
                                    </Typography>
                                  )}
                                  {person.sub_caste_name && (
                                    <Typography
                                      variant="caption"
                                      display="block"
                                    >
                                      Sub-Caste: {person.sub_caste_name}
                                    </Typography>
                                  )}
                                  <Typography
                                    variant="caption"
                                    display="block"
                                    sx={{ mt: 1 }}
                                  >
                                    🧬 {hierarchyText}
                                  </Typography>
                                </Box>
                              );

                              return (
                                <Tooltip
                                  key={person.person_id}
                                  title={tooltipContent}
                                >
                                  <Box
                                    onClick={() =>
                                      navigate(
                                        `/families?tree=${person.tree_id}`,
                                      )
                                    }
                                    sx={{
                                      p: 1.5,
                                      bgcolor: "#f5f5f5",
                                      borderRadius: 1,
                                      cursor: "pointer",
                                      color: "#0066cc",
                                      textDecoration: "underline",
                                      transition: "all 0.2s",
                                      "&:hover": {
                                        bgcolor: "#e3f2fd",
                                        fontWeight: 600,
                                        transform: "translateX(4px)",
                                      },
                                    }}
                                  >
                                    <Typography variant="body2">
                                      {person.person_name}
                                    </Typography>
                                  </Box>
                                </Tooltip>
                              );
                            })}
                          </Stack>
                        </CardContent>
                      </Card>
                    );
                  })}
                </Box>
              </Box>
            )}

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

            <PersonSearchField
              label="Owner Name"
              placeholder="Enter owner name and search"
              searchValue={formData.owner}
              onSearchValueChange={(value) =>
                setFormData((prev) => ({ ...prev, owner: value }))
              }
              onPersonSelect={(person) => {
                setFormData((prev) => ({
                  ...prev,
                  owner: person.name || "",
                  ownerId: person.id,
                }));
              }}
              selectedPerson={people.length > 0 ? people[0] : null}
              villageId={selectedVillage}
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

      {/* Professions Dialog */}
      <Dialog
        open={openProfessionDialog}
        onClose={handleCloseProfessionDialog}
        maxWidth="sm"
        fullWidth
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Add Profession to{" "}
            {selectedPersonForProfession?.name || "Family Member"}
          </Typography>

          <PersonSearchField
            label="Select Person"
            placeholder="Search person by name"
            searchValue={professionSearchInput}
            onSearchValueChange={(value) => {
              setProfessionSearchInput(value);
              if (!value) {
                setSelectedPersonForProfession(null);
              }
            }}
            onPersonSelect={(person) => {
              setSelectedPersonForProfession(person as FNode);
              setProfessionSearchInput(person.name);
            }}
            selectedPerson={selectedPersonForProfession}
            villageId={selectedVillage}
          />

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Select Profession</InputLabel>
            <Select
              value={selectedProfession?.id || ""}
              label="Select Profession"
              onChange={(e) => {
                const prof = professions.find((p) => p.id === e.target.value);
                setSelectedProfession(prof || null);
              }}
            >
              {professions.map((prof) => (
                <MenuItem key={prof.id} value={prof.id}>
                  {prof.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ border: "1px solid #ddd", p: 2, mb: 2, borderRadius: 1 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Or Create New Profession
            </Typography>
            <Stack direction="row" spacing={1}>
              <TextField
                placeholder="New profession name..."
                value={newProfessionName}
                onChange={(e) => setNewProfessionName(e.target.value)}
                size="small"
                fullWidth
              />
              <Button
                variant="outlined"
                onClick={handleCreateNewProfession}
                sx={{ whiteSpace: "nowrap" }}
              >
                Create
              </Button>
            </Stack>
          </Box>

          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              onClick={handleCloseProfessionDialog}
              fullWidth
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleAddProfession}
              disabled={!selectedProfession || !selectedPersonForProfession}
              fullWidth
              sx={{ background: "linear-gradient(135deg, #0066cc, #00cc99)" }}
            >
              Add Profession
            </Button>
          </Stack>
        </Box>
      </Dialog>
    </>
  );
};

export default BusinessPage;
