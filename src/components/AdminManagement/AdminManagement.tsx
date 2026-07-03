import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableSortLabel,
  InputAdornment,
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
import {
  Edit,
  Delete,
  Add,
  CheckCircle,
  LocationOn,
  Close,
  Search,
  Block,
  LockOpen,
} from "@mui/icons-material";
import { ApiService } from "../../services/apiService";
import { AppUser, UserRole } from "../model/User";
import { useAuth } from "../hooks/useAuth";
import { formatDate, formatDateTime } from "../../utils/dateFormatter";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  blockAdminUser,
  deleteAdminUser,
  fetchAdminUsers,
  fetchPendingVillageAccessRequests,
  reviewVillageAccessRequest,
  unblockAdminUser,
  updateAdminUser,
  verifyAdminUser,
} from "../../store/thunks/apiThunks";
import {
  fetchStates,
  fetchAllDistricts,
  selectStates,
  selectDistricts,
} from "../../store/slices/locationSlice";
import {
  fetchCastes,
  fetchAllSubCastes,
  selectCastes,
  selectSubCastes,
} from "../../store/slices/casteSlice";
import { fetchVillages, selectVillages } from "../../store/slices/villageSlice";
import { useLocation, useNavigate } from "react-router-dom";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TAB_KEYS = [
  "users",
  "village-requests",
  "states",
  "districts",
  "villages",
  "castes",
  "sub-castes",
] as const;

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
  const dispatch = useAppDispatch();
  const {
    isSuperAdmin,
    isAdmin,
    userProfile,
    loading: authLoading,
  } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const superAdmin = isSuperAdmin();

  // Redux state
  const states = useAppSelector(selectStates);
  const districts = useAppSelector(selectDistricts);
  const villagesList = useAppSelector(selectVillages);
  const castes = useAppSelector(selectCastes);
  const subCastes = useAppSelector(selectSubCastes);

  // Local component state
  const [users, setUsers] = useState<AppUser[]>([]);
  const [userOrderBy, setUserOrderBy] = useState<
    "email" | "name" | "phone" | "createdAt"
  >("createdAt");
  const [userOrder, setUserOrder] = useState<"asc" | "desc">("desc");
  const [userSearch, setUserSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState<AppUser | null>(null);
  const [editMode, setEditMode] = useState<"full" | "villages">("full");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>("admin");
  const [selectedVillages, setSelectedVillages] = useState<string[]>([]);
  // Block/unblock confirmation dialog state.
  const [blockTarget, setBlockTarget] = useState<AppUser | null>(null);
  const [blockReason, setBlockReason] = useState("");
  const [blockBusy, setBlockBusy] = useState(false);
  const [error, setError] = useState<string>("");
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [openingLinkedUserId, setOpeningLinkedUserId] = useState<string | null>(
    null,
  );

  // Add dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addType, setAddType] = useState<
    "state" | "district" | "village" | "caste" | "subcaste"
  >("state");
  const [newName, setNewName] = useState("");
  const [selectedParentId, setSelectedParentId] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadPendingRequests = React.useCallback(async () => {
    try {
      const userId = userProfile?.id;
      if (!userId) {
        setPendingRequests([]);
        return;
      }
      const data = await dispatch(
        fetchPendingVillageAccessRequests(userId),
      ).unwrap();
      setPendingRequests(data || []);
    } catch (err) {
      console.error("Error loading pending requests:", err);
      setPendingRequests([]);
    }
  }, [dispatch, userProfile?.id]);

  const loadHierarchyData = React.useCallback(async () => {
    try {
      await Promise.all([
        dispatch(fetchStates()),
        dispatch(fetchAllDistricts()),
        dispatch(fetchVillages()),
        dispatch(fetchCastes()),
        dispatch(fetchAllSubCastes()),
      ]);
    } catch (err) {
      console.error("Error loading hierarchy data:", err);
    }
  }, [dispatch]);

  const handleUserSort = (field: "email" | "name" | "phone" | "createdAt") => {
    if (userOrderBy === field) {
      setUserOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setUserOrderBy(field);
      setUserOrder("asc");
    }
  };

  const sortedUsers = React.useMemo(() => {
    const term = userSearch.trim().toLowerCase();
    const filtered = !term
      ? users
      : users.filter((u: any) => {
          const haystack = [
            u.email,
            u.name,
            u.displayName,
            u.phone,
            formatDate(u.createdAt),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return haystack.includes(term);
        });

    const getValue = (u: any): string | number => {
      switch (userOrderBy) {
        case "name":
          return (u.name || u.displayName || "").toLowerCase();
        case "phone":
          return u.phone || "";
        case "createdAt":
          return u.createdAt ? new Date(u.createdAt).getTime() : 0;
        case "email":
        default:
          return (u.email || "").toLowerCase();
      }
    };
    return [...filtered].sort((a, b) => {
      const av = getValue(a);
      const bv = getValue(b);
      if (av < bv) return userOrder === "asc" ? -1 : 1;
      if (av > bv) return userOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [users, userOrderBy, userOrder, userSearch]);

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);

      const usersData = await dispatch(fetchAdminUsers()).unwrap();

      setUsers(
        (usersData || []).map((user) => ({
          ...user,
          id: user.id,
          isVerified: user.isVerified,
        })) as AppUser[],
      );

      // Load hierarchy data
      await loadHierarchyData();
      await loadPendingRequests();

      setLoading(false);
    } catch (err) {
      console.error("Error loading data:", err);
      setError("Failed to load data");
      setLoading(false);
    }
  }, [dispatch, loadHierarchyData, loadPendingRequests]);

  useEffect(() => {
    const checkAccessAndLoad = async () => {
      if (authLoading) return;

      if (!isAdmin()) {
        setError("Access denied. Only admins can access this page.");
        setLoading(false);
        return;
      }

      await loadData();
    };

    checkAccessAndLoad();
  }, [isSuperAdmin, isAdmin, loadData, authLoading]);

  const tabValue = React.useMemo(() => {
    const params = new URLSearchParams(location.search);
    const tabKey = params.get("tab") || "users";
    let idx = TAB_KEYS.indexOf(tabKey as (typeof TAB_KEYS)[number]);
    if (idx === -1) idx = 0;
    if (!superAdmin && idx > 1) idx = 0;
    return idx;
  }, [location.search, superAdmin]);

  const handleAddClick = (
    type: "state" | "district" | "village" | "caste" | "subcaste",
  ) => {
    setAddType(type);
    setNewName("");
    setSelectedParentId("");
    setAddDialogOpen(true);
  };

  const handleOpenLinkedTree = React.useCallback(
    async (user: AppUser) => {
      if (!user.peopleId) return;

      try {
        setOpeningLinkedUserId(user.id);
        setError("");

        const person = await ApiService.getPersonById(user.peopleId);
        const treeId = person?.treeId;

        if (!treeId) {
          setError("Linked person record was found, but no tree could be opened.");
          return;
        }

        const params = new URLSearchParams();
        params.set("tree", treeId);
        params.set("personId", user.peopleId);
        navigate(`/families?${params.toString()}`);
      } catch (err) {
        console.error("Error opening linked tree:", err);
        setError("Failed to open the linked family tree.");
      } finally {
        setOpeningLinkedUserId((current) => (current === user.id ? null : current));
      }
    },
    [navigate],
  );

  const handleAddConfirm = async () => {
    if (!newName.trim()) {
      setError("Name cannot be empty");
      return;
    }

    try {
      setLoading(true);

      if (addType === "state") {
        await ApiService.createState?.({ name: newName });
      } else if (addType === "district") {
        if (!selectedParentId) {
          setError("Please select a state");
          setLoading(false);
          return;
        }
        await ApiService.createDistrict?.({
          name: newName,
          stateId: selectedParentId,
        });
      } else if (addType === "village") {
        if (!selectedParentId) {
          setError("Please select a district");
          setLoading(false);
          return;
        }
        await ApiService.createVillage?.({
          name: newName,
          districtId: selectedParentId,
        });
      } else if (addType === "caste") {
        await ApiService.createCaste?.({ name: newName });
      } else if (addType === "subcaste") {
        if (!selectedParentId) {
          setError("Please select a caste");
          setLoading(false);
          return;
        }
        await ApiService.createSubCaste?.({
          name: newName,
          casteId: selectedParentId,
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

  const handleVerifyUser = async (userId: string) => {
    if (!isSuperAdmin()) return;
    try {
      const data = await dispatch(
        verifyAdminUser({
          userId,
          reviewerId: userProfile?.id || null,
        }),
      ).unwrap();
      if (data && !data.success)
        throw new Error(data.message || "Failed to verify user");

      setSuccessMessage("User verified successfully");
      await loadData();

      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err: any) {
      console.error("Error verifying user:", err);
      setError(err.message || "Failed to verify user");
    }
  };

  const handleEditClick = (user: AppUser) => {
    if (!isSuperAdmin()) return;
    setEditUser(user);
    setEditMode("full");
    setSelectedRole(user.role);
    setSelectedVillages(user.villages || []);
    setEditDialogOpen(true);
  };

  const handleEditVillagesClick = (user: AppUser) => {
    if (!isSuperAdmin()) return;
    setEditUser(user);
    setEditMode("villages");
    setSelectedRole("admin");
    setSelectedVillages(user.villages || []);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!isSuperAdmin()) return;
    if (!editUser) return;

    try {
      await dispatch(
        updateAdminUser({
          userId: editUser.id,
          role: selectedRole,
          villages: selectedRole === "superadmin" ? [] : selectedVillages,
          modifiedBy: userProfile?.id || null,
        }),
      ).unwrap();

      await loadData();
      setEditDialogOpen(false);
      setEditUser(null);
    } catch (err) {
      console.error("Error updating user:", err);
      alert("Failed to update user");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!isSuperAdmin()) return;
    if (!window.confirm("Are you sure you want to delete this user?")) {
      return;
    }

    try {
      await dispatch(deleteAdminUser(userId)).unwrap();

      await loadData();
    } catch (err) {
      console.error("Error deleting user:", err);
      alert("Failed to delete user");
    }
  };

  const openBlockDialog = (user: AppUser) => {
    if (!isSuperAdmin()) return;
    setBlockReason("");
    setBlockTarget(user);
  };

  const handleConfirmBlockToggle = async () => {
    if (!isSuperAdmin() || !blockTarget) return;
    const willBlock = !blockTarget.isBlocked;
    try {
      setBlockBusy(true);
      if (willBlock) {
        await dispatch(
          blockAdminUser({ userId: blockTarget.id, reason: blockReason.trim() || null }),
        ).unwrap();
      } else {
        await dispatch(unblockAdminUser(blockTarget.id)).unwrap();
      }
      setSuccessMessage(willBlock ? "User blocked." : "User unblocked.");
      setBlockTarget(null);
      await loadData();
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err: any) {
      console.error("Error updating block status:", err);
      setError(err?.message || "Failed to update block status");
    } finally {
      setBlockBusy(false);
    }
  };

  const handleVillageToggle = (villageId: string) => {
    setSelectedVillages((prev) =>
      prev.includes(villageId)
        ? prev.filter((v) => v !== villageId)
        : [...prev, villageId],
    );
  };

  const handleReviewRequest = async (
    requestId: string,
    action: "approved" | "rejected",
  ) => {
    try {
      const userId = userProfile?.id;
      if (!userId) {
        throw new Error("User profile not loaded");
      }
      const data = await dispatch(
        reviewVillageAccessRequest({
          userId,
          requestId,
          action,
          reviewNote: null,
        }),
      ).unwrap();
      if (data && !data.success) throw new Error(data.error);

      setSuccessMessage(
        `Request ${action === "approved" ? "approved" : "rejected"} successfully`,
      );
      await loadData();
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err: any) {
      console.error("Error reviewing request:", err);
      setError(err.message || "Failed to review request");
    }
  };

  if (authLoading || loading) {
    return (
      <Container sx={{ mt: 4 }}>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  if (!isAdmin()) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">
          Access denied. Only admins can access this page.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth={false} sx={{ mt: 2, mb: 2, px: { xs: 2, sm: 3 } }}>
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
        <Tabs
          value={tabValue}
          onChange={(e, val) => {
            if (val === tabValue) return;
            const params = new URLSearchParams(location.search);
            params.set("tab", TAB_KEYS[val] || "users");
            navigate(`${location.pathname}?${params.toString()}`, { replace: true });
          }}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
        >
          <Tab
            label="Users"
            id="admin-tab-0"
            aria-controls="admin-tabpanel-0"
          />
          {isSuperAdmin() && (
            <Tab
              label="States"
              id="admin-tab-2"
              aria-controls="admin-tabpanel-2"
            />
          )}
          {isSuperAdmin() && (
            <Tab
              label="Districts"
              id="admin-tab-3"
              aria-controls="admin-tabpanel-3"
            />
          )}
          {isSuperAdmin() && (
            <Tab
              label="Villages"
              id="admin-tab-4"
              aria-controls="admin-tabpanel-4"
            />
          )}
          {isSuperAdmin() && (
            <Tab
              label="Castes"
              id="admin-tab-5"
              aria-controls="admin-tabpanel-5"
            />
          )}
          {isSuperAdmin() && (
            <Tab
              label="Sub-Castes"
              id="admin-tab-6"
              aria-controls="admin-tabpanel-6"
            />
          )}
        </Tabs>

        {/* Users Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box
            sx={{
              mb: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
              flexWrap: "wrap",
            }}
          >
            <Typography variant="h6">User Management</Typography>
            <TextField
              size="small"
              placeholder="Search by email, name, phone, or created date"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              sx={{ width: { xs: "100%", sm: 360 } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </Box>
          {!isSuperAdmin() && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Only superadmin can edit users. Admins can review village access
              requests from the "Village Requests" tab.
            </Alert>
          )}
          <TableContainer sx={{ overflowX: "auto" }}>
            <Table size="small" sx={{ minWidth: 820 }}>
              <TableHead>
                <TableRow>
                  <TableCell sortDirection={userOrderBy === "email" ? userOrder : false}>
                    <TableSortLabel
                      active={userOrderBy === "email"}
                      direction={userOrderBy === "email" ? userOrder : "asc"}
                      onClick={() => handleUserSort("email")}
                    >
                      Email
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={userOrderBy === "name" ? userOrder : false}>
                    <TableSortLabel
                      active={userOrderBy === "name"}
                      direction={userOrderBy === "name" ? userOrder : "asc"}
                      onClick={() => handleUserSort("name")}
                    >
                      Name
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={userOrderBy === "phone" ? userOrder : false}>
                    <TableSortLabel
                      active={userOrderBy === "phone"}
                      direction={userOrderBy === "phone" ? userOrder : "asc"}
                      onClick={() => handleUserSort("phone")}
                    >
                      Phone
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Linked Node</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell sortDirection={userOrderBy === "createdAt" ? userOrder : false}>
                    <TableSortLabel
                      active={userOrderBy === "createdAt"}
                      direction={userOrderBy === "createdAt" ? userOrder : "asc"}
                      onClick={() => handleUserSort("createdAt")}
                    >
                      Created At
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>Last Login</TableCell>
                  <TableCell sx={{ textAlign: "right"}}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.name || user.displayName || "-"}
                    </TableCell>
                    <TableCell>{user.phone || "-"}</TableCell>
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
                      {(user as any).peopleId ? (
                        <Chip
                          label="Linked"
                          color="info"
                          size="small"
                          variant="outlined"
                          clickable
                          disabled={openingLinkedUserId === user.id}
                          onClick={() => handleOpenLinkedTree(user)}
                        />
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Not linked
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.isBlocked ? (
                        <Chip
                          icon={<Block />}
                          label="Blocked"
                          color="error"
                          size="small"
                        />
                      ) : user.isVerified ? (
                        <Chip
                          icon={<CheckCircle />}
                          label="Approved"
                          color="success"
                          size="small"
                          variant="outlined"
                        />
                      ) : (
                        <Chip
                          label="Pending Approval"
                          color="warning"
                          size="small"
                        />
                      )}
                    </TableCell>
                    <TableCell>{formatDate((user as any).createdAt)}</TableCell>
                    <TableCell>
                      {user.lastLoginAt ? (
                        formatDateTime(user.lastLoginAt)
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Never
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{textAlign: "right" }}>
                      {isSuperAdmin() && !user.isVerified && (
                        <Tooltip title="Approve User">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleVerifyUser(user.id)}
                          >
                            <CheckCircle />
                          </IconButton>
                        </Tooltip>
                      )}
                      {isSuperAdmin() && user.id !== userProfile?.id && (
                        <Tooltip title={user.isBlocked ? "Unblock user" : "Block user"}>
                          <IconButton
                            size="small"
                            color={user.isBlocked ? "success" : "warning"}
                            onClick={() => openBlockDialog(user)}
                          >
                            {user.isBlocked ? <LockOpen /> : <Block />}
                          </IconButton>
                        </Tooltip>
                      )}
                      {isSuperAdmin() && (
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
                      )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
        {/* States Tab */}
        <TabPanel value={tabValue} index={1}>
          {!isSuperAdmin() ? (
            <Alert severity="info">Only superadmin can manage states.</Alert>
          ) : (
            <>
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
              <TableContainer sx={{ overflowX: "auto" }}>
                <Table size="small" sx={{ minWidth: 520 }}>
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
                          <TableCell>{formatDate(state.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </TabPanel>

        {/* Districts Tab */}
        <TabPanel value={tabValue} index={2}>
          {!isSuperAdmin() ? (
            <Alert severity="info">Only superadmin can manage districts.</Alert>
          ) : (
            <>
              <Box sx={{ mb: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => handleAddClick("district")}
                >
                  Add District
                </Button>
              </Box>
              <TableContainer sx={{ overflowX: "auto" }}>
                <Table size="small" sx={{ minWidth: 640 }}>
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
                          {states.find((s) => s.id === district.stateId)
                            ?.name || "-"}
                        </TableCell>
                        <TableCell>{formatDate(district.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </TabPanel>

        {/* Villages Tab */}
        <TabPanel value={tabValue} index={3}>
          {!isSuperAdmin() ? (
            <Alert severity="info">Only superadmin can manage villages.</Alert>
          ) : (
            <>
              <Box sx={{ mb: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => handleAddClick("village")}
                >
                  Add Village
                </Button>
              </Box>
              <TableContainer sx={{ overflowX: "auto" }}>
                <Table size="small" sx={{ minWidth: 760 }}>
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
                        (d) => d.id === village.districtId,
                      );
                      const state = states.find(
                        (s) => s.id === district?.stateId,
                      );
                      return (
                        <TableRow key={village.id}>
                        <TableCell>{village.name}</TableCell>
                        <TableCell>{district?.name || "-"}</TableCell>
                        <TableCell>{state?.name || "-"}</TableCell>
                        <TableCell>
                            {formatDate(village.createdAt)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </TabPanel>

        {/* Castes Tab */}
        <TabPanel value={tabValue} index={4}>
          {!isSuperAdmin() ? (
            <Alert severity="info">Only superadmin can manage castes.</Alert>
          ) : (
            <>
              <Box sx={{ mb: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => handleAddClick("caste")}
                >
                  Add Caste
                </Button>
              </Box>
              <TableContainer sx={{ overflowX: "auto" }}>
                <Table size="small" sx={{ minWidth: 480 }}>
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
                        <TableCell>{formatDate(caste.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </TabPanel>

        {/* Sub-Castes Tab */}
        <TabPanel value={tabValue} index={5}>
          {!isSuperAdmin() ? (
            <Alert severity="info">
              Only superadmin can manage sub-castes.
            </Alert>
          ) : (
            <>
              <Box sx={{ mb: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => handleAddClick("subcaste")}
                >
                  Add Sub-Caste
                </Button>
              </Box>
              <TableContainer sx={{ overflowX: "auto" }}>
                <Table size="small" sx={{ minWidth: 640 }}>
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
                          {castes.find((c) => c.id === subCaste.casteId)
                            ?.name || "-"}
                        </TableCell>
                        <TableCell>{formatDate(subCaste.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
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
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            pr: 1,
          }}
        >
          Edit User
          <IconButton
            aria-label="Close"
            onClick={() => setEditDialogOpen(false)}
            size="small"
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Email: {editUser?.email}
            </Typography>

            {editMode === "full" && (
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
            )}

            {(selectedRole === "admin" || editMode === "villages") && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Assign Villages:
                </Typography>
                {villagesList.length === 0 ? (
                  <Typography variant="caption" color="text.secondary">
                    No villages available
                  </Typography>
                ) : (
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    {villagesList.map((village) => (
                      <Box
                        key={village.id}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          p: 1,
                          border: 1,
                          borderColor: selectedVillages.includes(village.id)
                            ? "primary.main"
                            : "divider",
                          borderRadius: 1,
                          cursor: "pointer",
                          bgcolor: selectedVillages.includes(village.id)
                            ? "action.selected"
                            : "transparent",
                        }}
                        onClick={() => handleVillageToggle(village.id)}
                      >
                        <Typography>{village.name}</Typography>
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

      <Dialog
        open={!!blockTarget}
        onClose={() => !blockBusy && setBlockTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        {blockTarget && (
          <>
            <DialogTitle>
              {blockTarget.isBlocked ? "Unblock user?" : "Block user?"}
            </DialogTitle>
            <DialogContent dividers>
              {blockTarget.isBlocked ? (
                <Typography variant="body2">
                  Unblock{" "}
                  <strong>{blockTarget.name || blockTarget.email}</strong>? They
                  will be able to sign in and use the application again.
                </Typography>
              ) : (
                <>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    Block{" "}
                    <strong>{blockTarget.name || blockTarget.email}</strong>? They
                    will stay signed in but see a "blocked" message instead of the
                    app, and their changes will be rejected.
                  </Typography>
                  <TextField
                    label="Reason (optional — shown to the user)"
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    fullWidth
                    multiline
                    minRows={2}
                  />
                </>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setBlockTarget(null)} disabled={blockBusy}>
                Cancel
              </Button>
              <Button
                variant="contained"
                color={blockTarget.isBlocked ? "success" : "error"}
                onClick={() => void handleConfirmBlockToggle()}
                disabled={blockBusy}
              >
                {blockBusy
                  ? "Saving..."
                  : blockTarget.isBlocked
                    ? "Unblock"
                    : "Block"}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  );
};
