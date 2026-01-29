import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  TextField,
} from "@mui/material";
import { Edit, Delete, Add } from "@mui/icons-material";
import { supabase } from "../../supabase";
import { SupabaseService } from "../../services/supabaseService";
import { AppUser, UserRole } from "../model/User";
import { useAuth } from "../context/AuthContext";
import { formatDate } from "../../utils/dateFormatter";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export const AdminManagement: React.FC = () => {
  const { isSuperAdmin, userProfile } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [villages, setVillages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState<AppUser | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>("admin");
  const [selectedVillages, setSelectedVillages] = useState<string[]>([]);
  const [error, setError] = useState<string>("");
  const [tabValue, setTabValue] = useState(0);

  // State management for hierarchy data
  const [states, setStates] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [villagesList, setVillagesList] = useState<any[]>([]);
  const [castes, setCastes] = useState<any[]>([]);
  const [subCastes, setSubCastes] = useState<any[]>([]);

  // Add dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addType, setAddType] = useState<
    "state" | "district" | "village" | "caste" | "subcaste"
  >("state");
  const [newName, setNewName] = useState("");
  const [selectedParentId, setSelectedParentId] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Debug effect to log when states changes
  useEffect(() => {
    console.log("States state updated:", states, "length:", states?.length);
  }, [states]);

  useEffect(() => {
    const checkAccessAndLoad = async () => {
      if (!isSuperAdmin()) {
        setError("Access denied. Only superadmin can access this page.");
        setLoading(false);
        return;
      }
      await loadData();
    };
    checkAccessAndLoad();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load users from Supabase
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("*");

      if (usersError) {
        throw usersError;
      }

      setUsers(
        (usersData || []).map((user) => ({
          ...user,
          id: user.id,
        })) as AppUser[],
      );

      // Load trees from Supabase
      const trees = await SupabaseService.getTrees();
      const treeIds = trees.map((tree) => tree.id);
      setVillages(treeIds);

      // Load hierarchy data
      await loadHierarchyData();

      setLoading(false);
    } catch (err) {
      console.error("Error loading data:", err);
      setError("Failed to load data");
      setLoading(false);
    }
  };

  const loadHierarchyData = async () => {
    try {
      console.log("Loading hierarchy data...");
      console.log("SupabaseService methods:", {
        hasGetStates: typeof SupabaseService.getStates,
        hasGetDistricts: typeof SupabaseService.getDistricts,
        hasGetVillages: typeof SupabaseService.getVillages,
        hasGetCastes: typeof SupabaseService.getCastes,
        hasGetSubCastes: typeof SupabaseService.getSubCastes,
      });

      const statesData = await SupabaseService.getStates();
      console.log("States fetched:", statesData);

      const districtsData = await SupabaseService.getDistricts();
      console.log("Districts fetched:", districtsData);

      const villagesData = await SupabaseService.getVillages();
      console.log("Villages fetched:", villagesData);

      const castesData = await SupabaseService.getCastes();
      console.log("Castes fetched:", castesData);

      const subCastesData = await SupabaseService.getSubCastes();
      console.log("SubCastes fetched:", subCastesData);

      console.log("All data fetched, now setting state...");

      setStates(statesData || []);
      setDistricts(districtsData || []);
      setVillagesList(villagesData || []);
      setCastes(castesData || []);
      setSubCastes(subCastesData || []);

      console.log("State setters called");
    } catch (err) {
      console.error("Error loading hierarchy data:", err);
    }
  };

  const handleAddClick = (
    type: "state" | "district" | "village" | "caste" | "subcaste",
  ) => {
    setAddType(type);
    setNewName("");
    setSelectedParentId("");
    setAddDialogOpen(true);
  };

  const handleAddConfirm = async () => {
    if (!newName.trim()) {
      setError("Name cannot be empty");
      return;
    }

    try {
      setLoading(true);

      if (addType === "state") {
        await SupabaseService.createState?.({ name: newName });
      } else if (addType === "district") {
        if (!selectedParentId) {
          setError("Please select a state");
          setLoading(false);
          return;
        }
        await SupabaseService.createDistrict?.({
          name: newName,
          state_id: selectedParentId,
        });
      } else if (addType === "village") {
        if (!selectedParentId) {
          setError("Please select a district");
          setLoading(false);
          return;
        }
        await SupabaseService.createVillage?.({
          name: newName,
          district_id: selectedParentId,
        });
      } else if (addType === "caste") {
        await SupabaseService.createCaste?.({ name: newName });
      } else if (addType === "subcaste") {
        if (!selectedParentId) {
          setError("Please select a caste");
          setLoading(false);
          return;
        }
        await SupabaseService.createSubCaste?.({
          name: newName,
          caste_id: selectedParentId,
        });
      }

      setSuccessMessage(`${addType} created successfully!`);
      setAddDialogOpen(false);
      await loadHierarchyData();
      setLoading(false);

      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("Error creating item:", err);
      setError("Failed to create item");
      setLoading(false);
    }
  };

  const handleEditClick = (user: AppUser) => {
    setEditUser(user);
    setSelectedRole(user.role);
    setSelectedVillages(user.villages || []);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;

    try {
      // Update user in Supabase
      const { error } = await supabase
        .from("users")
        .update({
          role: selectedRole,
          villages: selectedRole === "superadmin" ? [] : selectedVillages,
          updatedAt: new Date().toISOString(),
          updatedBy: userProfile?.id,
        })
        .eq("id", editUser.id);

      if (error) {
        throw error;
      }

      await loadData();
      setEditDialogOpen(false);
      setEditUser(null);
    } catch (err) {
      console.error("Error updating user:", err);
      alert("Failed to update user");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Are you sure you want to delete this user?")) {
      return;
    }

    try {
      // Delete user from Supabase
      const { error } = await supabase.from("users").delete().eq("id", userId);

      if (error) {
        throw error;
      }

      await loadData();
    } catch (err) {
      console.error("Error deleting user:", err);
      alert("Failed to delete user");
    }
  };

  const handleVillageToggle = (villageId: string) => {
    setSelectedVillages((prev) =>
      prev.includes(villageId)
        ? prev.filter((v) => v !== villageId)
        : [...prev, villageId],
    );
  };

  if (!isSuperAdmin()) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">
          Access denied. Only superadmin can access this page.
        </Alert>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container sx={{ mt: 4 }}>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  return (
    <Container sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" sx={{ mb: 3 }}>
        Admin Management
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}

      <Paper>
        <Tabs value={tabValue} onChange={(e, val) => setTabValue(val)}>
          <Tab
            label="Users"
            id="admin-tab-0"
            aria-controls="admin-tabpanel-0"
          />
          <Tab
            label="States"
            id="admin-tab-1"
            aria-controls="admin-tabpanel-1"
          />
          <Tab
            label="Districts"
            id="admin-tab-2"
            aria-controls="admin-tabpanel-2"
          />
          <Tab
            label="Villages"
            id="admin-tab-3"
            aria-controls="admin-tabpanel-3"
          />
          <Tab
            label="Castes"
            id="admin-tab-4"
            aria-controls="admin-tabpanel-4"
          />
          <Tab
            label="Sub-Castes"
            id="admin-tab-5"
            aria-controls="admin-tabpanel-5"
          />
        </Tabs>

        {/* Users Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6">User Management</Typography>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Phone Number</TableCell>
                  <TableCell>Display Name</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Villages</TableCell>
                  <TableCell>Created At</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.displayName || "-"}</TableCell>
                    <TableCell>
                      <Chip
                        label={
                          user.role === "superadmin" ? "Super Admin" : "Admin"
                        }
                        color={user.role === "superadmin" ? "error" : "primary"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {user.role === "superadmin" ? (
                        <Chip label="All Villages" size="small" />
                      ) : user.villages && user.villages.length > 0 ? (
                        <Box
                          sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}
                        >
                          {user.villages.map((v) => (
                            <Chip key={v} label={v} size="small" />
                          ))}
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          No villages assigned
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(user.createdAt)}</TableCell>
                    <TableCell>
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={() => handleEditClick(user)}
                          disabled={user.id === userProfile?.id}
                        >
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={user.id === userProfile?.id}
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* States Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleAddClick("state")}
            >
              Add State
            </Button>
          </Box>
          {states.length === 0 && (
            <Typography color="text.secondary">No states found</Typography>
          )}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Created At</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {states &&
                  states.map((state) => (
                    <TableRow key={state.id}>
                      <TableCell>{state.name}</TableCell>
                      <TableCell>{formatDate(state.created_at)}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Districts Tab */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleAddClick("district")}
            >
              Add District
            </Button>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>State</TableCell>
                  <TableCell>Created At</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {districts.map((district) => (
                  <TableRow key={district.id}>
                    <TableCell>{district.name}</TableCell>
                    <TableCell>
                      {states.find((s) => s.id === district.state_id)?.name ||
                        "-"}
                    </TableCell>
                    <TableCell>{formatDate(district.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Villages Tab */}
        <TabPanel value={tabValue} index={3}>
          <Box sx={{ mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleAddClick("village")}
            >
              Add Village
            </Button>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>District</TableCell>
                  <TableCell>State</TableCell>
                  <TableCell>Created At</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {villagesList.map((village) => {
                  const district = districts.find(
                    (d) => d.id === village.district_id,
                  );
                  const state = states.find((s) => s.id === district?.state_id);
                  return (
                    <TableRow key={village.id}>
                      <TableCell>{village.name}</TableCell>
                      <TableCell>{district?.name || "-"}</TableCell>
                      <TableCell>{state?.name || "-"}</TableCell>
                      <TableCell>{formatDate(village.created_at)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Castes Tab */}
        <TabPanel value={tabValue} index={4}>
          <Box sx={{ mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleAddClick("caste")}
            >
              Add Caste
            </Button>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Created At</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {castes.map((caste) => (
                  <TableRow key={caste.id}>
                    <TableCell>{caste.name}</TableCell>
                    <TableCell>{formatDate(caste.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Sub-Castes Tab */}
        <TabPanel value={tabValue} index={5}>
          <Box sx={{ mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleAddClick("subcaste")}
            >
              Add Sub-Caste
            </Button>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Caste</TableCell>
                  <TableCell>Created At</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {subCastes.map((subCaste) => (
                  <TableRow key={subCaste.id}>
                    <TableCell>{subCaste.name}</TableCell>
                    <TableCell>
                      {castes.find((c) => c.id === subCaste.caste_id)?.name ||
                        "-"}
                    </TableCell>
                    <TableCell>{formatDate(subCaste.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
      </Paper>

      {/* Add Item Dialog */}
      <Dialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Add {addType.charAt(0).toUpperCase() + addType.slice(1)}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {(addType === "district" || addType === "village") && (
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>
                  {addType === "district" ? "State" : "District"}
                </InputLabel>
                <Select
                  value={selectedParentId}
                  onChange={(e) => setSelectedParentId(e.target.value)}
                  label={addType === "district" ? "State" : "District"}
                >
                  {(addType === "district" ? states : districts).map((item) => (
                    <MenuItem key={item.id} value={item.id}>
                      {item.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {addType === "subcaste" && (
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Caste</InputLabel>
                <Select
                  value={selectedParentId}
                  onChange={(e) => setSelectedParentId(e.target.value)}
                  label="Caste"
                >
                  {castes.map((caste) => (
                    <MenuItem key={caste.id} value={caste.id}>
                      {caste.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <TextField
              autoFocus
              fullWidth
              label={`${addType.charAt(0).toUpperCase() + addType.slice(1)} Name`}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={`Enter ${addType} name`}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddConfirm} variant="contained">
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Email: {editUser?.email}
            </Typography>

            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Role</InputLabel>
              <Select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                label="Role"
              >
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="superadmin">Super Admin</MenuItem>
              </Select>
            </FormControl>

            {selectedRole === "admin" && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Assign Villages:
                </Typography>
                {villages.length === 0 ? (
                  <Typography variant="caption" color="text.secondary">
                    No villages available
                  </Typography>
                ) : (
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    {villages.map((village) => (
                      <Box
                        key={village}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          p: 1,
                          border: 1,
                          borderColor: selectedVillages.includes(village)
                            ? "primary.main"
                            : "divider",
                          borderRadius: 1,
                          cursor: "pointer",
                          bgcolor: selectedVillages.includes(village)
                            ? "action.selected"
                            : "transparent",
                        }}
                        onClick={() => handleVillageToggle(village)}
                      >
                        <Typography>{village}</Typography>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            )}

            {selectedRole === "superadmin" && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Super admins have access to all villages automatically.
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};
