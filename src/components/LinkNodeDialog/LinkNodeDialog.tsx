import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Link,
} from "@mui/material";
import LinkIcon from "@mui/icons-material/Link";
import { PersonSearchField } from "../BusinessPage/PersonSearchField";
import { useAuth } from "../hooks/useAuth";
import { useVillage } from "../hooks/useVillage";
import { supabase } from "../../supabase";

interface SelectedPerson {
  id: string;
  name: string;
  treeId: string;
  [key: string]: any;
}

/**
 * One-time onboarding dialog for admin users.
 * Steps are optional:
 * 1) Link account to a profile node
 * 2) Request village access
 * Shown once per user (persisted in localStorage).
 */
export const LinkNodeDialog: React.FC = () => {
  const { currentUser, linkUserToNode, userProfile } = useAuth();
  const { selectedVillage, setSelectedVillage, villages } = useVillage();
  const [searchValue, setSearchValue] = useState("");
  const [selectedPerson, setSelectedPerson] = useState<SelectedPerson | null>(
    null,
  );
  const [linking, setLinking] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [step, setStep] = useState<"intro" | "link" | "request">("intro");
  const [open, setOpen] = useState(false);
  const hasAssignedVillage = (userProfile?.villages || []).length > 0;

  const storageKey = useMemo(
    () => `kinvia_admin_onboarding_seen_v1_${currentUser?.id || "anon"}`,
    [currentUser?.id],
  );

  // Auto-select first village if none selected
  useEffect(() => {
    if (!selectedVillage && villages.length > 0) {
      setSelectedVillage(villages[0].id);
    }
  }, [selectedVillage, villages, setSelectedVillage]);

  useEffect(() => {
    if (!currentUser || userProfile?.role !== "admin") {
      setOpen(false);
      return;
    }

    const seen = localStorage.getItem(storageKey) === "1";
    if (!seen) {
      setOpen(true);
      setStep(userProfile?.peopleId || hasAssignedVillage ? "intro" : "intro");
    }
  }, [currentUser, userProfile?.role, userProfile?.peopleId, hasAssignedVillage, storageKey]);

  const handleClosePermanently = () => {
    localStorage.setItem(storageKey, "1");
    setOpen(false);
  };

  const handleLink = async () => {
    if (!selectedPerson) return;
    setLinking(true);
    setError("");
    try {
      await linkUserToNode(selectedPerson.id, selectedPerson.treeId);
      setSuccess("Profile linked successfully.");
      setStep("request");
    } catch (e: any) {
      setError(e.message || "Failed to link. Please try again.");
    } finally {
      setLinking(false);
    }
  };

  const handleRequestVillageAccess = async () => {
    if (!selectedVillage) return;
    setRequesting(true);
    setError("");
    try {
      const { data, error: rpcError } = await supabase.rpc(
        "submit_village_access_request",
        {
          p_village_id: selectedVillage,
          p_request_message: requestMessage || null,
        },
      );

      if (rpcError) throw rpcError;
      if (data && !data.success) throw new Error(data.error);

      setSuccess("Village access request submitted.");
      handleClosePermanently();
    } catch (e: any) {
      setError(e.message || "Failed to submit request.");
    } finally {
      setRequesting(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <LinkIcon color="primary" />
        Welcome to Kinvia
      </DialogTitle>
      <DialogContent>
        {step === "intro" && (
          <Box>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Hi <strong>{userProfile?.name || "Admin"}</strong>. You can
              optionally link your profile and request village access now.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              You can do both anytime from your profile page by clicking your
              user profile in the header.
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              You cannot edit linked profile and village assignment directly.
              Please contact superadmin at{" "}
              <Link href="mailto:support@kinvia.in" underline="hover">
                support@kinvia.in
              </Link>
              .
            </Alert>
          </Box>
        )}

        {step === "link" && (
          <Box>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Link your account to your family tree profile (optional).
            </Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="village-select-label">Select Village</InputLabel>
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
              placeholder="Type your name and press Enter or click Search"
              searchValue={searchValue}
              onSearchValueChange={(value) => {
                setSearchValue(value);
                if (!value) setSelectedPerson(null);
              }}
              onPersonSelect={(person) => {
                setSelectedPerson(person as SelectedPerson);
                setSearchValue(person.name);
              }}
              selectedPerson={selectedPerson}
              villageId={selectedVillage}
              disabled={!selectedVillage}
            />

            {selectedPerson && (
              <Alert severity="info" sx={{ mt: 2 }}>
                You selected: <strong>{selectedPerson.name}</strong>
              </Alert>
            )}
          </Box>
        )}

        {step === "request" && (
          <Box>
            {hasAssignedVillage ? (
              <Box>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Village assignment is already approved.
                </Alert>
                <Typography variant="body2" color="text.secondary">
                  For any assignment changes, contact superadmin at{" "}
                  <Link href="mailto:support@kinvia.in" underline="hover">
                    support@kinvia.in
                  </Link>
                  .
                </Typography>
              </Box>
            ) : (
              <>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Request village access now? (optional)
                </Typography>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel id="request-village-select-label">
                    Select Village
                  </InputLabel>
                  <Select
                    labelId="request-village-select-label"
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
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Request Note (Optional)"
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                  You can request this anytime from Profile.
                </Typography>
              </>
            )}
          </Box>
        )}

        {success && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {success}
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {step === "intro" && (
          <>
            <Button onClick={handleClosePermanently} color="inherit">
              Skip All
            </Button>
            {!userProfile?.peopleId && (
              <Button onClick={() => setStep("link")} variant="outlined">
                Link Profile Now
              </Button>
            )}
            <Button
              variant="contained"
              onClick={() => {
                if (hasAssignedVillage) {
                  handleClosePermanently();
                } else {
                  setStep("request");
                }
              }}
              sx={{ background: "linear-gradient(135deg, #0066cc, #00cc99)" }}
            >
              Continue
            </Button>
          </>
        )}

        {step === "link" && (
          <>
            <Button onClick={() => setStep("request")} color="inherit">
              Skip
            </Button>
            <Button
              variant="contained"
              onClick={handleLink}
              disabled={!selectedPerson || linking}
              startIcon={linking ? <CircularProgress size={16} /> : <LinkIcon />}
              sx={{ background: "linear-gradient(135deg, #0066cc, #00cc99)" }}
            >
              {linking ? "Linking..." : "Link My Account"}
            </Button>
          </>
        )}

        {step === "request" && (
          <>
            <Button onClick={handleClosePermanently} color="inherit">
              Not Now
            </Button>
            <Button
              variant="contained"
              onClick={hasAssignedVillage ? handleClosePermanently : handleRequestVillageAccess}
              disabled={hasAssignedVillage ? false : !selectedVillage || requesting}
              startIcon={requesting ? <CircularProgress size={16} /> : undefined}
              sx={{ background: "linear-gradient(135deg, #0066cc, #00cc99)" }}
            >
              {hasAssignedVillage ? "Done" : requesting ? "Submitting..." : "Request Access"}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};
