import React, { useEffect, useRef, useState } from "react";
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
  InputAdornment,
} from "@mui/material";
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
import CategoryIcon from "@mui/icons-material/Category";
import DeleteIcon from "@mui/icons-material/Delete";
import NotesIcon from "@mui/icons-material/Notes";
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
import { ApiService } from "../../services/apiService";
import { PersonSearchField } from "./PersonSearchField";
import { BusinessFormDialog } from "../Business/BusinessFormDialog";
import { FNode } from "../model/FNode";

interface Business {
  id: string;
  name: string;
  category?: string;
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

const buildFamilyPagePath = (treeId?: string, personId?: string): string => {
  const params = new URLSearchParams();
  if (treeId) params.set("tree", treeId);
  if (personId) params.set("personId", personId);
  const query = params.toString();
  return query ? `/families?${query}` : "/families";
};

const businessBlue = "#0d6efd";
const businessGreen = "#16a34a";
const slateText = "#0f172a";
const mutedText = "#64748b";

const primaryButtonSx = {
  bgcolor: businessBlue,
  boxShadow: "0 10px 20px rgba(13,110,253,0.18)",
  borderRadius: 2,
  fontWeight: 800,
  textTransform: "none",
  "&:hover": {
    bgcolor: "#0b5ed7",
    boxShadow: "0 12px 24px rgba(13,110,253,0.22)",
  },
};

const cardSx = {
  height: "100%",
  border: "1px solid rgba(15,23,42,0.08)",
  borderRadius: 2,
  boxShadow: "0 10px 30px rgba(15,23,42,0.06)",
  transition:
    "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
  "&:hover": {
    transform: "translateY(-4px)",
    borderColor: "rgba(13,110,253,0.28)",
    boxShadow: "0 16px 36px rgba(15,23,42,0.1)",
  },
};

const dialogFieldSx = {
  "& .MuiInputAdornment-root": {
    color: mutedText,
  },
  "& .MuiOutlinedInput-root": {
    borderRadius: 2,
    bgcolor: "#ffffff",
    "& fieldset": {
      borderColor: "rgba(15,23,42,0.14)",
    },
    "&:hover fieldset": {
      borderColor: "rgba(13,110,253,0.45)",
    },
    "&.Mui-focused fieldset": {
      borderColor: businessBlue,
    },
  },
};

const normalizeCategory = (category?: string) =>
  category?.trim().toLowerCase() || "";

const titleCaseCategory = (category: string) =>
  category
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

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
        onClick={() => {
          if (business.ownerId) {
            onNavigate(`/profile/person/${business.ownerId}`);
            return;
          }
          onNavigate(buildFamilyPagePath(business.treeId, business.ownerId));
        }}
        sx={{
          color: businessBlue,
          cursor: "pointer",
          textDecoration: "underline",
          "&:hover": { color: "#0b5ed7", fontWeight: 600 },
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
  const { selectedVillage, setSelectedVillage, villages } = useVillage();
  const { currentUser, isAdmin } = useAuth();

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
    category: "",
    description: "",
    owner: "",
    ownerId: "",
    contact: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const defaultVillageAppliedForUserRef = useRef<string | null>(null);

  // Initialize default categories (static - no need to fetch from DB)
  const initializeCategories = () => {
    const defaultCategories: BusinessCategory[] = [
      {
        id: "retail",
        title: "Retail & Shops",
        description: "Family-owned stores, boutiques, and retail businesses",
        color: "#d97706",
        icon: "StoreIcon",
        displayName: "Retail & Shops",
      },
      {
        id: "agriculture",
        title: "Agriculture & Farming",
        description: "Agricultural businesses, farming, and related services",
        color: businessGreen,
        icon: "AgricultureIcon",
        displayName: "Agriculture & Farming",
      },
      {
        id: "it",
        title: "IT & Technology",
        description:
          "Software development, IT services, and tech professionals",
        color: businessBlue,
        icon: "ComputerIcon",
        displayName: "IT & Technology",
      },
      {
        id: "education",
        title: "Education",
        description:
          "Teachers, tutors, coaching centers, and educational services",
        color: "#0891b2",
        icon: "SchoolIcon",
        displayName: "Education",
      },
      {
        id: "healthcare",
        title: "Healthcare",
        description: "Doctors, nurses, clinics, and medical professionals",
        color: "#dc2626",
        icon: "LocalHospitalIcon",
        displayName: "Healthcare",
      },
      {
        id: "engineering",
        title: "Engineering & Construction",
        description: "Engineers, contractors, and construction businesses",
        color: "#7c3aed",
        icon: "EngineeringIcon",
        displayName: "Engineering & Construction",
      },
      {
        id: "properties",
        title: "Properties & Real Estate",
        description:
          "Real estate agents, property management, and property sales",
        color: "#475569",
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

  useEffect(() => {
    if (!currentUser) {
      defaultVillageAppliedForUserRef.current = null;
      return;
    }

    const userKey = currentUser.uid || "current-user";
    if (defaultVillageAppliedForUserRef.current === userKey) {
      return;
    }

    let active = true;
    defaultVillageAppliedForUserRef.current = userKey;

    ApiService.getDefaultUserTree()
      .then((target) => {
        if (!active || !target?.villageId) {
          return;
        }

        const villageExists =
          villages.length === 0 || villages.some((village) => village.id === target.villageId);
        if (villageExists && selectedVillage !== target.villageId) {
          setSelectedVillage(target.villageId);
        }
      })
      .catch((error) => {
        if (active) {
          console.warn("Failed to resolve default business village:", error);
        }
      });

    return () => {
      active = false;
    };
  }, [currentUser, selectedVillage, setSelectedVillage, villages]);

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
      await ApiService.addProfessionToPerson(
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
      await ApiService.removeProfessionFromPerson(personId, professionId);

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
      const newProf = await ApiService.createProfession({
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
    const normalizedCategory = normalizeCategory(category);
    return businesses.filter(
      (b) => normalizeCategory(b.category) === normalizedCategory,
    ).length;
  };

  const getCategoryColor = (category?: string) => {
    const categoryMeta = categories.find(
      (cat) => cat.id === normalizeCategory(category),
    );
    return categoryMeta?.color || "#475569";
  };

  const getCategoryLabel = (category?: string) => {
    const normalizedCategory = normalizeCategory(category);
    if (!normalizedCategory) return "";
    const categoryMeta = categories.find((cat) => cat.id === normalizedCategory);
    return categoryMeta?.displayName || titleCaseCategory(normalizedCategory);
  };

  const getCategoryIcon = (category?: string, size = 24) => {
    const color = getCategoryColor(category);
    switch (normalizeCategory(category)) {
      case "retail":
        return <StoreIcon sx={{ fontSize: size, color }} />;
      case "agriculture":
        return <AgricultureIcon sx={{ fontSize: size, color }} />;
      case "it":
        return <ComputerIcon sx={{ fontSize: size, color }} />;
      case "education":
        return <SchoolIcon sx={{ fontSize: size, color }} />;
      case "healthcare":
        return <LocalHospitalIcon sx={{ fontSize: size, color }} />;
      case "engineering":
        return <EngineeringIcon sx={{ fontSize: size, color }} />;
      case "properties":
        return <ApartmentIcon sx={{ fontSize: size, color }} />;
      default:
        return <BusinessIcon sx={{ fontSize: size, color }} />;
    }
  };

  const getCategoryIconLarge = (category: string) => {
    return getCategoryIcon(category, 44);
  };

  const handleOpenDialog = (business?: Business) => {
    setEditingBusiness(business || null);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingBusiness(null);
  };

  const handleBusinessSaved = () => {
    // Refresh businesses list by dispatching Redux action
    if (selectedVillage) {
      dispatch(fetchBusinessesByVillage(selectedVillage));
    }
  };

  const handleDelete = async (businessId: string) => {
    if (window.confirm("Are you sure you want to delete this business?")) {
      try {
        await ApiService.deleteBusiness(businessId);
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
          bgcolor: "#ffffff",
          color: slateText,
          py: { xs: 4, md: 6 },
          borderBottom: "1px solid rgba(15,23,42,0.08)",
        }}
      >
        <Container maxWidth="lg">
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={3}
            alignItems={{ xs: "flex-start", md: "center" }}
            justifyContent="space-between"
          >
            <Box sx={{ maxWidth: 760 }}>
              <Chip
                icon={<BusinessIcon />}
                label="Business Directory"
                sx={{
                  mb: 2,
                  bgcolor: "#eff6ff",
                  color: businessBlue,
                  fontWeight: 800,
                  borderRadius: 2,
                }}
              />
              <Typography
                variant="h3"
                gutterBottom
                sx={{
                  fontWeight: 900,
                  letterSpacing: 0,
                  fontSize: { xs: 32, md: 44 },
                }}
              >
                {villageName} Business Network
              </Typography>
              <Typography
                variant="h6"
                sx={{ color: mutedText, maxWidth: 680, lineHeight: 1.55 }}
              >
                Connect with family-run businesses, trusted services, and
                professional talent from your village.
              </Typography>
            </Box>
            {isAdmin() && (
              <Button
                variant="contained"
                size="large"
                startIcon={<AddIcon />}
                onClick={() => handleOpenDialog()}
                sx={primaryButtonSx}
              >
                Add Business
              </Button>
            )}
          </Stack>
        </Container>
      </Box>

      <Box sx={{ bgcolor: "#f8fafc", minHeight: "100vh" }}>
        <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
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
            <Box sx={{ mb: 5, textAlign: "center" }}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="center"
                alignItems="center"
                spacing={2}
                sx={{ mb: 2 }}
              >
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 900, color: slateText, letterSpacing: 0 }}
                >
                  Supporting {villageName} Businesses
                </Typography>
                {isAdmin() && (
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                    sx={primaryButtonSx}
                  >
                    Add Business
                  </Button>
                )}
              </Stack>
              <Typography
                variant="body1"
                paragraph
                sx={{ maxWidth: 760, mx: "auto", mb: 3, color: mutedText }}
              >
                Our village has a rich tradition of entrepreneurship and
                professional excellence. This directory helps connect family
                members in business, fostering collaboration, mutual support,
                and shared success.
              </Typography>
              {businesses.length === 0 && (
                <Alert
                  severity="info"
                  sx={{
                    maxWidth: 800,
                    mx: "auto",
                    borderRadius: 2,
                    border: "1px solid rgba(13,110,253,0.16)",
                  }}
                >
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
                  sx={{
                    textAlign: "center",
                    fontWeight: 900,
                    color: slateText,
                    mb: 4,
                    letterSpacing: 0,
                  }}
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
                  {businesses.map((business) => {
                    const categoryLabel = getCategoryLabel(business.category);
                    const categoryColor = getCategoryColor(business.category);

                    return (
                      <Card
                        key={business.id}
                        sx={{
                          ...cardSx,
                          display: "flex",
                          flexDirection: "column",
                          bgcolor: "#ffffff",
                        }}
                      >
                        <CardContent sx={{ flexGrow: 1, p: 3 }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "flex-start",
                            justifyContent: "space-between",
                            mb: 2,
                          }}
                        >
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Box
                              sx={{
                                width: 40,
                                height: 40,
                                borderRadius: 2,
                                bgcolor: categoryLabel
                                  ? `${categoryColor}14`
                                  : "#f1f5f9",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              {getCategoryIcon(business.category)}
                            </Box>
                            {categoryLabel && (
                              <Chip
                                label={categoryLabel}
                                size="small"
                                variant="outlined"
                                sx={{
                                  borderColor: `${categoryColor}55`,
                                  color: categoryColor,
                                  fontWeight: 700,
                                  bgcolor: "#ffffff",
                                  maxWidth: 160,
                                }}
                              />
                            )}
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
                          sx={{
                            fontWeight: 900,
                            color: slateText,
                            letterSpacing: 0,
                          }}
                        >
                          {business.name}
                        </Typography>

                        <Typography
                          variant="body2"
                          color="text.secondary"
                          paragraph
                          sx={{ minHeight: 60, mb: 3, color: mutedText }}
                        >
                          {business.description || "No description added yet."}
                        </Typography>

                        <Stack spacing={1.5}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <PersonIcon sx={{ fontSize: 18, color: mutedText }} />
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
                              <PhoneIcon sx={{ fontSize: 18, color: mutedText }} />
                              <Typography
                                variant="body2"
                                component="a"
                                href={`tel:${business.contact}`}
                                sx={{
                                  textDecoration: "none",
                                  color: businessBlue,
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
                    );
                  })}
                </Box>
              </Box>
            )}

            <Divider sx={{ my: 5, borderColor: "rgba(15,23,42,0.08)" }} />

            {/* Business Categories */}
            <Box sx={{ mb: 8 }}>
              <Typography
                variant="h4"
                gutterBottom
                sx={{
                  textAlign: "center",
                  fontWeight: 900,
                  color: slateText,
                  mb: 4,
                  letterSpacing: 0,
                }}
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
                    sx={{ ...cardSx, bgcolor: "#ffffff" }}
                  >
                    <CardContent sx={{ textAlign: "center", p: 3 }}>
                      <Box
                        sx={{
                          width: 64,
                          height: 64,
                          mx: "auto",
                          mb: 2,
                          borderRadius: 2,
                          bgcolor: "#eff6ff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {category.icon}
                      </Box>
                      <Typography
                        variant="h6"
                        gutterBottom
                        sx={{ fontWeight: 900, color: slateText }}
                      >
                        {category.title}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        paragraph
                        sx={{ minHeight: 48, color: mutedText }}
                      >
                        {category.description}
                      </Typography>
                      <Chip
                        label={`${category.count} ${
                          category.count === 1 ? "business" : "businesses"
                        }`}
                        variant="outlined"
                        sx={{
                          borderColor: "rgba(13,110,253,0.35)",
                          color: businessBlue,
                          fontWeight: 800,
                        }}
                      />
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </Box>

            <Divider sx={{ my: 5, borderColor: "rgba(15,23,42,0.08)" }} />

            {/* Benefits Section */}
            <Box sx={{ mb: 8 }}>
              <Stack
                direction="row"
                spacing={2}
                alignItems="center"
                sx={{ mb: 4 }}
              >
                <HandshakeIcon sx={{ fontSize: 40, color: businessBlue }} />
                <Typography variant="h4" sx={{ fontWeight: 900, color: slateText }}>
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
                  <Paper
                    key={`benefit-${index}`}
                    elevation={0}
                    sx={{
                      p: 3,
                      borderRadius: 2,
                      border: "1px solid rgba(15,23,42,0.08)",
                      boxShadow: "0 8px 24px rgba(15,23,42,0.05)",
                    }}
                  >
                    <Typography
                      variant="h6"
                      gutterBottom
                      sx={{ fontWeight: 900, color: slateText }}
                    >
                      {benefit.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: mutedText }}>
                      {benefit.description}
                    </Typography>
                  </Paper>
                ))}
              </Box>
            </Box>

            <Divider sx={{ my: 5, borderColor: "rgba(15,23,42,0.08)" }} />

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
                  sx={{ textAlign: "center", fontWeight: 900, mb: 0, color: slateText }}
                >
                  Professions & Occupations
                </Typography>
                {isAdmin() && (
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<AddIcon />}
                    sx={primaryButtonSx}
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
                        key={professionData.professionId}
                        sx={{ ...cardSx, bgcolor: "#ffffff" }}
                      >
                        <CardContent>
                          <Typography
                            variant="h6"
                            gutterBottom
                            sx={{ fontWeight: 900, mb: 2, color: slateText }}
                          >
                            {professionData.professionName}
                          </Typography>
                          {professionData.professionDescription && (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              paragraph
                              sx={{ minHeight: 40, mb: 2 }}
                            >
                              {professionData.professionDescription}
                            </Typography>
                          )}
                          <Stack spacing={1}>
                            {peopleInProfession.map((person: any) => {
                              const hierarchyText =
                                person.parentHierarchy &&
                                person.parentHierarchy.length > 0
                                  ? person.parentHierarchy
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
                                    {person.personName}
                                  </Typography>
                                  {person.casteName && (
                                    <Typography
                                      variant="caption"
                                      display="block"
                                    >
                                      Caste: {person.casteName}
                                    </Typography>
                                  )}
                                  {person.subCasteName && (
                                    <Typography
                                      variant="caption"
                                      display="block"
                                    >
                                      Sub-Caste: {person.subCasteName}
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
                                  key={person.personId}
                                  title={tooltipContent}
                                >
                                  <Box
                                    onClick={() =>
                                      navigate(
                                        buildFamilyPagePath(
                                          person.treeId,
                                          person.personId,
                                        ),
                                      )
                                    }
                                    sx={{
                                      p: 1.5,
                                      bgcolor: "#f8fafc",
                                      borderRadius: 2,
                                      border: "1px solid rgba(15,23,42,0.08)",
                                      cursor: "pointer",
                                      color: businessBlue,
                                      textDecoration: "underline",
                                      transition: "all 0.2s",
                                      "&:hover": {
                                        bgcolor: "#eff6ff",
                                        fontWeight: 600,
                                        transform: "translateX(4px)",
                                      },
                                    }}
                                  >
                                    <Typography
                                      variant="body2"
                                      sx={{ fontWeight: 600 }}
                                    >
                                      {person.personName}
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        display: "block",
                                        mt: 0.5,
                                        color: "text.secondary",
                                        textDecoration: "none",
                                      }}
                                    >
                                      Lineage: {hierarchyText}
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
                    sx={primaryButtonSx}
                  >
                    Add a Business
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    size="large"
                    sx={primaryButtonSx}
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
      </Box>

      {/* Add/Edit Business Dialog */}
      <BusinessFormDialog
        open={openDialog}
        onClose={handleCloseDialog}
        business={editingBusiness}
        enableOwnerSelect
        villageId={selectedVillage}
        onSaved={handleBusinessSaved}
      />

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
              sx={primaryButtonSx}
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
