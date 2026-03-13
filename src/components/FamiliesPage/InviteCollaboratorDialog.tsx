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
} from "@mui/material";
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
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Invite Collaborator</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
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
            startAdornment: <InputAdornment position="start">+91</InputAdornment>,
          }}
          helperText="Enter 10 digits only. +91 is added automatically."
          sx={{ mb: 2 }}
        />

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Access Scope</InputLabel>
          <Select
            label="Access Scope"
            value={inviteScope}
            onChange={(e) => onInviteScopeChange(e.target.value as "full" | "branch")}
          >
            <MenuItem value="full">Full tree</MenuItem>
            <MenuItem value="branch">Selected person branch</MenuItem>
          </Select>
        </FormControl>

        {inviteScope === "branch" && (
          <Stack spacing={1}>
            <PersonSearchField
              label="Branch Person"
              placeholder="Search people in this tree"
              searchValue={invitePersonSearch}
              onSearchValueChange={(value) => {
                onInvitePersonSearchChange(value);
                if (!value.trim() || value !== (selectedBranchPersonName || "")) {
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

        <FormControl fullWidth>
          <InputLabel>Role</InputLabel>
          <Select label="Role" value={inviteRole} onChange={(e) => onInviteRoleChange(e.target.value)}>
            <MenuItem value="write">Write</MenuItem>
            <MenuItem value="editor">Editor</MenuItem>
            <MenuItem value="read">Read</MenuItem>
            <MenuItem value="viewer">Viewer</MenuItem>
          </Select>
        </FormControl>

      </DialogContent>
      <DialogActions>
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
