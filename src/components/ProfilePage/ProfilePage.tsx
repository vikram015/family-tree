import React, { Suspense, useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Container,
  Paper,
  Button,
  Grid,
  Alert,
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
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useVillage } from "../hooks/useVillage";
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
import { ApiService } from "../../services/apiService";
import { selectCastes, selectSubCastes } from "../../store/slices/casteSlice";
import {
  fetchMyVillageAccessRequests,
  submitVillageAccessRequest,
} from "../../store/thunks/apiThunks";

const ImageCropper = React.lazy(() => import("../ImageCropper/ImageCropper"));

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { userProfile, linkUserToNode, currentUser, updateUserProfile } =
    useAuth();
  const { villages, selectedVillage, setSelectedVillage } = useVillage();
  const castes = useAppSelector(selectCastes);
  const subCastes = useAppSelector(selectSubCastes);
  const [isLinking, setIsLinking] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [selectedPerson, setSelectedPerson] = useState<any | null>(null);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // New state for Business and Profession
  const [professions, setProfessions] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [allProfessions, setAllProfessions] = useState<any[]>([]);
  // Dialog State
  const [openProfessionDialog, setOpenProfessionDialog] = useState(false);
  const [openBusinessDialog, setOpenBusinessDialog] = useState(false);
  const [openEditProfileDialog, setOpenEditProfileDialog] = useState(false);

  // Form State
  const [selectedProfessionId, setSelectedProfessionId] = useState<string>("");
  const [newProfessionName, setNewProfessionName] = useState("");
  const [newProfessionContact, setNewProfessionContact] = useState("");
  const [editProfileData, setEditProfileData] = useState({
    name: "",
    phone: "",
    email: "",
  });
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | undefined>();
  const [profilePhotoUploading, setProfilePhotoUploading] = useState(false);
  const [newBusinessData, setNewBusinessData] = useState({
    name: "",
    category: "",
    description: "",
    contact: "",
  });
  const [linkedPersonDetails, setLinkedPersonDetails] = useState<any | null>(
    null,
  );
  const [requestVillageId, setRequestVillageId] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const [myVillageRequests, setMyVillageRequests] = useState<any[]>([]);
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const hasAssignedVillage = (userProfile?.villages || []).length > 0;
  const casteMap = new Map(castes.map((c: any) => [c.id, c.name]));
  const subCasteMap = new Map(subCastes.map((s: any) => [s.id, s.name]));
  const linkedTreeCaste =
    casteMap.get(linkedPersonDetails?.tree?.caste) ||
    linkedPersonDetails?.tree?.caste;
  const linkedTreeSubCaste =
    subCasteMap.get(linkedPersonDetails?.tree?.subCaste) ||
    linkedPersonDetails?.tree?.subCaste;

  useEffect(() => {
    if (userProfile) {
      setEditProfileData({
        name: userProfile.displayName || userProfile.name || "",
        phone: userProfile.phone || "",
        email: userProfile.email || "",
      });
    }
  }, [userProfile]);

  useEffect(() => {
    const fetchDetails = async () => {
      if (userProfile?.peopleId) {
        try {
          const person = await ApiService.getPersonById(
            userProfile.peopleId,
          );
          let treeDetails = null;
          if (person && (person as any).treeId) {
            treeDetails = await ApiService.getTreeWithDetails(
              (person as any).treeId,
            );
          }
          setLinkedPersonDetails({ ...person, tree: treeDetails });
          setProfilePhotoUrl((person as any)?.photoUrl || undefined);

          const [profs, biz, allProfs] = await Promise.all([
            ApiService.getProfessionsByPerson(userProfile.peopleId),
            ApiService.getBusinessesByPerson(userProfile.peopleId),
            ApiService.getAllProfessions(),
          ]);
          setProfessions(profs || []);
          setBusinesses(biz || []);
          setAllProfessions(allProfs || []);
        } catch (err) {
          console.error("Error fetching details:", err);
        }
      }
    };
    fetchDetails();
  }, [userProfile?.peopleId]);

  const loadMyVillageRequests = useCallback(async () => {
    try {
      const userId = userProfile?.id;
      if (!userId) {
        setMyVillageRequests([]);
        return;
      }
      const data = await dispatch(
        fetchMyVillageAccessRequests(userId),
      ).unwrap();
      setMyVillageRequests(data || []);
    } catch (err) {
      console.error("Error loading village requests:", err);
      setMyVillageRequests([]);
    }
  }, [dispatch, userProfile?.id]);

  useEffect(() => {
    if (currentUser && userProfile?.role === "admin") {
      loadMyVillageRequests();
    }
  }, [currentUser, userProfile?.role, loadMyVillageRequests]);

  const handleUpdateProfile = async () => {
    try {
      if (updateUserProfile) {
        await updateUserProfile(
          editProfileData.name,
          userProfile?.phone || "",
          editProfileData.email,
        );
        setOpenEditProfileDialog(false);
      }
    } catch (err) {
      console.error("Error updating profile:", err);
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
    if (!userProfile?.peopleId) return;

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
        await ApiService.addProfessionToPerson(
          userProfile.peopleId,
          profId,
        );
        // Refresh user professions
        const updatedProfs = await ApiService.getProfessionsByPerson(
          userProfile.peopleId,
        );
        setProfessions(updatedProfs);
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

  const handleAddBusiness = async () => {
    if (!userProfile?.peopleId) return;

    try {
      await ApiService.createBusiness({
        ...newBusinessData,
        peopleId: userProfile.peopleId,
      });

      // Refresh businesses
      const updatedBiz = await ApiService.getBusinessesByPerson(
        userProfile.peopleId,
      );
      setBusinesses(updatedBiz);
      setOpenBusinessDialog(false);
      setNewBusinessData({
        name: "",
        category: "",
        description: "",
        contact: "",
      });
    } catch (err) {
      console.error("Error adding business:", err);
    }
  };

  const handleDeleteBusiness = async (id: string) => {
    try {
      await ApiService.deleteBusiness(id);
      const updatedBiz = await ApiService.getBusinessesByPerson(
        userProfile!.peopleId!,
      );
      setBusinesses(updatedBiz);
    } catch (err) {
      console.error("Error deleting business:", err);
    }
  };

  const handleRemoveProfession = async (profId: string) => {
    if (!userProfile?.peopleId) return;
    try {
      await ApiService.removeProfessionFromPerson(
        userProfile.peopleId,
        profId,
      );
      const updatedProfs = await ApiService.getProfessionsByPerson(
        userProfile.peopleId,
      );
      setProfessions(updatedProfs);
    } catch (err) {
      console.error("Error removing profession:", err);
    }
  };

  const handleLink = async () => {
    if (!selectedPerson) return;
    setLinking(true);
    setError("");
    setSuccess("");
    try {
      await linkUserToNode(selectedPerson.id, selectedPerson.treeId);
      setSuccess("Successfully linked your profile to the family tree!");
      setIsLinking(false);
      setSelectedPerson(null);
      setSearchValue("");
    } catch (e: any) {
      setError(e.message || "Failed to link. Please try again.");
    } finally {
      setLinking(false);
    }
  };

  const handleOpenLinkedProfileInTree = useCallback(() => {
    const personId = userProfile?.peopleId;
    const treeId =
      linkedPersonDetails?.treeId || linkedPersonDetails?.tree?.id || "";
    if (!personId || !treeId) return;
    const params = new URLSearchParams();
    params.set("tree", treeId);
    params.set("personId", personId);
    navigate(`/families?${params.toString()}`);
  }, [navigate, userProfile?.peopleId, linkedPersonDetails]);

  const handleSubmitVillageRequest = async () => {
    if (!requestVillageId) return;
    setRequestSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const userId = userProfile?.id;
      if (!userId) {
        throw new Error("User profile not loaded");
      }
      const data = await dispatch(
        submitVillageAccessRequest({
          userId,
          villageId: requestVillageId,
          requestMessage: requestMessage || null,
        }),
      ).unwrap();
      if (data && !data.success) throw new Error(data.error);

      setSuccess("Village access request submitted successfully.");
      setRequestVillageId("");
      setRequestMessage("");
      await loadMyVillageRequests();
    } catch (err: any) {
      setError(err.message || "Failed to submit request");
    } finally {
      setRequestSubmitting(false);
    }
  };

  if (!currentUser) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="warning">Please log in to view your profile.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 4, fontWeight: "bold" }}>
        My Profile
      </Typography>

      <Grid container spacing={3}>
        {/* User Info Card */}
        <Grid size={{ xs: 12, md: 4 }}>
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
              {userProfile?.displayName?.charAt(0) ||
                currentUser.email?.charAt(0)}
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

        {/* Tree Linking Section */}
        {false && (
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
              {userProfile?.peopleId && <VerifiedUserIcon color="success" />}
            </Box>

            <Divider sx={{ mb: 3 }} />

            {userProfile?.peopleId ? (
              <Box>
                <Alert severity="success" sx={{ mb: 3 }}>
                  Your account is successfully linked to a profile in the family
                  tree.
                </Alert>
                {linkedPersonDetails ? (
                  <Box>
                    <Typography variant="body1">
                      <strong>Name:</strong>{" "}
                      <Link
                        component="button"
                        type="button"
                        underline="hover"
                        onClick={handleOpenLinkedProfileInTree}
                      >
                        {linkedPersonDetails.name}
                      </Link>
                    </Typography>
                    {linkedPersonDetails.tree && (
                      <>
                        <Typography variant="body1">
                          <strong>Caste:</strong> {linkedTreeCaste || "N/A"}
                        </Typography>
                        <Typography variant="body1">
                          <strong>Sub-Caste:</strong>{" "}
                          {linkedTreeSubCaste || "N/A"}
                        </Typography>
                        <Typography variant="body1">
                          <strong>Village:</strong>{" "}
                          {linkedPersonDetails.tree.village?.name || "N/A"}
                        </Typography>
                      </>
                    )}
                  </Box>
                ) : (
                  <Typography variant="body1">
                    Linked Profile ID: <strong>{userProfile.peopleId}</strong>
                  </Typography>
                )}
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  To change this link, please contact superadmin at{" "}
                  <Link href="mailto:support@kinvia.in" underline="hover">
                    support@kinvia.in
                  </Link>
                  .
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
                      Linking your account allows you to manage your own profile
                      and helps admins verify your identity.
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

                    <FormControl fullWidth sx={{ mb: 3 }}>
                      <InputLabel id="village-select-label">
                        Select Village
                      </InputLabel>
                      <Select
                        labelId="village-select-label"
                        value={selectedVillage || ""}
                        label="Select Village"
                        onChange={(e) => setSelectedVillage(e.target.value)}
                      >
                        {villages.map((village) => (
                          <MenuItem key={village.id} value={village.id}>
                            {village.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

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
                      villageId={selectedVillage}
                      disabled={!selectedVillage}
                    />

                    {selectedPerson && (
                      <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
                        Selected: <strong>{selectedPerson.name}</strong>
                        {selectedPerson.villageName &&
                          ` from ${selectedPerson.villageName}`}
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
                        onClick={handleLink}
                        disabled={!selectedPerson || linking}
                        startIcon={
                          linking ? (
                            <CircularProgress size={16} />
                          ) : (
                            <LinkIcon />
                          )
                        }
                      >
                        {linking ? "Linking..." : "Confirm Link"}
                      </Button>
                    </Box>
                  </Box>
                )}
              </Box>
            )}
          </Paper>
        </Grid>
        )}

        {/* Business & Professional Details Section */}
        {userProfile?.peopleId && (
          <Grid size={{ xs: 12 }}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Professional & Business Details
              </Typography>
              <Divider sx={{ mb: 3 }} />

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
                    <IconButton
                      size="small"
                      onClick={() => setOpenProfessionDialog(true)}
                      color="primary"
                    >
                      <AddIcon />
                    </IconButton>
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
                    <List dense>
                      {professions.map((prof: any) => (
                        <ListItem
                          key={prof.id}
                          sx={{
                            border: "1px solid #eee",
                            borderRadius: 1,
                            mb: 1,
                          }}
                        >
                          <ListItemText
                            primary={prof.name}
                            secondary={prof.category}
                          />
                          <ListItemSecondaryAction>
                            <IconButton
                              edge="end"
                              size="small"
                              onClick={() => handleRemoveProfession(prof.id)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    </List>
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
                    <IconButton
                      size="small"
                      onClick={() => setOpenBusinessDialog(true)}
                      color="primary"
                    >
                      <AddIcon />
                    </IconButton>
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
                    <List dense>
                      {businesses.map((biz: any) => (
                        <ListItem
                          key={biz.id}
                          sx={{
                            border: "1px solid #eee",
                            borderRadius: 1,
                            mb: 1,
                          }}
                        >
                          <ListItemText
                            primary={biz.name}
                            secondary={
                              <React.Fragment>
                                <Typography
                                  component="span"
                                  variant="body2"
                                  color="text.primary"
                                >
                                  {biz.category}
                                </Typography>
                                {biz.description && ` — ${biz.description}`}
                                {biz.contact && ` — ${biz.contact}`}
                              </React.Fragment>
                            }
                          />
                          <ListItemSecondaryAction>
                            <IconButton
                              edge="end"
                              size="small"
                              onClick={() => handleDeleteBusiness(biz.id)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    </List>
                  )}
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        )}

        {false && userProfile?.role === "admin" && (
          <Grid size={{ xs: 12 }}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Village Assignment Requests
              </Typography>
              <Divider sx={{ mb: 2 }} />

              {hasAssignedVillage ? (
                <Box sx={{ mb: 3 }}>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Your village assignment is already approved.
                  </Alert>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>
                    Assigned Village
                  </Typography>
                  <Box
                    sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1 }}
                  >
                    {(userProfile?.villages || []).map((vId) => {
                      const vName =
                        villages.find((v) => v.id === vId)?.name || vId;
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
                    To change village assignment, contact superadmin at{" "}
                    <Link href="mailto:support@kinvia.in" underline="hover">
                      support@kinvia.in
                    </Link>
                    .
                  </Typography>
                </Box>
              ) : (
                <Stack spacing={2} sx={{ mb: 3 }}>
                  <FormControl fullWidth>
                    <InputLabel id="request-village-label">
                      Select Village
                    </InputLabel>
                    <Select
                      labelId="request-village-label"
                      value={requestVillageId}
                      label="Select Village"
                      onChange={(e) => setRequestVillageId(e.target.value)}
                    >
                      {villages.map((village) => (
                        <MenuItem key={village.id} value={village.id}>
                          {village.name}
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
                      disabled={!requestVillageId || requestSubmitting}
                      onClick={handleSubmitVillageRequest}
                    >
                      {requestSubmitting ? "Submitting..." : "Raise Request"}
                    </Button>
                  </Box>
                </Stack>
              )}

              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                My Requests
              </Typography>
              {myVillageRequests.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No requests submitted yet.
                </Typography>
              ) : (
                <List dense>
                  {myVillageRequests.map((req) => (
                    <ListItem
                      key={req.id}
                      sx={{ border: "1px solid #eee", borderRadius: 1, mb: 1 }}
                    >
                      <ListItemText
                        primary={req.villageName || req.villageId}
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

      <Dialog
        open={openBusinessDialog}
        onClose={() => setOpenBusinessDialog(false)}
      >
        <DialogTitle>Add Business</DialogTitle>
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
            <TextField
              fullWidth
              label="Business Name"
              value={newBusinessData.name}
              onChange={(e) =>
                setNewBusinessData({ ...newBusinessData, name: e.target.value })
              }
            />
            <TextField
              fullWidth
              label="Category"
              value={newBusinessData.category}
              onChange={(e) =>
                setNewBusinessData({
                  ...newBusinessData,
                  category: e.target.value,
                })
              }
            />
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={newBusinessData.description}
              onChange={(e) =>
                setNewBusinessData({
                  ...newBusinessData,
                  description: e.target.value,
                })
              }
            />
            <TextField
              fullWidth
              label="Contact Number"
              value={newBusinessData.contact}
              onChange={(e) =>
                setNewBusinessData({
                  ...newBusinessData,
                  contact: e.target.value,
                })
              }
              placeholder="Enter phone number (optional)"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenBusinessDialog(false)}>Cancel</Button>
          <Button
            onClick={handleAddBusiness}
            variant="contained"
            disabled={!newBusinessData.name}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openEditProfileDialog}
        onClose={() => setOpenEditProfileDialog(false)}
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
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Profile Image
              </Typography>
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
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditProfileDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleUpdateProfile}
            variant="contained"
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};
