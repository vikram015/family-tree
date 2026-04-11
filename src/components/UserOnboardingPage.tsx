import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Autocomplete,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Paper,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import { useNavigate, useSearchParams } from "react-router-dom";
import AddTree from "./AddTree/AddTree";
import { useAuth } from "./hooks/useAuth";
import { useVillage } from "./hooks/useVillage";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  fetchAllSubCastes,
  fetchCastes,
  selectCastes,
  selectCastesLoading,
  selectSubCastes,
  selectSubCastesLoading,
} from "../store/slices/casteSlice";
import {
  clearUserOnboardingMatches,
  fetchUserOnboarding,
  searchUserOnboardingMatches,
  selectEffectiveUserOnboardingData,
  selectUserOnboardingError,
  selectUserOnboardingLoaded,
  selectUserOnboardingLoading,
  selectUserOnboardingMatchError,
  selectUserOnboardingMatchResults,
  selectUserOnboardingMatchesLoading,
  selectUserOnboardingSaving,
  updateUserOnboarding,
} from "../store/slices/userOnboardingSlice";
import {
  ApiService,
  LinkRequest,
  LocationCombinationOption,
} from "../services/apiService";
import { OnboardingTreePreviewDialog } from "./OnboardingTreePreviewDialog";

const STEP_INDEX: Record<string, number> = {
  profile: 0,
  location: 1,
  match: 2,
  complete: 2,
};

function nowIso() {
  return new Date().toISOString();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderHighlightedText(value: string, searchTerm: string) {
  const trimmedSearch = searchTerm.trim();
  if (!trimmedSearch) {
    return value;
  }

  const pattern = new RegExp(`(${escapeRegExp(trimmedSearch)})`, "ig");
  const parts = value.split(pattern);

  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === trimmedSearch.toLowerCase() ? (
          <Box
            key={`${part}-${index}`}
            component="mark"
            sx={{
              px: 0.5,
              py: 0,
              borderRadius: 0.5,
              bgcolor: "warning.light",
              color: "text.primary",
            }}
          >
            {part}
          </Box>
        ) : (
          <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>
        ),
      )}
    </>
  );
}

export const UserOnboardingPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { currentUser, userProfile, loading, updateUserProfile } = useAuth();
  const { setSelectedVillage } = useVillage();
  const castes = useAppSelector(selectCastes);
  const subCastes = useAppSelector(selectSubCastes);
  const castesLoading = useAppSelector(selectCastesLoading);
  const subCastesLoading = useAppSelector(selectSubCastesLoading);
  const onboarding = useAppSelector(selectEffectiveUserOnboardingData);
  const onboardingLoading = useAppSelector(selectUserOnboardingLoading);
  const onboardingLoaded = useAppSelector(selectUserOnboardingLoaded);
  const onboardingSaving = useAppSelector(selectUserOnboardingSaving);
  const onboardingError = useAppSelector(selectUserOnboardingError);
  const matchResults = useAppSelector(selectUserOnboardingMatchResults);
  const matchesLoading = useAppSelector(selectUserOnboardingMatchesLoading);
  const matchError = useAppSelector(selectUserOnboardingMatchError);
  const matchedTrees = useMemo(
    () => matchResults.filter((tree) => tree.matchedPeople.length > 0),
    [matchResults],
  );
  const otherTrees = useMemo(
    () => matchResults.filter((tree) => tree.matchedPeople.length === 0),
    [matchResults],
  );

  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [selectedVillageId, setSelectedVillageId] = useState("");
  const [selectedStateId, setSelectedStateId] = useState("");
  const [selectedDistrictId, setSelectedDistrictId] = useState("");
  const [selectedCasteId, setSelectedCasteId] = useState("");
  const [selectedSubCasteId, setSelectedSubCasteId] = useState("");
  const [matchSearchName, setMatchSearchName] = useState("");
  const [locationInputValue, setLocationInputValue] = useState("");
  const [locationOptions, setLocationOptions] = useState<LocationCombinationOption[]>(
    [],
  );
  const [selectedLocationOption, setSelectedLocationOption] =
    useState<LocationCombinationOption | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [localError, setLocalError] = useState("");
  const [linkRequestSuccess, setLinkRequestSuccess] = useState("");
  const [myLinkRequests, setMyLinkRequests] = useState<LinkRequest[]>([]);
  const [linkRequestLoading, setLinkRequestLoading] = useState(false);
  const [linkRequestSubmittingPersonId, setLinkRequestSubmittingPersonId] =
    useState<string | null>(null);
  const [createTreeOpen, setCreateTreeOpen] = useState(false);
  const previewTreeId = searchParams.get("previewTreeId");
  const previewTreeName = searchParams.get("previewTreeName");
  const previewPersonId = searchParams.get("previewPersonId");
  const [stepOverride, setStepOverride] = useState<null | "profile" | "location" | "match">(null);
  const hydratedSnapshotRef = useRef("");
  const lastSearchKeyRef = useRef("");
  const locationRequestIdRef = useRef(0);
  const previousSelectedCasteRef = useRef("");
  const displayStep = stepOverride || onboarding.currentStep;
  const searchDisplayName = useMemo(
    () =>
      (
        matchSearchName ||
        onboarding.match.searchName ||
        profileName ||
        onboarding.profile.name ||
        userProfile?.name ||
        ""
      ).trim(),
    [
      matchSearchName,
      onboarding.match.searchName,
      onboarding.profile.name,
      profileName,
      userProfile?.name,
    ],
  );

  const filteredSubCastes = useMemo(
    () =>
      subCastes.filter(
        (subCaste: any) =>
          !selectedCasteId || subCaste.casteId === selectedCasteId,
      ),
    [subCastes, selectedCasteId],
  );

  const selectedCaste = useMemo(
    () => castes.find((caste: any) => caste.id === selectedCasteId) || null,
    [castes, selectedCasteId],
  );
  const selectedSubCaste = useMemo(
    () =>
      filteredSubCastes.find(
        (subCaste: any) => subCaste.id === selectedSubCasteId,
      ) || null,
    [filteredSubCastes, selectedSubCasteId],
  );
  const pendingUserNodeLinkRequest = useMemo(
    () =>
      myLinkRequests.find(
        (request) =>
          request.requestType === "user_to_tree_node" &&
          request.status === "pending",
      ) || null,
    [myLinkRequests],
  );

  useEffect(() => {
    if (!currentUser || loading || userProfile?.role !== "admin") {
      return;
    }

    if (!onboardingLoaded && !onboardingLoading) {
      dispatch(fetchUserOnboarding());
    }
  }, [
    currentUser,
    loading,
    userProfile?.role,
    onboardingLoaded,
    onboardingLoading,
    dispatch,
  ]);

  useEffect(() => {
    if (castes.length === 0 && !castesLoading) {
      dispatch(fetchCastes());
    }
    if (subCastes.length === 0 && !subCastesLoading) {
      dispatch(fetchAllSubCastes());
    }
  }, [
    castes.length,
    castesLoading,
    dispatch,
    subCastes.length,
    subCastesLoading,
  ]);

  useEffect(() => {
    if (!currentUser) {
      setMyLinkRequests([]);
      return;
    }

    let active = true;
    setLinkRequestLoading(true);

    ApiService.getMyLinkRequests()
      .then((rows) => {
        if (!active) {
          return;
        }
        setMyLinkRequests(rows || []);
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        console.error("Failed to load link requests:", error);
      })
      .finally(() => {
        if (active) {
          setLinkRequestLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [currentUser]);

  useEffect(() => {
    const snapshot = JSON.stringify(onboarding);
    if (!onboardingLoaded || hydratedSnapshotRef.current === snapshot) {
      return;
    }

    hydratedSnapshotRef.current = snapshot;
    setProfileName(onboarding.profile.name || userProfile?.name || "");
    setProfileEmail(onboarding.profile.email || userProfile?.email || "");
    setMatchSearchName(
      onboarding.match.searchName ||
        onboarding.profile.name ||
        userProfile?.name ||
        "",
    );
    if (
      onboarding.location.villageId ||
      onboarding.location.stateId ||
      onboarding.location.districtId ||
      onboarding.location.casteId ||
      onboarding.location.subCasteId ||
      (!selectedVillageId &&
        !selectedStateId &&
        !selectedDistrictId &&
        !selectedCasteId &&
        !selectedSubCasteId)
    ) {
      setSelectedVillageId(onboarding.location.villageId || "");
      setSelectedStateId(onboarding.location.stateId || "");
      setSelectedDistrictId(onboarding.location.districtId || "");
      previousSelectedCasteRef.current = onboarding.location.casteId || "";
      setSelectedCasteId(onboarding.location.casteId || "");
      setSelectedSubCasteId(onboarding.location.subCasteId || "");
    }
  }, [
    onboarding,
    onboardingLoaded,
    selectedCasteId,
    selectedDistrictId,
    selectedStateId,
    selectedSubCasteId,
    selectedVillageId,
    userProfile?.email,
    userProfile?.name,
  ]);

  useEffect(() => {
    if (stepOverride && onboarding.currentStep === stepOverride) {
      setStepOverride(null);
    }
  }, [onboarding.currentStep, stepOverride]);

  useEffect(() => {
    if (
      previousSelectedCasteRef.current &&
      selectedCasteId !== previousSelectedCasteRef.current
    ) {
      setSelectedSubCasteId("");
    }
    previousSelectedCasteRef.current = selectedCasteId;
  }, [selectedCasteId]);

  useEffect(() => {
    if (!onboardingLoaded) {
      return;
    }

    if (!selectedVillageId) {
      setSelectedLocationOption(null);
      if (!locationInputValue) {
        setLocationOptions([]);
      }
      return;
    }

    const currentRequestId = ++locationRequestIdRef.current;
    setLocationLoading(true);

    ApiService.searchLocationCombinations({
      villageId: selectedVillageId,
      limit: 1,
    })
      .then((rows) => {
        if (locationRequestIdRef.current !== currentRequestId) {
          return;
        }
        const option = rows[0] || null;
        setSelectedLocationOption(option);
        if (option) {
          setLocationInputValue(option.label);
        }
        if (option) {
          setLocationOptions((prev) => {
            const remaining = prev.filter(
              (item) => item.villageId !== option.villageId,
            );
            return [option, ...remaining];
          });
        }
      })
      .catch((error: any) => {
        if (locationRequestIdRef.current !== currentRequestId) {
          return;
        }
        console.error("Failed to load selected location combination:", error);
      })
      .finally(() => {
        if (locationRequestIdRef.current === currentRequestId) {
          setLocationLoading(false);
        }
      });
  }, [onboardingLoaded, selectedVillageId]);

  useEffect(() => {
    const query = locationInputValue.trim();

    if (selectedLocationOption?.label === locationInputValue || query.length < 2) {
      if (!query) {
        setLocationOptions((prev) =>
          selectedLocationOption ? [selectedLocationOption] : prev,
        );
      }
      return;
    }

    const timer = window.setTimeout(() => {
      const currentRequestId = ++locationRequestIdRef.current;
      setLocationLoading(true);

      ApiService.searchLocationCombinations({
        query,
        limit: 12,
      })
        .then((rows) => {
          if (locationRequestIdRef.current !== currentRequestId) {
            return;
          }
          setLocationOptions(rows || []);
        })
        .catch((error: any) => {
          if (locationRequestIdRef.current !== currentRequestId) {
            return;
          }
          console.error("Failed to search location combinations:", error);
        })
        .finally(() => {
          if (locationRequestIdRef.current === currentRequestId) {
            setLocationLoading(false);
          }
        });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [locationInputValue, selectedLocationOption]);

  useEffect(() => {
    if (displayStep !== "match") {
      return;
    }

    const villageId = onboarding.location.villageId || selectedVillageId;
    if (!villageId) {
      return;
    }

    const searchKey = JSON.stringify({
      villageId,
      casteId: onboarding.location.casteId || selectedCasteId || null,
      subCasteId: onboarding.location.subCasteId || selectedSubCasteId || null,
    });

    if (lastSearchKeyRef.current === searchKey) {
      return;
    }

    lastSearchKeyRef.current = searchKey;
    dispatch(
      searchUserOnboardingMatches({
        searchName: searchDisplayName || null,
        villageId,
        casteId: onboarding.location.casteId || selectedCasteId || null,
        subCasteId:
          onboarding.location.subCasteId || selectedSubCasteId || null,
      }),
    );
  }, [
    displayStep,
    dispatch,
    onboarding.location.casteId,
    onboarding.location.subCasteId,
    onboarding.location.villageId,
    searchDisplayName,
    selectedCasteId,
    selectedSubCasteId,
    selectedVillageId,
  ]);

  const handleSaveProfile = async () => {
    const trimmedName = profileName.trim();
    const trimmedEmail = profileEmail.trim();

    if (!trimmedName) {
      setLocalError("Name is required.");
      return;
    }

    if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
      setLocalError("Please enter a valid email address.");
      return;
    }

    setLocalError("");
    setStepOverride("location");

    try {
      await updateUserProfile(
        trimmedName,
        userProfile?.phone || "",
        trimmedEmail,
      );
      await dispatch(
        updateUserOnboarding({
          currentStep: "location",
          profile: {
            name: trimmedName,
            email: trimmedEmail,
            completedAt: nowIso(),
          },
          match: {
            searchName: trimmedName,
          },
        }),
      ).unwrap();
      setMatchSearchName(trimmedName);
      dispatch(clearUserOnboardingMatches());
    } catch (error: any) {
      setStepOverride(null);
      setLocalError(error?.message || "Failed to save profile.");
    }
  };

  const handleSaveLocation = async () => {
    if (!selectedStateId || !selectedDistrictId || !selectedVillageId) {
      setLocalError("State, district, and village are required.");
      return;
    }

    if (!selectedCasteId || !selectedSubCasteId) {
      setLocalError("Caste and sub-caste are required.");
      return;
    }

    setLocalError("");
    setSelectedVillage(selectedVillageId);
    setStepOverride("match");

    try {
      await dispatch(
        updateUserOnboarding({
          currentStep: "match",
          location: {
            stateId: selectedStateId,
            districtId: selectedDistrictId,
            villageId: selectedVillageId,
            casteId: selectedCasteId,
            subCasteId: selectedSubCasteId,
            completedAt: nowIso(),
          },
          match: {
            searchedAt: nowIso(),
            selectedTreeId: null,
            selectedPersonId: null,
            action: null,
          },
        }),
      ).unwrap();
      lastSearchKeyRef.current = JSON.stringify({
        villageId: selectedVillageId,
        casteId: selectedCasteId || null,
        subCasteId: selectedSubCasteId || null,
      });
      await dispatch(
        searchUserOnboardingMatches({
          searchName: searchDisplayName || null,
          villageId: selectedVillageId,
          casteId: selectedCasteId,
          subCasteId: selectedSubCasteId,
        }),
      ).unwrap();
    } catch (error: any) {
      setStepOverride(null);
      setLocalError(error?.message || "Failed to save location.");
    }
  };

  const handleBackToLocation = async () => {
    setLocalError("");
    setStepOverride("location");
    lastSearchKeyRef.current = "";
    try {
      await dispatch(
        updateUserOnboarding({
          currentStep: "location",
        }),
      ).unwrap();
    } catch (error: any) {
      setStepOverride(null);
      setLocalError(error?.message || "Failed to return to location.");
    }
  };

  const handleRunMatchSearch = async () => {
    const trimmedSearchName = matchSearchName.trim();

    if (!trimmedSearchName) {
      setLocalError("Please enter a name to search.");
      return;
    }

    if (!selectedVillageId) {
      setLocalError("Please select a location before searching.");
      return;
    }

    setLocalError("");
    setStepOverride("match");
    lastSearchKeyRef.current = "";

    try {
      await dispatch(
        updateUserOnboarding({
          currentStep: "match",
          match: {
            searchName: trimmedSearchName,
            searchedAt: nowIso(),
          },
        }),
      ).unwrap();
      await dispatch(
        searchUserOnboardingMatches({
          searchName: trimmedSearchName,
          villageId: selectedVillageId,
          casteId: selectedCasteId || null,
          subCasteId: selectedSubCasteId || null,
        }),
      ).unwrap();
    } catch (error: any) {
      setStepOverride(null);
      setLocalError(error?.message || "Failed to search trees.");
    }
  };

  const handleCreateLinkRequest = async (personId: string) => {
    setLocalError("");
    setLinkRequestSuccess("");
    setLinkRequestSubmittingPersonId(personId);

    try {
      const created = await ApiService.createUserNodeLinkRequest({
        targetPersonId: personId,
      });
      const rows = await ApiService.getMyLinkRequests("user_to_tree_node");
      setMyLinkRequests(rows || []);
      setLinkRequestSuccess(
        `Link request sent for ${created.targetPersonName || "the selected profile"}. A tree reviewer can approve or reject it.`,
      );
    } catch (error: any) {
      setLocalError(error?.message || "Failed to create link request.");
    } finally {
      setLinkRequestSubmittingPersonId(null);
    }
  };

  const handleOpenCreateTree = async () => {
    setLocalError("");
    await dispatch(
      updateUserOnboarding({
        match: {
          action: "create_tree",
          searchName:
            onboarding.match.searchName || profileName || userProfile?.name || "",
          searchedAt: onboarding.match.searchedAt || nowIso(),
        },
      }),
    ).unwrap();
    setCreateTreeOpen(true);
  };

  const handleTreeCreated = async (treeId: string) => {
    setCreateTreeOpen(false);
    await dispatch(
      updateUserOnboarding({
        status: "completed",
        currentStep: "complete",
        match: {
          ...onboarding.match,
          selectedTreeId: treeId,
          action: "create_tree",
        },
        completion: {
          completedAt: nowIso(),
          result: "created_tree",
        },
      }),
    ).unwrap();
    navigate(`/families?tree=${encodeURIComponent(treeId)}&createRoot=1`, {
      replace: true,
    });
  };

  const renderTreeCard = (tree: (typeof matchResults)[number]) => (
    <Accordion
      key={tree.treeId}
      disableGutters
      elevation={0}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: "12px !important",
        overflow: "hidden",
        "&:before": { display: "none" },
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          sx={{ width: "100%", pr: 1 }}
        >
          <Box>
            <Typography 
              variant="h6"
              color="primary"
              sx={{
                cursor: "pointer",
                display: "inline-block",
                "&:hover": { textDecoration: "underline" }
              }}
              onClick={(e) => {
                e.stopPropagation();
                const newParams = new URLSearchParams(searchParams);
                newParams.set("previewTreeId", tree.treeId);
                newParams.set("previewTreeName", tree.treeName || "");
                newParams.delete("previewPersonId");
                setSearchParams(newParams, { replace: true });
              }}
            >
              {tree.treeName}
            </Typography>
            <Stack
              direction="row"
              spacing={1}
              flexWrap="wrap"
              useFlexGap
              sx={{ mt: 0.75 }}
            >
              <Chip
                size="small"
                icon={<LocationOnOutlinedIcon />}
                label={tree.villageName}
              />
              <Chip size="small" label={tree.casteName || "No caste"} />
              <Chip size="small" label={tree.subCasteName || "No sub-caste"} />
            </Stack>
          </Box>
          <Stack spacing={0.5}>
            <Typography variant="body2" color="text.secondary">
              Owner: {tree.ownerName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Nodes: {tree.totalNodes}
            </Typography>
            {tree.matchedPeople.length > 0 && (
              <Typography variant="body2" sx={{ color: "success.main", fontWeight: 700 }}>
                Name matches: {tree.matchedPeople.length}
              </Typography>
            )}
          </Stack>
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ bgcolor: "background.default" }}>

        {tree.matchedPeople.length > 0 ? (
          <Stack spacing={2}>
            {tree.matchedPeople.map((person) => {
              const isPendingForThisPerson =
                pendingUserNodeLinkRequest?.targetPersonId === person.personId;
              const isBlockedByAnotherPendingRequest = Boolean(
                pendingUserNodeLinkRequest &&
                  pendingUserNodeLinkRequest.targetPersonId !== person.personId,
              );

              return (
                <Box
                  key={person.personId}
                  sx={{
                    p: { xs: 1.25, sm: 2 },
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: "background.paper",
                  }}
                >
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  alignItems={{ xs: "flex-start", sm: "center" }}
                >
                  <Avatar
                    src={person.photoUrl || undefined}
                    alt={person.name}
                    sx={{ width: 56, height: 56 }}
                  >
                    {person.name.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant="subtitle1"
                      color="primary"
                      sx={{
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-block",
                        "&:hover": { textDecoration: "underline" },
                      }}
                      onClick={() => {
                        const newParams = new URLSearchParams(searchParams);
                        newParams.set("previewTreeId", tree.treeId);
                        newParams.set("previewTreeName", tree.treeName || "");
                        newParams.set("previewPersonId", person.personId);
                        setSearchParams(newParams, { replace: true });
                      }}
                    >
                      {renderHighlightedText(person.name, searchDisplayName)}
                    </Typography>
                    {person.nameHindi && (
                      <Typography variant="body2" color="text.secondary">
                        {renderHighlightedText(person.nameHindi, searchDisplayName)}
                      </Typography>
                    )}
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {person.gender || "Unknown gender"}
                      {person.dob ? ` • DOB: ${person.dob}` : ""}
                    </Typography>
                  </Box>
                </Stack>

                {person.parentHierarchy.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography
                      variant="caption"
                      sx={{ color: "text.secondary", display: "block", mb: 1 }}
                    >
                      Family hierarchy
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={0.75}
                      flexWrap="wrap"
                      useFlexGap
                      alignItems="center"
                    >
                      {[
                        ...person.parentHierarchy
                        .slice()
                        .sort((a, b) => b.generation - a.generation)
                        .slice(0, 4)
                        .map((ancestor) => ({
                          key: ancestor.id,
                          label: ancestor.name,
                          highlight: false,
                        })),
                        {
                          key: person.personId,
                          label: person.name,
                          highlight: true,
                        },
                      ].map((node, index, nodes) => (
                        <React.Fragment key={node.key}>
                          <Box
                            sx={{
                              px: 1.25,
                              py: 0.75,
                              borderRadius: 999,
                              border: "1px solid",
                              borderColor: node.highlight ? "success.main" : "divider",
                              bgcolor: node.highlight ? "success.50" : "background.paper",
                              color: node.highlight ? "success.dark" : "text.primary",
                              fontSize: 12,
                              fontWeight: node.highlight ? 700 : 500,
                              lineHeight: 1.2,
                            }}
                          >
                            {node.label}
                          </Box>
                          {index < nodes.length - 1 && (
                            <Typography
                              variant="body2"
                              sx={{
                                color: "text.secondary",
                                fontWeight: 700,
                                px: 0.25,
                              }}
                            >
                              →
                            </Typography>
                          )}
                        </React.Fragment>
                      ))}
                    </Stack>
                  </Box>
                )}

                {!userProfile?.peopleId && (
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    alignItems={{ xs: "stretch", sm: "center" }}
                    justifyContent="space-between"
                    sx={{ mt: 2 }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Request approval from this tree’s owner or editor to link this
                      profile.
                    </Typography>
                    <Button
                      variant={isPendingForThisPerson ? "outlined" : "contained"}
                      disabled={
                        linkRequestLoading ||
                        Boolean(linkRequestSubmittingPersonId) ||
                        isPendingForThisPerson ||
                        isBlockedByAnotherPendingRequest
                      }
                      onClick={() => void handleCreateLinkRequest(person.personId)}
                    >
                      {linkRequestSubmittingPersonId === person.personId
                        ? "Sending..."
                        : isPendingForThisPerson
                          ? "Request pending"
                          : isBlockedByAnotherPendingRequest
                            ? "Another request pending"
                            : "Link profile"}
                    </Button>
                  </Stack>
                )}
              </Box>
              );
            })}
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No direct name match was found in this tree. This result is shown
            because the tree matches your selected village, caste, and sub-caste.
          </Typography>
        )}
      </AccordionDetails>
    </Accordion>
  );

  return (
    <>
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          background:
            "linear-gradient(180deg, rgba(25,118,210,0.08) 0%, rgba(255,255,255,1) 35%)",
        }}
      >
        <Container
          maxWidth="lg"
          sx={{
            py: { xs: 2, sm: 4, md: 6 },
            px: { xs: 0.75, sm: 2, md: 3 },
          }}
        >
          <Paper
            elevation={0}
            sx={{
              borderRadius: { xs: 3, sm: 4 },
              border: "1px solid",
              borderColor: "divider",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                px: { xs: 1.5, sm: 4 },
                py: { xs: 2.5, sm: 4 },
                borderBottom: "1px solid",
                borderColor: "divider",
                background:
                  "linear-gradient(135deg, rgba(25,118,210,0.12), rgba(0,204,153,0.08))",
              }}
            >
              <Typography
                variant={isMobile ? "h5" : "h4"}
                sx={{ fontWeight: 800, mb: 1 }}
              >
                Welcome to Kinvia
              </Typography>
              <Typography
                variant="body1"
                sx={{ color: "text.secondary", maxWidth: 760 }}
              >
                We’ll help you find your family tree or start a new one. This
                setup works best if you complete the steps in order.
              </Typography>
            </Box>

            <Box sx={{ px: { xs: 1.5, sm: 4 }, py: { xs: 1.5, sm: 3 } }}>
              <Stepper
                activeStep={STEP_INDEX[displayStep] ?? 0}
                orientation={isMobile ? "vertical" : "horizontal"}
              >
                <Step>
                  <StepLabel>Basic Info</StepLabel>
                </Step>
                <Step>
                  <StepLabel>Location</StepLabel>
                </Step>
                <Step>
                  <StepLabel>Find Tree</StepLabel>
                </Step>
              </Stepper>
            </Box>

            <Divider />

            <Box sx={{ px: { xs: 1.5, sm: 4 }, py: { xs: 1.5, sm: 4 } }}>
              {(onboardingLoading || !onboardingLoaded) && (
                <Box
                  sx={{
                    minHeight: 280,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CircularProgress />
                </Box>
              )}

              {onboardingLoaded && (
                <Stack spacing={3}>
                  {displayStep === "profile" && (
                    <Stack spacing={2}>
                      <Typography variant="h6">Step 1: Basic information</Typography>
                      <Typography variant="body1" color="text.secondary">
                        Start with your name and email so we can search for your
                        record inside the tree.
                      </Typography>
                      <TextField
                        label="Name"
                        value={profileName}
                        onChange={(event) => setProfileName(event.target.value)}
                        fullWidth
                      />
                      <TextField
                        label="Email"
                        type="email"
                        value={profileEmail}
                        onChange={(event) => setProfileEmail(event.target.value)}
                        fullWidth
                      />
                    </Stack>
                  )}

                  {displayStep === "location" && (
                    <Stack spacing={2}>
                      <Typography variant="h6">Step 2: Location</Typography>
                      <Typography variant="body1" color="text.secondary">
                        Tell us where your family tree belongs. We’ll use this
                        to narrow the search before showing possible matches.
                      </Typography>
                      <Autocomplete
                        options={locationOptions}
                        value={selectedLocationOption}
                        loading={locationLoading}
                        filterOptions={(options) => options}
                        getOptionLabel={(option) => option.label}
                        isOptionEqualToValue={(option, value) =>
                          option.villageId === value.villageId
                        }
                        inputValue={locationInputValue}
                        onInputChange={(_event, value, reason) => {
                          if (reason === "input" || reason === "clear") {
                            setLocationInputValue(value);
                            if (
                              reason === "input" &&
                              selectedLocationOption &&
                              value !== selectedLocationOption.label
                            ) {
                              setSelectedLocationOption(null);
                              setSelectedStateId("");
                              setSelectedDistrictId("");
                              setSelectedVillageId("");
                            }
                            if (!value) {
                              setSelectedLocationOption(null);
                              setSelectedStateId("");
                              setSelectedDistrictId("");
                              setSelectedVillageId("");
                            }
                          }
                        }}
                        onChange={(_event, value) => {
                          setSelectedLocationOption(value);
                          setSelectedStateId(value?.stateId || "");
                          setSelectedDistrictId(value?.districtId || "");
                          setSelectedVillageId(value?.villageId || "");
                          setLocationInputValue(value?.label || "");
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="State, district, village"
                            placeholder="Type village, district, or state"
                          />
                        )}
                        renderOption={(props, option) => (
                          <Box component="li" {...props}>
                            <Box>
                              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                {option.villageName}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {option.districtName}, {option.stateName}
                              </Typography>
                            </Box>
                          </Box>
                        )}
                      />
                      <Autocomplete
                        options={castes}
                        value={selectedCaste}
                        loading={castesLoading}
                        getOptionLabel={(option: any) => option.name}
                        onChange={(_event, value: any | null) => {
                          setSelectedCasteId(value?.id || "");
                        }}
                        renderInput={(params) => (
                          <TextField {...params} label="Caste" />
                        )}
                      />
                      <Autocomplete
                        options={filteredSubCastes}
                        value={selectedSubCaste}
                        loading={subCastesLoading}
                        getOptionLabel={(option: any) => option.name}
                        onChange={(_event, value: any | null) => {
                          setSelectedSubCasteId(value?.id || "");
                        }}
                        renderInput={(params) => (
                          <TextField {...params} label="Sub-caste" />
                        )}
                      />
                    </Stack>
                  )}

                  {displayStep === "match" && (
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="h6" sx={{ mb: 0.5 }}>
                          Step 3: Choose your tree
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                          Trees matching your name are shown first. Other trees
                          from the same village, caste, and sub-caste are
                          listed below.
                        </Typography>
                      </Box>

                      <Paper
                        variant="outlined"
                        sx={{
                          p: { xs: 1.25, sm: 2 },
                          borderRadius: 3,
                          bgcolor: "background.default",
                        }}
                      >
                        <Stack spacing={1.5}>
                          <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={1.5}
                            justifyContent="space-between"
                            alignItems={{ xs: "flex-start", sm: "center" }}
                          >
                            <Box>
                              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                Search criteria
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Review or change the information used to find matching trees.
                              </Typography>
                            </Box>
                            <Stack
                              direction={{ xs: "column", sm: "row" }}
                              spacing={1}
                              sx={{ width: { xs: "100%", sm: "auto" } }}
                            >
                              <Button
                                variant="outlined"
                                size="small"
                                onClick={handleBackToLocation}
                              >
                                Edit location
                              </Button>
                            </Stack>
                          </Stack>

                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            <Chip
                              size="small"
                              color="primary"
                              label={`Name: ${searchDisplayName || "Not set"}`}
                            />
                            <Chip
                              size="small"
                              icon={<LocationOnOutlinedIcon />}
                              label={`Location: ${
                                selectedLocationOption?.label || locationInputValue || "Not set"
                              }`}
                            />
                            <Chip
                              size="small"
                              label={`Caste: ${selectedCaste?.name || "Not set"}`}
                            />
                            <Chip
                              size="small"
                              label={`Sub-caste: ${selectedSubCaste?.name || "Not set"}`}
                            />
                          </Stack>

                          <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={1.5}
                            alignItems={{ xs: "stretch", sm: "flex-end" }}
                          >
                            <TextField
                              fullWidth
                              size="small"
                              label="Search name"
                              value={matchSearchName}
                              onChange={(event) => setMatchSearchName(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  void handleRunMatchSearch();
                                }
                              }}
                              sx={{ flex: 1 }}
                            />
                            <Button
                              variant="contained"
                              onClick={handleRunMatchSearch}
                              disabled={matchesLoading || onboardingSaving}
                              fullWidth={isMobile}
                              sx={{
                                whiteSpace: "nowrap",
                                minWidth: { sm: 140 },
                                alignSelf: { xs: "stretch", sm: "flex-end" },
                              }}
                            >
                              Search again
                            </Button>
                          </Stack>
                        </Stack>
                      </Paper>

                      {matchesLoading && (
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            minHeight: 200,
                          }}
                        >
                          <CircularProgress />
                        </Box>
                      )}

                      {!matchesLoading && (
                        <Stack spacing={2}>
                          {pendingUserNodeLinkRequest && (
                            <Alert severity="info">
                              Your link request for{" "}
                              <strong>
                                {pendingUserNodeLinkRequest.targetPersonName ||
                                  "the selected profile"}
                              </strong>{" "}
                              in{" "}
                              <strong>
                                {pendingUserNodeLinkRequest.targetTreeName ||
                                  "the selected tree"}
                              </strong>{" "}
                              is pending review.
                            </Alert>
                          )}

                          {linkRequestSuccess && (
                            <Alert severity="success">{linkRequestSuccess}</Alert>
                          )}

                          {matchResults.length === 0 && (
                            <Alert severity="info">
                              No matching tree was found yet. You can go back
                              and adjust the filters, or create a new tree.
                            </Alert>
                          )}

                          {matchedTrees.length > 0 && (
                            <Stack spacing={1.5}>
                              <Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                  Trees matching your name
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  These trees contain one or more people with the
                                  same name as your saved profile.
                                </Typography>
                              </Box>
                              {matchedTrees.map(renderTreeCard)}
                            </Stack>
                          )}

                          {otherTrees.length > 0 && (
                            <Stack spacing={1.5}>
                              <Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                  Other matching trees
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  These trees match your selected village, caste,
                                  and sub-caste even though your name was not found
                                  inside them.
                                </Typography>
                              </Box>
                              {otherTrees.map(renderTreeCard)}
                            </Stack>
                          )}

                          <Card
                            variant="outlined"
                            sx={{
                              borderStyle: "dashed",
                              borderColor: "primary.main",
                            }}
                          >
                            <CardContent>
                              <Stack
                                direction={{ xs: "column", md: "row" }}
                                spacing={2}
                                justifyContent="space-between"
                                alignItems={{ xs: "flex-start", md: "center" }}
                              >
                                <Box>
                                  <Typography variant="h6">
                                    Create a new family tree
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    If none of the matches belong to you, start a
                                    new tree with the selected location already
                                    filled in.
                                  </Typography>
                                </Box>
                                <Button
                                  variant="outlined"
                                  startIcon={<AddIcon />}
                                  onClick={handleOpenCreateTree}
                                >
                                  Create new tree
                                </Button>
                              </Stack>
                            </CardContent>
                          </Card>
                        </Stack>
                      )}
                    </Stack>
                  )}

                  {(localError || onboardingError || matchError) && (
                    <Alert severity="error">
                      {localError || onboardingError || matchError}
                    </Alert>
                  )}
                </Stack>
              )}
            </Box>

            <Divider />

            <Box
              sx={{
                px: { xs: 1.5, sm: 4 },
                py: 2,
                display: "flex",
                justifyContent: displayStep === "match"
                  ? "space-between"
                  : "flex-end",
                alignItems: "center",
                gap: 2,
                flexWrap: "wrap",
                backgroundColor: "background.paper",
              }}
            >
              {displayStep === "match" && (
                <Button color="inherit" onClick={handleBackToLocation}>
                  Back to location
                </Button>
              )}

              {displayStep === "profile" && (
                <Button
                  variant="contained"
                  onClick={handleSaveProfile}
                  disabled={onboardingSaving}
                  startIcon={
                    onboardingSaving ? <CircularProgress size={16} /> : undefined
                  }
                >
                  {onboardingSaving ? "Saving..." : "Next: Location"}
                </Button>
              )}

              {displayStep === "location" && (
                <Button
                  variant="contained"
                  onClick={handleSaveLocation}
                  disabled={onboardingSaving}
                  startIcon={
                    onboardingSaving ? <CircularProgress size={16} /> : undefined
                  }
                >
                  {onboardingSaving ? "Saving..." : "Next: Search Trees"}
                </Button>
              )}
            </Box>
          </Paper>
        </Container>
      </Box>

      <AddTree
        hideTrigger
        open={createTreeOpen}
        onClose={() => setCreateTreeOpen(false)}
        initialVillageId={selectedVillageId || onboarding.location.villageId || undefined}
        initialCasteId={selectedCasteId || onboarding.location.casteId || undefined}
        initialSubCasteId={
          selectedSubCasteId || onboarding.location.subCasteId || undefined
        }
        title="Create your family tree"
        onCreate={handleTreeCreated}
      />

      <OnboardingTreePreviewDialog
        open={Boolean(previewTreeId)}
        treeId={previewTreeId!}
        treeName={previewTreeName}
        personId={previewPersonId}
        myLinkRequests={myLinkRequests}
        onClose={() => {
          const newParams = new URLSearchParams(searchParams);
          newParams.delete("previewTreeId");
          newParams.delete("previewTreeName");
          newParams.delete("previewPersonId");
          setSearchParams(newParams, { replace: true });
        }}
      />
    </>
  );
};
