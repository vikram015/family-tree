import React, { Suspense, useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Box,
  Typography,
  Container,
  Paper,
  Button,
  Grid,
  Alert,
  Autocomplete,
  Avatar,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Stack,
  Tooltip,
  Link,
  Card,
  CardContent,
  Tabs,
  Tab,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useLoginModal } from "../context/LoginModalContext";
import { useLocations } from "../hooks/useLocations";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { PersonSearchField } from "../BusinessPage/PersonSearchField";
import LinkIcon from "@mui/icons-material/Link";
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import BusinessIcon from "@mui/icons-material/Business";
import WorkIcon from "@mui/icons-material/Work";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import NotesOutlinedIcon from "@mui/icons-material/NotesOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import CakeOutlinedIcon from "@mui/icons-material/CakeOutlined";
import WcOutlinedIcon from "@mui/icons-material/WcOutlined";
import {
  ApiService,
  LinkRequest,
  Wish,
  WishEventType,
} from "../../services/apiService";
import { BusinessFormDialog } from "../Business/BusinessFormDialog";
import { phoneFromCustomFields } from "../Business/businessContact";
import { formatDisplayDate } from "../../utils/dateFormatter";
import { selectCastes, selectSubCastes } from "../../store/slices/casteSlice";
import {
  fetchMyLocationAccessRequests,
  submitLocationAccessRequest,
} from "../../store/thunks/apiThunks";
import dayjs from "dayjs";

const ImageCropper = React.lazy(() => import("../ImageCropper/ImageCropper"));
const DatePicker = React.lazy(() =>
  import("@mui/x-date-pickers/DatePicker").then((m) => ({ default: m.DatePicker })),
);

const BUSINESS_CATEGORY_LABELS: Record<string, string> = {
  retail: "Retail & Shops",
  agriculture: "Agriculture & Farming",
  it: "IT & Technology",
  education: "Education",
  healthcare: "Healthcare",
  engineering: "Engineering & Construction",
  properties: "Properties & Real Estate",
};

const formatBusinessCategory = (category?: string) => {
  if (!category) return null;
  return BUSINESS_CATEGORY_LABELS[category] || category;
};

export const ProfilePage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();
  const { personId: routePersonId } = useParams<{ personId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const { userProfile, currentUser, updateUserProfile } = useAuth();
  const { openLoginModal } = useLoginModal();
  const { locations, selectedLocation, setSelectedLocation } = useLocations();
  const castes = useAppSelector(selectCastes);
  const subCastes = useAppSelector(selectSubCastes);
  const [isLinking, setIsLinking] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [selectedPerson, setSelectedPerson] = useState<any | null>(null);
  const [linking, setLinking] = useState(false);
  // Pending self-link request (account -> tree person) awaiting owner approval.
  const [pendingLinkRequest, setPendingLinkRequest] = useState<LinkRequest | null>(null);
  // Confirmation modal shown before a link request is sent.
  const [linkConfirmOpen, setLinkConfirmOpen] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // New state for Business and Profession
  const [professions, setProfessions] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [personCustomFields, setPersonCustomFields] = useState<
    Record<string, string>
  >({});
  const [allProfessions, setAllProfessions] = useState<any[]>([]);
  // Dialog State
  const [openProfessionDialog, setOpenProfessionDialog] = useState(false);
  const [openBusinessDialog, setOpenBusinessDialog] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<any | null>(null);
  const [businessToDelete, setBusinessToDelete] = useState<any | null>(null);
  const [deletingBusiness, setDeletingBusiness] = useState(false);
  const [openEditProfileDialog, setOpenEditProfileDialog] = useState(false);

  // The dialog is fullScreen on mobile, so it should feel like a screen the
  // hardware/gesture back button can dismiss instead of navigating the whole
  // app away while it stays open underneath. Push a history entry while open
  // and treat popstate as "close"; if it's closed some other way (Cancel/Save),
  // consume that entry so back doesn't then require a second press.
  const closedByBackRef = useRef(false);
  useEffect(() => {
    if (!openEditProfileDialog) return;
    closedByBackRef.current = false;
    window.history.pushState({ dialog: "edit-profile" }, "");
    const onPopState = () => {
      closedByBackRef.current = true;
      setOpenEditProfileDialog(false);
    };
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      if (!closedByBackRef.current) {
        window.history.back();
      }
    };
  }, [openEditProfileDialog]);

  const [personLoading, setPersonLoading] = useState(false);
  const [personNotFound, setPersonNotFound] = useState(false);

  // Form State
  const [selectedProfessionId, setSelectedProfessionId] = useState<string>("");
  const [newProfessionName, setNewProfessionName] = useState("");
  const [newProfessionContact, setNewProfessionContact] = useState("");
  const [editProfileData, setEditProfileData] = useState({
    name: "",
    phone: "",
    email: "",
    dob: "",
    gender: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | undefined>();
  const [profilePhotoUploading, setProfilePhotoUploading] = useState(false);
  const [linkedPersonDetails, setLinkedPersonDetails] = useState<any | null>(
    null,
  );
  const [requestLocationId, setRequestLocationId] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const [myLocationRequests, setMyLocationRequests] = useState<any[]>([]);
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const hasAssignedLocation = (userProfile?.locations || []).length > 0;
  const casteMap = new Map(castes.map((c: any) => [c.id, c.name]));
  const subCasteMap = new Map(subCastes.map((s: any) => [s.id, s.name]));
  const linkedTreeCaste =
    casteMap.get(linkedPersonDetails?.tree?.caste) ||
    linkedPersonDetails?.tree?.caste;
  const linkedTreeSubCaste =
    subCasteMap.get(linkedPersonDetails?.tree?.subCaste) ||
    linkedPersonDetails?.tree?.subCaste;

  const isPublicPersonView = Boolean(routePersonId);
  const effectivePersonId = routePersonId || userProfile?.peopleId || null;
  const canManagePerson = Boolean(
    currentUser &&
      effectivePersonId &&
      userProfile?.peopleId === effectivePersonId,
  );
  const isOwnAccountView = !isPublicPersonView;
  const displayPersonName =
    linkedPersonDetails?.name ||
    userProfile?.displayName ||
    userProfile?.name ||
    "Profile";

  // --- Wall (event-specific wishes) ---
  const WISH_EVENT_TYPES: WishEventType[] = [
    "birthday",
    "anniversary",
    "remembrance",
  ];
  const WISH_EVENT_LABELS: Record<WishEventType, string> = {
    birthday: "Birthday",
    anniversary: "Anniversary",
    remembrance: "Remembrance",
  };
  const currentYear = new Date().getFullYear();
  const rawEventParam = (searchParams.get("event") || "").toLowerCase();
  const requestedEventType: WishEventType = (
    WISH_EVENT_TYPES.includes(rawEventParam as WishEventType)
      ? rawEventParam
      : "birthday"
  ) as WishEventType;
  const parsedYear = parseInt(searchParams.get("year") || "", 10);
  const wishEventYear = Number.isFinite(parsedYear) ? parsedYear : currentYear;

  const [wishes, setWishes] = useState<Wish[]>([]);
  const [wishesLoading, setWishesLoading] = useState(false);
  const [wishMessage, setWishMessage] = useState("");
  const [postingWish, setPostingWish] = useState(false);
  const [wishError, setWishError] = useState("");
  // Whether this person has a spouse — anniversary only applies if married.
  const [hasSpouse, setHasSpouse] = useState(false);

  // Which occasions make sense for THIS person:
  //  - birthday: only for a living person
  //  - anniversary: only if they have a spouse
  //  - remembrance: only for a deceased person
  const personIsAlive = linkedPersonDetails
    ? linkedPersonDetails.isAlive !== false
    : true;
  const availableEventTypes: WishEventType[] = WISH_EVENT_TYPES.filter((type) => {
    if (type === "birthday") return personIsAlive;
    if (type === "anniversary") return hasSpouse;
    return !personIsAlive; // remembrance
  });
  const effectiveEventTypes: WishEventType[] =
    availableEventTypes.length > 0 ? availableEventTypes : ["birthday"];
  // Clamp the active thread to an occasion that's actually available.
  const wishEventType: WishEventType = effectiveEventTypes.includes(
    requestedEventType,
  )
    ? requestedEventType
    : effectiveEventTypes[0];

  const isSuperadmin = userProfile?.role === "superadmin";

  const loadWishes = useCallback(async () => {
    if (!effectivePersonId) {
      setWishes([]);
      return;
    }
    setWishesLoading(true);
    setWishError("");
    try {
      const data = await ApiService.getWishes({
        peopleId: effectivePersonId,
        eventType: wishEventType,
        eventYear: wishEventYear,
      });
      setWishes(data || []);
    } catch (err) {
      console.error("Error loading wishes:", err);
      setWishError("Failed to load wishes.");
    } finally {
      setWishesLoading(false);
    }
  }, [effectivePersonId, wishEventType, wishEventYear]);

  useEffect(() => {
    void loadWishes();
  }, [loadWishes]);

  // Determine whether the person has a spouse (gates the Anniversary occasion).
  useEffect(() => {
    let active = true;
    if (!effectivePersonId) {
      setHasSpouse(false);
      return;
    }
    ApiService.getPersonSpouses(effectivePersonId)
      .then((rows) => {
        if (active) setHasSpouse(Array.isArray(rows) && rows.length > 0);
      })
      .catch(() => {
        if (active) setHasSpouse(false);
      });
    return () => {
      active = false;
    };
  }, [effectivePersonId]);

  const handleSelectWishThread = (eventType: WishEventType) => {
    const next = new URLSearchParams(searchParams);
    next.set("event", eventType);
    next.set("year", String(wishEventYear));
    setSearchParams(next, { replace: true });
  };

  const handlePostWish = async () => {
    if (!effectivePersonId || !currentUser || !wishMessage.trim()) return;
    setPostingWish(true);
    setWishError("");
    try {
      await ApiService.postWish({
        peopleId: effectivePersonId,
        eventType: wishEventType,
        eventYear: wishEventYear,
        message: wishMessage.trim(),
      });
      setWishMessage("");
      await loadWishes();
    } catch (err: any) {
      console.error("Error posting wish:", err);
      setWishError(err?.message || "Failed to post wish.");
    } finally {
      setPostingWish(false);
    }
  };

  const handleDeleteWish = async (id: string) => {
    setWishError("");
    try {
      await ApiService.deleteWish(id);
      await loadWishes();
    } catch (err: any) {
      console.error("Error deleting wish:", err);
      setWishError(err?.message || "Failed to delete wish.");
    }
  };

  const formatWishTime = (value: string): string => {
    const d = new Date(value);
    if (isNaN(d.getTime())) return "";
    const diffMs = Date.now() - d.getTime();
    const diffSec = Math.round(diffMs / 1000);
    const diffMin = Math.round(diffSec / 60);
    const diffHr = Math.round(diffMin / 60);
    const diffDay = Math.round(diffHr / 24);
    if (diffSec < 60) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return d.toLocaleDateString();
  };

  const refreshPersonDetails = useCallback(async (personId: string) => {
    const person = await ApiService.getPersonById(personId);
    if (!person) {
      return null;
    }

    let treeDetails = null;
    if ((person as any).treeId) {
      treeDetails = await ApiService.getTreeWithDetails((person as any).treeId);
    }

    return { ...person, tree: treeDetails };
  }, []);

  const refreshBusinesses = useCallback(async (personId: string) => {
    const updatedBiz = await ApiService.getBusinessesByPerson(personId);
    setBusinesses(updatedBiz || []);
  }, []);

  const refreshProfessions = useCallback(async (personId: string) => {
    const updatedProfs = await ApiService.getProfessionsByPerson(personId);
    setProfessions(updatedProfs || []);
  }, []);

  useEffect(() => {
    setEditProfileData({
      name: userProfile?.displayName || userProfile?.name || "",
      phone: userProfile?.phone || "",
      email: userProfile?.email || "",
      // Date input needs YYYY-MM-DD; the stored value may be an ISO timestamp.
      dob: linkedPersonDetails?.dob
        ? String(linkedPersonDetails.dob).split("T")[0]
        : "",
      gender: linkedPersonDetails?.gender || "",
    });
  }, [userProfile, linkedPersonDetails]);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!effectivePersonId) {
        setLinkedPersonDetails(null);
        setProfessions([]);
        setBusinesses([]);
        setPersonNotFound(false);
        setProfilePhotoUrl(undefined);
        return;
      }

      setPersonLoading(true);
      setPersonNotFound(false);
      setError("");

      try {
        const personWithTree = await refreshPersonDetails(effectivePersonId);
        if (!personWithTree) {
          setLinkedPersonDetails(null);
          setProfessions([]);
          setBusinesses([]);
          setPersonNotFound(true);
          return;
        }

        setLinkedPersonDetails(personWithTree);
        setProfilePhotoUrl((personWithTree as any)?.photoUrl || undefined);

        const [profs, biz, allProfs, customFields] = await Promise.all([
          // Fetched so we know whether the person has any to reveal; the actual
          // details stay hidden behind the login prompt for guests.
          ApiService.getProfessionsByPerson(effectivePersonId),
          ApiService.getBusinessesByPerson(effectivePersonId),
          canManagePerson ? ApiService.getAllProfessions() : Promise.resolve([]),
          ApiService.getPersonCustomFields(effectivePersonId).catch(() => ({})),
        ]);
        setProfessions(profs || []);
        setBusinesses(biz || []);
        setPersonCustomFields(customFields || {});
        if (canManagePerson) {
          setAllProfessions(allProfs || []);
        }
      } catch (err) {
        console.error("Error fetching details:", err);
        setError("Failed to load profile details.");
      } finally {
        setPersonLoading(false);
      }
    };

    void fetchDetails();
  }, [effectivePersonId, canManagePerson, refreshPersonDetails, currentUser]);

  // Load any pending self-link request so an unlinked user sees its status
  // instead of being able to send a duplicate.
  useEffect(() => {
    if (!currentUser || userProfile?.peopleId) {
      setPendingLinkRequest(null);
      return;
    }
    let cancelled = false;
    ApiService.getMyLinkRequests("user_to_tree_node")
      .then((requests) => {
        if (cancelled) return;
        const pending = (requests || []).find((r) => r.status === "pending");
        setPendingLinkRequest(pending || null);
      })
      .catch(() => {
        if (!cancelled) setPendingLinkRequest(null);
      });
    return () => {
      cancelled = true;
    };
  }, [currentUser, userProfile?.peopleId]);

  const loadMyLocationRequests = useCallback(async () => {
    try {
      const userId = userProfile?.id;
      if (!userId) {
        setMyLocationRequests([]);
        return;
      }
      const data = await dispatch(
        fetchMyLocationAccessRequests(userId),
      ).unwrap();
      setMyLocationRequests(data || []);
    } catch (err) {
      console.error("Error loading location requests:", err);
      setMyLocationRequests([]);
    }
  }, [dispatch, userProfile?.id]);

  useEffect(() => {
    if (currentUser && userProfile?.role === "admin") {
      loadMyLocationRequests();
    }
  }, [currentUser, userProfile?.role, loadMyLocationRequests]);

  const handleUpdateProfile = async () => {
    setSavingProfile(true);
    setError("");
    try {
      if (updateUserProfile) {
        await updateUserProfile(
          editProfileData.name,
          userProfile?.phone || "",
          editProfileData.email,
        );
      }

      // Date of birth and gender live on the linked person record — update them
      // too when the user manages this profile.
      if (canManagePerson && effectivePersonId) {
        await ApiService.updatePerson(effectivePersonId, {
          dob: editProfileData.dob || undefined,
          gender: (editProfileData.gender || undefined) as any,
        });
        const refreshed = await refreshPersonDetails(effectivePersonId);
        if (refreshed) setLinkedPersonDetails(refreshed);
      }

      setOpenEditProfileDialog(false);
      setSuccess("Profile updated successfully.");
    } catch (err: any) {
      console.error("Error updating profile:", err);
      setError(err?.message || "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleProfilePhotoUpload = async (blob: Blob) => {
    if (!userProfile?.peopleId) {
      setError("Link your profile to a family tree person before adding a photo.");
      return;
    }

    setProfilePhotoUploading(true);
    setError("");
    try {
      const url = await ApiService.uploadPersonPhoto(userProfile.peopleId, blob);
      setProfilePhotoUrl(url);
      setLinkedPersonDetails((prev: any) =>
        prev ? { ...prev, photoUrl: url } : prev,
      );
      setSuccess("Profile image updated successfully.");
    } catch (err: any) {
      setError(err?.message || "Failed to update profile image.");
    } finally {
      setProfilePhotoUploading(false);
    }
  };

  const handleProfilePhotoRemove = async () => {
    if (!userProfile?.peopleId) {
      return;
    }

    setProfilePhotoUploading(true);
    setError("");
    try {
      await ApiService.removePersonPhoto(userProfile.peopleId);
      setProfilePhotoUrl(undefined);
      setLinkedPersonDetails((prev: any) =>
        prev ? { ...prev, photoUrl: null } : prev,
      );
      setSuccess("Profile image removed successfully.");
    } catch (err: any) {
      setError(err?.message || "Failed to remove profile image.");
    } finally {
      setProfilePhotoUploading(false);
    }
  };

  const handleAddProfession = async () => {
    if (!effectivePersonId || !canManagePerson) return;

    try {
      let profId = selectedProfessionId;

      // If "Other" or new profession is entered (simplified logic: if ID is empty but name is provided, create new)
      if (!profId && newProfessionName) {
        const newProf = await ApiService.createProfession({
          name: newProfessionName,
          category: "Other",
          description: newProfessionContact
            ? `Contact: ${newProfessionContact}`
            : undefined,
        });
        profId = newProf.id;
        // Refresh all professions
        const updatedAll = await ApiService.getAllProfessions();
        setAllProfessions(updatedAll);
      }

      if (profId) {
        await ApiService.addProfessionToPerson(effectivePersonId, profId);
        await refreshProfessions(effectivePersonId);
        setOpenProfessionDialog(false);
        setSelectedProfessionId("");
        setNewProfessionName("");
        setNewProfessionContact("");
      }
    } catch (err) {
      console.error("Error adding profession:", err);
      // specific error handling if needed
    }
  };

  const handleOpenBusinessDialog = (business?: any) => {
    setEditingBusiness(business || null);
    setOpenBusinessDialog(true);
  };

  const handleCloseBusinessDialog = () => {
    setOpenBusinessDialog(false);
    setEditingBusiness(null);
  };

  const handleDeleteBusiness = (business: any) => {
    if (!effectivePersonId || !canManagePerson) return;
    setBusinessToDelete(business);
  };

  const handleConfirmDeleteBusiness = async () => {
    if (!effectivePersonId || !canManagePerson || !businessToDelete) return;

    setDeletingBusiness(true);
    try {
      await ApiService.deleteBusiness(businessToDelete.id);
      await refreshBusinesses(effectivePersonId);
      setSuccess("Business deleted successfully.");
      setBusinessToDelete(null);
    } catch (err: any) {
      console.error("Error deleting business:", err);
      setError(err?.message || "Failed to delete business.");
    } finally {
      setDeletingBusiness(false);
    }
  };

  const handleRemoveProfession = async (profId: string) => {
    if (!effectivePersonId || !canManagePerson) return;
    try {
      await ApiService.removeProfessionFromPerson(effectivePersonId, profId);
      await refreshProfessions(effectivePersonId);
    } catch (err) {
      console.error("Error removing profession:", err);
    }
  };

  // Send a self-link request (pending owner approval) instead of linking
  // directly — mirrors the "This is me" flow on the family-tree node details.
  const handleLink = async () => {
    if (!selectedPerson) return;
    setLinking(true);
    setError("");
    setSuccess("");
    try {
      const created = await ApiService.createUserNodeLinkRequest({
        targetPersonId: selectedPerson.id,
      });
      setPendingLinkRequest(created);
      setSuccess(
        "Link request sent. It's pending the tree owner's approval.",
      );
      setLinkConfirmOpen(false);
      setIsLinking(false);
      setSelectedPerson(null);
      setSearchValue("");
    } catch (e: any) {
      setError(e.message || "Failed to send link request. Please try again.");
    } finally {
      setLinking(false);
    }
  };

  const handleOpenLinkedProfileInTree = useCallback(() => {
    const personId = effectivePersonId;
    const treeId =
      linkedPersonDetails?.treeId || linkedPersonDetails?.tree?.id || "";
    if (!personId || !treeId) return;
    const params = new URLSearchParams();
    params.set("tree", treeId);
    params.set("personId", personId);
    navigate(`/families?${params.toString()}`);
  }, [navigate, effectivePersonId, linkedPersonDetails]);

  const handleSubmitLocationRequest = async () => {
    if (!requestLocationId) return;
    setRequestSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const userId = userProfile?.id;
      if (!userId) {
        throw new Error("User profile not loaded");
      }
      const data = await dispatch(
        submitLocationAccessRequest({
          userId,
          locationId: requestLocationId,
          requestMessage: requestMessage || null,
        }),
      ).unwrap();
      if (data && !data.success) throw new Error(data.error);

      setSuccess("Location access request submitted successfully.");
      setRequestLocationId("");
      setRequestMessage("");
      await loadMyLocationRequests();
    } catch (err: any) {
      setError(err.message || "Failed to submit request");
    } finally {
      setRequestSubmitting(false);
    }
  };

  const pageTitle = useMemo(() => {
    if (isPublicPersonView) {
      return displayPersonName;
    }
    return "My Profile";
  }, [displayPersonName, isPublicPersonView]);

  if (isOwnAccountView && !currentUser) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          Please log in to view and manage your account profile.
        </Alert>
        <Button variant="contained" onClick={() => navigate("/login")}>
          Log in
        </Button>
      </Container>
    );
  }

  if (personNotFound) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">Profile not found.</Alert>
        <Button sx={{ mt: 2 }} onClick={() => navigate(-1)}>
          Go back
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 3 }}
      >
        <Typography variant="h4" sx={{ fontWeight: "bold" }}>
          {pageTitle}
        </Typography>
        {isPublicPersonView && (
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)}>
            Back
          </Button>
        )}
      </Stack>

      {(error || success) && (
        <Stack spacing={1} sx={{ mb: 2 }}>
          {error && <Alert severity="error">{error}</Alert>}
          {success && <Alert severity="success">{success}</Alert>}
        </Stack>
      )}

      {personLoading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {!personLoading && (
      <Grid container spacing={3}>
        {/* Account info — logged-in user only */}
        {isOwnAccountView && currentUser && (
        <Grid size={{ xs: 12, md: isPublicPersonView ? 12 : 4 }}>
          <Paper
            elevation={2}
            sx={{
              p: 3,
              textAlign: "center",
              height: "100%",
              position: "relative",
            }}
          >
            <Tooltip title="Edit Profile">
              <IconButton
                size="small"
                onClick={() => setOpenEditProfileDialog(true)}
                sx={{ position: "absolute", top: 8, right: 8 }}
              >
                <EditIcon />
              </IconButton>
            </Tooltip>

            <Avatar
              src={profilePhotoUrl || linkedPersonDetails?.photoUrl || undefined}
              sx={{
                width: 100,
                height: 100,
                bgcolor: "primary.main",
                fontSize: 40,
                mx: "auto",
                mb: 2,
              }}
            >
              {(linkedPersonDetails?.name || userProfile?.displayName || currentUser.email || "U")
                .charAt(0)
                .toUpperCase()}
            </Avatar>
            <Typography variant="h6" gutterBottom>
              {userProfile?.displayName || "User"}
            </Typography>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                mb: 1,
                color: "text.secondary",
              }}
            >
              <EmailIcon fontSize="small" />
              <Typography variant="body2">
                {userProfile?.email || currentUser.email}
              </Typography>
            </Box>
            {userProfile?.phone && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 1,
                  mb: 1,
                  color: "text.secondary",
                }}
              >
                <PhoneIcon fontSize="small" />
                <Typography variant="body2">{userProfile.phone}</Typography>
              </Box>
            )}
            {canManagePerson && (
              <>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 1,
                    mb: 1,
                    color: "text.secondary",
                  }}
                >
                  <CakeOutlinedIcon fontSize="small" />
                  <Typography variant="body2">
                    {linkedPersonDetails?.dob
                      ? formatDisplayDate(linkedPersonDetails.dob)
                      : "Date of birth not set"}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 1,
                    mb: 1,
                    color: "text.secondary",
                  }}
                >
                  <WcOutlinedIcon fontSize="small" />
                  <Typography variant="body2" sx={{ textTransform: "capitalize" }}>
                    {linkedPersonDetails?.gender || "Gender not set"}
                  </Typography>
                </Box>
              </>
            )}

            <Divider sx={{ my: 2 }} />

            <Box sx={{ textAlign: "left" }}>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
              >
                Account Status
              </Typography>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
              >
                <AdminPanelSettingsIcon color="action" fontSize="small" />
                <Typography variant="body2">
                  Role: <strong>{userProfile?.role || "User"}</strong>
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <VerifiedUserIcon
                  color={userProfile?.isVerified ? "success" : "disabled"}
                  fontSize="small"
                />
                <Typography variant="body2">
                  Status:{" "}
                  <strong>
                    {userProfile?.isVerified
                      ? "Verified"
                      : "Pending Verification"}
                  </strong>
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
        )}

        {/* Family tree person summary */}
        {effectivePersonId && linkedPersonDetails && (
          <Grid size={{ xs: 12, md: isOwnAccountView && currentUser ? 8 : 12 }}>
            <Paper elevation={2} sx={{ p: 3, height: "100%" }}>
              <Stack direction="row" spacing={2} alignItems="flex-start">
                {!(isOwnAccountView && currentUser) && (
                  <Avatar
                    src={
                      profilePhotoUrl || linkedPersonDetails?.photoUrl || undefined
                    }
                    sx={{
                      width: 88,
                      height: 88,
                      bgcolor: "primary.main",
                      fontSize: 32,
                    }}
                  >
                    {(linkedPersonDetails?.name || "?").charAt(0).toUpperCase()}
                  </Avatar>
                )}
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    <Link
                      component="button"
                      type="button"
                      underline="hover"
                      onClick={handleOpenLinkedProfileInTree}
                      sx={{ fontWeight: 700 }}
                    >
                      {linkedPersonDetails.name}
                    </Link>
                  </Typography>
                  {linkedPersonDetails.nameHindi && (
                    <Typography variant="body2" color="text.secondary">
                      {linkedPersonDetails.nameHindi}
                    </Typography>
                  )}
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                    {(linkedPersonDetails.gender || canManagePerson) && (
                      <Chip
                        size="small"
                        label={`Gender: ${linkedPersonDetails.gender || "Not set"}`}
                        sx={{ textTransform: "capitalize" }}
                      />
                    )}
                    {(linkedPersonDetails.dob || canManagePerson) && (
                      <Chip
                        size="small"
                        label={`DOB: ${
                          linkedPersonDetails.dob
                            ? formatDisplayDate(linkedPersonDetails.dob)
                            : "Not set"
                        }`}
                      />
                    )}
                  </Stack>
                  {linkedPersonDetails.tree && (
                    <Stack spacing={0.5} sx={{ mt: 2 }}>
                      <Typography variant="body2">
                        <strong>Tree:</strong>{" "}
                        {linkedPersonDetails.tree.name || "Family tree"}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Caste:</strong> {linkedTreeCaste || "N/A"}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Sub-caste:</strong> {linkedTreeSubCaste || "N/A"}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Location:</strong>{" "}
                        {linkedPersonDetails.tree.location?.name || "N/A"}
                      </Typography>
                    </Stack>
                  )}
                </Box>
              </Stack>
            </Paper>
          </Grid>
        )}

        {/* Tree Linking Section — logged-in user not yet linked to a person. */}
        {isOwnAccountView && currentUser && !userProfile?.peopleId && (
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper elevation={2} sx={{ p: 3, height: "100%" }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
              }}
            >
              <Typography variant="h6">Family Tree Connection</Typography>
            </Box>

            <Divider sx={{ mb: 3 }} />

            {pendingLinkRequest ? (
              <Box>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Your request to link with{" "}
                  <strong>
                    {pendingLinkRequest.targetPersonName || "a family member"}
                  </strong>{" "}
                  is pending the tree owner's approval.
                </Alert>
                <Typography variant="body2" color="text.secondary">
                  You'll be able to manage your profile once the owner approves
                  the request.
                </Typography>
              </Box>
            ) : (
              <Box>
                {!isLinking ? (
                  <Box sx={{ textAlign: "center", py: 4 }}>
                    <Typography variant="body1" paragraph>
                      You haven't linked your account to a family tree profile
                      yet.
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      paragraph
                    >
                      Find yourself in the tree and send a link request — the
                      tree owner approves it, then you can manage your own
                      profile.
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<LinkIcon />}
                      onClick={() => setIsLinking(true)}
                      sx={{ mt: 2 }}
                    >
                      Link My Profile
                    </Button>
                  </Box>
                ) : (
                  <Box>
                    <Typography variant="subtitle1" gutterBottom>
                      Find your profile in the tree
                    </Typography>

                    <Autocomplete
                      fullWidth
                      sx={{ mb: 3 }}
                      options={locations}
                      autoHighlight
                      getOptionLabel={(option) => option?.name || ""}
                      isOptionEqualToValue={(option, value) =>
                        option.id === value.id
                      }
                      value={
                        locations.find((l) => l.id === selectedLocation) || null
                      }
                      onChange={(_e, newValue) => {
                        setSelectedLocation(newValue ? newValue.id : "");
                        // Clear a previously picked person when the location changes.
                        setSelectedPerson(null);
                        setSearchValue("");
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Select Location"
                          placeholder="Search your location..."
                        />
                      )}
                    />

                    <PersonSearchField
                      label="Search Your Name"
                      placeholder="Type your name..."
                      searchValue={searchValue}
                      onSearchValueChange={(value) => {
                        setSearchValue(value);
                        if (!value) setSelectedPerson(null);
                      }}
                      onPersonSelect={(person) => {
                        setSelectedPerson(person);
                        setSearchValue(person.name);
                      }}
                      selectedPerson={selectedPerson}
                      locationId={selectedLocation}
                      disabled={!selectedLocation}
                    />

                    {selectedPerson && (
                      <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
                        Selected: <strong>{selectedPerson.name}</strong>
                        {selectedPerson.locationName &&
                          ` from ${selectedPerson.locationName}`}
                      </Alert>
                    )}

                    {error && (
                      <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
                        {error}
                      </Alert>
                    )}

                    {success && (
                      <Alert severity="success" sx={{ mt: 2, mb: 2 }}>
                        {success}
                      </Alert>
                    )}

                    <Box
                      sx={{
                        display: "flex",
                        gap: 2,
                        mt: 3,
                        justifyContent: "flex-end",
                      }}
                    >
                      <Button
                        onClick={() => setIsLinking(false)}
                        disabled={linking}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="contained"
                        onClick={() => setLinkConfirmOpen(true)}
                        disabled={!selectedPerson || linking}
                        startIcon={<LinkIcon />}
                      >
                        Send Link Request
                      </Button>
                    </Box>
                  </Box>
                )}
              </Box>
            )}
          </Paper>
        </Grid>
        )}

        {/* Business & Professional Details Section — hidden for guests when the
            person has neither a business nor a profession to reveal. */}
        {effectivePersonId &&
          (currentUser || businesses.length > 0 || professions.length > 0) && (
          <Grid size={{ xs: 12 }}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Professional & Business Details
              </Typography>
              <Divider sx={{ mb: 3 }} />

              {!currentUser ? (
                <Box sx={{ textAlign: "center", py: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Log in to see this person's businesses and professions.
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() =>
                      openLoginModal(() => {
                        if (effectivePersonId) {
                          void refreshProfessions(effectivePersonId);
                          void refreshBusinesses(effectivePersonId);
                        }
                      })
                    }
                  >
                    Log in
                  </Button>
                </Box>
              ) : (
              <Grid container spacing={4}>
                {/* Professions Column */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 2,
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <WorkIcon color="action" />
                      <Typography variant="subtitle1" fontWeight="bold">
                        Professions
                      </Typography>
                    </Box>
                    {canManagePerson && (
                      <IconButton
                        size="small"
                        onClick={() => setOpenProfessionDialog(true)}
                        color="primary"
                      >
                        <AddIcon />
                      </IconButton>
                    )}
                  </Box>

                  {professions.length === 0 ? (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontStyle: "italic" }}
                    >
                      No professions added yet.
                    </Typography>
                  ) : (
                    <Stack spacing={1}>
                      {professions.map((prof: any) => (
                        <Paper
                          key={prof.id}
                          variant="outlined"
                          sx={{ p: 1.5, borderRadius: 2 }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                              gap: 1,
                            }}
                          >
                            <Box>
                              <Typography variant="subtitle2" fontWeight={700}>
                                {prof.name}
                              </Typography>
                              {prof.category && (
                                <Typography variant="body2" color="text.secondary">
                                  {prof.category}
                                </Typography>
                              )}
                              {prof.description && (
                                <Typography variant="body2" sx={{ mt: 0.5 }}>
                                  {prof.description}
                                </Typography>
                              )}
                            </Box>
                            {canManagePerson && (
                              <IconButton
                                size="small"
                                onClick={() => handleRemoveProfession(prof.id)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            )}
                          </Box>
                        </Paper>
                      ))}
                    </Stack>
                  )}
                </Grid>

                {/* Businesses Column */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 2,
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <BusinessIcon color="action" />
                      <Typography variant="subtitle1" fontWeight="bold">
                        Businesses
                      </Typography>
                    </Box>
                    {canManagePerson && (
                      <IconButton
                        size="small"
                        onClick={() => handleOpenBusinessDialog()}
                        color="primary"
                      >
                        <AddIcon />
                      </IconButton>
                    )}
                  </Box>

                  {businesses.length === 0 ? (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontStyle: "italic" }}
                    >
                      No businesses added yet.
                    </Typography>
                  ) : (
                    <Stack spacing={1.5}>
                      {businesses.map((biz: any) => (
                        <Card key={biz.id} variant="outlined" sx={{ borderRadius: 2 }}>
                          <CardContent sx={{ pb: "16px !important" }}>
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                                gap: 1,
                                mb: 1,
                              }}
                            >
                              <Typography variant="subtitle1" fontWeight={800}>
                                {biz.name}
                              </Typography>
                              {canManagePerson && (
                                <Stack direction="row" spacing={0.5}>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleOpenBusinessDialog(biz)}
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => handleDeleteBusiness(biz)}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Stack>
                              )}
                            </Box>

                            {formatBusinessCategory(biz.category) && (
                              <Chip
                                size="small"
                                icon={<CategoryOutlinedIcon />}
                                label={formatBusinessCategory(biz.category) || ""}
                                sx={{ mb: 1 }}
                              />
                            )}

                            <Stack spacing={1}>
                              <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                                <NotesOutlinedIcon
                                  fontSize="small"
                                  color="action"
                                  sx={{ mt: 0.25 }}
                                />
                                <Typography variant="body2" color="text.secondary">
                                  {biz.description || "No description provided."}
                                </Typography>
                              </Box>
                              {biz.contact && (
                                <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                                  <PhoneIcon fontSize="small" color="action" />
                                  <Typography
                                    variant="body2"
                                    component="a"
                                    href={`tel:${biz.contact}`}
                                    sx={{ color: "primary.main", textDecoration: "none" }}
                                  >
                                    {biz.contact}
                                  </Typography>
                                </Box>
                              )}
                              {linkedPersonDetails?.name && (
                                <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                                  <PersonOutlineOutlinedIcon
                                    fontSize="small"
                                    color="action"
                                  />
                                  <Typography variant="body2">
                                    Owner: {linkedPersonDetails.name}
                                  </Typography>
                                </Box>
                              )}
                            </Stack>
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                  )}
                </Grid>
              </Grid>
              )}
            </Paper>
          </Grid>
        )}

        {/* Wall — event-specific wishes for this person. */}
        {effectivePersonId && (
          <Grid size={{ xs: 12 }}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Wall
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {`${WISH_EVENT_LABELS[wishEventType]} wishes for ${
                  linkedPersonDetails?.name || "this person"
                } · ${wishEventYear}`}
              </Typography>

              <Tabs
                value={wishEventType}
                onChange={(_e, value) =>
                  handleSelectWishThread(value as WishEventType)
                }
                variant="scrollable"
                scrollButtons="auto"
                sx={{ mt: 1, mb: 2 }}
              >
                {effectiveEventTypes.map((type) => (
                  <Tab
                    key={type}
                    value={type}
                    label={WISH_EVENT_LABELS[type]}
                  />
                ))}
              </Tabs>

              <Divider sx={{ mb: 2 }} />

              {wishError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {wishError}
                </Alert>
              )}

              {/* Composer / guest gate */}
              {currentUser ? (
                <Box sx={{ mb: 3 }}>
                  <TextField
                    fullWidth
                    multiline
                    minRows={2}
                    label="Write a wish"
                    placeholder={`Share a ${WISH_EVENT_LABELS[
                      wishEventType
                    ].toLowerCase()} wish...`}
                    value={wishMessage}
                    onChange={(e) => setWishMessage(e.target.value)}
                    disabled={postingWish}
                  />
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "flex-end",
                      mt: 1,
                    }}
                  >
                    <Button
                      variant="contained"
                      onClick={handlePostWish}
                      disabled={!wishMessage.trim() || postingWish}
                      startIcon={
                        postingWish ? (
                          <CircularProgress size={16} />
                        ) : undefined
                      }
                    >
                      {postingWish ? "Posting..." : "Post wish"}
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Box sx={{ textAlign: "center", py: 2, mb: 1 }}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 1 }}
                  >
                    Log in to post a wish.
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => openLoginModal(() => void loadWishes())}
                  >
                    Log in to post a wish
                  </Button>
                </Box>
              )}

              {/* Wishes list (newest-first from the API) */}
              {wishesLoading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : wishes.length === 0 ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontStyle: "italic", py: 1 }}
                >
                  No wishes yet — be the first to wish!
                </Typography>
              ) : (
                <Stack spacing={1.5}>
                  {wishes.map((wish) => {
                    const canDelete =
                      isSuperadmin ||
                      (Boolean(wish.authorUserId) &&
                        wish.authorUserId === userProfile?.id);
                    return (
                      <Paper
                        key={wish.id}
                        variant="outlined"
                        sx={{ p: 1.5, borderRadius: 2 }}
                      >
                        <Stack
                          direction="row"
                          spacing={1.5}
                          alignItems="flex-start"
                        >
                          <Avatar
                            sx={{
                              width: 36,
                              height: 36,
                              bgcolor: "primary.main",
                              fontSize: 16,
                            }}
                          >
                            {(wish.authorName || "Someone")
                              .charAt(0)
                              .toUpperCase()}
                          </Avatar>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              <Typography
                                variant="subtitle2"
                                fontWeight={700}
                              >
                                {wish.authorName || "Someone"}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {formatWishTime(wish.createdAt)}
                              </Typography>
                            </Box>
                            <Typography
                              variant="body2"
                              sx={{ mt: 0.5, whiteSpace: "pre-wrap" }}
                            >
                              {wish.message}
                            </Typography>
                          </Box>
                          {canDelete && (
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteWish(wish.id)}
                              aria-label="Delete wish"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          )}
                        </Stack>
                      </Paper>
                    );
                  })}
                </Stack>
              )}
            </Paper>
          </Grid>
        )}

        {false && userProfile?.role === "admin" && (
          <Grid size={{ xs: 12 }}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Location Assignment Requests
              </Typography>
              <Divider sx={{ mb: 2 }} />

              {hasAssignedLocation ? (
                <Box sx={{ mb: 3 }}>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Your location assignment is already approved.
                  </Alert>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>
                    Assigned Location
                  </Typography>
                  <Box
                    sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1 }}
                  >
                    {(userProfile?.locations || []).map((vId) => {
                      const vName =
                        locations.find((v) => v.id === vId)?.name || vId;
                      return (
                        <Chip
                          key={vId}
                          label={vName}
                          color="success"
                          size="small"
                        />
                      );
                    })}
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    To change location assignment, contact superadmin at{" "}
                    <Link href="mailto:support@kinvia.in" underline="hover">
                      support@kinvia.in
                    </Link>
                    .
                  </Typography>
                </Box>
              ) : (
                <Stack spacing={2} sx={{ mb: 3 }}>
                  <FormControl fullWidth>
                    <InputLabel id="request-location-label">
                      Select Location
                    </InputLabel>
                    <Select
                      labelId="request-location-label"
                      value={requestLocationId}
                      label="Select Location"
                      onChange={(e) => setRequestLocationId(e.target.value)}
                    >
                      {locations.map((location) => (
                        <MenuItem key={location.id} value={location.id}>
                          {location.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField
                    label="Request Note (Optional)"
                    multiline
                    rows={2}
                    value={requestMessage}
                    onChange={(e) => setRequestMessage(e.target.value)}
                  />
                  <Box>
                    <Button
                      variant="contained"
                      disabled={!requestLocationId || requestSubmitting}
                      onClick={handleSubmitLocationRequest}
                    >
                      {requestSubmitting ? "Submitting..." : "Raise Request"}
                    </Button>
                  </Box>
                </Stack>
              )}

              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                My Requests
              </Typography>
              {myLocationRequests.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No requests submitted yet.
                </Typography>
              ) : (
                <List dense>
                  {myLocationRequests.map((req) => (
                    <ListItem
                      key={req.id}
                      sx={{ border: "1px solid #eee", borderRadius: 1, mb: 1 }}
                    >
                      <ListItemText
                        primary={req.locationName || req.locationId}
                        secondary={req.requestMessage || "No note"}
                      />
                      <Chip
                        size="small"
                        label={req.status}
                        color={
                          req.status === "approved"
                            ? "success"
                            : req.status === "rejected"
                              ? "error"
                              : "warning"
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>
          </Grid>
        )}
      </Grid>
      )}

      {/* Dialogs */}
      <Dialog
        open={openProfessionDialog}
        onClose={() => setOpenProfessionDialog(false)}
      >
        <DialogTitle>Add Profession</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, minWidth: 300 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="prof-select-label">Select Profession</InputLabel>
              <Select
                labelId="prof-select-label"
                value={selectedProfessionId}
                label="Select Profession"
                onChange={(e) => setSelectedProfessionId(e.target.value)}
              >
                <MenuItem value="">
                  <em>None (Create New)</em>
                </MenuItem>
                {allProfessions.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {!selectedProfessionId && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <TextField
                  fullWidth
                  label="New Profession Name"
                  value={newProfessionName}
                  onChange={(e) => setNewProfessionName(e.target.value)}
                  helperText="Enter a new profession name if not in list"
                />
                <TextField
                  fullWidth
                  label="Contact Number"
                  value={newProfessionContact}
                  onChange={(e) => setNewProfessionContact(e.target.value)}
                  placeholder="Enter phone number (optional)"
                />
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenProfessionDialog(false)}>Cancel</Button>
          <Button
            onClick={handleAddProfession}
            variant="contained"
            disabled={!selectedProfessionId && !newProfessionName}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>

      <BusinessFormDialog
        open={openBusinessDialog}
        onClose={handleCloseBusinessDialog}
        business={editingBusiness}
        personId={effectivePersonId}
        defaultContact={phoneFromCustomFields(personCustomFields)}
        onSaved={() => {
          setSuccess(
            editingBusiness ? "Business updated successfully." : "Business added successfully.",
          );
          if (effectivePersonId) {
            void refreshBusinesses(effectivePersonId);
          }
        }}
      />

      <Dialog
        open={Boolean(businessToDelete)}
        onClose={() => {
          if (!deletingBusiness) setBusinessToDelete(null);
        }}
      >
        <DialogTitle>Delete business</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete
            {businessToDelete?.name ? ` "${businessToDelete.name}"` : " this business"}? This
            action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setBusinessToDelete(null)}
            disabled={deletingBusiness}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDeleteBusiness}
            color="error"
            variant="contained"
            disabled={deletingBusiness}
          >
            {deletingBusiness ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openEditProfileDialog}
        onClose={() => setOpenEditProfileDialog(false)}
        fullScreen={isMobile}
      >
        <DialogTitle>Edit Profile</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              pt: 1,
              minWidth: 300,
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "center" }}>
              {userProfile?.peopleId ? (
                <Suspense fallback={<Box sx={{ height: 112 }} />}>
                  <ImageCropper
                    currentPhoto={
                      profilePhotoUrl || linkedPersonDetails?.photoUrl || undefined
                    }
                    previewVariant="rounded"
                    onCropped={handleProfilePhotoUpload}
                    onRemove={handleProfilePhotoRemove}
                    uploading={profilePhotoUploading}
                    previewSize={112}
                  />
                </Suspense>
              ) : (
                <Alert severity="info">
                  Link your account to a family tree profile before adding a
                  profile image.
                </Alert>
              )}
            </Box>
            <TextField
              fullWidth
              label="Display Name"
              value={editProfileData.name}
              onChange={(e) =>
                setEditProfileData({ ...editProfileData, name: e.target.value })
              }
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={editProfileData.email}
              onChange={(e) =>
                setEditProfileData({
                  ...editProfileData,
                  email: e.target.value,
                })
              }
            />
            <TextField
              fullWidth
              label="Mobile Number"
              value={editProfileData.phone}
              disabled
              helperText="Mobile number is verified and cannot be edited here."
            />
            {canManagePerson ? (
              <>
                <Suspense fallback={<TextField fullWidth label="Date of Birth" />}>
                  <DatePicker
                    label="Date of Birth"
                    value={editProfileData.dob ? dayjs(editProfileData.dob) : null}
                    onChange={(value) =>
                      setEditProfileData({
                        ...editProfileData,
                        dob: value && value.isValid() ? value.format("YYYY-MM-DD") : "",
                      })
                    }
                    format="DD/MM/YYYY"
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Suspense>
                <FormControl fullWidth>
                  <InputLabel id="profile-gender-label">Gender</InputLabel>
                  <Select
                    labelId="profile-gender-label"
                    label="Gender"
                    value={editProfileData.gender}
                    onChange={(e) =>
                      setEditProfileData({
                        ...editProfileData,
                        gender: e.target.value,
                      })
                    }
                  >
                    <MenuItem value="male">Male</MenuItem>
                    <MenuItem value="female">Female</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </Select>
                </FormControl>
              </>
            ) : null}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOpenEditProfileDialog(false)}
            disabled={savingProfile}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdateProfile}
            variant="contained"
            disabled={savingProfile}
            startIcon={savingProfile ? <CircularProgress size={16} /> : undefined}
          >
            {savingProfile ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm before sending a self-link request */}
      <Dialog
        open={linkConfirmOpen}
        onClose={() => !linking && setLinkConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Confirm your profile</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Please confirm this is you. A link request will be sent to the tree
            owner for approval.
          </Typography>

          {selectedPerson && (
            <Stack direction="row" spacing={2} alignItems="flex-start">
              <Avatar
                src={selectedPerson.photoUrl || undefined}
                sx={{ width: 56, height: 56, bgcolor: "primary.main" }}
              >
                {(selectedPerson.name || "?").charAt(0).toUpperCase()}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {selectedPerson.name}
                </Typography>

                <Stack
                  direction="row"
                  spacing={1}
                  flexWrap="wrap"
                  useFlexGap
                  sx={{ mt: 1 }}
                >
                  {selectedPerson.locationName && (
                    <Chip size="small" label={selectedPerson.locationName} />
                  )}
                  {selectedPerson.casteName && (
                    <Chip
                      size="small"
                      label={`Caste: ${selectedPerson.casteName}`}
                    />
                  )}
                  {(selectedPerson.subCasteName || selectedPerson.gotra) && (
                    <Chip
                      size="small"
                      label={`Sub-caste: ${selectedPerson.subCasteName || selectedPerson.gotra}`}
                    />
                  )}
                </Stack>

                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 1.5, display: "block" }}
                >
                  <strong>Lineage:</strong>{" "}
                  {Array.isArray(selectedPerson.hierarchy) &&
                  selectedPerson.hierarchy.length > 0
                    ? selectedPerson.hierarchy
                        .slice(-5)
                        .map((a: any) => a?.name)
                        .filter(Boolean)
                        .join(" → ")
                    : "No ancestry data"}
                </Typography>
              </Box>
            </Stack>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setLinkConfirmOpen(false)}
            disabled={linking}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleLink}
            disabled={!selectedPerson || linking}
            startIcon={
              linking ? <CircularProgress size={16} /> : <LinkIcon />
            }
          >
            {linking ? "Sending..." : "Confirm & Send Request"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};
