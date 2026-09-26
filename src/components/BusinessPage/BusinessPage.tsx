import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Container,
  Typography,
  Box,
  Card,
  CardActionArea,
  CardContent,
  Paper,
  Stack,
  Divider,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  InputAdornment,
} from "@mui/material";
import BusinessIcon from "@mui/icons-material/Business";
import HandshakeIcon from "@mui/icons-material/Handshake";
import AddIcon from "@mui/icons-material/Add";
import WorkOutlineIcon from "@mui/icons-material/WorkOutline";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PhoneIcon from "@mui/icons-material/Phone";
import PersonIcon from "@mui/icons-material/Person";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import TimelineIcon from "@mui/icons-material/Timeline";
import PlaceIcon from "@mui/icons-material/Place";
import SearchIcon from "@mui/icons-material/Search";
import { useLocations } from "../hooks/useLocations";
import { useAuth } from "../hooks/useAuth";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  fetchBusinessesByLocation,
  selectBusinesses,
  selectBusinessLoading,
  selectBusinessLoadedLocationId,
  clearBusinesses,
} from "../../store/slices/businessSlice";
import {
  fetchProfessionsData,
  selectPeopleWithProfessions,
  clearProfessions,
} from "../../store/slices/professionSlice";
import type { ProfessionProfileSummary } from "../../store/slices/professionSlice";
import { ApiService, LocationCombinationOption } from "../../services/apiService";
import { PersonSearchField } from "./PersonSearchField";
import { ProfessionFormDialog } from "../ProfessionProfilePage/ProfessionFormDialog";
import { LocationPicker } from "../LocationPicker/LocationPicker";
import { PlacePicker, PlaceValue } from "../PlacePicker/PlacePicker";
import { BusinessFormDialog } from "../Business/BusinessFormDialog";
import { FNode } from "../model/FNode";
import StorefrontIcon from "@mui/icons-material/StorefrontOutlined";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import { getAlreadyGrantedPosition, requestPosition } from "../../utils/grantedGeolocation";
import { brand } from "../../theme/brand";
import { RichText } from "../common/RichText";
import { richTextToPlain } from "../common/richText";
import {
  BUSINESS_CATEGORY_OPTIONS,
  businessCategoryColor as getCategoryColor,
  businessCategoryLabel as getCategoryLabel,
  normalizeCategory,
} from "../Business/businessCategories";
import { businessCategoryIcon as getCategoryIcon } from "../Business/businessCategoryIcon";

interface Business {
  id: string;
  name: string;
  category?: string;
  description: string;
  owner: string;
  ownerId?: string; // Link to person in family tree
  ownerUserId?: string; // User account linked to the owner person
  ownerName?: string; // Display name of owner
  contact?: string;
  locationId: string;
  createdAt?: any;
  updatedAt?: any;
  treeId?: string; // Tree ID for family page navigation
  gender?: string; // Owner gender
  dob?: string; // Owner date of birth
  hierarchy?: any[]; // Parent hierarchy
  casteName?: string; // Caste name
  subCasteName?: string; // Sub-caste name
}


const buildFamilyPagePath = (treeId?: string, personId?: string): string => {
  const params = new URLSearchParams();
  if (treeId) params.set("tree", treeId);
  if (personId) params.set("personId", personId);
  const query = params.toString();
  return query ? `/families?${query}` : "/families";
};

const businessBlue = brand.primary;
const slateText = brand.ink;
const mutedText = brand.slateMuted;

/** The design's warm archival canvas, and its hairline card border. */
const BORDER_SUBTLE = "#E2E8F0";
/** The tinted strip at the foot of a business card. */
const CARD_FOOTER_BG = "#F6F8FD";

/**
 * A village the user picked for themselves, remembered across visits.
 *
 * Kept separate from the auto-resolved default so that choosing a village is
 * sticky: without this, every reload would re-resolve from position/tree and
 * silently move them back.
 */
const STORED_LOCATION_KEY = "kinvia:businessLocation";
/** A place the user searched for, so their choice survives a reload. */
const STORED_PLACE_KEY = "kinvia:businessPlace";

function readStoredPlace(): PlaceValue | null {
  try {
    const raw = window.localStorage.getItem(STORED_PLACE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && Number.isFinite(parsed.latitude) ? parsed : null;
  } catch {
    return null;
  }
}

function writeStoredPlace(place: PlaceValue | null) {
  try {
    if (place?.latitude != null) {
      window.localStorage.setItem(STORED_PLACE_KEY, JSON.stringify(place));
    } else {
      window.localStorage.removeItem(STORED_PLACE_KEY);
    }
  } catch {
    // Choice just won't persist.
  }
}

function readStoredLocationChoice(): string {
  try {
    return window.localStorage.getItem(STORED_LOCATION_KEY) || "";
  } catch {
    // Private mode or blocked storage — the choice just won't persist.
    return "";
  }
}

const primaryButtonSx = {
  bgcolor: businessBlue,
  boxShadow: "0 10px 20px rgba(13,110,253,0.18)",
  borderRadius: 2,
  fontWeight: 800,
  textTransform: "none",
  "&:hover": {
    bgcolor: brand.primaryDark,
    boxShadow: "0 12px 24px rgba(13,110,253,0.22)",
  },
};

const cardSx = {
  height: "100%",
  border: "1px solid rgba(15,23,42,0.08)",
  borderRadius: 2,
  boxShadow: "0 10px 30px rgba(15,23,42,0.06)",
  transition:
    "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
  "&:hover": {
    transform: "translateY(-4px)",
    borderColor: "rgba(13,110,253,0.28)",
    boxShadow: "0 16px 36px rgba(15,23,42,0.1)",
  },
};

// Owner link component with hierarchy tooltip
const OwnerLink: React.FC<{
  business: Business;
  onNavigate: (path: string) => void;
}> = ({ business, onNavigate }) => {
  const hierarchyText =
    business.hierarchy && business.hierarchy.length > 0
      ? business.hierarchy
          .slice(-5)
          .map((a: any) => a.name)
          .join(" → ")
      : "No ancestry data";

  const tooltipContent = (
    <Box sx={{ p: 1 }}>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {business.owner}
      </Typography>
      {business.casteName && (
        <Typography variant="caption" display="block">
          Caste: {business.casteName}
        </Typography>
      )}
      {business.subCasteName && (
        <Typography variant="caption" display="block">
          Sub-Caste: {business.subCasteName}
        </Typography>
      )}
      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
        🧬 {hierarchyText}
      </Typography>
    </Box>
  );

  return (
    <Tooltip title={tooltipContent}>
      <Box
        component="span"
        onClick={() => {
          if (business.ownerId) {
            onNavigate(`/profile/person/${business.ownerId}`);
            return;
          }
          onNavigate(buildFamilyPagePath(business.treeId, business.ownerId));
        }}
        sx={{
          color: businessBlue,
          cursor: "pointer",
          textDecoration: "underline",
          "&:hover": { color: brand.primaryDark, fontWeight: 600 },
          transition: "all 0.2s",
        }}
      >
        {business.owner}
      </Box>
    </Tooltip>
  );
};

export const BusinessPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { selectedLocation, setSelectedLocation, locations } = useLocations();
  const { currentUser, isAdmin, isSuperAdmin, userProfile, canEditProfessionProfile } =
    useAuth();
  const myPeopleId = userProfile?.peopleId;
  /**
   * Who may add a business.
   *
   * The server allows anyone with write access to the owning person
   * (`assertWriteAccess` on POST /api/business), not just admins — so a member
   * linked to their own node can list their own business. The UI used to gate
   * this on `isAdmin()` alone, which hid the action from exactly the people the
   * empty state is trying to invite. The server still decides; this only
   * governs whether the button is offered.
   */
  const canAddBusiness = Boolean(isAdmin() || myPeopleId);
  const myUserId = userProfile?.id;
  // The set of owner person ids the current user may manage (edit/delete a
  // business or professions), resolved once per page by the backend under the
  // shared rule: superadmin → all; claimer → own node; admin → unclaimed nodes
  // they have write access to.
  const [manageableOwnerIds, setManageableOwnerIds] = useState<Set<string>>(
    new Set(),
  );
  const canEditPerson = (personId?: string | null) =>
    Boolean(personId && manageableOwnerIds.has(personId));
  const canEditBusiness = (business: { ownerId?: string | null }) =>
    Boolean(business.ownerId && manageableOwnerIds.has(business.ownerId));

  // Redux state
  const businesses = useAppSelector(selectBusinesses);
  const loading = useAppSelector(selectBusinessLoading);
  const loadedLocationId = useAppSelector(selectBusinessLoadedLocationId);
  const peopleWithProfessions = useAppSelector(selectPeopleWithProfessions);

  // Local component state
  // Categories are a fixed vocabulary shared with the business profile page.
  const categories = BUSINESS_CATEGORY_OPTIONS;
  const [openDialog, setOpenDialog] = useState(false);
  const [openProfessionDialog, setOpenProfessionDialog] = useState(false);
  // Which person's career profile the editor is open on, and their existing
  // profile when the card already showed one (so it edits instead of duplicating).
  const [professionEditorPersonId, setProfessionEditorPersonId] = useState<string | null>(null);
  const [professionEditorProfile, setProfessionEditorProfile] = useState<any | null>(null);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Business | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedPersonForProfession, setSelectedPersonForProfession] =
    useState<FNode | null>(null);
  const [professionSearchInput, setProfessionSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  /**
   * The point the directory is centred on, and where it came from.
   *
   * "position" — the browser's location, used by default once granted.
   * "place"    — a place the user searched for, which overrides the position.
   * null       — we have neither, so the page asks for one.
   */
  const [centre, setCentre] = useState<PlaceValue | null>(null);
  const [centreSource, setCentreSource] = useState<"position" | "place" | null>(null);
  const [nearbyBusinesses, setNearbyBusinesses] = useState<any[] | null>(null);
  const [nearbyProfessions, setNearbyProfessions] = useState<any[] | null>(null);
  const [nearbyProfessionsLoading, setNearbyProfessionsLoading] = useState(false);
  // Bumped after a profile is saved, so the nearby list re-reads and shows it.
  const [nearbyProfessionsVersion, setNearbyProfessionsVersion] = useState(0);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  // Fixed for now. Exposed as a value rather than a control because a radius
  // selector is only meaningful once enough businesses carry coordinates.
  const radiusKm = 25;

  /**
   * Resolve, in one batched call, which displayed owner nodes the current user
   * may manage (business owners + profession people).
   *
   * Every list the page can render feeds this, not just the village-scoped
   * ones: a card that appears only in the radius result still needs its edit
   * affordance resolved, and asking about ids that are not on screen costs
   * nothing beyond a slightly longer request.
   */
  useEffect(() => {
    let active = true;
    const candidateIds = Array.from(
      new Set(
        [
          ...businesses.map((b) => b.ownerId),
          ...(nearbyBusinesses || []).map((row: any) => row.personId),
          ...peopleWithProfessions.map((item) => item.person.id),
          ...(nearbyProfessions || []).map((row: any) => row.personId),
        ].filter(Boolean),
      ),
    ) as string[];

    if (!currentUser || candidateIds.length === 0) {
      setManageableOwnerIds(new Set());
      return () => {
        active = false;
      };
    }

    ApiService.getManageablePeople(candidateIds)
      .then((ids) => {
        if (active) setManageableOwnerIds(new Set(ids));
      })
      .catch((error) => {
        console.error("Failed to load manageable owners:", error);
        if (active) setManageableOwnerIds(new Set());
      });

    return () => {
      active = false;
    };
  }, [businesses, nearbyBusinesses, peopleWithProfessions, nearbyProfessions, currentUser]);


  /**
   * Replace a bare position with the place it is in.
   *
   * Only ever an improvement to the label: the coordinates are already set and
   * the lists are already loading, so a failed or unconfigured lookup leaves
   * the page working with the placeholder name it started with.
   */
  const nameTheCentre = useCallback(
    async (position: { latitude: number; longitude: number }) => {
      const place = await ApiService.reverseGeocode(position.latitude, position.longitude);
      if (!place?.name) return;
      setCentre((current) => {
        // Don't rename a centre the user has since changed out from under us.
        if (
          current?.latitude !== position.latitude ||
          current?.longitude !== position.longitude
        ) {
          return current;
        }
        // Both fields get the locality, not the full formatted address.
        //
        // Reverse geocoding a GPS fix returns whatever building the point
        // landed on — "Haryana Agricultural University, Hisar, Haryana, India"
        // — and the picker shows `address`. For a centre meaning "roughly
        // where I am", the town is the honest label; the precise address would
        // claim a precision the 25km radius does not have.
        return { ...current, name: place.name, address: place.name };
      });
    },
    [],
  );

  /**
   * Ask the browser for the user's location, in response to them clicking.
   *
   * The only path allowed to raise the permission prompt: a person just pressed
   * a button that says it will. A refusal is recorded so the page stops
   * offering, and falls back to searching by place instead.
   */
  const centreOnMyLocation = useCallback(async () => {
    const position = await requestPosition();
    if (!position) {
      setLocationDenied(true);
      return;
    }
    setLocationDenied(false);
    // Show the point immediately so the list starts loading, then replace the
    // placeholder with a real name. The browser hands over coordinates and
    // nothing else, and a field reading "Your location" gives the user no way
    // to tell whether we got it right.
    setCentre({ name: "Your location", address: "Your location", ...position });
    setCentreSource("position");
    // A live position supersedes a previously searched place.
    writeStoredPlace(null);
    void nameTheCentre(position);
    // nameTheCentre is a stable useCallback; listed so the linter can verify it.
  }, [nameTheCentre]);

  /**
   * Where the directory is centred, resolved once on load:
   *   1. a place the user searched for (they chose it — it wins and persists);
   *   2. their position, but only if access is already granted, so nothing
   *      prompts on arrival.
   * Neither means the page asks, rather than guessing.
   */
  useEffect(() => {
    let active = true;

    const stored = readStoredPlace();
    if (stored) {
      setCentre(stored);
      setCentreSource("place");
      return;
    }

    void getAlreadyGrantedPosition().then((position) => {
      if (!active || !position) return;
      setCentre({ name: "Your location", address: "Your location", ...position });
      setCentreSource("position");
      void nameTheCentre(position);
    });

    return () => {
      active = false;
    };
  }, [nameTheCentre]);

  /**
   * Load the people around that point.
   *
   * The same centre the businesses use, so one place controls both halves of
   * the directory. Anchored on each person's tree village, which means it only
   * returns anyone once those villages carry coordinates — see the fallback
   * where `sourcePeopleWithProfessions` is built.
   */
  useEffect(() => {
    if (centre?.latitude == null || centre?.longitude == null) {
      setNearbyProfessions(null);
      return;
    }
    let active = true;
    setNearbyProfessionsLoading(true);
    ApiService.getProfessionsNearby(centre.latitude, centre.longitude, radiusKm)
      .then((rows) => {
        if (active) setNearbyProfessions(rows || []);
      })
      .catch((error) => {
        console.warn("Could not load nearby professions:", error);
        if (active) setNearbyProfessions([]);
      })
      .finally(() => {
        if (active) setNearbyProfessionsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [centre?.latitude, centre?.longitude, radiusKm, nearbyProfessionsVersion]);

  /**
   * Re-read the businesses around the centre.
   *
   * Callable, not just an effect, because saving or deleting a business has to
   * refresh whatever list is on screen. The page shows the radius result
   * whenever there is a centre, so refreshing only the village-scoped redux
   * list left a business the user had just added invisible until they reloaded
   * the page — it had been saved, but the grid was reading the other source.
   */
  const refreshNearbyBusinesses = useCallback(async () => {
    if (centre?.latitude == null || centre?.longitude == null) return;
    setNearbyLoading(true);
    try {
      const rows = await ApiService.getBusinessesNearby(
        centre.latitude,
        centre.longitude,
        radiusKm,
      );
      setNearbyBusinesses(rows || []);
    } catch (error) {
      console.warn("Could not load nearby businesses:", error);
      setNearbyBusinesses([]);
    } finally {
      setNearbyLoading(false);
    }
  }, [centre?.latitude, centre?.longitude, radiusKm]);

  /** Load the businesses around that point. */
  useEffect(() => {
    if (centre?.latitude == null || centre?.longitude == null) {
      setNearbyBusinesses(null);
      return;
    }
    void refreshNearbyBusinesses();
    return () => {};
  }, [centre?.latitude, centre?.longitude, refreshNearbyBusinesses]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const defaultLocationAppliedForUserRef = useRef<string | null>(null);

  const villageName =
    locations.find((v) => v.id === selectedLocation)?.name || "Select a location";

  /**
   * The place the page is actually showing, as the user would name it.
   *
   * The heading used to read the village out of the location table no matter
   * what — so someone who had searched a town, or shared their position, was
   * told they were looking at their ancestral village while the grid below
   * showed results from somewhere else entirely. The centre is what the results
   * are drawn from, so the centre is what the page should say; the village
   * remains the answer only when there is no centre.
   */
  const areaName = centre?.name && centre.name !== "Your location" ? centre.name : villageName;

  // The location filter lives on this page now (it used to be in the header,
  // where it did nothing on seven of nine routes). Businesses stay deliberately
  // location-scoped and open to every signed-in user — unlike trees, which are
  // scoped by access.
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
        if (active && rows?.[0]) setLocationOption(rows[0]);
      })
      .catch(() => {
        /* Non-fatal: the picker still supports searching by hand. */
      });
    return () => {
      active = false;
    };
  }, [selectedLocation, locationOption?.locationId]);

  useEffect(() => {
    if (!currentUser) {
      defaultLocationAppliedForUserRef.current = null;
      return;
    }

    const userKey = currentUser.uid || "current-user";
    if (defaultLocationAppliedForUserRef.current === userKey) {
      return;
    }

    // A village the user chose themselves outranks every signal below, and
    // survives a reload — otherwise the auto-default would quietly undo their
    // choice every time they came back.
    const storedChoice = readStoredLocationChoice();
    if (storedChoice) {
      defaultLocationAppliedForUserRef.current = userKey;
      if (selectedLocation !== storedChoice) setSelectedLocation(storedChoice);
      return;
    }

    let active = true;
    defaultLocationAppliedForUserRef.current = userKey;

    /**
     * Where this user most likely wants the directory pointed.
     *
     * Nobody should have to pick a village before they can see anything, so we
     * work down the signals we actually hold, strongest first:
     *
     *   1. where they actually are, when they have already granted location
     *      access — the most specific answer available, and the one they opted
     *      into. Never raises a prompt (see `getAlreadyGrantedPosition`);
     *   2. the village their family tree is rooted in;
     *   3. a location their account has been granted;
     *   4. their birth place, matched by name against the village taxonomy.
     *
     * Every one of these is a *default*. An explicit choice always wins and is
     * remembered (`STORED_LOCATION_KEY`), so this never overrules someone who
     * has picked a village for themselves.
     *
     * Birth place is last on purpose: it is a Google place, not a village id,
     * so it can only be matched on its name and that match can be wrong or
     * absent. Better than an empty page, worse than anything above it.
     */
    const resolveDefaultLocationId = async (): Promise<string | null> => {
      try {
        const position = await getAlreadyGrantedPosition();
        if (position) {
          const nearest = await ApiService.getNearestLocation(
            position.latitude,
            position.longitude,
          );
          if (nearest?.locationId) return nearest.locationId;
        }
      } catch (error) {
        console.warn("Could not resolve a location from the user's position:", error);
      }

      try {
        const tree = await ApiService.getDefaultUserTree();
        if (tree?.locationId) return tree.locationId;
      } catch (error) {
        console.warn("Could not read the user's default tree location:", error);
      }

      const granted = (userProfile?.locations || []).find(Boolean);
      if (granted) return granted;

      const personId = userProfile?.peopleId;
      if (!personId) return null;
      try {
        const person = await ApiService.getPersonById(personId);
        const birthPlace = (person?.birthPlaceName || "").trim();
        if (!birthPlace) return null;

        const matches = await ApiService.searchLocationCombinations({
          query: birthPlace,
          limit: 5,
        });
        // Only an exact name match counts. A fuzzy one would silently point the
        // directory at a different village that merely starts with the same
        // letters, which is worse than asking the user to choose.
        const exact = (matches || []).find(
          (option) =>
            option.locationName.trim().toLowerCase() === birthPlace.toLowerCase(),
        );
        return exact?.locationId || null;
      } catch (error) {
        console.warn("Could not resolve a location from the user's birth place:", error);
        return null;
      }
    };

    void resolveDefaultLocationId()
      .then((locationId) => {
        if (!active || !locationId) return;

        const locationExists =
          locations.length === 0 || locations.some((location) => location.id === locationId);
        if (locationExists && selectedLocation !== locationId) {
          setSelectedLocation(locationId);
        }
      })
      .catch((error) => {
        if (active) {
          console.warn("Failed to resolve default business location:", error);
        }
      });

    return () => {
      active = false;
    };
  }, [
    currentUser,
    selectedLocation,
    setSelectedLocation,
    locations,
    userProfile?.locations,
    userProfile?.peopleId,
  ]);

  // Fetch businesses when location changes - dispatches Redux action
  useEffect(() => {
    if (!selectedLocation) {
      dispatch(clearBusinesses());
      return;
    }

    dispatch(fetchBusinessesByLocation(selectedLocation));
  }, [selectedLocation, dispatch]);

  // Fetch professions and people with their professions - dispatches Redux action
  useEffect(() => {
    if (!selectedLocation) {
      dispatch(clearProfessions());
      return;
    }

    dispatch(fetchProfessionsData(selectedLocation));
  }, [selectedLocation, dispatch]);

  const handleCloseProfessionDialog = () => {
    setOpenProfessionDialog(false);
    setSelectedPersonForProfession(null);
    setProfessionSearchInput("");
  };

  const handleRemoveProfession = async (
    personId: string,
    professionId: string,
  ) => {
    try {
      await ApiService.removeProfessionFromPerson(personId, professionId);

      setNearbyProfessionsVersion((v) => v + 1);
      // Refresh professions data by dispatching Redux action
      if (selectedLocation) {
        dispatch(fetchProfessionsData(selectedLocation));
      }
    } catch (error) {
      console.error("Error removing profession:", error);
      alert("Error removing profession");
    }
  };

  /**
   * Counted over the list actually on screen, which is the radius result
   * whenever there is a centre. Counting the village fetch instead left the
   * category tiles advertising businesses from a place the user had navigated
   * away from.
   */
  const getCategoryCount = (category: string, rows: Array<{ category?: string }>) => {
    const normalizedCategory = normalizeCategory(category);
    return rows.filter(
      (b) => normalizeCategory(b.category) === normalizedCategory,
    ).length;
  };

  const getCategoryIconLarge = (category: string) => {
    return getCategoryIcon(category, 44);
  };

  const handleOpenDialog = (business?: Business) => {
    setEditingBusiness(business || null);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingBusiness(null);
  };

  const handleBusinessSaved = () => {
    // Both sources: the village-scoped list in redux, and the radius result the
    // grid actually renders when a place is chosen. Refreshing one of the two
    // is why a newly added business needed a page reload to appear.
    if (selectedLocation) {
      dispatch(fetchBusinessesByLocation(selectedLocation));
    }
    void refreshNearbyBusinesses();
  };

  const handleDeleteBusiness = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await ApiService.deleteBusiness(deleteTarget.id);
      setDeleteTarget(null);
      if (selectedLocation) {
        dispatch(fetchBusinessesByLocation(selectedLocation));
      }
      void refreshNearbyBusinesses();
    } catch (error) {
      alert(
        `Failed to delete business: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    } finally {
      setDeleting(false);
    }
  };

  if (!selectedLocation) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
          Find local businesses
        </Typography>
        <Typography variant="body1" sx={{ color: mutedText, mb: 3 }}>
          Choose a location to see the family-run businesses registered there.
        </Typography>
        <LocationPicker
          value={locationOption}
          onChange={(option) => {
            setLocationOption(option);
            setSelectedLocation(option?.locationId || "");
          }}
          label="Location"
          placeholder="Search for a village, district, or state"
          autoFocus
        />
      </Container>
    );
  }

  // Show the loader until the businesses for the CURRENTLY selected location have
  // been loaded. Without the loadedLocationId check there's a flash where the page
  // renders with stale/empty data before the fetch effect flips `loading` on.
  if (loading || loadedLocationId !== selectedLocation) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, textAlign: "center" }}>
        <CircularProgress />
      </Container>
    );
  }

  /**
   * Rows from the nearby endpoint, in the shape the directory already renders.
   *
   * Mirrors the mapping the redux thunk does for the village-scoped list — the
   * two sources answer different questions but produce the same cards, so the
   * grid below needs no second code path.
   */
  const nearbyMapped = (nearbyBusinesses || []).map((row: any) => ({
    id: row.businessId,
    name: row.businessName,
    category: row.businessCategory || "",
    description: row.businessDescription || "",
    owner: row.personName || "",
    ownerId: row.personId || "",
    ownerName: row.personName || "",
    ownerUserId: row.ownerUserId || "",
    contact: row.businessContact || "",
    locationId: row.locationId || "",
    treeId: row.treeId || "",
    gender: row.personGender || "",
    dob: row.personDob || "",
    hierarchy: row.parentHierarchy || [],
    casteName: row.casteName || "",
    subCasteName: row.subCasteName || "",
    createdAt: row.businessCreatedAt,
    updatedAt: row.businessCreatedAt,
    distanceKm: row.distanceKm == null ? undefined : Number(row.distanceKm),
    placeName: row.placeName || row.placeAddress || "",
  }));

  // A centre point means the page is answering "what's near here"; without one
  // it falls back to the village-scoped list it has always shown.
  const sourceBusinesses = centre?.latitude != null ? nearbyMapped : businesses;

  const businessCategories = categories.map((cat) => ({
    icon: getCategoryIconLarge(cat.id),
    title: cat.title,
    description: cat.description,
    count: getCategoryCount(cat.id, sourceBusinesses),
    category: cat.id,
  }));

  const filteredBusinesses = sourceBusinesses.filter((business) => {
    const matchesCategory =
      activeCategory === "all" ||
      normalizeCategory(business.category) === activeCategory;
    const term = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !term ||
      [
        business.name,
        richTextToPlain(business.description),
        business.owner,
        getCategoryLabel(business.category),
        business.contact,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term);
    return matchesCategory && matchesSearch;
  });

  // Float the logged-in user's own businesses to the top (stable sort keeps the
  // rest of the order intact).
  const orderedBusinesses = myUserId
    ? [...filteredBusinesses].sort(
        (a, b) =>
          (a.ownerUserId === myUserId ? 0 : 1) -
          (b.ownerUserId === myUserId ? 0 : 1),
      )
    : filteredBusinesses;

  /**
   * The people shown, from whichever source the current centre supports.
   *
   * Rows from `/api/profession/nearby` arrive already grouped per person, so
   * they only need reshaping into the card's `{ person, professions, profile }`
   * form — the same shape the village-scoped redux list produces.
   */
  const nearbyPeopleMapped = (nearbyProfessions || []).map((row: any) => ({
    person: {
      id: row.personId,
      name: row.personName,
      gender: row.personGender,
      dob: row.personDob || "",
      treeId: row.treeId,
      casteName: row.casteName,
      subCasteName: row.subCasteName,
      parentHierarchy: row.parentHierarchy || [],
      parents: [] as any,
      children: [] as any,
      siblings: [] as any,
      spouses: [] as any,
      top: 0,
      left: 0,
      hasSubTree: false,
    } as unknown as FNode,
    professions: (row.professions || []).map((prof: any) => ({
      id: prof.id,
      name: prof.name,
      description: prof.description,
      category: prof.category,
    })),
    profile: row.professionProfile || null,
    distanceKm: row.distanceKm == null ? undefined : Number(row.distanceKm),
  }));

  /**
   * Which list of people the page shows — the same rule the businesses use.
   *
   * A centre means the radius result, whether or not it found anyone. An
   * earlier version fell back to the village-scoped list when the radius came
   * up empty, to avoid an empty section beside a populated business grid. That
   * was wrong: it left the previous village's people on screen after the user
   * had moved the map somewhere else, which reads as "these people are here"
   * about a place they are not. An honest empty state is the better answer, so
   * the empty case is handled where the section renders.
   */
  const sourcePeopleWithProfessions =
    centre?.latitude != null ? nearbyPeopleMapped : peopleWithProfessions;

  /**
   * The same search box filters the people below it.
   *
   * It used to narrow only the business grid, so typing a trade — the obvious
   * thing to search a directory of tradespeople for — left the professions
   * section showing everyone. Matched against everything a card actually
   * displays, plus the profession tags, so a hit is always visible on the card
   * the search returns.
   */
  const professionSearchTerm = searchQuery.trim().toLowerCase();
  const filteredPeopleWithProfessions = !professionSearchTerm
    ? sourcePeopleWithProfessions
    : sourcePeopleWithProfessions.filter((item) => {
        const profile: ProfessionProfileSummary | null = (item as any).profile || null;
        return [
          item.person.name,
          (item.person as any).casteName,
          (item.person as any).subCasteName,
          profile?.title,
          profile?.sector,
          profile?.subSpecialization,
          profile?.organization,
          profile?.workLocation,
          profile?.contactPhone,
          richTextToPlain(profile?.summary || ""),
          ...item.professions.map((prof) => prof.name),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(professionSearchTerm);
      });

  /**
   * The professions directory, derived from the people actually being shown.
   *
   * It used to read `professionsWithCount` straight from redux, which is always
   * the village-scoped fetch — so it kept listing the old village's trades and
   * people after the user moved the search somewhere else, and ignored the
   * search box entirely. Grouping the resolved list instead means every section
   * on the page answers for the same place and the same query.
   */
  const professionGroups = (() => {
    const groups = new Map<string, any>();
    for (const item of filteredPeopleWithProfessions) {
      const person = item.person as any;
      for (const prof of item.professions) {
        if (!prof?.id) continue;
        if (!groups.has(prof.id)) {
          groups.set(prof.id, {
            professionId: prof.id,
            professionName: prof.name,
            professionDescription: prof.description,
            professionCategory: prof.category,
            people: [],
          });
        }
        groups.get(prof.id).people.push({
          personId: person.id,
          personName: person.name,
          treeId: person.treeId,
          casteName: person.casteName,
          subCasteName: person.subCasteName,
          parentHierarchy: person.parentHierarchy || [],
        });
      }
    }
    return [...groups.values()].sort((a, b) =>
      String(a.professionName || "").localeCompare(String(b.professionName || "")),
    );
  })();

  // Likewise float the user's own profession card to the top.
  const orderedPeopleWithProfessions = myPeopleId
    ? [...filteredPeopleWithProfessions].sort(
        (a, b) =>
          (a.person.id === myPeopleId ? 0 : 1) -
          (b.person.id === myPeopleId ? 0 : 1),
      )
    : filteredPeopleWithProfessions;

  const benefits = [
    {
      title: "Family Network",
      description:
        "Connect with family members in business and build strong professional relationships",
    },
    {
      title: "Mutual Support",
      description:
        "Support each other's businesses, share resources, and collaborate on projects",
    },
    {
      title: "Knowledge Sharing",
      description:
        "Learn from experienced family entrepreneurs and share business insights",
    },
    {
      title: "Trust & Reliability",
      description:
        "Work with trusted family members who share your values and commitment",
    },
  ];

  return (
    <>
      <Helmet>
        <title>Business Directory - Kinvia | Family Business Network</title>
        <meta
          name="description"
          content="Discover and connect with family business members. Explore family-run businesses, build professional networks, and collaborate within your family enterprise community."
        />
        <meta
          name="keywords"
          content="family business, business directory, entrepreneurship, family enterprises, business network, professional connections"
        />
        <meta property="og:title" content="Business Directory - Kinvia" />
        <meta
          property="og:description"
          content="Connect with family members in business and build strong professional relationships."
        />
      </Helmet>
      {/* Page header.
          One continuous surface with the rest of the page: the design treats
          the title as the first section, not a tinted band bolted above it. */}
      <Box sx={{ bgcolor: brand.pageCanvas, color: slateText, pt: { xs: 3, md: 5 }, pb: { xs: 2, md: 3 } }}>
        <Container maxWidth="lg">
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={3}
            alignItems={{ xs: "flex-start", md: "center" }}
            justifyContent="space-between"
          >
            <Box sx={{ maxWidth: 760 }}>
              <Chip
                icon={<BusinessIcon />}
                label="Business Directory"
                sx={{
                  mb: 2,
                  bgcolor: brand.primarySoft,
                  color: businessBlue,
                  fontWeight: 800,
                  borderRadius: 2,
                }}
              />
              <Typography
                variant="h3"
                gutterBottom
                sx={{
                  fontWeight: 900,
                  letterSpacing: 0,
                  fontSize: { xs: 32, md: 44 },
                }}
              >
                {areaName} Business Network
              </Typography>
              <Typography
                variant="h6"
                sx={{ color: mutedText, maxWidth: 680, lineHeight: 1.55 }}
              >
                Connect with family-run businesses, trusted services, and
                professional talent from your location.
              </Typography>
            </Box>
            {canAddBusiness && (
              <Button
                variant="contained"
                size="large"
                startIcon={<AddIcon />}
                onClick={() => handleOpenDialog()}
                sx={primaryButtonSx}
              >
                Add Business
              </Button>
            )}
          </Stack>
        </Container>
      </Box>

      <Box sx={{ bgcolor: brand.pageCanvas, minHeight: "100vh" }}>
        <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        {loading ? (
          <Box sx={{ textAlign: "center", py: 8 }}>
            <CircularProgress />
            <Typography variant="body1" sx={{ mt: 2 }}>
              Loading businesses...
            </Typography>
          </Box>
        ) : (
          <>
            {/* Businesses Directory */}
            <Box sx={{ mb: 8 }}>
              <Typography
                variant="h4"
                sx={{ fontWeight: 900, color: slateText, mb: 0.5, letterSpacing: 0 }}
              >
                Registered Businesses
              </Typography>
              <Typography variant="body1" sx={{ color: mutedText, mb: 3 }}>
                Discover and connect with family-run businesses and professionals around{" "}
                {areaName}.
              </Typography>

              {/* Controls sit together on one raised surface rather than
                  loose on the page — they act on the grid below as a set. */}
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={2}
                alignItems={{ xs: "stretch", md: "flex-start" }}
                sx={{
                  mb: 3,
                  p: { xs: 1.5, md: 2 },
                  borderRadius: 3,
                  bgcolor: brand.surface,
                  border: `1px solid ${BORDER_SUBTLE}`,
                  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
                }}
              >
                <Box sx={{ width: { xs: "100%", md: 320 } }}>
                  <Box sx={{ bgcolor: brand.surface }}>
                    {/* The same place search used on the node and business
                        forms, so "where" means one thing across the app. */}
                    <PlacePicker
                      value={centre}
                      onChange={(place) => {
                        setCentre(place);
                        setCentreSource(place ? "place" : null);
                        writeStoredPlace(place);
                      }}
                      label=""
                      placeholder="Search a town or area"
                      size="small"
                    />
                  </Box>

                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={0.5}
                    sx={{ mt: 0.75, px: 0.5, minHeight: 16 }}
                  >
                    {centreSource === "position" && (
                      <>
                        <MyLocationIcon sx={{ fontSize: 13, color: brand.accentDark }} />
                        <Typography sx={{ fontSize: 11.5, color: mutedText }}>
                          Near you — search above to look somewhere else
                        </Typography>
                      </>
                    )}
                    {centreSource === "place" && (
                      <Typography
                        component="button"
                        type="button"
                        onClick={() => void centreOnMyLocation()}
                        sx={{
                          border: 0,
                          p: 0,
                          bgcolor: "transparent",
                          cursor: "pointer",
                          fontSize: 11.5,
                          fontWeight: 700,
                          color: businessBlue,
                        }}
                      >
                        Use my location instead
                      </Typography>
                    )}
                  </Stack>
                </Box>
                <TextField
                  size="small"
                  placeholder="Search businesses and people by name, trade, or phone"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  sx={{ bgcolor: brand.surface, width: { xs: "100%", md: 380 } }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
                <FormControl size="small" sx={{ bgcolor: brand.surface, minWidth: 200 }}>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={activeCategory}
                    label="Category"
                    onChange={(e) => setActiveCategory(e.target.value)}
                  >
                    <MenuItem value="all">All categories</MenuItem>
                    {categories.map((cat) => (
                      <MenuItem key={cat.id} value={cat.id}>
                        {cat.displayName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Box sx={{ flexGrow: 1 }} />
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  sx={{
                    flexShrink: 0,
                    alignSelf: "flex-start",
                    minHeight: { md: 40 },
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: mutedText,
                    }}
                  >
                    Listed
                  </Typography>
                  <Box
                    sx={{
                      px: 1.25,
                      py: 0.25,
                      borderRadius: 999,
                      bgcolor: brand.primarySoft,
                      color: businessBlue,
                      fontSize: 13,
                      fontWeight: 800,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {filteredBusinesses.length}
                  </Box>
                </Stack>
              </Stack>

              {!centre ? (
                /* No point to search around yet. Ask — with a button, so the
                   browser prompt is something the user chose — and offer the
                   place search as the alternative for anyone who won't share. */
                <Box
                  sx={{
                    textAlign: "center",
                    px: { xs: 3, md: 6 },
                    py: { xs: 5, md: 7 },
                    borderRadius: 3,
                    bgcolor: brand.surface,
                    border: `1px solid ${BORDER_SUBTLE}`,
                    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
                  }}
                >
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      mx: "auto",
                      mb: 2,
                      borderRadius: 3,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: brand.primarySoft,
                      color: businessBlue,
                    }}
                  >
                    <MyLocationIcon />
                  </Box>
                  <Typography
                    sx={{ fontSize: { xs: 20, md: 24 }, fontWeight: 800, color: slateText }}
                  >
                    Find businesses near you
                  </Typography>
                  <Typography
                    sx={{
                      mt: 1,
                      mx: "auto",
                      maxWidth: 520,
                      fontSize: 15,
                      lineHeight: 1.6,
                      color: mutedText,
                    }}
                  >
                    {locationDenied
                      ? "No problem — search for a town or area above and we'll show the family businesses around it."
                      : "Share your location and we'll show the family businesses closest to you. You can also search any town or area above."}
                  </Typography>

                  {!locationDenied && (
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={<MyLocationIcon />}
                      onClick={() => void centreOnMyLocation()}
                      sx={{ ...primaryButtonSx, mt: 3 }}
                    >
                      Use my location
                    </Button>
                  )}
                </Box>
              ) : nearbyLoading ? (
                <Box sx={{ textAlign: "center", py: 6 }}>
                  <CircularProgress />
                </Box>
              ) : sourceBusinesses.length === 0 ? (
                /* An empty village is an opportunity, not an error — so this is
                   an invitation rather than the grey "no results" notice it
                   used to be. */
                <Box
                  sx={{
                    textAlign: "center",
                    px: { xs: 3, md: 6 },
                    py: { xs: 5, md: 7 },
                    borderRadius: 3,
                    bgcolor: brand.surface,
                    border: `1px solid ${BORDER_SUBTLE}`,
                    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
                  }}
                >
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      mx: "auto",
                      mb: 2,
                      borderRadius: 3,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: brand.primarySoft,
                      color: businessBlue,
                    }}
                  >
                    <StorefrontIcon />
                  </Box>

                  <Typography
                    sx={{
                      fontSize: { xs: 20, md: 24 },
                      fontWeight: 800,
                      color: slateText,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    Be the first here
                  </Typography>
                  <Typography
                    sx={{
                      mt: 1,
                      mx: "auto",
                      maxWidth: 520,
                      fontSize: 15,
                      lineHeight: 1.6,
                      color: mutedText,
                    }}
                  >
                    No family business is listed within {radiusKm} km of{" "}
                    {centre?.name || "here"} yet. Add yours and it becomes the
                    first thing relatives see when they look for someone local.
                  </Typography>

                  {canAddBusiness ? (
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={<AddIcon />}
                      onClick={() => handleOpenDialog()}
                      sx={{ ...primaryButtonSx, mt: 3 }}
                    >
                      List your business
                    </Button>
                  ) : (
                    /* Saying "add yours" to someone the server will refuse is
                       worse than saying nothing — see `canAddBusiness`. */
                    <Typography sx={{ mt: 3, fontSize: 13.5, color: mutedText }}>
                      Link your profile to a family tree to add your own business
                      here.
                    </Typography>
                  )}
                </Box>
              ) : filteredBusinesses.length === 0 ? (
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                  No businesses match your search. Try a different term or
                  category.
                </Alert>
              ) : (
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "1fr 1fr",
                      md: "1fr 1fr 1fr",
                    },
                    gap: 3,
                  }}
                >
                  {orderedBusinesses.map((business) => {
                    const categoryLabel = getCategoryLabel(business.category);
                    const categoryColor = getCategoryColor(business.category);
                    const canEditThisBusiness = canEditBusiness(business);

                    return (
                      <Card
                        key={business.id}
                        sx={{
                          ...cardSx,
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          bgcolor: brand.surface,
                          borderRadius: 3,
                          overflow: "hidden",
                          transition: "transform 200ms ease, box-shadow 200ms ease",
                          "@media (hover: hover)": {
                            "&:hover": {
                              transform: "translateY(-4px)",
                              boxShadow: "0 12px 28px -6px rgba(29, 78, 216, 0.12), 0 4px 8px -2px rgba(15, 23, 42, 0.04)",
                            },
                          },
                        }}
                      >
                        <CardContent sx={{ flexGrow: 1, p: 3, pb: 2 }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "flex-start",
                            justifyContent: "space-between",
                            mb: 2,
                          }}
                        >
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Box
                              sx={{
                                width: 40,
                                height: 40,
                                borderRadius: 2,
                                bgcolor: categoryLabel
                                  ? `${categoryColor}14`
                                  : brand.canvas,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              {getCategoryIcon(business.category)}
                            </Box>
                            {categoryLabel && (
                              <Chip
                                label={categoryLabel}
                                size="small"
                                variant="outlined"
                                sx={{
                                  borderColor: `${categoryColor}55`,
                                  color: categoryColor,
                                  fontWeight: 700,
                                  bgcolor: brand.surface,
                                  maxWidth: 160,
                                }}
                              />
                            )}
                          </Box>
                          {canEditThisBusiness && (
                            <Stack direction="row" spacing={0.5}>
                              <Tooltip title="Edit business">
                                <IconButton
                                  size="small"
                                  aria-label="Edit business"
                                  onClick={() => handleOpenDialog(business)}
                                  sx={{ color: businessBlue }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete business">
                                <IconButton
                                  size="small"
                                  aria-label="Delete business"
                                  onClick={() => setDeleteTarget(business)}
                                  sx={{ color: "error.main" }}
                                >
                                  <DeleteOutlineIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          )}
                        </Box>

                        <Typography
                          variant="h6"
                          gutterBottom
                          component={RouterLink}
                          to={`/business/${business.id}`}
                          sx={{
                            display: "block",
                            fontWeight: 900,
                            color: slateText,
                            letterSpacing: 0,
                            textDecoration: "none",
                            "&:hover": { color: businessBlue },
                          }}
                        >
                          {business.name}
                        </Typography>

                        {/* Two lines, clamped: descriptions vary wildly in
                            length and a fixed min-height left tall gaps under
                            the short ones while still clipping the long ones. */}
                        <Box
                          sx={{
                            color: mutedText,
                            fontSize: 14,
                            lineHeight: 1.5,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          <RichText
                            value={business.description}
                            fallback="No description added yet."
                          />
                        </Box>
                        </CardContent>

                        {/* Contact details sit on their own tinted strip at the
                            foot of the card, so every card's facts line up
                            across the grid regardless of description length. */}
                        <Box
                          sx={{
                            px: 3,
                            py: 1.75,
                            bgcolor: CARD_FOOTER_BG,
                            borderTop: `1px solid ${BORDER_SUBTLE}`,
                            display: "flex",
                            flexDirection: "column",
                            gap: 1,
                          }}
                        >
                          <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                            spacing={1}
                          >
                            <Stack direction="row" alignItems="center" spacing={0.75}>
                              <PersonIcon sx={{ fontSize: 15, color: mutedText }} />
                              <Typography sx={{ fontSize: 11.5, color: mutedText }}>
                                Owner
                              </Typography>
                            </Stack>
                            <Typography
                              noWrap
                              sx={{ fontSize: 13, fontWeight: 700, color: slateText, minWidth: 0 }}
                            >
                              {business.ownerId && business.treeId ? (
                                <OwnerLink
                                  business={business}
                                  onNavigate={navigate}
                                />
                              ) : (
                                business.owner
                              )}
                            </Typography>
                          </Stack>

                          {business.contact && (
                            <Stack
                              direction="row"
                              alignItems="center"
                              justifyContent="space-between"
                              spacing={1}
                            >
                              <Stack direction="row" alignItems="center" spacing={0.75}>
                                <PhoneIcon sx={{ fontSize: 15, color: mutedText }} />
                                <Typography sx={{ fontSize: 11.5, color: mutedText }}>
                                  Phone
                                </Typography>
                              </Stack>
                              <Typography
                                component="a"
                                href={`tel:${business.contact}`}
                                sx={{
                                  fontSize: 13,
                                  fontWeight: 700,
                                  textDecoration: "none",
                                  color: businessBlue,
                                  "&:hover": { textDecoration: "underline" },
                                }}
                              >
                                {business.contact}
                              </Typography>
                            </Stack>
                          )}
                        </Box>
                      </Card>
                    );
                  })}
                </Box>
              )}
            </Box>

            <Divider sx={{ my: 5, borderColor: "rgba(15,23,42,0.08)" }} />

            {/* Professions & Occupations */}
            <Box sx={{ mb: 8 }}>
              <Stack
                direction="row"
                justifyContent="center"
                alignItems="center"
                spacing={2}
                sx={{ mb: 6 }}
              >
                <Typography
                  variant="h4"
                  gutterBottom
                  sx={{ textAlign: "center", fontWeight: 900, mb: 0, color: slateText }}
                >
                  Professions & Occupations
                </Typography>
                {/* A profession profile is the subject's own, so this fills in
                    yours. Superadmin keeps the person picker, since it is the
                    one role the server still lets edit anyone's. */}
                {(myPeopleId || isSuperAdmin()) && (
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<AddIcon />}
                    sx={{ ...primaryButtonSx, whiteSpace: "nowrap", flexShrink: 0 }}
                    onClick={() => {
                      setProfessionEditorProfile(null);
                      if (isSuperAdmin()) {
                        // Pick the person first; the editor opens after.
                        setSelectedPersonForProfession(null);
                        setProfessionSearchInput("");
                        setOpenProfessionDialog(true);
                        return;
                      }
                      setProfessionEditorPersonId(myPeopleId || null);
                    }}
                  >
                    {isSuperAdmin() ? "Add Profession" : "Add my profession"}
                  </Button>
                )}
              </Stack>

              <Typography variant="body1" sx={{ mb: 4, textAlign: "center" }}>
                The trades and careers of family members around {areaName} — the
                same place and search as the businesses above.
              </Typography>

              {nearbyProfessionsLoading && centre?.latitude != null ? (
                <Box sx={{ textAlign: "center", py: 6 }}>
                  <CircularProgress />
                </Box>
              ) : orderedPeopleWithProfessions.length > 0 ? (
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "1fr 1fr",
                      md: "repeat(3, 1fr)",
                    },
                    gap: 2,
                  }}
                >
                  {orderedPeopleWithProfessions.map((item) => {
                    const profile: ProfessionProfileSummary | null =
                      (item as any).profile || null;
                    const experience =
                      profile?.totalExperienceYears != null &&
                      Number(profile.totalExperienceYears) > 0
                        ? `${Number(profile.totalExperienceYears)} yr${Number(profile.totalExperienceYears) === 1 ? "" : "s"}`
                        : null;
                    const facts = [
                      profile?.organization
                        ? { icon: <BusinessOutlinedIcon sx={{ fontSize: 15, color: mutedText }} />, label: "Works at", value: profile.organization }
                        : null,
                      experience
                        ? { icon: <TimelineIcon sx={{ fontSize: 15, color: mutedText }} />, label: "Experience", value: experience }
                        : null,
                      profile?.workLocation
                        ? { icon: <PlaceIcon sx={{ fontSize: 15, color: mutedText }} />, label: "Based in", value: profile.workLocation }
                        : null,
                      // Present only when its owner published it — the server
                      // sends null to everyone else.
                      profile?.contactPhone
                        ? {
                            icon: <PhoneIcon sx={{ fontSize: 15, color: mutedText }} />,
                            label: "Phone",
                            value: profile.contactPhone,
                            href: `tel:${profile.contactPhone.replace(/[^\d+]/g, "")}`,
                          }
                        : null,
                    ].filter(Boolean) as Array<{
                      icon: React.ReactNode;
                      label: string;
                      value: string;
                      href?: string;
                    }>;

                    // The profession tags, as a headline for people with no
                    // career profile of their own.
                    const professionHeadline = item.professions
                      .map((prof) => prof.name)
                      .filter(Boolean)
                      .join(" · ");

                    return (
                      <Card
                        key={item.person.id}
                        sx={{
                          ...cardSx,
                          display: "flex",
                          flexDirection: "column",
                          bgcolor: brand.surface,
                          borderRadius: 3,
                          overflow: "hidden",
                          transition: "transform 200ms ease, box-shadow 200ms ease",
                          "@media (hover: hover)": {
                            "&:hover": {
                              transform: "translateY(-4px)",
                              boxShadow:
                                "0 12px 28px -6px rgba(29, 78, 216, 0.12), 0 4px 8px -2px rgba(15, 23, 42, 0.04)",
                            },
                          },
                        }}
                      >
                        {/* The body is the link: a profession is a thing you
                            open, like a business, not a row of tags. The tag
                            chips and the add control stay outside it, since
                            they are their own actions. */}
                        <CardActionArea
                          component={RouterLink}
                          to={`/profession/${item.person.id}`}
                          sx={{ flexGrow: 1, alignItems: "stretch" }}
                        >
                          <CardContent sx={{ p: 3, pb: 2 }}>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                mb: 2,
                                flexWrap: "wrap",
                              }}
                            >
                              <Box
                                sx={{
                                  width: 40,
                                  height: 40,
                                  borderRadius: 2,
                                  bgcolor: `${businessBlue}14`,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                }}
                              >
                                <WorkOutlineIcon sx={{ color: businessBlue, fontSize: 20 }} />
                              </Box>
                              {profile?.sector && (
                                <Chip
                                  label={profile.sector}
                                  size="small"
                                  variant="outlined"
                                  sx={{
                                    borderColor: `${businessBlue}55`,
                                    color: businessBlue,
                                    fontWeight: 700,
                                    bgcolor: brand.surface,
                                    maxWidth: 160,
                                  }}
                                />
                              )}
                              {profile?.mentorshipAvailable && (
                                <Chip
                                  label="Mentors"
                                  size="small"
                                  sx={{
                                    bgcolor: "#ECFDF5",
                                    color: "#047857",
                                    fontWeight: 700,
                                  }}
                                />
                              )}
                            </Box>

                            <Tooltip
                              title={
                                <Box sx={{ p: 1 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {item.person.name}
                                  </Typography>
                                  {(item.person as any).casteName && (
                                    <Typography variant="caption" display="block">
                                      Caste: {(item.person as any).casteName}
                                    </Typography>
                                  )}
                                  {(item.person as any).subCasteName && (
                                    <Typography variant="caption" display="block">
                                      Sub-Caste: {(item.person as any).subCasteName}
                                    </Typography>
                                  )}
                                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                                    🧬{" "}
                                    {(item.person as any).parentHierarchy &&
                                    (item.person as any).parentHierarchy.length > 0
                                      ? (item.person as any).parentHierarchy
                                          .slice(-5)
                                          .map((a: any) => a.name)
                                          .join(" → ")
                                      : "No ancestry data"}
                                  </Typography>
                                </Box>
                              }
                            >
                              <Typography
                                variant="h6"
                                sx={{ fontWeight: 900, color: slateText, letterSpacing: 0 }}
                              >
                                {item.person.name}
                              </Typography>
                            </Tooltip>

                            {/* A career profile is the better headline, but most
                                people only have the profession tag they were
                                given — and that came down in this same response.
                                Falling through to it means the card names what
                                the person does instead of announcing what the
                                record is missing. */}
                            {profile?.title ? (
                              <Typography
                                sx={{ fontSize: 14, fontWeight: 700, color: businessBlue, mb: 0.75 }}
                              >
                                {profile.title}
                                {profile.subSpecialization ? ` · ${profile.subSpecialization}` : ""}
                              </Typography>
                            ) : professionHeadline ? (
                              <Typography
                                sx={{ fontSize: 14, fontWeight: 700, color: businessBlue, mb: 0.75 }}
                              >
                                {professionHeadline}
                              </Typography>
                            ) : (
                              <Typography sx={{ fontSize: 13.5, color: mutedText, mb: 0.75 }}>
                                No profession recorded yet
                              </Typography>
                            )}

                            {profile?.summary && (
                              <Box
                                sx={{
                                  color: mutedText,
                                  fontSize: 14,
                                  lineHeight: 1.5,
                                  display: "-webkit-box",
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden",
                                }}
                              >
                                <RichText value={profile.summary} />
                              </Box>
                            )}
                          </CardContent>
                        </CardActionArea>

                        {facts.length > 0 && (
                          <Box
                            sx={{
                              px: 3,
                              py: 1.75,
                              bgcolor: CARD_FOOTER_BG,
                              borderTop: `1px solid ${BORDER_SUBTLE}`,
                              display: "flex",
                              flexDirection: "column",
                              gap: 1,
                            }}
                          >
                            {facts.map((fact) => (
                              <Stack
                                key={fact.label}
                                direction="row"
                                alignItems="center"
                                justifyContent="space-between"
                                spacing={1}
                              >
                                <Stack direction="row" alignItems="center" spacing={0.75}>
                                  {fact.icon}
                                  <Typography sx={{ fontSize: 11.5, color: mutedText }}>
                                    {fact.label}
                                  </Typography>
                                </Stack>
                                <Typography
                                  noWrap
                                  {...(fact.href
                                    ? { component: "a" as const, href: fact.href }
                                    : {})}
                                  sx={{
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: fact.href ? businessBlue : slateText,
                                    textDecoration: "none",
                                    minWidth: 0,
                                  }}
                                >
                                  {fact.value}
                                </Typography>
                              </Stack>
                            ))}
                          </Box>
                        )}

                        {/* Tags and the controls that act on them. Outside the
                            link so a chip's delete button isn't nested in an
                            anchor, and so tapping a tag can't open the page. */}
                        <Box
                          sx={{
                            px: 3,
                            py: 2,
                            borderTop: `1px solid ${BORDER_SUBTLE}`,
                            display: "flex",
                            flexDirection: "column",
                            gap: 1.25,
                          }}
                        >
                          {item.professions.length > 0 ? (
                            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }} useFlexGap>
                              {item.professions.map((prof) => (
                                <Chip
                                  key={prof.id}
                                  label={prof.name}
                                  onDelete={
                                    canEditPerson(item.person.id)
                                      ? () => handleRemoveProfession(item.person.id, prof.id)
                                      : undefined
                                  }
                                  variant="outlined"
                                  size="small"
                                />
                              ))}
                            </Stack>
                          ) : (
                            <Typography variant="body2" sx={{ color: mutedText }}>
                              No profession tags added yet
                            </Typography>
                          )}

                          <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                            spacing={1}
                          >
                            <Button
                              size="small"
                              startIcon={<PersonIcon sx={{ fontSize: 16 }} />}
                              onClick={() => navigate(`/profile/person/${item.person.id}`)}
                              sx={{ textTransform: "none", px: 0.5 }}
                            >
                              Family profile
                            </Button>
                            {canEditProfessionProfile(item.person.id) && (
                              <Button
                                variant="outlined"
                                size="small"
                                onClick={() => {
                                  setProfessionEditorProfile(profile);
                                  setProfessionEditorPersonId(item.person.id);
                                }}
                                startIcon={profile ? <EditIcon /> : <AddIcon />}
                                sx={{ whiteSpace: "nowrap", textTransform: "none" }}
                              >
                                {profile ? "Edit profession" : "Add profession"}
                              </Button>
                            )}
                          </Stack>
                        </Box>
                      </Card>
                    );
                  })}
                </Box>
              ) : (
                <Paper
                  elevation={0}
                  sx={{
                    p: 4,
                    textAlign: "center",
                    borderRadius: 3,
                    bgcolor: brand.surface,
                    border: `1px solid ${BORDER_SUBTLE}`,
                  }}
                >
                  <Typography sx={{ fontWeight: 800, color: slateText, mb: 0.5 }}>
                    {professionSearchTerm
                      ? `No one here matches “${searchQuery.trim()}”`
                      : "Nobody listed here yet"}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: mutedText, maxWidth: 520, mx: "auto", lineHeight: 1.6 }}
                  >
                    {professionSearchTerm
                      ? `No family member around ${areaName} matches that. Try a different term, or search somewhere else.`
                      : centre?.latitude != null
                        ? `No family member with a profession is listed within ${radiusKm} km of ${areaName}. Try another town, or widen your search.`
                        : "No people data available."}
                  </Typography>
                </Paper>
              )}
            </Box>

            <Divider sx={{ my: 6 }} />

            {/* Professions Categories with People */}
            {professionGroups.length > 0 && (
              <Box sx={{ mb: 8 }}>
                <Typography
                  variant="h4"
                  gutterBottom
                  sx={{ textAlign: "center", fontWeight: 700, mb: 6 }}
                >
                  Professions Directory
                </Typography>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "1fr 1fr",
                      md: "1fr 1fr 1fr",
                    },
                    gap: 3,
                  }}
                >
                  {professionGroups.map((professionData: any) => {
                    // Group people by profession
                    const peopleInProfession = professionData.people || [];

                    return (
                      <Card
                        key={professionData.professionId}
                        sx={{ ...cardSx, bgcolor: brand.surface }}
                      >
                        <CardContent>
                          <Typography
                            variant="h6"
                            gutterBottom
                            sx={{ fontWeight: 900, mb: 2, color: slateText }}
                          >
                            {professionData.professionName}
                          </Typography>
                          {professionData.professionDescription && (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              paragraph
                              sx={{ minHeight: 40, mb: 2 }}
                            >
                              {professionData.professionDescription}
                            </Typography>
                          )}
                          <Stack spacing={1}>
                            {peopleInProfession.map((person: any) => {
                              const hierarchyText =
                                person.parentHierarchy &&
                                person.parentHierarchy.length > 0
                                  ? person.parentHierarchy
                                      .slice(-5)
                                      .map((a: any) => a.name)
                                      .join(" → ")
                                  : "No ancestry data";

                              const tooltipContent = (
                                <Box sx={{ p: 1 }}>
                                  <Typography
                                    variant="body2"
                                    sx={{ fontWeight: 600 }}
                                  >
                                    {person.personName}
                                  </Typography>
                                  {person.casteName && (
                                    <Typography
                                      variant="caption"
                                      display="block"
                                    >
                                      Caste: {person.casteName}
                                    </Typography>
                                  )}
                                  {person.subCasteName && (
                                    <Typography
                                      variant="caption"
                                      display="block"
                                    >
                                      Sub-Caste: {person.subCasteName}
                                    </Typography>
                                  )}
                                  <Typography
                                    variant="caption"
                                    display="block"
                                    sx={{ mt: 1 }}
                                  >
                                    🧬 {hierarchyText}
                                  </Typography>
                                </Box>
                              );

                              return (
                                <Tooltip
                                  key={person.personId}
                                  title={tooltipContent}
                                >
                                  <Box
                                    onClick={() =>
                                      navigate(
                                        buildFamilyPagePath(
                                          person.treeId,
                                          person.personId,
                                        ),
                                      )
                                    }
                                    sx={{
                                      p: 1.5,
                                      bgcolor: brand.canvas,
                                      borderRadius: 2,
                                      border: "1px solid rgba(15,23,42,0.08)",
                                      cursor: "pointer",
                                      color: businessBlue,
                                      textDecoration: "underline",
                                      transition: "all 0.2s",
                                      "&:hover": {
                                        bgcolor: brand.primarySoft,
                                        fontWeight: 600,
                                        transform: "translateX(4px)",
                                      },
                                    }}
                                  >
                                    <Typography
                                      variant="body2"
                                      sx={{ fontWeight: 600 }}
                                    >
                                      {person.personName}
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        display: "block",
                                        mt: 0.5,
                                        color: "text.secondary",
                                        textDecoration: "none",
                                      }}
                                    >
                                      Lineage: {hierarchyText}
                                    </Typography>
                                  </Box>
                                </Tooltip>
                              );
                            })}
                          </Stack>
                        </CardContent>
                      </Card>
                    );
                  })}
                </Box>
              </Box>
            )}

            <Divider sx={{ my: 5, borderColor: "rgba(15,23,42,0.08)" }} />

            {/* Business Categories */}
            <Box sx={{ mb: 8 }}>
              <Typography
                variant="h4"
                gutterBottom
                sx={{
                  textAlign: "center",
                  fontWeight: 900,
                  color: slateText,
                  mb: 4,
                  letterSpacing: 0,
                }}
              >
                Business Categories
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "1fr 1fr",
                    md: "1fr 1fr 1fr",
                  },
                  gap: 3,
                }}
              >
                {businessCategories.map((category) => (
                  <Card
                    key={category.category}
                    sx={{ ...cardSx, bgcolor: brand.surface }}
                  >
                    <CardContent sx={{ textAlign: "center", p: 3 }}>
                      <Box
                        sx={{
                          width: 64,
                          height: 64,
                          mx: "auto",
                          mb: 2,
                          borderRadius: 2,
                          bgcolor: brand.primarySoft,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {category.icon}
                      </Box>
                      <Typography
                        variant="h6"
                        gutterBottom
                        sx={{ fontWeight: 900, color: slateText }}
                      >
                        {category.title}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        paragraph
                        sx={{ minHeight: 48, color: mutedText }}
                      >
                        {category.description}
                      </Typography>
                      <Chip
                        label={`${category.count} ${
                          category.count === 1 ? "business" : "businesses"
                        }`}
                        variant="outlined"
                        sx={{
                          borderColor: "rgba(13,110,253,0.35)",
                          color: businessBlue,
                          fontWeight: 800,
                        }}
                      />
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </Box>

            <Divider sx={{ my: 5, borderColor: "rgba(15,23,42,0.08)" }} />

            {/* Benefits Section */}
            <Box sx={{ mb: 8 }}>
              <Stack
                direction="row"
                spacing={2}
                alignItems="center"
                sx={{ mb: 4 }}
              >
                <HandshakeIcon sx={{ fontSize: 40, color: businessBlue }} />
                <Typography variant="h4" sx={{ fontWeight: 900, color: slateText }}>
                  Benefits of Family Business Network
                </Typography>
              </Stack>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                  gap: 3,
                }}
              >
                {benefits.map((benefit, index) => (
                  <Paper
                    key={`benefit-${index}`}
                    elevation={0}
                    sx={{
                      p: 3,
                      borderRadius: 2,
                      border: "1px solid rgba(15,23,42,0.08)",
                      boxShadow: "0 8px 24px rgba(15,23,42,0.05)",
                    }}
                  >
                    <Typography
                      variant="h6"
                      gutterBottom
                      sx={{ fontWeight: 900, color: slateText }}
                    >
                      {benefit.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: mutedText }}>
                      {benefit.description}
                    </Typography>
                  </Paper>
                ))}
              </Box>
            </Box>

            <Divider sx={{ my: 6 }} />

            {/* How to Get Listed */}
            <Box sx={{ mb: 8 }}>
              <Card elevation={3} sx={{ p: 4, bgcolor: "#f0f8ff" }}>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
                  List Your Business
                </Typography>
                <Typography variant="body1" paragraph>
                  Are you a family member running a business or offering
                  professional services? We'd love to feature you in our family
                  business directory!
                </Typography>
                <Typography variant="body1" paragraph>
                  Being listed helps you:
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 3 }}>
                  <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                    Connect with potential customers within the family
                  </Typography>
                  <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                    Build your professional network
                  </Typography>
                  <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                    Find collaboration opportunities
                  </Typography>
                  <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                    Showcase your services to the community
                  </Typography>
                </Box>
                {isAdmin() ? (
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                    sx={primaryButtonSx}
                  >
                    Add a Business
                  </Button>
                ) : (
                  // Contact page hidden for now — CTA suppressed for non-admins.
                  // <Button variant="contained" size="large" sx={primaryButtonSx} href="/contact">
                  //   Contact Us to Get Listed
                  // </Button>
                  null
                )}
              </Card>
            </Box>
          </>
        )}
        </Container>
      </Box>

      {/* Add/Edit Business Dialog */}
      <BusinessFormDialog
        open={openDialog}
        onClose={handleCloseDialog}
        business={editingBusiness}
        enableOwnerSelect
        locationId={selectedLocation}
        onSaved={handleBusinessSaved}
      />

      {/* Delete business confirmation */}
      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => !deleting && setDeleteTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete business</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete{" "}
            <strong>{deleteTarget?.name}</strong>? This can't be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => void handleDeleteBusiness()}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Choosing who, then the same profession editor used everywhere else.
          The picker exists only for the page-level Add button, where no person
          is known yet; the cards open the editor directly. */}
      <Dialog
        open={openProfessionDialog}
        onClose={handleCloseProfessionDialog}
        maxWidth="sm"
        fullWidth
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Whose profession?
          </Typography>

          <PersonSearchField
            label="Select Person"
            placeholder="Start typing a name"
            searchValue={professionSearchInput}
            onSearchValueChange={(value) => {
              setProfessionSearchInput(value);
              if (!value) {
                setSelectedPersonForProfession(null);
              }
            }}
            onPersonSelect={(person) => {
              setSelectedPersonForProfession(person as FNode);
              setProfessionSearchInput(person.name);
            }}
            selectedPerson={selectedPersonForProfession}
            locationId={selectedLocation}
            writableOnly
          />

          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button variant="outlined" onClick={handleCloseProfessionDialog} fullWidth>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                if (!selectedPersonForProfession) return;
                setProfessionEditorPersonId(selectedPersonForProfession.id);
                setOpenProfessionDialog(false);
              }}
              disabled={!selectedPersonForProfession}
              fullWidth
              sx={primaryButtonSx}
            >
              Continue
            </Button>
          </Stack>
        </Box>
      </Dialog>

      {professionEditorPersonId && (
        <ProfessionFormDialog
          open
          onClose={() => setProfessionEditorPersonId(null)}
          peopleId={professionEditorPersonId}
          profile={professionEditorProfile}
          onSaved={() => {
            setProfessionEditorPersonId(null);
            // The list shows the nearby rows whenever a centre is set, so
            // refreshing redux alone left a new profile invisible.
            setNearbyProfessionsVersion((v) => v + 1);
            if (selectedLocation) {
              dispatch(fetchProfessionsData(selectedLocation));
            }
          }}
        />
      )}
    </>
  );
};

export default BusinessPage;
