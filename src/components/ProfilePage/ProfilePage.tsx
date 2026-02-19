import React, { useState, useEffect } from "react";
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
} from "@mui/material";
import { useAuth } from "../hooks/useAuth";
import { useVillage } from "../hooks/useVillage";
import { PersonSearchField } from "../BusinessPage/PersonSearchField";
import LinkIcon from "@mui/icons-material/Link";
import PersonIcon from "@mui/icons-material/Person";
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import BusinessIcon from "@mui/icons-material/Business";
import WorkIcon from "@mui/icons-material/Work";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import { SupabaseService } from "../../services/supabaseService";

export const ProfilePage: React.FC = () => {
  const { userProfile, linkUserToNode, currentUser, updateUserProfile } =
    useAuth();
  const { villages, selectedVillage, setSelectedVillage } = useVillage();
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
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Dialog State
  const [openProfessionDialog, setOpenProfessionDialog] = useState(false);
  const [openBusinessDialog, setOpenBusinessDialog] = useState(false);
  const [openEditProfileDialog, setOpenEditProfileDialog] = useState(false);

  // Form State
  const [selectedProfessionId, setSelectedProfessionId] = useState<string>("");
  const [newProfessionName, setNewProfessionName] = useState("");
  const [editProfileData, setEditProfileData] = useState({
    name: "",
    phone: "",
  });
  const [newBusinessData, setNewBusinessData] = useState({
    name: "",
    category: "",
    description: "",
  });
  const [linkedPersonDetails, setLinkedPersonDetails] = useState<any | null>(
    null,
  );

  useEffect(() => {
    if (userProfile) {
      setEditProfileData({
        name: userProfile.displayName || userProfile.name || "",
        phone: userProfile.phone || "",
      });
    }
  }, [userProfile]);

  useEffect(() => {
    const fetchDetails = async () => {
      if (userProfile?.peopleId) {
        setLoadingDetails(true);
        try {
          const person = await SupabaseService.getPersonById(
            userProfile.peopleId,
          );
          let treeDetails = null;
          if (person && (person as any).tree_id) {
            treeDetails = await SupabaseService.getTreeWithDetails(
              (person as any).tree_id,
            );
          }
          setLinkedPersonDetails({ ...person, tree: treeDetails });

          const [profs, biz, allProfs] = await Promise.all([
            SupabaseService.getProfessionsByPerson(userProfile.peopleId),
            SupabaseService.getBusinessesByPerson(userProfile.peopleId),
            SupabaseService.getAllProfessions(),
          ]);
          setProfessions(profs || []);
          setBusinesses(biz || []);
          setAllProfessions(allProfs || []);
        } catch (err) {
          console.error("Error fetching details:", err);
        } finally {
          setLoadingDetails(false);
        }
      }
    };
    fetchDetails();
  }, [userProfile?.peopleId]);

  const handleUpdateProfile = async () => {
    try {
      if (updateUserProfile) {
        await updateUserProfile(editProfileData.name, editProfileData.phone);
        setOpenEditProfileDialog(false);
      }
    } catch (err) {
      console.error("Error updating profile:", err);
    }
  };

  const handleAddProfession = async () => {
    if (!userProfile?.peopleId) return;

    try {
      let profId = selectedProfessionId;

      // If "Other" or new profession is entered (simplified logic: if ID is empty but name is provided, create new)
      if (!profId && newProfessionName) {
        const newProf = await SupabaseService.createProfession({
          name: newProfessionName,
          category: "Other",
        });
        profId = newProf.id;
        // Refresh all professions
        const updatedAll = await SupabaseService.getAllProfessions();
        setAllProfessions(updatedAll);
      }

      if (profId) {
        await SupabaseService.addProfessionToPerson(
          userProfile.peopleId,
          profId,
        );
        // Refresh user professions
        const updatedProfs = await SupabaseService.getProfessionsByPerson(
          userProfile.peopleId,
        );
        setProfessions(updatedProfs);
        setOpenProfessionDialog(false);
        setSelectedProfessionId("");
        setNewProfessionName("");
      }
    } catch (err) {
      console.error("Error adding profession:", err);
      // specific error handling if needed
    }
  };

  const handleAddBusiness = async () => {
    if (!userProfile?.peopleId) return;

    try {
      await SupabaseService.createBusiness({
        ...newBusinessData,
        people_id: userProfile.peopleId,
      });

      // Refresh businesses
      const updatedBiz = await SupabaseService.getBusinessesByPerson(
        userProfile.peopleId,
      );
      setBusinesses(updatedBiz);
      setOpenBusinessDialog(false);
      setNewBusinessData({ name: "", category: "", description: "" });
    } catch (err) {
      console.error("Error adding business:", err);
    }
  };

  const handleDeleteBusiness = async (id: string) => {
    try {
      // Assuming we implement delete or soft delete. For now, let's just log or skip if not implemented.
      // Wait, updateBusiness exists, maybe generic delete?
      // Since there isn't a deleteBusiness method exposed in grep, maybe just update is_deleted = true
      await SupabaseService.updateBusiness(id, { is_deleted: true });
      const updatedBiz = await SupabaseService.getBusinessesByPerson(
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
      await SupabaseService.removeProfessionFromPerson(
        userProfile.peopleId,
        profId,
      );
      const updatedProfs = await SupabaseService.getProfessionsByPerson(
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
              <Typography variant="body2">{currentUser.email}</Typography>
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
                      <strong>Name:</strong> {linkedPersonDetails.name}
                    </Typography>
                    {linkedPersonDetails.tree && (
                      <>
                        <Typography variant="body1">
                          <strong>Caste:</strong>{" "}
                          {linkedPersonDetails.tree.caste || "N/A"}
                        </Typography>
                        <Typography variant="body1">
                          <strong>Sub-Caste:</strong>{" "}
                          {linkedPersonDetails.tree.sub_caste || "N/A"}
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
                  To change this link, please contact a super admin.
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
              <TextField
                fullWidth
                label="New Profession Name"
                value={newProfessionName}
                onChange={(e) => setNewProfessionName(e.target.value)}
                helperText="Enter a new profession name if not in list"
              />
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
              label="Phone Number"
              value={editProfileData.phone}
              onChange={(e) =>
                setEditProfileData({
                  ...editProfileData,
                  phone: e.target.value,
                })
              }
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditProfileDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (updateUserProfile) {
                updateUserProfile(
                  editProfileData.name,
                  editProfileData.phone,
                ).then(() => {
                  setOpenEditProfileDialog(false);
                });
              }
            }}
            variant="contained"
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};
