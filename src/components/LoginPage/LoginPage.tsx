import React, { useCallback, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Box, Container, Skeleton, Stack, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import { useAuth } from "../hooks/useAuth";
import { resolveDefaultFamilyTreePath } from "../../utils/defaultFamilyTreeNavigation";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  selectEffectiveUserOnboardingData,
  selectUserOnboardingLoaded,
} from "../../store/slices/userOnboardingSlice";
import {
  fetchDashboardStatistics,
  selectStatistics,
  selectStatisticsLoading,
} from "../../store/slices/statisticsSlice";
import {
  consumePostLoginRedirect,
  setPostLoginRedirectIfAbsent,
} from "../../utils/postLoginRedirect";
import { usePhoneOtpAuth } from "../LoginModal/usePhoneOtpAuth";
import { PhoneOtpForm } from "../LoginModal/PhoneOtpForm";
import { OTP_LENGTH } from "../../config/otp";
import { brand } from "../../theme/brand";

/**
 * The full-page sign-in screen.
 *
 * Two columns: what Kinvia is on the left, the actual sign-in on the right. The
 * left panel exists because /login is the first page many people see — an
 * invited relative following a link has no other context — so it says what the
 * archive is before asking for a phone number.
 *
 * Everything shown there is real: the counts come from the same public
 * statistics endpoint the landing page uses, and the assurances describe
 * behaviour the app actually has. No invented testimonials or sample records.
 *
 * The form is `PhoneOtpForm` on `usePhoneOtpAuth` — the same flow the in-app
 * `LoginModal` runs.
 */

/** Design palette for this screen (DESIGN.md), kept local to it. */
const CANVAS = "#FAFAF7";
const PANEL_GRADIENT = "linear-gradient(to bottom, #eff4ff 0%, #e5eeff 55%, #cbdbf5 100%)";
const GREEN_SOFT = "#E8F5EE";
const GREEN_INK = "#006c4a";
const TEXT_DISPLAY = "#0F172A";
const TEXT_MUTED = "#64748B";
const BORDER_SUBTLE = "#E2E8F0";

const ASSURANCES = [
  { icon: <LockOutlinedIcon />, label: "One-time code sign-in — no password to lose" },
  { icon: <VisibilityOffOutlinedIcon />, label: "Private by default: nothing is public until you share it" },
  { icon: <ShieldOutlinedIcon />, label: "You decide who can see and edit your branch" },
];

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { currentUser, userProfile, loading } = useAuth();
  const onboarding = useAppSelector(selectEffectiveUserOnboardingData);
  const onboardingLoaded = useAppSelector(selectUserOnboardingLoaded);
  const statistics = useAppSelector(selectStatistics);
  const statsLoading = useAppSelector(selectStatisticsLoading);
  const from = (location.state as any)?.from?.pathname || "/families";

  const auth = usePhoneOtpAuth();

  useEffect(() => {
    dispatch(fetchDashboardStatistics());
  }, [dispatch]);

  // Persist where the login was initiated so it survives the onboarding detour
  // (router state on this navigation is lost once the onboarding guard runs).
  useEffect(() => {
    setPostLoginRedirectIfAbsent((location.state as any)?.from?.pathname);
  }, [location.state]);

  useEffect(() => {
    if (loading || !currentUser) {
      return;
    }

    // Admins may be sent through onboarding first. Wait for its status to load.
    const isAdmin = userProfile?.role === "admin";
    if (isAdmin && !onboardingLoaded) {
      return;
    }
    const needsOnboarding = isAdmin && onboarding.status === "in_progress";
    if (needsOnboarding) {
      // Navigate to onboarding ourselves instead of waiting for the global
      // onboarding guard to react. The cross-component handoff races with the
      // repeated auth-state updates fired during sign-in and could leave a
      // freshly logged-in user stranded on /login until a manual refresh.
      // This does NOT consume the remembered post-login redirect — the guard
      // still consumes it once onboarding completes — so the original
      // destination is preserved.
      navigate("/onboarding", { replace: true });
      return;
    }

    let active = true;
    const target = consumePostLoginRedirect() || from;

    if (target === "/families") {
      resolveDefaultFamilyTreePath().then((targetPath) => {
        if (active) {
          navigate(targetPath, { replace: true });
        }
      });
    } else {
      if (active) {
        navigate(target, { replace: true });
      }
    }

    return () => {
      active = false;
    };
  }, [
    loading,
    currentUser,
    userProfile?.role,
    onboarding.status,
    onboardingLoaded,
    from,
    navigate,
  ]);

  const handleLeave = useCallback(() => {
    // Abandoning login discards the remembered destination.
    consumePostLoginRedirect();
  }, []);

  const figures = [
    { label: "Members", value: Number(statistics?.totalPeople || 0) },
    { label: "Family trees", value: Number(statistics?.totalTrees || 0) },
    { label: "Locations", value: Number(statistics?.totalLocations || 0) },
  ];

  return (
    <>
      <Helmet>
        <title>Sign in - Kinvia</title>
        <meta name="description" content="Sign in to Kinvia to open your family tree." />
      </Helmet>

      <Box sx={{ bgcolor: CANVAS, minHeight: "100vh", py: { xs: 3, md: 6 } }}>
        <Container maxWidth={false} sx={{ maxWidth: 1280, px: { xs: 2, md: 4 } }}>
          <Box
            component={Link}
            to="/"
            onClick={handleLeave}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.5,
              mb: { xs: 2, md: 3 },
              fontSize: 13,
              fontWeight: 600,
              color: TEXT_MUTED,
              textDecoration: "none",
              "&:hover": { color: TEXT_DISPLAY },
            }}
          >
            <ArrowBackIcon sx={{ fontSize: 16 }} />
            Back to home
          </Box>

          <Box
            sx={{
              display: "grid",
              // The brand panel is context, not a gate: on a phone the form
              // comes first and the panel follows it.
              gridTemplateColumns: { xs: "1fr", lg: "5fr 7fr" },
              gap: { xs: 2.5, lg: 4 },
              alignItems: "stretch",
            }}
          >
            {/* ---- Left: what this is ------------------------------------- */}
            <Box
              sx={{
                order: { xs: 2, lg: 1 },
                position: "relative",
                overflow: "hidden",
                borderRadius: 4,
                p: { xs: 3, md: 4 },
                background: PANEL_GRADIENT,
                color: TEXT_DISPLAY,
                boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              {/* Ambient glows, as radial gradients rather than positioned
                  blurred divs — nothing extra in the accessibility tree. */}
              <Box
                aria-hidden
                sx={{
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                  background: [
                    "radial-gradient(420px circle at -10% -10%, rgba(220, 225, 255, 0.75) 0%, rgba(220, 225, 255, 0) 70%)",
                    "radial-gradient(320px circle at 105% 88%, rgba(130, 245, 193, 0.35) 0%, rgba(130, 245, 193, 0) 70%)",
                  ].join(", "),
                }}
              />

              <Box sx={{ position: "relative" }}>
                <Stack
                  direction="row"
                  spacing={0.75}
                  alignItems="center"
                  sx={{
                    display: "inline-flex",
                    px: 1.25,
                    py: 0.5,
                    mb: 3,
                    borderRadius: 999,
                    bgcolor: GREEN_SOFT,
                    color: GREEN_INK,
                  }}
                >
                  <VerifiedUserOutlinedIcon sx={{ fontSize: 15 }} />
                  <Typography
                    sx={{
                      fontSize: 11.5,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    Your family archive
                  </Typography>
                </Stack>

                <Typography
                  component="h2"
                  sx={{
                    fontSize: { xs: 28, md: 36 },
                    fontWeight: 800,
                    letterSpacing: "-0.02em",
                    lineHeight: 1.15,
                    mb: 1.5,
                  }}
                >
                  Access your living lineage and treasured records.
                </Typography>

                <Typography
                  sx={{ fontSize: 15, lineHeight: 1.65, color: TEXT_MUTED, mb: 3 }}
                >
                  A permanent home for your family tree, its stories and the
                  photographs that go with them — built to be handed on, not
                  scrolled past.
                </Typography>

                {/* Real platform numbers, from the same public endpoint the
                    landing page uses. */}
                <Box
                  sx={{
                    p: 2.5,
                    borderRadius: 3,
                    bgcolor: "#ffffff",
                    boxShadow: "0 4px 16px -4px rgba(15, 23, 42, 0.08)",
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                    <AccountTreeOutlinedIcon sx={{ fontSize: 17, color: brand.primary }} />
                    <Typography
                      sx={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: TEXT_MUTED,
                      }}
                    >
                      Across Kinvia today
                    </Typography>
                  </Stack>

                  <Stack direction="row" spacing={2}>
                    {figures.map((figure) => (
                      <Box key={figure.label} sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          sx={{
                            fontSize: { xs: 20, md: 24 },
                            fontWeight: 800,
                            letterSpacing: "-0.02em",
                            lineHeight: 1.2,
                            color: TEXT_DISPLAY,
                          }}
                        >
                          {statsLoading ? (
                            <Skeleton width={56} />
                          ) : (
                            figure.value.toLocaleString()
                          )}
                        </Typography>
                        <Typography
                          noWrap
                          sx={{ fontSize: 11.5, fontWeight: 600, color: TEXT_MUTED }}
                        >
                          {figure.label}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              </Box>

              {/* Assurances rather than a testimonial: each line is something
                  the product does, not something a customer is claimed to have
                  said. */}
              <Stack
                spacing={1.25}
                sx={{
                  position: "relative",
                  mt: 3,
                  p: 2,
                  borderRadius: 3,
                  bgcolor: "rgba(255, 255, 255, 0.6)",
                  backdropFilter: "blur(4px)",
                }}
              >
                {ASSURANCES.map((item) => (
                  <Stack
                    key={item.label}
                    direction="row"
                    spacing={1.25}
                    alignItems="center"
                  >
                    <Box
                      sx={{
                        display: "inline-flex",
                        color: GREEN_INK,
                        "& .MuiSvgIcon-root": { fontSize: 18 },
                      }}
                    >
                      {item.icon}
                    </Box>
                    <Typography sx={{ fontSize: 13, color: TEXT_DISPLAY }}>
                      {item.label}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>

            {/* ---- Right: sign in ----------------------------------------- */}
            <Box
              sx={{
                order: { xs: 1, lg: 2 },
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <Box
                sx={{
                  bgcolor: "#ffffff",
                  borderRadius: 4,
                  border: `1px solid ${BORDER_SUBTLE}`,
                  boxShadow: "0 20px 32px -8px rgba(15, 23, 42, 0.12), 0 8px 16px -4px rgba(15, 23, 42, 0.06)",
                  p: { xs: 2.5, md: 4 },
                }}
              >
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  spacing={1.5}
                  sx={{ pb: 2.5, mb: 3, borderBottom: `1px solid ${BORDER_SUBTLE}` }}
                >
                  <Stack direction="row" spacing={1.25} alignItems="center">
                    <Box
                      component="img"
                      src="/favic_no_background.png"
                      alt=""
                      sx={{ width: 38, height: 38, display: "block" }}
                    />
                    <Box>
                      <Typography
                        sx={{
                          fontSize: 17,
                          fontWeight: 800,
                          letterSpacing: "0.06em",
                          lineHeight: 1.2,
                          color: TEXT_DISPLAY,
                        }}
                      >
                        KINVIA
                      </Typography>
                      <Typography sx={{ fontSize: 11, color: TEXT_MUTED }}>
                        Your family, kept together
                      </Typography>
                    </Box>
                  </Stack>

                  <Stack
                    direction="row"
                    spacing={0.5}
                    alignItems="center"
                    sx={{
                      flexShrink: 0,
                      px: 1.25,
                      py: 0.5,
                      borderRadius: 999,
                      bgcolor: GREEN_SOFT,
                      color: GREEN_INK,
                    }}
                  >
                    <LockOutlinedIcon sx={{ fontSize: 15 }} />
                    <Typography
                      noWrap
                      sx={{ fontSize: 11.5, fontWeight: 700, display: { xs: "none", sm: "block" } }}
                    >
                      Secure OTP sign-in
                    </Typography>
                  </Stack>
                </Stack>

                <Typography
                  component="h1"
                  sx={{
                    fontSize: { xs: 26, md: 34 },
                    fontWeight: 800,
                    letterSpacing: "-0.02em",
                    lineHeight: 1.15,
                    color: TEXT_DISPLAY,
                    mb: 0.75,
                  }}
                >
                  Welcome back to Kinvia
                </Typography>
                <Typography sx={{ fontSize: 15, color: TEXT_MUTED, mb: 3 }}>
                  {auth.awaitingCode
                    ? `Enter the ${OTP_LENGTH}-digit code we just sent you.`
                    : `Enter your mobile number and we'll text you a ${OTP_LENGTH}-digit code.`}
                </Typography>

                <PhoneOtpForm auth={auth} size="page" />
              </Box>
            </Box>
          </Box>
        </Container>
      </Box>
    </>
  );
};
