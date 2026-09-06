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
import { brand, washBorder } from "../../theme/brand";
import { GlobalSearch } from "./GlobalSearch";
import { LandingPage } from "./LandingPage";
import { TodayStrip } from "./TodayStrip";
import { PersonalStats } from "./PersonalStats";
import { TreeGaps } from "./TreeGaps";
import { FeatureGrid } from "./FeatureGrid";
import { NetworkStrip } from "./NetworkStrip";
import { ContributorList, Contributor } from "./ContributorList";
import {heroSurface, panelSx, sectionSpacing } from "./homeTheme";

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

      <Box sx={{ background: heroSurface, borderBottom: "1px solid", borderColor: washBorder }}>
        {/* A signed-in dashboard earns its space with what changed and what to do
            next, so this band stays small: a greeting, search, and one action.
            The slogan that used to sit here is landing-page copy — it pushed the
            worklist below the fold without telling the user anything. */}
        <Container maxWidth="lg" sx={{ py: { xs: 2, md: 2.5 } }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={{ xs: 1.5, md: 3 }}
            alignItems={{ xs: "stretch", md: "center" }}
            sx={{ mb: 2 }}
          >
            <Typography
              component="h1"
              sx={{
                fontWeight: 800,
                fontSize: { xs: 22, sm: 25, md: 27 },
                lineHeight: 1.2,
                color: brand.ink,
                flexShrink: 0,
              }}
            >
              {personName ? (
                `Welcome back, ${personName}`
              ) : authPending ? (
                <>
                  Welcome back,{" "}
                  <Skeleton
                    variant="text"
                    width={140}
                    sx={{ display: "inline-block", verticalAlign: "middle" }}
                  />
                </>
              ) : (
                "Welcome back"
              )}
            </Typography>
            <Box sx={{ flex: 1, minWidth: 0, maxWidth: { md: 520 } }}>
              <GlobalSearch />
            </Box>
          </Stack>

          {nextAction && (
            <Box
              sx={{
                ...(panelSx as object),
                p: { xs: 1.75, sm: 2 },
                mb: 3,
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
                  bgcolor: brand.primary,
                  "&:hover": { bgcolor: brand.primaryDark },
                }}
              >
                {nextAction.cta}
              </Button>
            </Box>
          )}

          <Button
            variant="contained"
            onClick={() => void handleContinueToYourTree()}
            disabled={continueTreeLoading}
            endIcon={<ArrowForwardIcon />}
            sx={{
              fontWeight: 700,
              minHeight: 44,
              bgcolor: brand.primary,
              "&:hover": { bgcolor: brand.primaryDark },
            }}
          >
            {continueTreeLoading ? "Opening..." : "Continue your tree"}
          </Button>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: sectionSpacing }}>
        <Stack spacing={sectionSpacing}>
          <TodayStrip
            events={familyEvents}
            upcoming={upcoming}
            loading={eventsLoading || authPending}
          />

          <PersonalStats
            stats={stats}
            treeName={insights?.tree?.name}
            treeId={insights?.tree?.id}
            loading={insightsLoading || authPending}
          />

          <TreeGaps
            gaps={insights?.gaps || []}
            loading={insightsLoading || authPending}
            treeName={insights?.tree?.name}
          />

          <FeatureGrid counts={counts} loading={insightsLoading || authPending} />

          <Box sx={{ ...(panelSx as object), p: { xs: 2.5, md: 3 } }}>
            <ContributorList contributors={topContributors} loading={loadingStats} />
          </Box>

          <NetworkStrip
            totalPeople={totalPeople}
            totalTrees={totalTrees}
            totalLocations={totalLocations}
            totalBusinesses={totalBusinesses}
            loading={loadingStats}
          />
        </Stack>
      </Container>
    </>
  );
};

export default HomePage;
