import React from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import PersonSearchOutlinedIcon from "@mui/icons-material/PersonSearchOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import { PersonSearchField } from "../BusinessPage/PersonSearchField";

type BranchPersonOption = {
  id: string;
  name: string;
  treeId: string;
  hierarchy?: Array<{ id: string; name: string; generation?: number }>;
  villageName?: string;
  casteName?: string;
  subCasteName?: string;
};

interface InviteCollaboratorDialogProps {
  open: boolean;
  busy: boolean;
  invitePhone: string;
  inviteRole: string;
  inviteScope: "full" | "branch";
  invitePersonId: string;
  invitePersonSearch: string;
  treeId: string;
  selectedBranchPersonName?: string;
  onClose: () => void;
  onInvitePhoneChange: (value: string) => void;
  onInviteRoleChange: (value: string) => void;
  onInviteScopeChange: (value: "full" | "branch") => void;
  onInvitePersonIdChange: (value: string) => void;
  onInvitePersonSearchChange: (value: string) => void;
  onInvitePersonSelect: (value: BranchPersonOption | null) => void;
  onCreateInvite: () => void;
}

export function InviteCollaboratorDialog({
  open,
  busy,
  invitePhone,
  inviteRole,
  inviteScope,
  invitePersonId,
  invitePersonSearch,
  treeId,
  selectedBranchPersonName,
  onClose,
  onInvitePhoneChange,
  onInviteRoleChange,
  onInviteScopeChange,
  onInvitePersonIdChange,
  onInvitePersonSearchChange,
  onInvitePersonSelect,
  onCreateInvite,
}: InviteCollaboratorDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const iconAdornment = (icon: React.ReactNode) => (
    <InputAdornment position="start" sx={{ color: "action.active", mr: 0.25 }}>
      {icon}
    </InputAdornment>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: isMobile
          ? {
              m: 0,
              width: "100%",
              height: "100%",
              maxHeight: "100%",
              borderRadius: 0,
            }
          : undefined,
      }}
    >
      <DialogTitle>Invite Collaborator</DialogTitle>
      <DialogContent sx={isMobile ? { flex: 1, overflowY: "auto" } : undefined}>
        <Stack spacing={2.5} sx={{ pt: 0.5 }}>
          <DialogContentText sx={{ m: 0 }}>
            Create an invite link and share it via SMS, WhatsApp, or any app from your phone.
          </DialogContentText>

          <TextField
            label="Phone Number (optional)"
            placeholder="10 digit mobile number"
            fullWidth
            value={invitePhone}
            onChange={(e) => onInvitePhoneChange(e.target.value)}
            inputProps={{ maxLength: 10, inputMode: "numeric" }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start" sx={{ gap: 0.75 }}>
                  <PhoneOutlinedIcon fontSize="small" color="action" />
                  +91
                </InputAdornment>
              ),
            }}
            helperText="Enter 10 digits only. +91 is added automatically."
          />

          <FormControl fullWidth>
            <InputLabel>Access Scope</InputLabel>
            <Select
              label="Access Scope"
              value={inviteScope}
              onChange={(e) => onInviteScopeChange(e.target.value as "full" | "branch")}
              startAdornment={iconAdornment(<AccountTreeOutlinedIcon fontSize="small" />)}
            >
              <MenuItem value="full">Full tree</MenuItem>
              <MenuItem value="branch">Selected person branch</MenuItem>
            </Select>
          </FormControl>

          {inviteScope === "branch" && (
            <Stack spacing={1.5} sx={{ mb: 1 }}>
              <PersonSearchField
                label="Branch Person"
                placeholder="Search people in this tree"
                searchValue={invitePersonSearch}
                startIcon={<PersonSearchOutlinedIcon fontSize="small" color="action" />}
                onSearchValueChange={(value, meta) => {
                  onInvitePersonSearchChange(value);
                  if (meta?.source === "select") {
                    return;
                  }
                  if (value.trim() && value !== (selectedBranchPersonName || "")) {
                    onInvitePersonIdChange("");
                  }
                }}
                onPersonSelect={(person) => {
                  onInvitePersonSelect(person as BranchPersonOption);
                }}
                selectedPerson={invitePersonId ? { id: invitePersonId } : null}
                treeId={treeId}
                disabled={!treeId}
                autoSearch
                minSearchLength={2}
                hideSearchButton
                noResultsText={
                  invitePersonSearch.trim().length < 2
                    ? "Type at least 2 characters"
                    : "No matching person in this tree"
                }
              />
              {invitePersonId && (
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {selectedBranchPersonName || "Selected person"}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    This person will be the branch root for invite access.
                  </Typography>
                </Paper>
              )}
            </Stack>
          )}

          <FormControl fullWidth sx={{ mt: inviteScope === "branch" ? 1 : 0 }}>
            <InputLabel>Role</InputLabel>
            <Select
              label="Role"
              value={inviteRole}
              onChange={(e) => onInviteRoleChange(e.target.value)}
              startAdornment={iconAdornment(<AdminPanelSettingsOutlinedIcon fontSize="small" />)}
            >
              <MenuItem value="write">Write</MenuItem>
              <MenuItem value="editor">Editor</MenuItem>
              <MenuItem value="read">Read</MenuItem>
              <MenuItem value="viewer">Viewer</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions sx={isMobile ? { px: 3, py: 2 } : undefined}>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          onClick={onCreateInvite}
          variant="contained"
          disabled={busy || (inviteScope === "branch" && !invitePersonId)}
        >
          {busy ? "Creating..." : "Create & Share"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
