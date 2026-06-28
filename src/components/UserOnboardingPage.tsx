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
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
  createFilterOptions,
  type FilterOptionsState,
  InputAdornment,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
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
import { FullScreenMobileAutocomplete } from "./FullScreenMobilePicker";

const STEP_INDEX: Record<string, number> = {
  profile: 0,
  location: 1,
  match: 2,
  complete: 2,
};
const ONBOARDING_STEPS = [
  { key: "profile", label: "Your Info" },
  { key: "location", label: "Community" },
  { key: "match", label: "Find Family Tree" },
] as const;
const onboardingBlue = "#0d6efd";
const onboardingGreen = "#16a34a";
const profileFormMaxWidth = 560;
const locationFormMaxWidth = 640;

type OnboardingHistoryStep = "profile" | "location" | "match";
type LookupOption = {
  id: string;
  name: string;
  casteId?: string;
};

type CreateLookupOption = {
  id: string;
  name: string;
  inputValue: string;
  isCreateOption: true;
};

type LookupAutocompleteOption = LookupOption | CreateLookupOption;

type CreatableLocationOption = LocationCombinationOption & {
  isCreateOption?: boolean;
  inputValue?: string;
};

const CREATE_LOCATION_OPTION_ID = "__create_location__";
const lookupFilter = createFilterOptions<LookupAutocompleteOption>();

function isCreateLookupOption(
  option: LookupAutocompleteOption,
): option is CreateLookupOption {
  return "isCreateOption" in option;
}

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
  const [casteInputValue, setCasteInputValue] = useState("");
  const [subCasteInputValue, setSubCasteInputValue] = useState("");
  const [lookupSaving, setLookupSaving] = useState(false);
  const [matchSearchName, setMatchSearchName] = useState("");
  const [locationInputValue, setLocationInputValue] = useState("");
  const [locationOptions, setLocationOptions] = useState<LocationCombinationOption[]>(
    [],
  );
  const [selectedLocationOption, setSelectedLocationOption] =
    useState<LocationCombinationOption | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [createVillageOpen, setCreateVillageOpen] = useState(false);
  const [createVillageName, setCreateVillageName] = useState("");
  const [createVillageStateId, setCreateVillageStateId] = useState("");
  const [createVillageDistrictId, setCreateVillageDistrictId] = useState("");
  const [createVillageStates, setCreateVillageStates] = useState<any[]>([]);
  const [createVillageDistricts, setCreateVillageDistricts] = useState<any[]>([]);
  const [createVillageLoadingStates, setCreateVillageLoadingStates] = useState(false);
  const [createVillageLoadingDistricts, setCreateVillageLoadingDistricts] =
    useState(false);
  const [createVillageSaving, setCreateVillageSaving] = useState(false);
  const [createVillageError, setCreateVillageError] = useState("");
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
  const historyInitializedRef = useRef(false);
  const historyStepRef = useRef<OnboardingHistoryStep | null>(null);
  const previewOpenedFromOnboardingRef = useRef(false);
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
  const trimmedLocationQuery = locationInputValue.trim();
  const shouldShowLocationSuggestions =
    trimmedLocationQuery.length >= 2 &&
    selectedLocationOption?.label !== locationInputValue;
  const locationOptionsWithCreate = useMemo<CreatableLocationOption[]>(() => {
    const options = locationOptions as CreatableLocationOption[];
    if (
      trimmedLocationQuery.length < 2 ||
      locationLoading ||
      selectedLocationOption?.label === locationInputValue
    ) {
      return options;
    }

    const query = trimmedLocationQuery.toLowerCase();
    const exactMatch = options.some(
      (option) =>
        option.villageName.toLowerCase() === query ||
        option.label.toLowerCase() === query,
    );

    if (exactMatch) {
      return options;
    }

    return [
      ...options,
      {
        stateId: "",
        stateName: "",
        districtId: "",
        districtName: "",
        villageId: CREATE_LOCATION_OPTION_ID,
        villageName: `Add "${trimmedLocationQuery}"`,
        label: `Add "${trimmedLocationQuery}"`,
        isCreateOption: true,
        inputValue: trimmedLocationQuery,
      },
    ];
  }, [
    locationInputValue,
    locationLoading,
    locationOptions,
    selectedLocationOption?.label,
    trimmedLocationQuery,
  ]);

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
  const selectedCreateVillageState = useMemo(
    () =>
      createVillageStates.find(
        (state: any) => state.id === createVillageStateId,
      ) || null,
    [createVillageStateId, createVillageStates],
  );
  const selectedCreateVillageDistrict = useMemo(
    () =>
      createVillageDistricts.find(
        (district: any) => district.id === createVillageDistrictId,
      ) || null,
    [createVillageDistrictId, createVillageDistricts],
  );
  const buildCreatableLookupOptions = (
    options: LookupOption[],
    params: FilterOptionsState<LookupAutocompleteOption>,
    label: string,
  ): LookupAutocompleteOption[] => {
    const trimmedValue = params.inputValue.trim();
    const filtered = lookupFilter(options, params);

    if (!trimmedValue) {
      return filtered;
    }

    const hasExactMatch = options.some(
      (option) =>
        option.name.trim().toLowerCase() === trimmedValue.toLowerCase(),
    );

    if (!hasExactMatch) {
      filtered.push({
        id: `create-${label}-${trimmedValue}`,
        name: `Add "${trimmedValue}" as new ${label}`,
        inputValue: trimmedValue,
        isCreateOption: true,
      });
    }

    return filtered;
  };
  const pendingUserNodeLinkRequest = useMemo(
    () =>
      myLinkRequests.find(
        (request) =>
          request.requestType === "user_to_tree_node" &&
          request.status === "pending",
      ) || null,
    [myLinkRequests],
  );
  const activeStepIndex = STEP_INDEX[displayStep] ?? 0;
  const profilePhone = userProfile?.phone || currentUser?.phoneNumber || "";
  const actionMaxWidth =
    displayStep === "profile"
      ? profileFormMaxWidth
      : displayStep === "location"
        ? locationFormMaxWidth
        : "none";
  const inputCardSx = {
    "& .MuiInputLabel-root": {
      left: 52,
      top: 8,
      transform: "none",
      color: "#475569",
      fontSize: 12,
      fontWeight: 600,
      lineHeight: 1.2,
      pointerEvents: "none",
      zIndex: 1,
      "&.Mui-focused": {
        color: "#475569",
      },
      "&.Mui-disabled": {
        color: "#64748b",
      },
      "&.MuiInputLabel-shrink": {
        transform: "none",
      },
    },
    "& .MuiOutlinedInput-root": {
      minHeight: 64,
      borderRadius: 2,
      bgcolor: "#ffffff",
      boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
      alignItems: "flex-end",
      "& fieldset": {
        borderColor: "rgba(15,23,42,0.14)",
        top: 0,
      },
      "& legend": {
        display: "none",
      },
      "&:hover fieldset": {
        borderColor: "rgba(13,110,253,0.45)",
      },
      "&.Mui-focused fieldset": {
        borderColor: onboardingBlue,
      },
    },
    "& .MuiOutlinedInput-input": {
      pt: 3,
      pb: 1.25,
      fontWeight: 600,
      color: "#0f172a",
    },
    "& .MuiInputAdornment-root": {
      mt: "0 !important",
      alignSelf: "center",
      color: "#0f172a",
    },
  };
  const primaryOnboardingButtonSx = {
    minHeight: 48,
    px: 4,
    borderRadius: 2,
    bgcolor: onboardingBlue,
    boxShadow: "0 10px 20px rgba(13,110,253,0.22)",
    fontWeight: 800,
    textTransform: "none",
    "&:hover": {
      bgcolor: "#0b5ed7",
      boxShadow: "0 12px 22px rgba(13,110,253,0.26)",
    },
  };
  const secondaryOnboardingButtonSx = {
    minHeight: 48,
    px: 3,
    borderRadius: 2,
    borderColor: "rgba(13,110,253,0.45)",
    color: onboardingBlue,
    bgcolor: "#ffffff",
    fontWeight: 800,
    textTransform: "none",
    "&:hover": {
      borderColor: onboardingBlue,
      bgcolor: "rgba(13,110,253,0.06)",
    },
  };
  const renderOnboardingStepRail = () => (
    <Stack
      direction="row"
      alignItems="flex-start"
      justifyContent="center"
      spacing={{ xs: 1, sm: 2 }}
      sx={{ width: "100%", maxWidth: 620, mx: "auto" }}
    >
      {ONBOARDING_STEPS.map((step, index) => {
        const completed = index < activeStepIndex;
        const active = index === activeStepIndex;
        const color = completed ? onboardingGreen : active ? onboardingBlue : "#cbd5e1";
        return (
          <React.Fragment key={step.key}>
            <Stack alignItems="center" spacing={0.75} sx={{ minWidth: { xs: 76, sm: 120 } }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  bgcolor: color,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: 14,
                  boxShadow: active ? "0 8px 18px rgba(13,110,253,0.26)" : "none",
                }}
              >
                {completed ? <CheckCircleIcon sx={{ fontSize: 18 }} /> : index + 1}
              </Box>
              <Typography
                variant="caption"
                sx={{
                  color: active || completed ? "#0f172a" : "#64748b",
                  fontWeight: active ? 800 : 600,
                  textAlign: "center",
                }}
              >
                {step.label}
              </Typography>
            </Stack>
            {index < ONBOARDING_STEPS.length - 1 && (
              <Box
                sx={{
                  flex: 1,
                  height: 2,
                  mt: 2,
                  maxWidth: 160,
                  bgcolor: index < activeStepIndex ? onboardingGreen : "#e2e8f0",
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </Stack>
  );

  const normalizeHistoryStep = (
    step?: string | null,
  ): OnboardingHistoryStep => {
    if (step === "location" || step === "match") {
      return step;
    }

    return "profile";
  };

  const updateHistoryStep = (
    step: OnboardingHistoryStep,
    mode: "push" | "replace",
  ) => {
    const nextState = {
      ...(window.history.state || {}),
      onboardingFlow: "user-onboarding",
      onboardingStep: step,
    };

    if (mode === "replace") {
      window.history.replaceState(nextState, "", window.location.href);
    } else {
      window.history.pushState(nextState, "", window.location.href);
    }

    historyStepRef.current = step;
  };

  const openPreview = (treeId: string, treeName?: string | null, personId?: string | null) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("previewTreeId", treeId);
    newParams.set("previewTreeName", treeName || "");
    if (personId) {
      newParams.set("previewPersonId", personId);
    } else {
      newParams.delete("previewPersonId");
    }
    previewOpenedFromOnboardingRef.current = true;
    setSearchParams(newParams);
  };

  const closePreview = () => {
    if (previewOpenedFromOnboardingRef.current) {
      previewOpenedFromOnboardingRef.current = false;
      navigate(-1);
      return;
    }

    const newParams = new URLSearchParams(searchParams);
    newParams.delete("previewTreeId");
    newParams.delete("previewTreeName");
    newParams.delete("previewPersonId");
    setSearchParams(newParams, { replace: true });
  };

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
    if (!onboardingLoaded || historyInitializedRef.current) {
      return;
    }

    const initialStep = normalizeHistoryStep(onboarding.currentStep);
    updateHistoryStep("profile", "replace");

    if (initialStep === "location" || initialStep === "match") {
      updateHistoryStep("location", "push");
    }

    if (initialStep === "match") {
      updateHistoryStep("match", "push");
    }

    historyInitializedRef.current = true;
  }, [onboarding.currentStep, onboardingLoaded]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (!historyInitializedRef.current) {
        return;
      }

      const targetStep = event.state?.onboardingStep as OnboardingHistoryStep | undefined;
      const targetFlow = event.state?.onboardingFlow;

      if (targetFlow !== "user-onboarding" || !targetStep) {
        return;
      }

      historyStepRef.current = targetStep;
      setLocalError("");
      setStepOverride(targetStep);

      if (targetStep === "location") {
        lastSearchKeyRef.current = "";
      }

      void dispatch(
        updateUserOnboarding({
          currentStep: targetStep,
        }),
      )
        .unwrap()
        .catch((error: any) => {
          setStepOverride(null);
          setLocalError(error?.message || "Failed to update onboarding step.");
        });
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [dispatch]);

  useEffect(() => {
    if (!previewTreeId) {
      previewOpenedFromOnboardingRef.current = false;
    }
  }, [previewTreeId]);

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
    if (selectedCaste) {
      setCasteInputValue(selectedCaste.name);
    }
  }, [selectedCaste]);

  useEffect(() => {
    if (selectedSubCaste) {
      setSubCasteInputValue(selectedSubCaste.name);
    }
  }, [selectedSubCaste]);

  useEffect(() => {
    if (!onboardingLoaded) {
      return;
    }

    if (!selectedVillageId) {
      setSelectedLocationOption(null);
      setLocationOptions([]);
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
    if (!createVillageOpen || createVillageStates.length > 0) {
      return;
    }

    let active = true;
    setCreateVillageLoadingStates(true);
    ApiService.getStates()
      .then((rows) => {
        if (active) {
          setCreateVillageStates(rows || []);
        }
      })
      .catch((error: any) => {
        if (active) {
          setCreateVillageError(error?.message || "Failed to load states.");
        }
      })
      .finally(() => {
        if (active) {
          setCreateVillageLoadingStates(false);
        }
      });

    return () => {
      active = false;
    };
  }, [createVillageOpen, createVillageStates.length]);

  useEffect(() => {
    if (!createVillageOpen || !createVillageStateId) {
      setCreateVillageDistricts([]);
      setCreateVillageDistrictId("");
      return;
    }

    let active = true;
    setCreateVillageLoadingDistricts(true);
    ApiService.getDistricts(createVillageStateId)
      .then((rows) => {
        if (active) {
          setCreateVillageDistricts(rows || []);
        }
      })
      .catch((error: any) => {
        if (active) {
          setCreateVillageError(error?.message || "Failed to load districts.");
        }
      })
      .finally(() => {
        if (active) {
          setCreateVillageLoadingDistricts(false);
        }
      });

    return () => {
      active = false;
    };
  }, [createVillageOpen, createVillageStateId]);

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
      updateHistoryStep("location", "push");
      setMatchSearchName(trimmedName);
      dispatch(clearUserOnboardingMatches());
    } catch (error: any) {
      setStepOverride(null);
      setLocalError(error?.message || "Failed to save profile.");
    }
  };

  const handleOpenCreateVillage = (villageName?: string) => {
    setCreateVillageName(villageName || trimmedLocationQuery);
    setCreateVillageStateId(selectedStateId || "");
    setCreateVillageDistrictId(selectedDistrictId || "");
    setCreateVillageError("");
    setCreateVillageOpen(true);
  };

  const handleCloseCreateVillage = () => {
    if (createVillageSaving) {
      return;
    }
    setCreateVillageOpen(false);
    setCreateVillageError("");
  };

  const handleCreateVillage = async () => {
    const villageName = createVillageName.trim();
    if (!createVillageStateId || !createVillageDistrictId || !villageName) {
      setCreateVillageError("State, district, and village name are required.");
      return;
    }

    setCreateVillageSaving(true);
    setCreateVillageError("");
    setLocalError("");

    try {
      const state = selectedCreateVillageState;
      const district = selectedCreateVillageDistrict;
      if (!state || !district) {
        setCreateVillageError("State and district are required.");
        return;
      }

      const village = await ApiService.createVillage({
        name: villageName,
        districtId: createVillageDistrictId,
      });
      const option = {
        stateId: state.id,
        stateName: state.name,
        districtId: district.id,
        districtName: district.name,
        villageId: village.id,
        villageName: village.name,
        label: [village.name, district.name, state.name].join(", "),
      };

      setSelectedLocationOption(option);
      setSelectedStateId(option.stateId);
      setSelectedDistrictId(option.districtId);
      setSelectedVillageId(option.villageId);
      setLocationInputValue(option.label);
      setLocationOptions((prev) => {
        const remaining = prev.filter(
          (item) => item.villageId !== option.villageId,
        );
        return [option, ...remaining];
      });
      setCreateVillageOpen(false);
      setSelectedVillage(option.villageId);
      await dispatch(
        updateUserOnboarding({
          location: {
            stateId: option.stateId,
            districtId: option.districtId,
            villageId: option.villageId,
          },
        }),
      ).unwrap();
    } catch (error: any) {
      setCreateVillageError(error?.message || "Failed to create village.");
    } finally {
      setCreateVillageSaving(false);
    }
  };

  const handleCreateCaste = async (nameToCreate: string) => {
    const trimmedName = nameToCreate.trim();
    if (!trimmedName) {
      return;
    }

    setLookupSaving(true);
    setLocalError("");

    try {
      const created = await ApiService.createCaste({ name: trimmedName });
      await dispatch(fetchCastes()).unwrap();
      setSelectedCasteId(created.id);
      setSelectedSubCasteId("");
      setCasteInputValue(created.name);
      setSubCasteInputValue("");
      previousSelectedCasteRef.current = created.id;
    } catch (error: any) {
      setLocalError(error?.message || "Failed to create caste.");
    } finally {
      setLookupSaving(false);
    }
  };

  const handleCreateSubCaste = async (nameToCreate: string) => {
    const trimmedName = nameToCreate.trim();
    if (!trimmedName) {
      return;
    }
    if (!selectedCasteId) {
      setLocalError("Select caste before adding a sub-caste.");
      return;
    }

    setLookupSaving(true);
    setLocalError("");

    try {
      const created = await ApiService.createSubCaste({
        name: trimmedName,
        casteId: selectedCasteId,
      });
      await dispatch(fetchAllSubCastes()).unwrap();
      setSelectedSubCasteId(created.id);
      setSubCasteInputValue(created.name);
    } catch (error: any) {
      setLocalError(error?.message || "Failed to create sub-caste.");
    } finally {
      setLookupSaving(false);
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
      updateHistoryStep("match", "push");
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
      updateHistoryStep("location", "push");
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

  const handleCreateLinkRequest = async (personId: string, treeId: string) => {
    setLocalError("");
    setLinkRequestSuccess("");
    setLinkRequestSubmittingPersonId(personId);

    try {
      await ApiService.createUserNodeLinkRequest({
        targetPersonId: personId,
      });
      await handleOnboardingRequestCompleted({
        requestType: "user_to_tree_node",
        treeId,
        personId,
      });
    } catch (error: any) {
      setLocalError(error?.message || "Failed to create link request.");
    } finally {
      setLinkRequestSubmittingPersonId(null);
    }
  };

  const handleOnboardingRequestCompleted = async (input: {
    requestType: "user_to_tree_node" | "branch_access_request";
    treeId: string;
    personId: string;
  }) => {
    const targetUrl = input.treeId
      ? `/families?tree=${encodeURIComponent(input.treeId)}&personId=${encodeURIComponent(
          input.personId,
        )}`
      : "/families";

    await dispatch(
      updateUserOnboarding({
        status: "completed",
        currentStep: "complete",
        match: {
          ...onboarding.match,
          selectedTreeId: input.treeId,
          selectedPersonId: input.personId,
          action: "link",
        },
        completion: {
          completedAt: nowIso(),
          result: "linked",
        },
      }),
    ).unwrap();
    await dispatch(fetchUserOnboarding()).unwrap();
    navigate(targetUrl, { replace: true });
  };

  const handleOpenCreateTree = async () => {
    setLocalError("");
    setCreateTreeOpen(true);
  };

  const handleTreeCreated = async (treeId: string) => {
    setCreateTreeOpen(false);
    const resp = await dispatch(
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
    console.log("Updated onboarding after tree creation:", resp);
    if (selectedVillageId) {
      setSelectedVillage(selectedVillageId);
    }
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
        borderColor: "rgba(15,23,42,0.12)",
        borderRadius: "16px !important",
        overflow: "hidden",
        bgcolor: "#ffffff",
        boxShadow: "0 10px 28px rgba(15,23,42,0.06)",
        "&:before": { display: "none" },
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: { xs: 1.5, sm: 2 } }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          sx={{ width: "100%", pr: 1 }}
        >
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Avatar
              sx={{
                width: 42,
                height: 42,
                bgcolor: tree.matchedPeople.length > 0 ? "#dcfce7" : "#f1f5f9",
                color: tree.matchedPeople.length > 0 ? "#15803d" : "#64748b",
                fontWeight: 900,
              }}
            >
              {tree.matchedPeople.length || "•"}
            </Avatar>
            <Box>
            <Typography 
              variant="h6"
              color="text.primary"
              sx={{
                cursor: "pointer",
                display: "inline-block",
                fontWeight: 900,
                "&:hover": { textDecoration: "underline" }
              }}
              onClick={(e) => {
                e.stopPropagation();
                openPreview(tree.treeId, tree.treeName);
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
                sx={{ bgcolor: "#f8fafc" }}
              />
              <Chip size="small" label={tree.casteName || "No caste"} sx={{ bgcolor: "#f8fafc" }} />
              <Chip size="small" label={tree.subCasteName || "No sub-caste"} sx={{ bgcolor: "#f8fafc" }} />
            </Stack>
          </Box>
          </Stack>
          <Stack spacing={0.5} sx={{ minWidth: { sm: 170 } }}>
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
      <AccordionDetails sx={{ bgcolor: "#f8fafc", px: { xs: 1.5, sm: 2 } }}>

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
                        openPreview(tree.treeId, tree.treeName, person.personId);
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
                      onClick={() =>
                        void handleCreateLinkRequest(person.personId, tree.treeId)
                      }
                      sx={{
                        minWidth: 150,
                        bgcolor: isPendingForThisPerson ? undefined : onboardingBlue,
                      }}
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
          background: "#ffffff",
        }}
      >
        <Container
          maxWidth="lg"
          sx={{
            py: { xs: 2, sm: 3, md: 4 },
            px: { xs: 1.5, sm: 2.5, md: 3 },
          }}
        >
          <Paper
            elevation={0}
            sx={{
              borderRadius: 0,
              border: 0,
              overflow: "hidden",
              bgcolor: "transparent",
            }}
          >
            <Box
              sx={{
                px: { xs: 0, sm: 2 },
                pt: { xs: 1, sm: 2 },
                pb: { xs: 2, sm: 3 },
              }}
            >
              {renderOnboardingStepRail()}
            </Box>
            <Box sx={{ px: { xs: 0, sm: 2 }, py: { xs: 1, sm: 2 } }}>
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
                    <Stack spacing={2.25} alignItems="center">
                      <Box sx={{ textAlign: "center", maxWidth: 620 }}>
                        <Typography
                          variant={isMobile ? "h5" : "h4"}
                          sx={{ fontWeight: 900, letterSpacing: 0, mb: 1 }}
                        >
                          Let's start with your basic information
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                          This helps us find the right family tree for you.
                        </Typography>
                      </Box>
                      <Stack
                        spacing={1.5}
                        sx={{ width: "100%", maxWidth: profileFormMaxWidth }}
                      >
                      <TextField
                        label="Full Name"
                        value={profileName}
                        onChange={(event) => setProfileName(event.target.value)}
                        fullWidth
                        sx={inputCardSx}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <PersonOutlineOutlinedIcon />
                            </InputAdornment>
                          ),
                        }}
                      />
                      <TextField
                        label="Email Address"
                        type="email"
                        value={profileEmail}
                        onChange={(event) => setProfileEmail(event.target.value)}
                        fullWidth
                        sx={inputCardSx}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <EmailOutlinedIcon />
                            </InputAdornment>
                          ),
                        }}
                      />
                      <TextField
                        label="Phone Number"
                        value={profilePhone || "Not provided"}
                        fullWidth
                        disabled
                        sx={inputCardSx}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <PhoneOutlinedIcon />
                            </InputAdornment>
                          ),
                        }}
                      />
                      </Stack>
                    </Stack>
                  )}

                  {displayStep === "location" && (
                    <Stack spacing={2.25} alignItems="center">
                      <Box sx={{ textAlign: "center", maxWidth: 620 }}>
                        <Typography
                          variant={isMobile ? "h5" : "h4"}
                          sx={{ fontWeight: 900, letterSpacing: 0, mb: 1 }}
                        >
                          Where is your family from?
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                          Your community details help us find matching family trees.
                        </Typography>
                      </Box>
                      <Stack
                        spacing={1.5}
                        sx={{ width: "100%", maxWidth: locationFormMaxWidth }}
                      >
                      <FullScreenMobileAutocomplete<CreatableLocationOption, false, false, false>
                        pickerTitle="Select Location"
                        closeLabel="Close location picker"
                        options={locationOptionsWithCreate}
                        value={selectedLocationOption}
                        open={shouldShowLocationSuggestions}
                        loading={locationLoading}
                        forcePopupIcon={false}
                        filterOptions={(options) => options}
                        getOptionLabel={(option) => option.label}
                        isOptionEqualToValue={(option, value) =>
                          option.villageId === value.villageId
                        }
                        noOptionsText={
                          trimmedLocationQuery.length < 2
                            ? "Start typing to search locations"
                            : "No matching locations"
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
                        onChange={(_event, value: CreatableLocationOption | null) => {
                          if (value?.isCreateOption) {
                            handleOpenCreateVillage(value.inputValue);
                            return;
                          }
                          setSelectedLocationOption(value);
                          setSelectedStateId(value?.stateId || "");
                          setSelectedDistrictId(value?.districtId || "");
                          setSelectedVillageId(value?.villageId || "");
                          setLocationInputValue(value?.label || "");
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Location (Village / City)"
                            placeholder="Type village, district, or state"
                            sx={inputCardSx}
                            InputProps={{
                              ...params.InputProps,
                              startAdornment: (
                                <>
                                  <InputAdornment position="start">
                                    <LocationOnOutlinedIcon />
                                  </InputAdornment>
                                  {params.InputProps.startAdornment}
                                </>
                              ),
                            }}
                          />
                        )}
                        renderOption={(props, option) => (
                          <Box component="li" {...props}>
                            {option.isCreateOption ? (
                              <Stack direction="row" spacing={1.25} alignItems="center">
                                <AddIcon color="primary" fontSize="small" />
                                <Box>
                                  <Typography
                                    variant="body1"
                                    color="primary"
                                    sx={{ fontWeight: 700 }}
                                  >
                                    Add village
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {option.inputValue}
                                  </Typography>
                                </Box>
                              </Stack>
                            ) : (
                              <Box>
                              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                {option.villageName}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {option.districtName}, {option.stateName}
                              </Typography>
                              </Box>
                            )}
                          </Box>
                        )}
                      />
                      <FullScreenMobileAutocomplete<LookupAutocompleteOption, false, false, false>
                        pickerTitle="Select Caste"
                        closeLabel="Close caste picker"
                        options={castes}
                        value={selectedCaste}
                        inputValue={casteInputValue}
                        loading={castesLoading || lookupSaving}
                        selectOnFocus
                        clearOnBlur
                        handleHomeEndKeys
                        getOptionLabel={(option) => option.name}
                        isOptionEqualToValue={(option, value) =>
                          option.id === value.id
                        }
                        filterOptions={(options, params) =>
                          buildCreatableLookupOptions(options, params, "caste")
                        }
                        onInputChange={(_event, value) => {
                          setCasteInputValue(value);
                        }}
                        onChange={async (_event, value) => {
                          if (!value) {
                            setSelectedCasteId("");
                            setSelectedSubCasteId("");
                            setCasteInputValue("");
                            setSubCasteInputValue("");
                            return;
                          }

                          if (isCreateLookupOption(value)) {
                            await handleCreateCaste(value.inputValue);
                            return;
                          }

                          setSelectedCasteId(value.id);
                          setSelectedSubCasteId("");
                          setCasteInputValue(value.name);
                          setSubCasteInputValue("");
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Caste"
                            placeholder="Search or add caste"
                            sx={inputCardSx}
                            InputProps={{
                              ...params.InputProps,
                              startAdornment: (
                                <>
                                  <InputAdornment position="start">
                                    <GroupsOutlinedIcon />
                                  </InputAdornment>
                                  {params.InputProps.startAdornment}
                                </>
                              ),
                            }}
                          />
                        )}
                        renderOption={(props, option) => (
                          <Box component="li" {...props}>
                            {isCreateLookupOption(option) ? (
                              <Stack direction="row" spacing={1.25} alignItems="center">
                                <AddCircleOutlineIcon color="success" fontSize="small" />
                                <Typography
                                  variant="body1"
                                  color="success.dark"
                                  sx={{ fontWeight: 700 }}
                                >
                                  {option.name}
                                </Typography>
                              </Stack>
                            ) : (
                              option.name
                            )}
                          </Box>
                        )}
                      />
                      <FullScreenMobileAutocomplete<LookupAutocompleteOption, false, false, false>
                        pickerTitle="Select Sub-caste"
                        closeLabel="Close sub-caste picker"
                        options={filteredSubCastes}
                        value={selectedSubCaste}
                        inputValue={subCasteInputValue}
                        loading={subCastesLoading || lookupSaving}
                        disabled={!selectedCasteId || lookupSaving}
                        selectOnFocus
                        clearOnBlur
                        handleHomeEndKeys
                        getOptionLabel={(option) => option.name}
                        isOptionEqualToValue={(option, value) =>
                          option.id === value.id
                        }
                        filterOptions={(options, params) =>
                          buildCreatableLookupOptions(
                            options,
                            params,
                            "sub-caste",
                          )
                        }
                        onInputChange={(_event, value) => {
                          setSubCasteInputValue(value);
                        }}
                        onChange={async (_event, value) => {
                          if (!value) {
                            setSelectedSubCasteId("");
                            setSubCasteInputValue("");
                            return;
                          }

                          if (isCreateLookupOption(value)) {
                            await handleCreateSubCaste(value.inputValue);
                            return;
                          }

                          setSelectedSubCasteId(value.id);
                          setSubCasteInputValue(value.name);
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Sub-caste"
                            placeholder={
                              selectedCasteId
                                ? "Search or add sub-caste"
                                : "Select caste first"
                            }
                            sx={inputCardSx}
                            InputProps={{
                              ...params.InputProps,
                              startAdornment: (
                                <>
                                  <InputAdornment position="start">
                                    <BadgeOutlinedIcon />
                                  </InputAdornment>
                                  {params.InputProps.startAdornment}
                                </>
                              ),
                            }}
                          />
                        )}
                        renderOption={(props, option) => (
                          <Box component="li" {...props}>
                            {isCreateLookupOption(option) ? (
                              <Stack direction="row" spacing={1.25} alignItems="center">
                                <AddCircleOutlineIcon color="success" fontSize="small" />
                                <Typography
                                  variant="body1"
                                  color="success.dark"
                                  sx={{ fontWeight: 700 }}
                                >
                                  {option.name}
                                </Typography>
                              </Stack>
                            ) : (
                              option.name
                            )}
                          </Box>
                        )}
                      />
                      </Stack>
                    </Stack>
                  )}

                  {displayStep === "match" && (
                    <Stack spacing={2.25}>
                      <Box sx={{ textAlign: "center", mx: "auto" }}>
                        <Typography
                          variant={isMobile ? "h5" : "h4"}
                          sx={{ fontWeight: 900, letterSpacing: 0, mb: 1 }}
                        >
                          {matchResults.length > 0
                            ? `We found ${matchResults.length} possible family trees`
                            : "Find your family tree"}
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                          Trees are ranked by name match and community details.
                        </Typography>
                      </Box>

                      <Paper
                        sx={{
                          p: { xs: 1.5, sm: 2.25 },
                          borderRadius: 3,
                          bgcolor: "#eff6ff",
                          color: "#0f172a",
                          border: "1px solid rgba(13,110,253,0.22)",
                          boxShadow: "0 10px 24px rgba(13,110,253,0.06)",
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
                              <Typography
                                variant="subtitle1"
                                sx={{ color: "#0f172a", fontWeight: 800 }}
                              >
                                Search criteria
                              </Typography>
                            </Box>
                            <Stack
                              direction={{ xs: "column", sm: "row" }}
                              spacing={1}
                              sx={{ width: { xs: "100%", sm: "auto" } }}
                            >
                              <Button
                                variant="outlined"
                                onClick={handleBackToLocation}
                                sx={{
                                  ...secondaryOnboardingButtonSx,
                                  minHeight: 40,
                                  px: 2.75,
                                }}
                              >
                                Edit location
                              </Button>
                            </Stack>
                          </Stack>

                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            <Chip
                              icon={<PersonOutlineOutlinedIcon />}
                              label={searchDisplayName || "Not set"}
                              sx={{ bgcolor: "#fff", fontWeight: 700 }}
                            />
                            <Chip
                              icon={<LocationOnOutlinedIcon />}
                              label={selectedLocationOption?.villageName || locationInputValue || "Not set"}
                              sx={{ bgcolor: "#fff", fontWeight: 700 }}
                            />
                            <Chip
                              icon={<GroupsOutlinedIcon />}
                              label={selectedCaste?.name || "Not set"}
                              sx={{ bgcolor: "#fff", fontWeight: 700 }}
                            />
                            <Chip
                              icon={<BadgeOutlinedIcon />}
                              label={selectedSubCaste?.name || "Not set"}
                              sx={{ bgcolor: "#fff", fontWeight: 700 }}
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
                              sx={{ ...inputCardSx, flex: 1 }}
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <SearchOutlinedIcon />
                                  </InputAdornment>
                                ),
                              }}
                            />
                            <Button
                              variant="contained"
                              onClick={handleRunMatchSearch}
                              disabled={matchesLoading || onboardingSaving}
                              fullWidth={isMobile}
                              sx={{
                                ...primaryOnboardingButtonSx,
                                whiteSpace: "nowrap",
                                minWidth: { sm: 140 },
                                height: '100%',
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
                                  sx={secondaryOnboardingButtonSx}
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

            <Box
              sx={{
                px: { xs: 0, sm: 0 },
                py: { xs: 2, sm: 2.5 },
                width: "100%",
                maxWidth: actionMaxWidth,
                mx: "auto",
                display: "flex",
                justifyContent: displayStep === "match"
                  ? "space-between"
                  : "flex-end",
                alignItems: "center",
                gap: 2,
                flexWrap: "wrap",
                backgroundColor: "transparent",
              }}
            >
              {displayStep === "match" && (
                <Button
                  variant="outlined"
                  onClick={handleBackToLocation}
                  sx={secondaryOnboardingButtonSx}
                >
                  Back to location
                </Button>
              )}

              {displayStep === "profile" && (
                <Button
                  variant="contained"
                  onClick={handleSaveProfile}
                  disabled={onboardingSaving}
                  endIcon={
                    !onboardingSaving ? <Box component="span">→</Box> : undefined
                  }
                  startIcon={
                    onboardingSaving ? <CircularProgress size={16} /> : undefined
                  }
                  sx={{
                    ...primaryOnboardingButtonSx,
                    width: "100%",
                  }}
                >
                  {onboardingSaving ? "Saving..." : "Continue"}
                </Button>
              )}

              {displayStep === "location" && (
                <Button
                  variant="contained"
                  onClick={handleSaveLocation}
                  disabled={onboardingSaving}
                  endIcon={
                    !onboardingSaving ? <Box component="span">→</Box> : undefined
                  }
                  startIcon={
                    onboardingSaving ? <CircularProgress size={16} /> : undefined
                  }
                  sx={{
                    ...primaryOnboardingButtonSx,
                    width: { xs: "100%", sm: 260 },
                  }}
                >
                  {onboardingSaving ? "Saving..." : "Continue to Search"}
                </Button>
              )}
            </Box>
          </Paper>
        </Container>
      </Box>

      <Dialog
        open={createVillageOpen}
        onClose={handleCloseCreateVillage}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Add village</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {createVillageError && (
              <Alert severity="error">{createVillageError}</Alert>
            )}
            <Autocomplete
              options={createVillageStates}
              value={selectedCreateVillageState}
              loading={createVillageLoadingStates}
              getOptionLabel={(option: any) => option?.name || ""}
              isOptionEqualToValue={(option: any, value: any) =>
                option.id === value.id
              }
              onChange={(_event, value: any | null) => {
                setCreateVillageStateId(value?.id || "");
                setCreateVillageDistrictId("");
                setCreateVillageError("");
              }}
              disabled={createVillageSaving}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="State"
                  placeholder="Search state"
                  helperText={
                    createVillageLoadingStates ? "Loading states..." : undefined
                  }
                />
              )}
            />
            <Autocomplete
              options={createVillageDistricts}
              value={selectedCreateVillageDistrict}
              loading={createVillageLoadingDistricts}
              getOptionLabel={(option: any) => option?.name || ""}
              isOptionEqualToValue={(option: any, value: any) =>
                option.id === value.id
              }
              onChange={(_event, value: any | null) => {
                setCreateVillageDistrictId(value?.id || "");
                setCreateVillageError("");
              }}
              disabled={createVillageSaving || !createVillageStateId}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="District"
                  placeholder="Search district"
                  helperText={
                    createVillageLoadingDistricts
                      ? "Loading districts..."
                      : !createVillageStateId
                        ? "Select a state first"
                        : undefined
                  }
                />
              )}
            />
            <TextField
              label="Village"
              value={createVillageName}
              onChange={(event) => {
                setCreateVillageName(event.target.value);
                setCreateVillageError("");
              }}
              disabled={createVillageSaving}
              autoFocus
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreateVillage} disabled={createVillageSaving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateVillage}
            disabled={
              createVillageSaving ||
              !createVillageStateId ||
              !createVillageDistrictId ||
              !createVillageName.trim()
            }
            startIcon={
              createVillageSaving ? <CircularProgress size={16} /> : undefined
            }
          >
            {createVillageSaving ? "Saving..." : "Add village"}
          </Button>
        </DialogActions>
      </Dialog>

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
        onRequestCompleted={handleOnboardingRequestCompleted}
        onClose={closePreview}
      />
    </>
  );
};
