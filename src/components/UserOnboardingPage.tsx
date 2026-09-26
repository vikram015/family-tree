import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import {
  Link,
  FormControlLabel,
  Checkbox,
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
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
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
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

const DatePicker = React.lazy(() =>
  import("@mui/x-date-pickers/DatePicker").then((m) => ({ default: m.DatePicker })),
);

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
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
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
  // Still fetched: OnboardingTreePreviewDialog needs it to tell whether the
  // user already has a pending branch-access request for a given person, and
  // the pending-link banner below reflects a link request made elsewhere
  // (e.g. NodeDetails' standalone self-link feature) — onboarding itself no
  // longer creates user_to_tree_node requests.
  const [myLinkRequests, setMyLinkRequests] = useState<LinkRequest[]>([]);
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
  // "complete" has no render branch of its own (completion navigates the user
  // away immediately) — but a user can return to /onboarding later via the
  // "finish setting up your profile" dashboard nudge while onboarding is still
  // persisted as "complete" from an earlier branch-access request. Falling
  // back to "match" avoids a blank page in that case.
  // Basic details are mandatory and come first for everyone — including a user
  // who arrived through an invite, whose onboarding the backend already marked
  // complete. Until name, email and acceptance are on file, step one is the only
  // step, whatever the persisted currentStep says.
  const needsBasicDetails =
    !userProfile?.name?.trim() ||
    !userProfile?.email?.trim() ||
    !userProfile?.privacyPolicyAccepted;

  const displayStep = needsBasicDetails
    ? "profile"
    : stepOverride ||
      (onboarding.currentStep === "complete" ? "match" : onboarding.currentStep);
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

  /**
   * How many existing trees already match what the user has entered.
   *
   * A real count from the same search step 3 runs, minus the name — so the
   * number on screen is exactly how many trees they are about to be offered.
   * Null until a location is chosen (the search requires one) or while it is in
   * flight; the callout only appears once there is something true to say.
   */
  const [matchPreviewCount, setMatchPreviewCount] = useState<number | null>(null);

  useEffect(() => {
    if (displayStep !== "location" || !selectedLocationId) {
      setMatchPreviewCount(null);
      return;
    }
    let active = true;
    // Debounced: caste and sub-caste are often changed in quick succession, and
    // each change would otherwise fire its own search.
    const timer = setTimeout(() => {
      ApiService.searchUserOnboardingMatches({
        locationId: selectedLocationId,
        casteId: selectedCasteId || null,
        subCasteId: selectedSubCasteId || null,
      })
        .then((matches) => {
          if (active) setMatchPreviewCount(Array.isArray(matches) ? matches.length : 0);
        })
        .catch(() => {
          // A failed preview is not worth an error: the count simply doesn't
          // appear, and the step works exactly as before.
          if (active) setMatchPreviewCount(null);
        });
    }, 400);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [displayStep, selectedLocationId, selectedCasteId, selectedSubCasteId]);

  /** "Jain - Baid", or whichever of the two the user has filled in. */
  const matchPreviewLabel = useMemo(() => {
    const caste = castes.find((item: any) => item.id === selectedCasteId)?.name;
    const subCaste = subCastes.find((item: any) => item.id === selectedSubCasteId)?.name;
    return [caste, subCaste].filter(Boolean).join(" - ");
  }, [castes, subCastes, selectedCasteId, selectedSubCasteId]);

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
      top: 10,
      transform: "none",
      // A micro-label, not a field label: it names the value sitting under it
      // rather than competing with it.
      color: "#94a3b8",
      fontSize: 11,
      fontWeight: 500,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      lineHeight: 1.2,
      pointerEvents: "none",
      zIndex: 1,
      "&.Mui-focused": {
        color: "#94a3b8",
      },
      "&.Mui-disabled": {
        color: brand.slateMuted,
      },
      "&.MuiInputLabel-shrink": {
        transform: "none",
      },
    },
    "& .MuiOutlinedInput-root": {
      // Tall enough that the value clears its micro-label. At 62 the two were
      // almost touching once a field had content in it.
      minHeight: 68,
      borderRadius: 1.5,
      bgcolor: "#ffffff",
      alignItems: "flex-end",
      transition: "box-shadow 140ms ease, border-color 140ms ease",
      "& fieldset": {
        borderColor: "#e2e8f0",
        top: 0,
      },
      "& legend": {
        display: "none",
      },
      "&:hover fieldset": {
        borderColor: "#cbd5e1",
      },
      // The focus accent from the design: the border takes the royal blue and a
      // soft 3px ring sits outside it, rather than the border simply thickening.
      "&.Mui-focused": {
        boxShadow: "0 0 0 3px rgba(29, 78, 216, 0.12)",
      },
      "&.Mui-focused fieldset": {
        borderColor: onboardingBlue,
        borderWidth: 1,
      },
    },
    "& .MuiOutlinedInput-input": {
      // Clears the micro-label above it.
      pt: 3.25,
      pb: 1.5,
      fontWeight: 600,
      color: brand.ink,
    },
    "& .MuiInputAdornment-root": {
      mt: "0 !important",
      alignSelf: "center",
      // Icons sit behind the values they mark.
      color: "#94a3b8",
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
        const done = completed;
        return (
          <React.Fragment key={step.key}>
            <Stack alignItems="center" spacing={0.75} sx={{ minWidth: { xs: 76, sm: 120 } }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 600,
                  fontSize: 12,
                  flexShrink: 0,
                  // Filled for done and current, outlined for what's ahead —
                  // and the current step wears a soft halo so it reads as
                  // "you are here" rather than just another filled circle.
                  ...(done
                    ? { bgcolor: onboardingGreen, color: "#fff" }
                    : active
                      ? {
                          bgcolor: onboardingBlue,
                          color: "#fff",
                          boxShadow: "0 0 0 4px rgba(219, 234, 254, 0.9)",
                        }
                      : {
                          bgcolor: "#ffffff",
                          color: "#64748b",
                          border: "2px solid #cbd5e1",
                        }),
                }}
              >
                {done ? <CheckCircleIcon sx={{ fontSize: 18 }} /> : index + 1}
              </Box>
              <Typography
                variant="caption"
                sx={{
                  color: active ? onboardingBlue : done ? brand.ink : "#94a3b8",
                  fontWeight: active ? 700 : 500,
                  letterSpacing: "-0.01em",
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
                    bgcolor: index < activeStepIndex ? onboardingGreen : "#e2e8f0",
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
    // A returning user who already accepted keeps their tick, so revisiting
    // step one is not a re-consent.
    setPrivacyAccepted(Boolean(userProfile?.privacyPolicyAccepted));
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
    userProfile?.gender,
    userProfile?.dob,
    userProfile?.privacyPolicyAccepted,
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
      searchName: searchDisplayName || null,
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

    if (!privacyAccepted) {
      setLocalError(
        "Please accept the Terms of Use and Privacy Policy to continue.",
      );
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
        true,
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
        searchName: searchDisplayName || null,
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

  /**
   * Step 2 -> step 1.
   *
   * Mirrors `handleBackToLocation`: the server's `currentStep` and the history
   * entry have to move with the view, or a refresh or a browser Back would put
   * the user somewhere the app no longer thinks they are.
   */
  const handleBackToProfile = async () => {
    setLocalError("");
    setStepOverride("profile");
    try {
      await dispatch(
        updateUserOnboarding({
          currentStep: "profile",
        }),
      ).unwrap();
      updateHistoryStep("profile", "push");
    } catch (error: any) {
      setStepOverride(null);
      setLocalError(error?.message || "Failed to return to your details.");
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

  // Onboarding only ever produces a branch-access request now — linking a
  // profile to a specific person happens later, elsewhere (e.g. NodeDetails'
  // standalone self-link feature), once the user has actually seen the tree.
  const handleOnboardingRequestCompleted = async (input: {
    requestType: "branch_access_request";
    treeId: string;
    personId: string;
    personName?: string;
    treeName?: string;
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
          action: "branch_access",
        },
        completion: {
          completedAt: nowIso(),
          result: "branch_access_requested",
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


  // "Skip for now" — mark onboarding skipped (progress is preserved so the user
  // can resume later from the homepage nudge) and let them into the app.
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
    // freshly created tree and start the guided setup, which collects the immediate
    // family while the user is still in a filling-things-in frame of mind.
    const treeUrl = `/families?tree=${encodeURIComponent(treeId)}&setup=1`;
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
    /**
     * A matched criterion is stated, not decorated: emerald tint, emerald ink,
     * and a tick. Unmatched ones stay neutral so the eye lands on what actually
     * lines up with the user's answers.
     */
    const reasonChipSx = (matched: boolean) =>
      matched
        ? {
            height: 22,
            borderRadius: 1,
            bgcolor: "#ECFDF5",
            color: "#047857",
            fontWeight: 600,
            "& .MuiChip-label": { px: 0.9, fontSize: 11.5 },
            "& .MuiChip-icon": { color: "#047857", fontSize: 14, ml: 0.75 },
          }
        : {
            height: 22,
            borderRadius: 1,
            bgcolor: "#f1f5f9",
            color: brand.slateMuted,
            fontWeight: 600,
            "& .MuiChip-label": { px: 0.9, fontSize: 11.5 },
          };

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
                // 20px was heading-sized for what is one row in a list of five.
                sx={{ fontWeight: 700, fontSize: 14.5, color: "inherit" }}
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
          <Stack
            spacing={0.25}
            sx={{ minWidth: { sm: 150 }, textAlign: { sm: "right" } }}
          >
            <Typography sx={{ fontSize: 12, color: brand.slateMuted }}>
              Owner:{" "}
              <Box component="span" sx={{ color: brand.slate, fontWeight: 600 }}>
                {tree.ownerName}
              </Box>
            </Typography>
            <Typography sx={{ fontSize: 12, color: brand.slateMuted }}>
              Nodes:{" "}
              <Box component="span" sx={{ color: brand.ink, fontWeight: 700 }}>
                {tree.totalNodes}
              </Box>
            </Typography>
          </Stack>
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ bgcolor: brand.canvas, px: { xs: 1.5, sm: 2 } }}>

        {tree.matchedPeople.length > 0 ? (
          <Stack spacing={2}>
            {tree.matchedPeople.map((person) => {
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
          // The card has to sit on something, or its border and shadow have
          // nothing to read against — white on white showed no card at all.
          background: "#f8fafc",
        }}
      >
        <Container
          // The first two steps are a narrow form; the match step lists trees
          // and needs the room.
          maxWidth={displayStep === "match" ? "lg" : "sm"}
          sx={{
            py: { xs: 3, sm: 4, md: 5 },
            px: { xs: 1.5, sm: 2.5, md: 3 },
          }}
        >
          {/* Progress sits above the card, not inside it: it describes where
              this card falls in the sequence rather than being part of it. */}
          <Box sx={{ mb: { xs: 3, sm: 4 } }}>{renderOnboardingStepRail()}</Box>

          <Paper
            elevation={0}
            sx={{
              borderRadius: 4,
              border: "1px solid rgba(226, 232, 240, 0.9)",
              bgcolor: "#ffffff",
              boxShadow:
                "0 10px 30px -4px rgba(23, 37, 84, 0.05), 0 4px 12px -2px rgba(23, 37, 84, 0.03)",
              overflow: "hidden",
              p: { xs: 2.5, sm: 4 },
            }}
          >
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
                        {/* Repeats the rail's position in words, so the card
                            stands on its own when the rail scrolls away. */}
                        <Stack
                          direction="row"
                          alignItems="center"
                          spacing={0.75}
                          sx={{
                            display: "inline-flex",
                            px: 1.25,
                            py: 0.5,
                            mb: 1.5,
                            borderRadius: 999,
                            bgcolor: brand.primarySoft,
                            border: "1px solid #dbeafe",
                            color: onboardingBlue,
                          }}
                        >
                          <Box
                            aria-hidden
                            sx={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              bgcolor: onboardingBlue,
                            }}
                          />
                          <Typography
                            sx={{
                              fontSize: 11,
                              fontWeight: 600,
                              letterSpacing: "0.06em",
                              textTransform: "uppercase",
                            }}
                          >
                            Step {activeStepIndex + 1} of {ONBOARDING_STEPS.length}
                          </Typography>
                        </Stack>

                        <Typography
                          variant={isMobile ? "h5" : "h4"}
                          sx={{ fontWeight: 800, letterSpacing: "-0.02em", mb: 1 }}
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
                      <Suspense fallback={<TextField label="Date of Birth" fullWidth sx={inputCardSx} />}>
                        <DatePicker
                          label="Date of Birth"
                          value={profileDob ? dayjs(profileDob) : null}
                          onChange={(value) =>
                            setProfileDob(value && value.isValid() ? value.format("YYYY-MM-DD") : "")
                          }
                          format="DD/MM/YYYY"
                          slotProps={{
                            textField: {
                              fullWidth: true,
                              sx: inputCardSx,
                              InputProps: {
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <CakeOutlinedIcon />
                                  </InputAdornment>
                                ),
                              },
                            },
                          }}
                        />
                      </Suspense>
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
                      <FormControlLabel
                        sx={{ alignItems: "flex-start", mt: 0.5 }}
                        control={
                          <Checkbox
                            checked={privacyAccepted}
                            onChange={(e) => setPrivacyAccepted(e.target.checked)}
                            sx={{ pt: 0.25 }}
                          />
                        }
                        label={
                          <Typography variant="body2" sx={{ color: brand.slate }}>
                            I agree to the{" "}
                            <Link
                              href="/terms"
                              target="_blank"
                              rel="noopener"
                              underline="hover"
                              sx={{ fontWeight: 700 }}
                            >
                              Terms of Use
                            </Link>{" "}
                            and{" "}
                            <Link
                              href="/privacy-policy"
                              target="_blank"
                              rel="noopener"
                              underline="hover"
                              sx={{ fontWeight: 700 }}
                            >
                              Privacy Policy
                            </Link>
                            . I understand I am responsible for the details I add
                            about my relatives.
                          </Typography>
                        }
                      />
                      </Stack>
                    </Stack>
                  )}

                  {displayStep === "location" && (
                    <Stack spacing={2.25} alignItems="center">
                      <Box sx={{ textAlign: "center", maxWidth: 620 }}>
                        {/* Says why we're asking, right where we ask — this step
                            requests the most sensitive answers in the flow. */}
                        <Stack
                          direction="row"
                          alignItems="center"
                          spacing={0.75}
                          sx={{
                            display: "inline-flex",
                            px: 1.25,
                            py: 0.5,
                            mb: 1.5,
                            borderRadius: 999,
                            bgcolor: brand.primarySoft,
                            border: "1px solid #dbeafe",
                            color: onboardingBlue,
                          }}
                        >
                          <LockOutlinedIcon sx={{ fontSize: 13 }} />
                          <Typography sx={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.04em" }}>
                            Private &amp; encrypted lineage record
                          </Typography>
                        </Stack>

                        <Typography
                          variant={isMobile ? "h5" : "h4"}
                          sx={{ fontWeight: 800, letterSpacing: "-0.02em", mb: 1 }}
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

                      {/* What these answers are already worth.
                          The count is a real search — the same one step 3 runs,
                          without the name — so it is exactly how many trees the
                          user is about to be offered. Shown only when there is
                          at least one, because "0 trees match" discourages the
                          person whose branch we most want them to start. */}
                      {matchPreviewCount !== null && matchPreviewCount > 0 && (
                        <Stack
                          direction="row"
                          spacing={1.25}
                          sx={{
                            width: "100%",
                            maxWidth: locationFormMaxWidth,
                            p: 1.75,
                            borderRadius: 2,
                            bgcolor: brand.primarySoft,
                            border: "1px solid #dbeafe",
                          }}
                        >
                          <LightbulbOutlinedIcon
                            sx={{ fontSize: 18, color: onboardingBlue, mt: "1px", flexShrink: 0 }}
                          />
                          <Typography sx={{ fontSize: 13.5, lineHeight: 1.6, color: brand.slate }}>
                            <Box component="span" sx={{ fontWeight: 700, color: onboardingBlue }}>
                              {matchPreviewCount} existing family{" "}
                              {matchPreviewCount === 1 ? "tree" : "trees"}
                            </Box>{" "}
                            match{matchPreviewLabel ? ` "${matchPreviewLabel}"` : ""} in the{" "}
                            {selectedLocationOption?.label || "selected"} records. Adding
                            these details is what lets us take you straight to your branch.
                          </Typography>
                        </Stack>
                      )}

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

                      {/* A quiet recap of what produced this list. It was a
                          blue panel with a blue shadow, which competed with the
                          results underneath — the results are the point. */}
                      <Paper
                        elevation={0}
                        sx={{
                          p: { xs: 1.75, sm: 2.5 },
                          borderRadius: 3,
                          bgcolor: "#F8FAFC",
                          color: brand.ink,
                          border: "1px solid #dbeafe",
                          boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
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
                                sx={{
                                  fontSize: 11.5,
                                  fontWeight: 700,
                                  letterSpacing: "0.08em",
                                  textTransform: "uppercase",
                                  color: brand.slate,
                                }}
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
                            {[
                              { icon: <PersonOutlineOutlinedIcon />, label: searchDisplayName },
                              {
                                icon: <LocationOnOutlinedIcon />,
                                label:
                                  selectedLocationOption?.locationName || locationInputValue,
                              },
                              {
                                icon: <GroupsOutlinedIcon />,
                                label: selectedCaste ? toTitleCase(selectedCaste.name) : "",
                              },
                              {
                                icon: <BadgeOutlinedIcon />,
                                label: selectedSubCaste ? toTitleCase(selectedSubCaste.name) : "",
                              },
                            ].map((item) => (
                              <Chip
                                key={item.label || "unset"}
                                icon={item.icon}
                                label={item.label || "Not set"}
                                sx={{
                                  height: 30,
                                  borderRadius: 1.5,
                                  bgcolor: "#ffffff",
                                  border: "1px solid #e2e8f0",
                                  color: item.label ? brand.ink : brand.slateMuted,
                                  fontWeight: 500,
                                  "& .MuiChip-label": { px: 1, fontSize: 12.5 },
                                  "& .MuiChip-icon": {
                                    fontSize: 15,
                                    ml: 1,
                                    color: brand.slateMuted,
                                  },
                                }}
                              />
                            ))}
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

                          {matchResults.length > 0 && (
                            /* Explains the one interaction this step depends on.
                               A plain MUI Alert reads as a system message; this
                               is an instruction, so it sits in the sky tone the
                               design uses for guidance. */
                            <Stack
                              direction="row"
                              spacing={1.25}
                              sx={{
                                p: 1.75,
                                borderRadius: 2,
                                bgcolor: "rgba(240, 249, 255, 0.9)",
                                border: "1px solid rgba(186, 230, 253, 0.7)",
                              }}
                            >
                              <VisibilityOutlinedIcon
                                sx={{ fontSize: 17, color: onboardingBlue, mt: "2px", flexShrink: 0 }}
                              />
                              <Typography sx={{ fontSize: 12.5, lineHeight: 1.6, color: "#0c4a6e" }}>
                                Click a tree or a matched person below to preview it. From
                                the preview, you can request edit access to that person&apos;s
                                branch if it looks like your family.
                              </Typography>
                            </Stack>
                          )}

                          {matchedTrees.length > 0 && (
                            <Stack spacing={1.5}>
                              <Box>
                                <Typography sx={{ fontWeight: 700, fontSize: 14, color: brand.ink }}>
                                  Trees matching your name
                                </Typography>
                                <Typography sx={{ fontSize: 12.5, color: brand.slateMuted, mt: 0.25 }}>
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
                                <Typography sx={{ fontWeight: 700, fontSize: 14, color: brand.ink }}>
                                  Other matching trees
                                </Typography>
                                <Typography sx={{ fontSize: 12.5, color: brand.slateMuted, mt: 0.25 }}>
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
                  disabled={onboardingSaving || !privacyAccepted}
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
                  {onboardingSaving ? "Saving..." : "Continue to Community"}
                </Button>
              )}

              {/* A way back to step 1, paired with the step's own CTA so the
                  two read as one decision rather than a dead end. */}
              {displayStep === "location" && (
                <Button
                  variant="text"
                  onClick={handleBackToProfile}
                  disabled={onboardingSaving}
                  startIcon={<Box component="span">←</Box>}
                  sx={{
                    textTransform: "none",
                    fontWeight: 600,
                    color: brand.slateMuted,
                    "&:hover": { color: brand.ink, bgcolor: "transparent" },
                  }}
                >
                  Back to personal info
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

          {/* Sits outside the card on purpose: it is about the product, not
              about the step, and repeating it inside every step would turn it
              into furniture people stop reading. */}
          <Stack
            direction="row"
            alignItems="flex-start"
            justifyContent="center"
            spacing={1.25}
            sx={{ mt: 3, px: 2, maxWidth: 560, mx: "auto" }}
          >
            <ShieldOutlinedIcon sx={{ fontSize: 17, color: onboardingBlue, mt: "1px" }} />
            <Typography sx={{ fontSize: 12.5, color: brand.slateMuted, lineHeight: 1.5 }}>
              <Box component="span" sx={{ fontWeight: 600, color: brand.slate }}>
                Your privacy:
              </Box>{" "}
              your records are yours. We never sell them to data brokers.
            </Typography>
          </Stack>
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
        myLinkRequests={myLinkRequests}
        onRequestCompleted={handleOnboardingRequestCompleted}
        onClose={closePreview}
      />
    </>
  );
};
