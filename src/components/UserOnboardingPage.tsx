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
  MenuItem,
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
import WcOutlinedIcon from "@mui/icons-material/WcOutlined";
import CakeOutlinedIcon from "@mui/icons-material/CakeOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { useNavigate, useSearchParams } from "react-router-dom";
import AddTree from "./AddTree/AddTree";
import { useAuth } from "./hooks/useAuth";
import { useLocations } from "./hooks/useLocations";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { consumePostLoginRedirect } from "../utils/postLoginRedirect";
import { formatDisplayDate } from "../utils/dateFormatter";
import { toTitleCase } from "../utils/textCase";
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
import { CreateLocationDialog } from "./LocationPicker/CreateLocationDialog";
import { brand } from "../theme/brand";

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
// Values MUST match the tree Gender values used on person nodes (see GENDER_OPTIONS
// in AddNode.tsx) so a user's stored gender is directly comparable to a node's gender.
const PROFILE_GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
] as const;
const onboardingBlue = brand.primary;
const onboardingGreen = brand.accent;
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

// Title-case a location option's display fields so inconsistently-stored place
// names render uniformly. Normalizing at ingestion keeps every downstream use
// (option label, input value, and the label-equality checks) consistent.
function normalizeLocationOptionCasing<
  T extends {
    locationName?: string;
    districtName?: string;
    stateName?: string;
    label?: string;
  },
>(option: T): T {
  return {
    ...option,
    locationName:
      option.locationName != null ? toTitleCase(option.locationName) : option.locationName,
    districtName:
      option.districtName != null ? toTitleCase(option.districtName) : option.districtName,
    stateName: option.stateName != null ? toTitleCase(option.stateName) : option.stateName,
    label: option.label != null ? toTitleCase(option.label) : option.label,
  };
}

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
  const { setSelectedLocation } = useLocations();
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
  const [profileGender, setProfileGender] = useState("");
  const [profileDob, setProfileDob] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState("");
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
  const [createLocationOpen, setCreateLocationOpen] = useState(false);
  const [createLocationName, setCreateLocationName] = useState("");
  const [localError, setLocalError] = useState("");
  const [linkRequestSuccess, setLinkRequestSuccess] = useState("");
  const [myLinkRequests, setMyLinkRequests] = useState<LinkRequest[]>([]);
  const [linkRequestLoading, setLinkRequestLoading] = useState(false);
  const [linkRequestSubmittingPersonId, setLinkRequestSubmittingPersonId] =
    useState<string | null>(null);
  // Confirmation shown right after a link request is sent (pending approval).
  const [linkRequestSent, setLinkRequestSent] = useState<{
    personName: string;
    treeName: string;
  } | null>(null);
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
        option.locationName.toLowerCase() === query ||
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
        locationId: CREATE_LOCATION_OPTION_ID,
        locationName: `Add "${trimmedLocationQuery}"`,
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

  // Subtle "Add … as new" option rendering, consistent with the create-tree
  // (AddTree) lookup styling on both pages.
  const renderLookupOption = (
    props: React.HTMLAttributes<HTMLLIElement> & { key?: React.Key },
    option: LookupAutocompleteOption,
  ) => {
    if (!isCreateLookupOption(option)) {
      return <li {...(props as any)}>{toTitleCase(option.name)}</li>;
    }
    const { key, ...rest } = props as any;
    return (
      <Box
        component="li"
        key={key}
        {...rest}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          borderTop: "1px solid",
          borderColor: "divider",
          mt: 0.5,
          pt: 1,
          pb: 1,
        }}
      >
        <AddCircleOutlineIcon fontSize="small" color="primary" />
        <Box component="span" sx={{ fontWeight: 700, color: "primary.main" }}>
          {option.name}
        </Box>
      </Box>
    );
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
      color: brand.slate,
      fontSize: 12,
      fontWeight: 600,
      lineHeight: 1.2,
      pointerEvents: "none",
      zIndex: 1,
      "&.Mui-focused": {
        color: brand.slate,
      },
      "&.Mui-disabled": {
        color: brand.slateMuted,
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
      color: brand.ink,
    },
    "& .MuiInputAdornment-root": {
      mt: "0 !important",
      alignSelf: "center",
      color: brand.ink,
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
      bgcolor: brand.primaryDark,
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
                  color: active || completed ? brand.ink : brand.slateMuted,
                  fontWeight: active ? 800 : 600,
                  textAlign: "center",
                }}
              >
                {step.label}
              </Typography>
            </Stack>
            {index < ONBOARDING_STEPS.length - 1 && (
              // Wrapper matches the circle's height (32px) so the 2px line sits
              // exactly on the circle's vertical center, not near the top.
              <Box
                sx={{
                  flex: 1,
                  maxWidth: 160,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <Box
                  sx={{
                    width: "100%",
                    height: 2,
                    bgcolor: index < activeStepIndex ? onboardingGreen : brand.border,
                  }}
                />
              </Box>
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
    setProfileGender(userProfile?.gender || "");
    setProfileDob(userProfile?.dob || "");
    setMatchSearchName(
      onboarding.match.searchName ||
        onboarding.profile.name ||
        userProfile?.name ||
        "",
    );
    if (
      onboarding.location.locationId ||
      onboarding.location.stateId ||
      onboarding.location.districtId ||
      onboarding.location.casteId ||
      onboarding.location.subCasteId ||
      (!selectedLocationId &&
        !selectedStateId &&
        !selectedDistrictId &&
        !selectedCasteId &&
        !selectedSubCasteId)
    ) {
      setSelectedLocationId(onboarding.location.locationId || "");
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
    selectedLocationId,
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
      setCasteInputValue(toTitleCase(selectedCaste.name));
    }
  }, [selectedCaste]);

  useEffect(() => {
    if (selectedSubCaste) {
      setSubCasteInputValue(toTitleCase(selectedSubCaste.name));
    }
  }, [selectedSubCaste]);

  useEffect(() => {
    if (!onboardingLoaded) {
      return;
    }

    if (!selectedLocationId) {
      setSelectedLocationOption(null);
      setLocationOptions([]);
      return;
    }

    const currentRequestId = ++locationRequestIdRef.current;
    setLocationLoading(true);

    ApiService.searchLocationCombinations({
      locationId: selectedLocationId,
      limit: 1,
    })
      .then((rows) => {
        if (locationRequestIdRef.current !== currentRequestId) {
          return;
        }
        const option = rows[0] ? normalizeLocationOptionCasing(rows[0]) : null;
        setSelectedLocationOption(option);
        if (option) {
          setLocationInputValue(option.label);
        }
        if (option) {
          setLocationOptions((prev) => {
            const remaining = prev.filter(
              (item) => item.locationId !== option.locationId,
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
  }, [onboardingLoaded, selectedLocationId]);

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
          setLocationOptions((rows || []).map(normalizeLocationOptionCasing));
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

    const locationId = onboarding.location.locationId || selectedLocationId;
    if (!locationId) {
      return;
    }

    const searchKey = JSON.stringify({
      locationId,
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
        locationId,
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
    onboarding.location.locationId,
    searchDisplayName,
    selectedCasteId,
    selectedSubCasteId,
    selectedLocationId,
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

    if (!profileGender) {
      setLocalError("Please select your gender.");
      return;
    }

    const trimmedDob = profileDob.trim();

    setLocalError("");
    setStepOverride("location");

    try {
      await updateUserProfile(
        trimmedName,
        userProfile?.phone || "",
        trimmedEmail,
        undefined,
        profileGender,
        trimmedDob || undefined,
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

  const handleOpenCreateLocation = (locationName?: string) => {
    setCreateLocationName(locationName || trimmedLocationQuery);
    setCreateLocationOpen(true);
  };

  const handleCloseCreateLocation = () => {
    setCreateLocationOpen(false);
  };

  const handleLocationCreated = async (rawOption: LocationCombinationOption) => {
    const option = normalizeLocationOptionCasing(rawOption);
    setLocalError("");
    setSelectedLocationOption(option);
    setSelectedStateId(option.stateId);
    setSelectedDistrictId(option.districtId);
    setSelectedLocationId(option.locationId);
    setLocationInputValue(option.label);
    setLocationOptions((prev) => [
      option,
      ...prev.filter((item) => item.locationId !== option.locationId),
    ]);
    setSelectedLocation(option.locationId);
    await dispatch(
      updateUserOnboarding({
        location: {
          stateId: option.stateId,
          districtId: option.districtId,
          locationId: option.locationId,
        },
      }),
    ).unwrap();
  };

  const handleCreateCaste = async (nameToCreate: string) => {
    const trimmedName = nameToCreate.trim();
    if (!trimmedName) {
      return;
    }

    setLookupSaving(true);
    setLocalError("");

    try {
      const created = await ApiService.createCaste({ name: toTitleCase(trimmedName) });
      await dispatch(fetchCastes()).unwrap();
      setSelectedCasteId(created.id);
      setSelectedSubCasteId("");
      setCasteInputValue(toTitleCase(created.name));
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
        name: toTitleCase(trimmedName),
        casteId: selectedCasteId,
      });
      await dispatch(fetchAllSubCastes()).unwrap();
      setSelectedSubCasteId(created.id);
      setSubCasteInputValue(toTitleCase(created.name));
    } catch (error: any) {
      setLocalError(error?.message || "Failed to create sub-caste.");
    } finally {
      setLookupSaving(false);
    }
  };

  const handleSaveLocation = async () => {
    if (!selectedStateId || !selectedDistrictId || !selectedLocationId) {
      setLocalError("State, district, and location are required.");
      return;
    }

    if (!selectedCasteId || !selectedSubCasteId) {
      setLocalError("Caste and sub-caste are required.");
      return;
    }

    setLocalError("");
    setSelectedLocation(selectedLocationId);
    setStepOverride("match");

    try {
      await dispatch(
        updateUserOnboarding({
          currentStep: "match",
          location: {
            stateId: selectedStateId,
            districtId: selectedDistrictId,
            locationId: selectedLocationId,
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
        locationId: selectedLocationId,
        casteId: selectedCasteId || null,
        subCasteId: selectedSubCasteId || null,
      });
      await dispatch(
        searchUserOnboardingMatches({
          searchName: searchDisplayName || null,
          locationId: selectedLocationId,
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

    if (!selectedLocationId) {
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
          locationId: selectedLocationId,
          casteId: selectedCasteId || null,
          subCasteId: selectedSubCasteId || null,
        }),
      ).unwrap();
    } catch (error: any) {
      setStepOverride(null);
      setLocalError(error?.message || "Failed to search trees.");
    }
  };

  // Records a just-sent profile-link request as PENDING approval (the user is
  // NOT linked yet) and surfaces the confirmation screen. Onboarding is marked
  // "skipped" so the user isn't force-redirected while they wait; approval
  // flips it to "completed" server-side.
  const markLinkRequestPending = async (input: {
    treeId: string;
    personId: string;
    personName?: string;
    treeName?: string;
  }) => {
    await dispatch(
      updateUserOnboarding({
        status: "skipped",
        match: {
          ...onboarding.match,
          selectedTreeId: input.treeId,
          selectedPersonId: input.personId,
          action: "link",
        },
      }),
    ).unwrap();
    await dispatch(fetchUserOnboarding()).unwrap();
    setLinkRequestSent({
      personName: input.personName || "the selected profile",
      treeName: input.treeName || "the selected tree",
    });
  };

  const handleCreateLinkRequest = async (
    personId: string,
    treeId: string,
    personName?: string,
    treeName?: string,
  ) => {
    setLocalError("");
    setLinkRequestSuccess("");
    setLinkRequestSubmittingPersonId(personId);

    try {
      const created = await ApiService.createUserNodeLinkRequest({
        targetPersonId: personId,
      });
      setMyLinkRequests((prev) => [...prev, created]);
      await markLinkRequestPending({ treeId, personId, personName, treeName });
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
    personName?: string;
    treeName?: string;
  }) => {
    // A profile-link request is only PENDING approval — show the confirmation
    // screen rather than falsely reporting the user as linked.
    if (input.requestType === "user_to_tree_node") {
      closePreview();
      await markLinkRequestPending(input);
      return;
    }

    // Branch-access request — existing behavior: record and return to the tree.
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
    navigate(consumePostLoginRedirect() || targetUrl, { replace: true });
  };

  const handleOpenCreateTree = async () => {
    setLocalError("");
    setCreateTreeOpen(true);
  };

  const [skipping, setSkipping] = useState(false);

  // "Skip for now" — mark onboarding skipped (progress is preserved so the user
  // can resume later from the homepage nudge) and let them into the app.
  const handleSkipOnboarding = async () => {
    setSkipping(true);
    setLocalError("");
    try {
      await dispatch(
        updateUserOnboarding({ status: "skipped" }),
      ).unwrap();
      await dispatch(fetchUserOnboarding()).unwrap();
      navigate(consumePostLoginRedirect() || "/", { replace: true });
    } catch (error: any) {
      setLocalError(error?.message || "Failed to skip onboarding.");
      setSkipping(false);
    }
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
    if (selectedLocationId) {
      setSelectedLocation(selectedLocationId);
    }
    // Return to where login was initiated if we remember it; otherwise open the
    // freshly created tree so the user can add its root person.
    const treeUrl = `/families?tree=${encodeURIComponent(treeId)}&createRoot=1`;
    navigate(consumePostLoginRedirect() || treeUrl, { replace: true });
  };

  const renderTreeCard = (tree: (typeof matchResults)[number]) => {
    // Why is this tree shown? Compare it against the user's own onboarding
    // selections so we can label the reasons explicitly.
    const matchedName = tree.matchedPeople.length > 0;
    const matchedLocation = Boolean(
      onboarding.location.locationId &&
        tree.locationId === onboarding.location.locationId,
    );
    const matchedCaste = Boolean(
      onboarding.location.casteId && tree.casteId === onboarding.location.casteId,
    );
    const matchedSubCaste = Boolean(
      onboarding.location.subCasteId &&
        tree.subCasteId === onboarding.location.subCasteId,
    );

    // A reason-aware chip: highlighted (green + check) when it matches the
    // user's own detail, plain otherwise.
    const reasonChipSx = (matched: boolean) =>
      matched
        ? { bgcolor: brand.accentSoft, color: brand.accentDark, fontWeight: 700 }
        : { bgcolor: brand.canvas };

    return (
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
                bgcolor: tree.matchedPeople.length > 0 ? brand.accentSoft : "#f1f5f9",
                color: tree.matchedPeople.length > 0 ? brand.accentDark : brand.slateMuted,
                fontWeight: 900,
              }}
            >
              {tree.matchedPeople.length || "•"}
            </Avatar>
            <Box>
            <Box
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                openPreview(tree.treeId, tree.treeName);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  openPreview(tree.treeId, tree.treeName);
                }
              }}
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.5,
                cursor: "pointer",
                color: "primary.main",
                "& .tree-name-text": {
                  textDecoration: "underline",
                  textUnderlineOffset: "3px",
                },
                "&:hover .tree-name-text": {
                  textDecorationThickness: "2px",
                },
              }}
            >
              <Typography
                className="tree-name-text"
                variant="h6"
                sx={{ fontWeight: 900, color: "inherit" }}
              >
                {tree.treeName}
              </Typography>
              <VisibilityOutlinedIcon fontSize="small" />
            </Box>
            <Stack
              direction="row"
              spacing={1}
              flexWrap="wrap"
              useFlexGap
              sx={{ mt: 0.75 }}
            >
              {matchedName && (
                <Chip
                  size="small"
                  icon={<CheckCircleIcon />}
                  label={`Name match (${tree.matchedPeople.length})`}
                  sx={{ bgcolor: brand.accentSoft, color: brand.accentDark, fontWeight: 700 }}
                />
              )}
              <Chip
                size="small"
                icon={matchedLocation ? <CheckCircleIcon /> : <LocationOnOutlinedIcon />}
                label={tree.locationName}
                sx={reasonChipSx(matchedLocation)}
              />
              <Chip
                size="small"
                icon={matchedCaste ? <CheckCircleIcon /> : undefined}
                label={tree.casteName || "No caste"}
                sx={reasonChipSx(matchedCaste)}
              />
              <Chip
                size="small"
                icon={matchedSubCaste ? <CheckCircleIcon /> : undefined}
                label={tree.subCasteName || "No sub-caste"}
                sx={reasonChipSx(matchedSubCaste)}
              />
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
          </Stack>
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ bgcolor: brand.canvas, px: { xs: 1.5, sm: 2 } }}>

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
                      {person.dob ? ` • DOB: ${formatDisplayDate(person.dob)}` : ""}
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
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        Is this you?
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Send a request to the tree’s owner to link this profile as
                        your own account.
                      </Typography>
                    </Box>
                    <Button
                      variant={isPendingForThisPerson ? "outlined" : "contained"}
                      disabled={
                        linkRequestLoading ||
                        Boolean(linkRequestSubmittingPersonId) ||
                        isPendingForThisPerson ||
                        isBlockedByAnotherPendingRequest
                      }
                      onClick={() =>
                        void handleCreateLinkRequest(
                          person.personId,
                          tree.treeId,
                          person.name,
                          tree.treeName,
                        )
                      }
                      sx={{
                        width: { xs: "100%", sm: "auto" },
                        minWidth: { sm: 150 },
                        bgcolor: isPendingForThisPerson ? undefined : onboardingBlue,
                      }}
                    >
                      {linkRequestSubmittingPersonId === person.personId
                        ? "Sending..."
                        : isPendingForThisPerson
                          ? "Request pending"
                          : isBlockedByAnotherPendingRequest
                            ? "Another request pending"
                            : "This is me"}
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
            because the tree matches your selected location, caste, and sub-caste.
          </Typography>
        )}
      </AccordionDetails>
    </Accordion>
    );
  };

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
              <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
                <Button
                  variant="text"
                  size="small"
                  onClick={handleSkipOnboarding}
                  disabled={skipping || onboardingLoading || !onboardingLoaded}
                  sx={{ color: brand.slateMuted, fontWeight: 700, textTransform: "none" }}
                >
                  {skipping ? "Skipping…" : "Skip for now"}
                </Button>
              </Box>
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
                        select
                        required
                        label="Gender"
                        value={profileGender}
                        onChange={(event) => setProfileGender(event.target.value)}
                        fullWidth
                        sx={inputCardSx}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <WcOutlinedIcon />
                            </InputAdornment>
                          ),
                        }}
                      >
                        {PROFILE_GENDER_OPTIONS.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </TextField>
                      <TextField
                        label="Date of Birth"
                        type="date"
                        value={profileDob}
                        onChange={(event) => setProfileDob(event.target.value)}
                        fullWidth
                        sx={inputCardSx}
                        InputLabelProps={{ shrink: true }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <CakeOutlinedIcon />
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
                          We use your location, caste and sub-caste only to find your
                          family tree — they’re never shared publicly.
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
                          option.locationId === value.locationId
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
                              setSelectedLocationId("");
                            }
                            if (!value) {
                              setSelectedLocationOption(null);
                              setSelectedStateId("");
                              setSelectedDistrictId("");
                              setSelectedLocationId("");
                            }
                          }
                        }}
                        onChange={(_event, value: CreatableLocationOption | null) => {
                          if (value?.isCreateOption) {
                            handleOpenCreateLocation(value.inputValue);
                            return;
                          }
                          setSelectedLocationOption(value);
                          setSelectedStateId(value?.stateId || "");
                          setSelectedDistrictId(value?.districtId || "");
                          setSelectedLocationId(value?.locationId || "");
                          setLocationInputValue(value?.label || "");
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Location (Location / City)"
                            placeholder="Type location, district, or state"
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
                                    Add location
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {option.inputValue}
                                  </Typography>
                                </Box>
                              </Stack>
                            ) : (
                              <Box>
                              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                {option.locationName}
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
                        getOptionLabel={(option) =>
                          isCreateLookupOption(option) ? option.name : toTitleCase(option.name)
                        }
                        isOptionEqualToValue={(option, value) =>
                          option.id === value.id
                        }
                        filterOptions={(options, params) =>
                          buildCreatableLookupOptions(options, params, "caste")
                        }
                        onInputChange={(_event, value, reason) => {
                          // Only react to real user typing/clearing. The hidden
                          // mobile trigger fires "reset" when this value changes,
                          // which would otherwise wipe what the user just typed.
                          if (reason === "input" || reason === "clear") {
                            setCasteInputValue(value);
                          }
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
                          setCasteInputValue(toTitleCase(value.name));
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
                        renderOption={renderLookupOption}
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
                        getOptionLabel={(option) =>
                          isCreateLookupOption(option) ? option.name : toTitleCase(option.name)
                        }
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
                        onInputChange={(_event, value, reason) => {
                          // Only react to real user typing/clearing (ignore the
                          // "reset" the hidden mobile trigger emits, which would
                          // otherwise clear the text as it's typed).
                          if (reason === "input" || reason === "clear") {
                            setSubCasteInputValue(value);
                          }
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
                          setSubCasteInputValue(toTitleCase(value.name));
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
                        renderOption={renderLookupOption}
                      />
                      </Stack>
                    </Stack>
                  )}

                  {displayStep === "match" && linkRequestSent && (
                    <Stack
                      spacing={3}
                      alignItems="center"
                      sx={{ textAlign: "center", py: { xs: 2, sm: 4 }, px: { xs: 1, sm: 0 } }}
                    >
                      <CheckCircleIcon
                        sx={{ fontSize: { xs: 56, sm: 72 }, color: onboardingGreen }}
                      />
                      <Box sx={{ maxWidth: 620 }}>
                        <Typography variant={isMobile ? "h5" : "h4"} sx={{ fontWeight: 900, mb: 1 }}>
                          Request sent!
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                          Your request to link with{" "}
                          <strong>{linkRequestSent.personName}</strong> in{" "}
                          <strong>{linkRequestSent.treeName}</strong> has been sent to
                          the tree’s owner for approval.
                        </Typography>
                      </Box>

                      <Paper
                        variant="outlined"
                        sx={{ p: 2, borderRadius: 3, bgcolor: brand.primarySoft, maxWidth: 460 }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          <strong>What happens next?</strong> Once the owner approves,
                          your account is linked and you can manage your profile. You can
                          explore the app in the meantime — we’ll keep the request pending.
                        </Typography>
                      </Paper>

                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1.5}
                        justifyContent="center"
                        sx={{ width: { xs: "100%", sm: "auto" } }}
                      >
                        <Button
                          variant="contained"
                          onClick={() =>
                            navigate(consumePostLoginRedirect() || "/", { replace: true })
                          }
                          sx={{
                            bgcolor: onboardingBlue,
                            fontWeight: 700,
                            width: { xs: "100%", sm: "auto" },
                            minWidth: { sm: 170 },
                          }}
                        >
                          Explore the app
                        </Button>
                        <Button
                          variant="outlined"
                          onClick={() => navigate("/requests")}
                          sx={{
                            ...secondaryOnboardingButtonSx,
                            width: { xs: "100%", sm: "auto" },
                            minWidth: { sm: 170 },
                          }}
                        >
                          View my requests
                        </Button>
                      </Stack>
                    </Stack>
                  )}

                  {displayStep === "match" && !linkRequestSent && (
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
                          bgcolor: brand.primarySoft,
                          color: brand.ink,
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
                                sx={{ color: brand.ink, fontWeight: 800 }}
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
                              label={selectedLocationOption?.locationName || locationInputValue || "Not set"}
                              sx={{ bgcolor: "#fff", fontWeight: 700 }}
                            />
                            <Chip
                              icon={<GroupsOutlinedIcon />}
                              label={selectedCaste ? toTitleCase(selectedCaste.name) : "Not set"}
                              sx={{ bgcolor: "#fff", fontWeight: 700 }}
                            />
                            <Chip
                              icon={<BadgeOutlinedIcon />}
                              label={selectedSubCaste ? toTitleCase(selectedSubCaste.name) : "Not set"}
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
                            <Stack spacing={2}>
                              <Box sx={{ textAlign: "center", py: 1 }}>
                                <SearchOutlinedIcon
                                  sx={{ fontSize: 52, color: brand.slateMuted, mb: 0.5 }}
                                />
                                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                                  We couldn’t find your family tree
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  No tree matched your name or community details yet.
                                  Here’s what you can do:
                                </Typography>
                              </Box>

                              {/* 1 — Refine the search */}
                              <Card variant="outlined" sx={{ borderRadius: 3 }}>
                                <CardContent>
                                  <Stack
                                    direction={{ xs: "column", sm: "row" }}
                                    spacing={2}
                                    justifyContent="space-between"
                                    alignItems={{ xs: "flex-start", sm: "center" }}
                                  >
                                    <Stack direction="row" spacing={1.5} alignItems="center">
                                      <SearchOutlinedIcon sx={{ color: brand.primary }} />
                                      <Box>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                          Refine your search
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                          Adjust your name, location, caste or sub-caste
                                          and try again.
                                        </Typography>
                                      </Box>
                                    </Stack>
                                    <Button
                                      variant="outlined"
                                      onClick={handleBackToLocation}
                                      sx={{
                                        ...secondaryOnboardingButtonSx,
                                        width: { xs: "100%", sm: "auto" },
                                        minWidth: { sm: 150 },
                                      }}
                                    >
                                      Edit search
                                    </Button>
                                  </Stack>
                                </CardContent>
                              </Card>

                              {/* 2 — Create your own tree */}
                              <Card
                                variant="outlined"
                                sx={{ borderRadius: 3, borderStyle: "dashed", borderColor: "primary.main" }}
                              >
                                <CardContent>
                                  <Stack
                                    direction={{ xs: "column", sm: "row" }}
                                    spacing={2}
                                    justifyContent="space-between"
                                    alignItems={{ xs: "flex-start", sm: "center" }}
                                  >
                                    <Stack direction="row" spacing={1.5} alignItems="center">
                                      <AddIcon sx={{ color: brand.primary }} />
                                      <Box>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                          Create your own tree
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                          Start a new family tree with your selected
                                          location already filled in.
                                        </Typography>
                                      </Box>
                                    </Stack>
                                    <Button
                                      variant="contained"
                                      startIcon={<AddIcon />}
                                      onClick={handleOpenCreateTree}
                                      sx={{
                                        bgcolor: onboardingBlue,
                                        fontWeight: 700,
                                        width: { xs: "100%", sm: "auto" },
                                        minWidth: { sm: 150 },
                                      }}
                                    >
                                      Create tree
                                    </Button>
                                  </Stack>
                                </CardContent>
                              </Card>

                              {/* 3 — Ask family for an invite */}
                              <Card variant="outlined" sx={{ borderRadius: 3 }}>
                                <CardContent>
                                  <Stack direction="row" spacing={1.5} alignItems="center">
                                    <GroupsOutlinedIcon sx={{ color: brand.primary }} />
                                    <Box>
                                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                        Ask family for an invite
                                      </Typography>
                                      <Typography variant="body2" color="text.secondary">
                                        If a relative already keeps your family tree, ask
                                        them to send you an invite link — opening it adds
                                        you straight into their tree.
                                      </Typography>
                                    </Box>
                                  </Stack>
                                </CardContent>
                              </Card>
                            </Stack>
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
                                  These trees match your selected location, caste,
                                  and sub-caste even though your name was not found
                                  inside them.
                                </Typography>
                              </Box>
                              {otherTrees.map(renderTreeCard)}
                            </Stack>
                          )}

                          {matchResults.length > 0 && (
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
                          )}
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
                // Match the content Box padding so the full-width match-step
                // actions line up with the content above (centered steps keep 0
                // padding since they align via maxWidth + mx:auto instead).
                px: displayStep === "match" ? { xs: 0, sm: 2 } : { xs: 0, sm: 0 },
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
              {displayStep === "match" && !linkRequestSent && (
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

      <CreateLocationDialog
        open={createLocationOpen}
        onClose={handleCloseCreateLocation}
        initialName={createLocationName}
        onCreated={handleLocationCreated}
      />

      <AddTree
        hideTrigger
        open={createTreeOpen}
        onClose={() => setCreateTreeOpen(false)}
        initialLocationId={selectedLocationId || onboarding.location.locationId || undefined}
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
        searchName={searchDisplayName}
        myLinkRequests={myLinkRequests}
        onRequestCompleted={handleOnboardingRequestCompleted}
        onClose={closePreview}
      />
    </>
  );
};
