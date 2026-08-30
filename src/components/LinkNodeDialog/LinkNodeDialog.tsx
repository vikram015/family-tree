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
  TextField,
  Link,
  useMediaQuery,
  useTheme,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import LinkIcon from "@mui/icons-material/Link";
import { PersonSearchField } from "../BusinessPage/PersonSearchField";
import { LocationPicker } from "../LocationPicker/LocationPicker";
import { ApiService, LocationCombinationOption } from "../../services/apiService";
import { useAuth } from "../hooks/useAuth";
import { useLocations } from "../hooks/useLocations";
import { useAppDispatch } from "../../store/hooks";
import { submitLocationAccessRequest } from "../../store/thunks/apiThunks";
import { brand } from "../../theme/brand";

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
 * 2) Request location access
 * Shown once per user (persisted in localStorage).
 */
export const LinkNodeDialog: React.FC = () => {
  const dispatch = useAppDispatch();
  const { currentUser, linkUserToNode, userProfile, updateUserProfile } =
    useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { selectedLocation, setSelectedLocation, locations } = useLocations();
  const [searchValue, setSearchValue] = useState("");
  const [selectedPerson, setSelectedPerson] = useState<SelectedPerson | null>(
    null,
  );
  const [linking, setLinking] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [step, setStep] = useState<"profile" | "link" | "request">("profile");
  const [open, setOpen] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const hasAssignedLocation = (userProfile?.locations || []).length > 0;
  const needsProfileCompletion = useMemo(
    () =>
      !userProfile?.name?.trim() ||
      !userProfile?.email?.trim() ||
      !userProfile?.privacyPolicyAccepted,
    [userProfile?.name, userProfile?.email, userProfile?.privacyPolicyAccepted],
  );
  const needsLink = !userProfile?.peopleId;
  const needsLocationRequest = !hasAssignedLocation;

  // Auto-select first location if none selected
  useEffect(() => {
    if (!selectedLocation && locations.length > 0) {
      setSelectedLocation(locations[0].id);
    }
  }, [selectedLocation, locations, setSelectedLocation]);

  // Full hierarchy option for the selected location, for the LocationPicker.
  const [locationOption, setLocationOption] =
    useState<LocationCombinationOption | null>(null);
  useEffect(() => {
    if (!selectedLocation) {
      setLocationOption(null);
      return;
    }
    if (locationOption?.locationId === selectedLocation) return;
    let active = true;
    ApiService.searchLocationCombinations({ locationId: selectedLocation, limit: 1 })
      .then((rows) => {
        if (active) setLocationOption(rows[0] || null);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [selectedLocation, locationOption?.locationId]);

  const handleLocationChange = (option: LocationCombinationOption | null) => {
    setLocationOption(option);
    setSelectedLocation(option?.locationId || "");
  };

  useEffect(() => {
    setProfileName(userProfile?.name || "");
    setProfileEmail(userProfile?.email || "");
    setPrivacyAccepted(Boolean(userProfile?.privacyPolicyAccepted));
  }, [
    userProfile?.name,
    userProfile?.email,
    userProfile?.privacyPolicyAccepted,
  ]);

  useEffect(() => {
    if (!currentUser || userProfile?.role !== "admin") {
      setOpen(false);
      return;
    }

    if (needsProfileCompletion) {
      setOpen(true);
      setStep("profile");
      return;
    }

    if (needsLink) {
      setOpen(true);
      setStep("link");
      return;
    }

    if (needsLocationRequest) {
      setOpen(true);
      setStep("request");
      return;
    }

    setOpen(false);
  }, [
    currentUser,
    userProfile?.role,
    needsProfileCompletion,
    needsLink,
    needsLocationRequest,
  ]);

  const handleCloseDialog = () => {
    setOpen(false);
    setError("");
    setSuccess("");
  };

  const handleCompleteProfile = async () => {
    const trimmedName = profileName.trim();
    const trimmedEmail = profileEmail.trim();

    if (!trimmedName) {
      setError("Username is required.");
      return;
    }
    if (!trimmedEmail) {
      setError("Email is required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Please provide a valid email address.");
      return;
    }
    if (!privacyAccepted) {
      setError("Please accept the Terms of Use and Privacy Policy to continue.");
      return;
    }

    setSavingProfile(true);
    setError("");
    try {
      await updateUserProfile(
        trimmedName,
        userProfile?.phone || "",
        trimmedEmail,
        true,
      );
      setSuccess("Profile updated successfully.");
      if (needsLink) {
        setStep("link");
      } else if (needsLocationRequest) {
        setStep("request");
      } else {
        handleCloseDialog();
      }
    } catch (e: any) {
      setError(e.message || "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLink = async () => {
    if (!selectedPerson) return;
    setLinking(true);
    setError("");
    try {
      await linkUserToNode(selectedPerson.id, selectedPerson.treeId);
      setSuccess("Profile linked successfully.");
      if (needsLocationRequest) {
        setStep("request");
      } else {
        handleCloseDialog();
      }
    } catch (e: any) {
      setError(e.message || "Failed to link. Please try again.");
    } finally {
      setLinking(false);
    }
  };

  const handleRequestLocationAccess = async () => {
    if (!selectedLocation) return;
    setRequesting(true);
    setError("");
    try {
      const userId = userProfile?.id;
      if (!userId) {
        throw new Error("User profile not loaded");
      }
      const data = await dispatch(
        submitLocationAccessRequest({
          userId,
          locationId: selectedLocation,
          requestMessage: requestMessage || null,
        }),
      ).unwrap();
      if (data && !data.success) throw new Error(data.error);

      setSuccess("Location access request submitted.");
      handleCloseDialog();
    } catch (e: any) {
      setError(e.message || "Failed to submit request.");
    } finally {
      setRequesting(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} maxWidth="sm" fullWidth fullScreen={isMobile}>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <LinkIcon color="primary" />
        Welcome to Kinvia
      </DialogTitle>
      <DialogContent>
        {step === "profile" && (
          <Box sx={{ pt: 1 }}>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Complete your profile to continue.
            </Typography>
            <TextField
              fullWidth
              label="Username"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={profileEmail}
              onChange={(e) => setProfileEmail(e.target.value)}
              sx={{ mb: 1 }}
            />
            <Typography variant="caption" color="text.secondary">
              Username, email, and privacy policy acceptance are required for
              first-time login.
            </Typography>
            <FormControlLabel
              sx={{ mt: 1 }}
              control={
                <Checkbox
                  checked={privacyAccepted}
                  onChange={(e) => setPrivacyAccepted(e.target.checked)}
                />
              }
              label={
                <Typography variant="body2">
                  I agree to the{" "}
                  <Link
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    underline="hover"
                  >
                    Terms of Use
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    underline="hover"
                  >
                    Privacy Policy
                  </Link>
                  .
                </Typography>
              }
            />
          </Box>
        )}

        {step === "link" && (
          <Box>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Link your account to your person record in the family tree
              (optional).
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              <strong>What this means:</strong> Linking connects your login
              account with your existing person profile in the tree. After
              linking, admins can identify you correctly and your
              profile-related actions are tied to that person record.
            </Alert>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Search your name in your location and select the correct person. If
              you are not sure, you can skip this step and do it later from the
              Profile page.
            </Typography>
            <Box sx={{ mb: 2 }}>
              <LocationPicker
                label="Select Location"
                value={locationOption}
                onChange={handleLocationChange}
              />
            </Box>

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
              locationId={selectedLocation}
              disabled={!selectedLocation}
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
            {hasAssignedLocation ? (
              <Box>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Location assignment is already approved.
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
                  Request location access now? (optional)
                </Typography>
                <Alert severity="info" sx={{ mb: 2 }}>
                  <strong>What this means:</strong> Location access lets an admin
                  manage data for a specific location (for example people,
                  businesses, and related records for that location).
                </Alert>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  Choose the location you want access to. A superadmin will
                  review and approve or reject your request.
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <LocationPicker
                    label="Select Location"
                    value={locationOption}
                    onChange={handleLocationChange}
                  />
                </Box>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Request Note (Optional)"
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 1, display: "block" }}
                >
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
        {step === "profile" && (
          <Button
            variant="contained"
            onClick={handleCompleteProfile}
            disabled={savingProfile}
            startIcon={
              savingProfile ? <CircularProgress size={16} /> : undefined
            }
          >
            {savingProfile ? "Saving..." : "Save & Continue"}
          </Button>
        )}

        {step === "link" && (
          <>
            <Button
              onClick={() => {
                if (needsLocationRequest) {
                  setStep("request");
                } else {
                  handleCloseDialog();
                }
              }}
              color="inherit"
            >
              Skip for now
            </Button>
            <Button
              variant="contained"
              onClick={handleLink}
              disabled={!selectedPerson || linking}
              startIcon={
                linking ? <CircularProgress size={16} /> : <LinkIcon />
              }
              sx={{ background: `linear-gradient(135deg, ${brand.primary}, ${brand.accent})` }}
            >
              {linking ? "Linking..." : "Link My Account"}
            </Button>
          </>
        )}

        {step === "request" && (
          <>
            <Button onClick={handleCloseDialog} color="inherit">
              Skip for now
            </Button>
            <Button
              variant="contained"
              onClick={
                hasAssignedLocation
                  ? handleCloseDialog
                  : handleRequestLocationAccess
              }
              disabled={
                hasAssignedLocation ? false : !selectedLocation || requesting
              }
              startIcon={
                requesting ? <CircularProgress size={16} /> : undefined
              }
              sx={{ background: `linear-gradient(135deg, ${brand.primary}, ${brand.accent})` }}
            >
              {hasAssignedLocation
                ? "Done"
                : requesting
                  ? "Submitting..."
                  : "Submit Request"}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};
