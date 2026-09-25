import React, { useCallback, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Box,
  Button,
  Container,
  Skeleton,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import PhotoLibraryOutlinedIcon from "@mui/icons-material/PhotoLibraryOutlined";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  fetchDashboardStatistics,
  selectStatistics,
  selectStatisticsLoading,
} from "../../store/slices/statisticsSlice";
import {
  ApiService,
  DashboardInsights,
  FamilyEvents,
  UpcomingFamilyEvent,
} from "../../services/apiService";
import { selectEffectiveUserOnboardingData } from "../../store/slices/userOnboardingSlice";
import { useAuth } from "../hooks/useAuth";
import { resolveDefaultFamilyTreePath } from "../../utils/defaultFamilyTreeNavigation";
import { brand, fontSerif } from "../../theme/brand";
import { GlobalSearch } from "./GlobalSearch";
import { LandingPage } from "./LandingPage";
import { TodayStrip } from "./TodayStrip";
import { PersonalStats } from "./PersonalStats";
import { TreeGaps } from "./TreeGaps";
import { FeatureGrid } from "./FeatureGrid";
import { NetworkStrip } from "./NetworkStrip";
import { RecentPhotos } from "./RecentPhotos";
import { QuickActions } from "./QuickActions";
import { ContributorList, Contributor } from "./ContributorList";
import { WishWall } from "./WishWall";
import { eyebrowSx, panelSx } from "./homeTheme";

/**
 * The dashboard's ground.
 *
 * A flat near-white rather than the app's blue wash: this page is a field of
 * white cards, and a gradient behind them made the cards read as floating on a
 * second, differently-coloured page.
 */

/** The small separator between eyebrow items. */
const Dot: React.FC = () => (
  <Box aria-hidden sx={{ width: 3, height: 3, borderRadius: "50%", bgcolor: "#cbd5e1" }} />
);

type NextAction = {
  title: string;
  description: string;
  to: string;
  cta: string;
};

const EMPTY_STATS: DashboardInsights["stats"] = {
  peopleInTree: 0,
  generations: 0,
  addedThisMonth: 0,
  incompleteProfiles: 0,
};

/**
 * The homepage is two different products behind one route.
 *
 * Signed out it's an acquisition surface (`LandingPage`) — it used to greet
 * anonymous visitors with "Welcome back, Family Member" over internal metrics.
 * Signed in it's a dashboard built around what the user can do next: today's
 * family dates, their own tree's numbers, and the gaps worth filling.
 *
 * Which of the two we render must not flip after the first paint: a returning
 * user seeing the landing page for a moment before the dashboard replaces it
 * reads as a bug. Firebase resolves its persisted session asynchronously, so
 * until it reports (`initialized`) we pick the side from `hadSession` — the
 * previous visit's outcome — and render that side's loading state rather than
 * guessing "signed out".
 */
export const HomePage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  // From `xl` the page has room for the design's right rail.
  const isWide = useMediaQuery(theme.breakpoints.up("xl"));
  /** Bumped when a wish is sent, so the wall re-reads itself. */
  const [wallVersion, setWallVersion] = useState(0);
  const { currentUser, userProfile, loading: authLoading, initialized, hadSession } = useAuth();
  const onboarding = useAppSelector(selectEffectiveUserOnboardingData);
  const statistics = useAppSelector(selectStatistics);
  const loadingStats = useAppSelector(selectStatisticsLoading);

  const [insights, setInsights] = useState<DashboardInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [familyEvents, setFamilyEvents] = useState<FamilyEvents | null>(null);
  const [upcoming, setUpcoming] = useState<UpcomingFamilyEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [nextAction, setNextAction] = useState<NextAction | null>(null);
  const [continueTreeLoading, setContinueTreeLoading] = useState(false);

  // Both fields map from the same DB column, so a user who never set a name
  // (phone signups) has neither. Greet them without a placeholder standing in
  // for their name.
  const personName = (userProfile?.displayName || userProfile?.name || "").trim();

  // Shown as a chip beside the greeting. Only roles the app actually grants —
  // an invented status label ("Custodian", "Branch Keeper") would look like a
  // standing the user had earned when it means nothing.
  const roleLabel =
    userProfile?.role === "superadmin"
      ? "Super admin"
      : userProfile?.role === "admin"
        ? "Admin"
        : null;

  const totalPeople = Number(statistics?.totalPeople || 0);
  const totalTrees = Number(statistics?.totalTrees || 0);
  const totalLocations = Number(statistics?.totalLocations || 0);
  const totalBusinesses = Number(statistics?.totalBusinesses || 0);
  const topContributors: Contributor[] = Array.isArray(statistics?.topContributors)
    ? (statistics.topContributors as Contributor[])
    : [];

  useEffect(() => {
    dispatch(fetchDashboardStatistics());
  }, [dispatch]);

  // Personalized data — one round trip for the tree stats, worklist and badges.
  useEffect(() => {
    if (!currentUser) {
      setInsights(null);
      return;
    }
    let cancelled = false;
    setInsightsLoading(true);
    ApiService.getMyDashboardInsights()
      .then((data) => {
        if (!cancelled) setInsights(data);
      })
      .catch((err) => {
        console.error("Failed to load dashboard insights:", err);
        if (!cancelled) setInsights(null);
      })
      .finally(() => {
        if (!cancelled) setInsightsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentUser, userProfile?.peopleId]);

  // Today's dates, plus the week ahead so a quiet day still has something.
  useEffect(() => {
    if (!currentUser || !userProfile?.peopleId) {
      setFamilyEvents(null);
      setUpcoming([]);
      return;
    }
    let cancelled = false;
    setEventsLoading(true);
    Promise.all([
      ApiService.getTodaysFamilyEvents().catch(() => null),
      ApiService.getUpcomingFamilyEvents(7).catch(() => []),
    ])
      .then(([today, ahead]) => {
        if (cancelled) return;
        setFamilyEvents(today);
        setUpcoming(Array.isArray(ahead) ? ahead : []);
      })
      .finally(() => {
        if (!cancelled) setEventsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentUser, userProfile?.peopleId]);

  /**
   * The single most useful thing this user could do next.
   *
   * Only computed for users who aren't linked to a person node yet — once
   * they're linked, the `TreeGaps` worklist is a better prompt than a banner.
   */
  useEffect(() => {
    let cancelled = false;

    const compute = async () => {
      if (!currentUser || !userProfile) {
        setNextAction(null);
        return;
      }
      if (userProfile.peopleId) {
        setNextAction(null);
        return;
      }

      let allRequests: any[] = [];
      try {
        allRequests = await ApiService.getMyLinkRequests();
      } catch (err) {
        console.error("Failed to load link requests:", err);
      }
      if (cancelled) return;

      const pending = allRequests.filter((r) => r.status === "pending");
      const pendingLink = pending.find((r) => r.requestType === "user_to_tree_node");
      const hasApprovedBranchAccess = allRequests.some(
        (r) => r.requestType === "branch_access_request" && r.status === "approved",
      );
      // An accepted invite already put them in a tree, so onboarding would only
      // ask them to find one again — send them to link their node instead.
      const joinedThroughInvite =
        onboarding?.completion?.result === "invite_accepted";

      // The decisive signal: can they already see a tree?
      //
      // The two flags above only catch users who arrived via an approved request
      // or an invite. Someone who CREATED their own tree has neither — no request
      // row exists — and was being sent to onboarding to "find my tree" when the
      // tree was already theirs. getTrees() is access-scoped, so a non-empty
      // result means they have somewhere to link themselves.
      let hasAccessibleTree = false;
      try {
        const trees = await ApiService.getTrees();
        hasAccessibleTree = (trees || []).length > 0;
      } catch (err) {
        // Non-fatal: fall back to the request-derived signals below.
        console.warn("Could not check accessible trees for next action:", err);
      }
      if (cancelled) return;

      if (pendingLink) {
        setNextAction({
          title: "Profile link pending approval",
          description: `Your request to link with ${pendingLink.targetPersonName || "your family member"} is awaiting the tree owner's approval.`,
          to: "/requests",
          cta: "View request",
        });
        return;
      }

      setNextAction(
        hasAccessibleTree || hasApprovedBranchAccess || joinedThroughInvite
          ? {
              title: "Link your profile",
              description:
                "Find yourself in your family tree to finish linking your account.",
              to: "/profile",
              cta: "Link my profile",
            }
          : {
              title: "Finish setting up your profile",
              description: "Find your family tree and request access to your branch.",
              to: "/onboarding",
              cta: "Find my tree",
            },
      );
    };

    void compute();
    return () => {
      cancelled = true;
    };
  }, [currentUser, userProfile, onboarding?.completion?.result]);

  const handleContinueToYourTree = useCallback(async () => {
    setContinueTreeLoading(true);
    try {
      navigate(await resolveDefaultFamilyTreePath());
    } finally {
      setContinueTreeLoading(false);
    }
  }, [navigate]);

  // Before Firebase reports, the last visit's outcome is the best available
  // guess — and the one that is right for this browser almost every time.
  const showDashboard = initialized ? !!currentUser : hadSession;
  // Auth still settling: the sections have skeletons, so show those instead of
  // real zeros/empty states that would be replaced a moment later. Once the
  // profile is in hand a later refetch (the hourly token refresh) must not send
  // an already-populated dashboard back to skeletons.
  const authPending = !initialized || (authLoading && !userProfile);

  // ---- Signed out: a proper landing page, not an empty dashboard. ----------
  if (!showDashboard) {
    return (
      <>
        <Helmet>
          <title>Kinvia - Preserve Your Family Legacy</title>
          <meta
            name="description"
            content="Kinvia helps families preserve lineage, stories, and relationships for future generations."
          />
        </Helmet>
        <LandingPage
          searchSlot={<GlobalSearch maxWidth="100%" rounded showTypeFilter />}
          totalPeople={totalPeople}
          totalTrees={totalTrees}
          totalLocations={totalLocations}
          totalBusinesses={totalBusinesses}
          statsLoading={loadingStats}
        />
      </>
    );
  }

  // ---- Signed in: the dashboard. ------------------------------------------
  const stats = insights?.stats || EMPTY_STATS;
  const counts = insights?.counts || { photos: 0, pendingRequests: 0 };

  return (
    <>
      <Helmet>
        <title>Kinvia - Your Family Dashboard</title>
        <meta
          name="description"
          content="Your family at a glance — today's dates, your tree, and what to add next."
        />
      </Helmet>

      {/*
        One continuous surface, top to bottom.

        The dashboard used to open with a tinted, bordered hero band, which cut
        the page in two: a coloured strip at the top and a different-looking page
        under it. The design treats the greeting as simply the first section of
        the page, so the wash runs the whole way and the sections themselves
        provide the structure.
      */}
      <Box sx={{ bgcolor: brand.pageCanvas, minHeight: "100vh" }}>
        <Container
          maxWidth={false}
          sx={{ maxWidth: 1440, px: { xs: 2, sm: 3, lg: 4 }, py: { xs: 3, md: 4 } }}
        >
          <Stack spacing={{ xs: 3, md: 4 }}>
            {/* ---- Greeting, primary actions, search ------------------------ */}
            <Box component="section">
              <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "stretch", sm: "flex-end" }}
                spacing={{ xs: 2, sm: 3 }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    flexWrap="wrap"
                    useFlexGap
                    sx={{ mb: 0.5 }}
                  >
                    <Typography sx={{ ...(eyebrowSx as object), color: brand.primary }}>
                      Welcome back
                    </Typography>
                    {roleLabel && (
                      <>
                        <Dot />
                        <Box
                          sx={{
                            px: 1,
                            py: 0.25,
                            borderRadius: 1,
                            fontSize: 11,
                            fontWeight: 600,
                            color: brand.primaryDark,
                            bgcolor: brand.primarySoft,
                            border: "1px solid",
                            borderColor: "rgba(191, 219, 254, 0.9)",
                          }}
                        >
                          {roleLabel}
                        </Box>
                      </>
                    )}
                    {/* Which branch this dashboard is about — the design's
                        "Dhana Ram Lineage Lead" line, minus the invented title. */}
                    {insights?.tree?.name && (
                      <>
                        <Dot />
                        <Typography
                          noWrap
                          sx={{
                            display: { xs: "none", sm: "block" },
                            fontSize: 12,
                            color: brand.slateMuted,
                            maxWidth: 260,
                          }}
                        >
                          {insights.tree.name}
                        </Typography>
                      </>
                    )}
                  </Stack>

                  <Typography
                    component="h1"
                    sx={{
                      fontWeight: 800,
                      fontSize: { xs: 26, sm: 32, md: 36 },
                      letterSpacing: "-0.02em",
                      lineHeight: 1.15,
                      color: brand.ink,
                    }}
                  >
                    {personName ? (
                      personName
                    ) : authPending ? (
                      <Skeleton variant="text" width={200} sx={{ maxWidth: "100%" }} />
                    ) : (
                      "Your family dashboard"
                    )}
                  </Typography>

                  {/* The design's one serif line — a deliberate break from the
                      UI typeface, so the sentiment doesn't read as chrome. */}
                  <Typography
                    sx={{
                      mt: 0.5,
                      fontFamily: fontSerif,
                      fontSize: 15,
                      fontStyle: "italic",
                      color: brand.slateMuted,
                    }}
                  >
                    Every update you make today becomes heritage tomorrow.
                  </Typography>
                </Box>

                {/* The two destinations a returning user opens by name. */}
                <Stack
                  direction="row"
                  spacing={1.5}
                  sx={{ flexShrink: 0, "& > *": { flex: { xs: 1, sm: "0 0 auto" } } }}
                >
                  <Button
                    variant="contained"
                    onClick={() => void handleContinueToYourTree()}
                    disabled={continueTreeLoading}
                    endIcon={<ArrowForwardIcon />}
                    sx={{
                      fontWeight: 700,
                      minHeight: 44,
                      px: 2.25,
                      borderRadius: 2,
                      textTransform: "none",
                      fontSize: 14,
                      boxShadow: "0 1px 2px rgba(13, 110, 253, 0.25)",
                      bgcolor: brand.primary,
                      "&:hover": { bgcolor: brand.primaryDark },
                    }}
                  >
                    {continueTreeLoading ? "Opening…" : "Continue your tree"}
                  </Button>
                  <Button
                    component={Link}
                    to="/photos"
                    variant="outlined"
                    startIcon={<PhotoLibraryOutlinedIcon />}
                    sx={{
                      // Hidden on phones, where two side-by-side buttons force
                      // the primary label onto two lines. Photos keeps its
                      // Explore tile a screen below, so nothing is lost.
                      display: { xs: "none", sm: "inline-flex" },
                      fontWeight: 600,
                      minHeight: 44,
                      px: 2.25,
                      borderRadius: 2,
                      textTransform: "none",
                      fontSize: 14,
                      whiteSpace: "nowrap",
                      bgcolor: brand.surface,
                      color: brand.slate,
                      borderColor: brand.border,
                      "&:hover": { bgcolor: brand.canvas, borderColor: "#cbd5e1" },
                    }}
                  >
                    Family photos
                  </Button>
                </Stack>
              </Stack>

              {/* Full width rather than sharing the greeting's row: search is
                  the fastest way into a 600-person tree, not a sliver. */}
              <Box sx={{ mt: { xs: 2, md: 2.5 }, maxWidth: 860 }}>
                <GlobalSearch maxWidth="100%" rounded showTypeFilter />
              </Box>

              {nextAction && (
                <Box
                  sx={{
                    ...(panelSx as object),
                    p: { xs: 1.75, sm: 2 },
                    mt: { xs: 2, md: 2.5 },
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    alignItems: { xs: "flex-start", sm: "center" },
                    gap: { xs: 1.5, sm: 2 },
                    borderColor: brand.primary,
                    bgcolor: brand.primarySoft,
                  }}
                >
                  <AutoAwesomeOutlinedIcon sx={{ color: brand.primary, flexShrink: 0 }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700, color: brand.ink }}>
                      {nextAction.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: brand.slate }}>
                      {nextAction.description}
                    </Typography>
                  </Box>
                  <Button
                    component={Link}
                    to={nextAction.to}
                    variant="contained"
                    endIcon={<ArrowForwardIcon />}
                    fullWidth={isMobile}
                    sx={{
                      flexShrink: 0,
                      fontWeight: 700,
                      minHeight: 44,
                      textTransform: "none",
                      fontSize: 14,
                      bgcolor: brand.primary,
                      "&:hover": { bgcolor: brand.primaryDark },
                    }}
                  >
                    {nextAction.cta}
                  </Button>
                </Box>
              )}
            </Box>

            {/*
              Below `xl` everything is one column, exactly as the desktop
              design. From `xl` the page splits 8/4 and the ranking, the archive
              and the shortcuts move into a rail — the widescreen design — so a
              2560px monitor isn't a column of content with empty margins.
            */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", xl: "minmax(0, 8fr) minmax(0, 4fr)" },
                gap: { xs: 3, md: 4 },
                alignItems: "start",
              }}
            >
              <Stack spacing={{ xs: 3, md: 4 }} sx={{ minWidth: 0 }}>
                <TodayStrip
                  events={familyEvents}
                  upcoming={upcoming}
                  loading={eventsLoading || authPending}
                  treeId={insights?.tree?.id}
                  // A wish sent from a card up here belongs on the wall below
                  // immediately — they are on the same screen, so not showing it
                  // reads as the send having failed.
                  onWishSent={() => setWallVersion((version) => version + 1)}
                />

                <PersonalStats
                  stats={stats}
                  treeName={insights?.tree?.name}
                  treeId={insights?.tree?.id}
                  loading={insightsLoading || authPending}
                />

                {!isWide && <WishWall refreshKey={wallVersion} />}

                <TreeGaps
                  gaps={insights?.gaps || []}
                  loading={insightsLoading || authPending}
                  treeName={insights?.tree?.name}
                  totalIncomplete={stats.incompleteProfiles}
                />

                <FeatureGrid counts={counts} loading={insightsLoading || authPending} />

                <NetworkStrip
                  totalPeople={totalPeople}
                  totalTrees={totalTrees}
                  totalLocations={totalLocations}
                  totalBusinesses={totalBusinesses}
                  loading={loadingStats}
                />
              </Stack>

              {isWide && (
                <Stack spacing={3} sx={{ minWidth: 0, position: "sticky", top: 88 }}>
                  {/* What the family is saying sits where the photo archive
                      used to: it changes daily and invites a reply, while the
                      archive is a browse-when-you-feel-like-it surface that
                      reads just as well further down. */}
                  <WishWall refreshKey={wallVersion} />
                  <QuickActions pendingRequests={Number(counts?.pendingRequests) || 0} />
                </Stack>
              )}
            </Box>

            {/*
              The wall and the ranking close the page, below the two-column
              grid so they span its full width at every breakpoint.

              They belong together: the ranking is a maintenance statistic —
              who edits the tree most — and on its own at the top of a rail it
              read as a leaderboard the dashboard was built around. Next to what
              people actually wrote to each other, it reads as what it is.
            */}
            <Stack spacing={{ xs: 3, md: 4 }} sx={{ minWidth: 0 }}>
              <RecentPhotos />
              <ContributorList contributors={topContributors} loading={loadingStats} />
            </Stack>
          </Stack>
        </Container>
      </Box>
    </>
  );
};

export default HomePage;
