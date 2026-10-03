import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Container,
  Link,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Link as RouterLink, useParams } from "react-router-dom";
import { ApiService, AdminUserTreeAccess } from "../../services/apiService";
import { useAuth } from "../hooks/useAuth";
import { formatDate, formatDateTime } from "../../utils/dateFormatter";

/** How the user reaches one tree, in words. */
function accessLabel(tree: AdminUserTreeAccess["trees"][number]): {
  label: string;
  color: "success" | "primary" | "default" | "warning";
} {
  if (tree.isOwner) return { label: "Owner", color: "success" };
  const perms = tree.permissions || [];
  if (perms.length === 0) return { label: "No current access", color: "warning" };
  const full = perms.find((p) => !p.personId);
  if (full) return { label: `Full tree · ${full.role}`, color: "primary" };
  const branches = perms.map((p) => p.personName || "Unnamed").join(", ");
  return { label: `Branch: ${branches} · ${perms[0].role}`, color: "default" };
}

/**
 * Superadmin view of one user: every tree they can reach, how, and how many
 * people they have added to each.
 */
export const AdminUserAccessPage: React.FC = () => {
  const { userId = "" } = useParams<{ userId: string }>();
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const [data, setData] = useState<AdminUserTreeAccess | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!isSuperAdmin()) {
      setError("Only superadmins can view this page.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    ApiService.getAdminUserTreeAccess(userId)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, authLoading, isSuperAdmin]);

  const user = data?.user;

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>
      <Link
        component={RouterLink}
        to="/admin"
        underline="hover"
        sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, mb: 2, fontWeight: 600 }}
      >
        <ArrowBackIcon fontSize="small" /> Back to users
      </Link>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : user && data ? (
        <Stack spacing={3}>
          <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              {user.name || "Unnamed user"}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {[user.phone, user.email].filter(Boolean).join(" · ") || "No contact details"}
            </Typography>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 2 }}>
              <Chip
                size="small"
                label={user.role === "superadmin" ? "Super Admin" : "Admin"}
                color={user.role === "superadmin" ? "error" : "primary"}
              />
              <Chip size="small" variant="outlined" label={`${data.totals.trees} trees`} />
              <Chip size="small" variant="outlined" label={`${data.totals.nodesAdded} people added`} />
              {user.isBlocked && <Chip size="small" color="error" label="Blocked" />}
              <Chip
                size="small"
                variant="outlined"
                label={`Last login: ${user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "never"}`}
              />
            </Stack>
            {user.role === "superadmin" && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Superadmins can open every tree. The list below shows the trees this account
                created, holds a permission on, or added people to.
              </Alert>
            )}
          </Paper>

          {data.trees.length === 0 ? (
            <Alert severity="info">This user has no access to any tree and hasn't added anyone.</Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3, overflowX: "auto" }}>
              <Table size="small" sx={{ minWidth: 720 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Tree</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>Access</TableCell>
                    <TableCell align="right">People added</TableCell>
                    <TableCell>Last added</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.trees.map((tree) => {
                    const access = accessLabel(tree);
                    return (
                      <TableRow key={tree.treeId} hover>
                        <TableCell>
                          <Link component={RouterLink} to={`/families?tree=${tree.treeId}`} sx={{ fontWeight: 600 }}>
                            {tree.treeName || "Untitled tree"}
                          </Link>
                        </TableCell>
                        <TableCell>{tree.locationName || "—"}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={access.label}
                            color={access.color}
                            variant={access.color === "default" ? "outlined" : "filled"}
                            sx={{ maxWidth: 320 }}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>
                          {tree.nodesAdded}
                        </TableCell>
                        <TableCell>{tree.lastAddedAt ? formatDate(tree.lastAddedAt) : "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Stack>
      ) : null}
    </Container>
  );
};

export default AdminUserAccessPage;
