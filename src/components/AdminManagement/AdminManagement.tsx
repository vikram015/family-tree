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
} from "@mui/material";
import { Edit, Delete } from "@mui/icons-material";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import { AppUser, UserRole } from "../model/User";
import { useAuth } from "../context/AuthContext";

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

  useEffect(() => {
    if (!isSuperAdmin()) {
      setError("Access denied. Only superadmin can access this page.");
      setLoading(false);
      return;
    }
    loadData();
  }, [isSuperAdmin]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load users
      const usersSnapshot = await getDocs(collection(db, "users"));
      const usersData = usersSnapshot.docs.map(
        (doc) =>
          ({
            ...doc.data(),
            uid: doc.id,
          } as AppUser)
      );
      setUsers(usersData);

      // Load villages (tree IDs)
      const treesSnapshot = await getDocs(collection(db, "tree"));
      const villageIds = treesSnapshot.docs.map((doc) => doc.id);
      setVillages(villageIds);

      setLoading(false);
    } catch (err) {
      console.error("Error loading data:", err);
      setError("Failed to load data");
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
      const userRef = doc(db, "users", editUser.uid);
      await updateDoc(userRef, {
        role: selectedRole,
        villages: selectedRole === "superadmin" ? [] : selectedVillages,
        updatedAt: new Date().toISOString(),
        updatedBy: userProfile?.uid,
      });

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
      await deleteDoc(doc(db, "users", userId));
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
        : [...prev, villageId]
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
      <Box
        sx={{
          mb: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h4" component="h1">
          User Management
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
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
              <TableRow key={user.uid}>
                <TableCell>{user.phoneNumber}</TableCell>
                <TableCell>{user.displayName || "-"}</TableCell>
                <TableCell>
                  <Chip
                    label={user.role === "superadmin" ? "Super Admin" : "Admin"}
                    color={user.role === "superadmin" ? "error" : "primary"}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {user.role === "superadmin" ? (
                    <Chip label="All Villages" size="small" />
                  ) : user.villages && user.villages.length > 0 ? (
                    <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
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
                <TableCell>
                  {new Date(user.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Tooltip title="Edit">
                    <IconButton
                      size="small"
                      onClick={() => handleEditClick(user)}
                      disabled={user.uid === userProfile?.uid}
                    >
                      <Edit />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteUser(user.uid)}
                      disabled={user.uid === userProfile?.uid}
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
              Phone: {editUser?.phoneNumber}
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
