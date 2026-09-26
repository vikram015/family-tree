import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Container,
  Grid,
  Skeleton,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ApiService,
  CelebrationEventType,
  CelebrationPayload,
  CelebrationWish,
  ReactionKind,
} from "../../services/apiService";
import { brand } from "../../theme/brand";
import { useAuth } from "../hooks/useAuth";
import { useLoginModal } from "../context/LoginModalContext";
import { buildEventShareUrl, shareEventNative } from "../../utils/shareEvent";
import { toneFor } from "./celebrationTheme";
import MilestoneCard from "./MilestoneCard";
import WishComposer from "./WishComposer";
import WishStream from "./WishStream";
import {
  EventHistory,
  OtherMilestones,
  PedigreeAnchor,
  VisitorNote,
} from "./FamilyPanels";

/**
 * A single celebration: the card, the guestbook, and — for family only — the
 * lineage context around it.
 *
 * Two ways in, because a celebration is reached both from inside the app and
 * from a link someone forwarded:
 *
 *   /celebration/:eventId                            an event that exists
 *   /celebration?personId=…&eventType=…&eventYear=…  create it if it doesn't
 *
 * The second form is what the dashboard and the share route use. The server
 * validates the occasion against the tree before minting anything, so a
 * hand-typed person id cannot conjure a birthday for someone who has no
 * recorded date of birth.
 *
 * Every tiering decision is the server's. This component renders what it is
 * given and never decides that something is safe to show — the family-only
 * fields are simply absent from a visitor's payload.
 */

export const CelebrationPage: React.FC = () => {
  const { eventId } = useParams<{ eventId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser, initialized } = useAuth();
  const { openLoginModal } = useLoginModal();

  const [payload, setPayload] = useState<CelebrationPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const composerRef = useRef<HTMLDivElement | null>(null);

  const personId = searchParams.get("personId");
  const eventType = searchParams.get("eventType") as CelebrationEventType | null;
  const eventYear = searchParams.get("eventYear");

  /**
   * What is currently on screen, as a key.
   *
   * The page used to fetch twice on every visit, which is what the flicker was.
   * Two separate triggers, both of which change the effect's dependencies right
   * after the first fetch lands:
   *
   *  1. Arriving via `?personId=…`, resolving, then replacing the URL with
   *     `/celebration/:id` — which makes `eventId` appear and re-runs the load
   *     for the event just fetched.
   *  2. Firebase reporting the signed-in user a moment after mount, flipping
   *     `currentUser` from undefined to a value.
   *
   * Recording what has been loaded (including who for, since the payload is
   * tiered per viewer) makes both re-runs no-ops instead of round trips.
   */
  const loadedKeyRef = useRef<string | null>(null);
  /** First paint shows a skeleton; a refetch must not throw the page away. */
  const hasLoadedOnceRef = useRef(false);

  const load = useCallback(async () => {
    // Waiting for auth to settle rather than fetching anonymously and then
    // again with a token. `viewerTier` and `canPost` are both answers about the
    // viewer, so a pre-auth fetch is not just wasted — it renders the visitor
    // view to someone who is family, for exactly as long as the flicker lasted.
    if (!initialized) return;

    const authKey = currentUser?.uid || "anon";

    let key: string;
    if (eventId) {
      key = `id:${eventId}|${authKey}`;
    } else if (personId && eventType) {
      key = `resolve:${personId}:${eventType}:${eventYear || ""}|${authKey}`;
    } else {
      setError("This celebration link is incomplete.");
      setLoading(false);
      return;
    }

    if (loadedKeyRef.current === key) return;

    if (!hasLoadedOnceRef.current) setLoading(true);
    setError(null);

    try {
      let next: CelebrationPayload;
      if (eventId) {
        next = await ApiService.getCelebration(eventId);
      } else {
        next = await ApiService.resolveCelebration(
          personId as string,
          eventType as CelebrationEventType,
          Number(eventYear) || new Date().getFullYear(),
        );
      }

      // Claim the canonical key BEFORE navigating, so the URL swap below finds
      // this event already loaded and does not fetch it again.
      loadedKeyRef.current = `id:${next.event.id}|${authKey}`;
      hasLoadedOnceRef.current = true;
      setPayload(next);

      if (!eventId) {
        // A stable link to bookmark or share, instead of a re-resolve.
        navigate(`/celebration/${next.event.id}`, { replace: true });
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not open this celebration.",
      );
    } finally {
      setLoading(false);
    }
  }, [eventId, personId, eventType, eventYear, navigate, initialized, currentUser?.uid]);

  useEffect(() => {
    void load();
  }, [load]);

  const event = payload?.event;
  const isFamily = payload?.viewerTier === "family";
  const tone = useMemo(() => toneFor(event?.eventType || "birthday"), [event?.eventType]);

  const handleShare = useCallback(async () => {
    if (!event) return;
    const url = buildEventShareUrl(
      event.primaryPersonId,
      event.eventType,
      event.eventYear,
      event.primaryPhotoUrl,
    );
    const name = event.primaryName || "our family member";
    const text =
      event.eventType === "remembrance"
        ? `Remembering ${name}`
        : `Join me in wishing ${name}`;
    const shared = await shareEventNative({ title: text, text, url });
    setToast(shared ? "Link ready to share" : "Could not share this link");
  }, [event]);

  const handlePost = useCallback(
    async (message: string, authorRelation: string | null) => {
      if (!event) return;
      // The server returns the whole refreshed page, so the new entry arrives
      // with its relation already resolved instead of appearing unlabelled and
      // correcting itself a moment later.
      const next = await ApiService.postCelebrationWish(event.id, message, authorRelation);
      setPayload(next);
      setToast("Your message has been added");
    },
    [event],
  );

  const handleDelete = useCallback(
    async (wishId: string) => {
      if (!event) return;
      try {
        await ApiService.deleteCelebrationWish(event.id, wishId);
        setPayload((current) => {
          if (!current) return current;

          // The id may name a top-level message or a reply under one, so both
          // levels are filtered. Removing a parent takes its replies with it,
          // which matches the ON DELETE CASCADE on the server.
          const remaining = current.wishes.filter((wish) => wish.id !== wishId);
          const wasTopLevel = remaining.length !== current.wishes.length;

          return {
            ...current,
            wishes: remaining.map((wish) =>
              wish.replies?.length
                ? { ...wish, replies: wish.replies.filter((reply) => reply.id !== wishId) }
                : wish,
            ),
            // Only top-level messages are counted, so deleting a reply must
            // leave the headline number alone.
            event: wasTopLevel
              ? { ...current.event, wishCount: Math.max(0, current.event.wishCount - 1) }
              : current.event,
          };
        });
        setToast("Message removed");
      } catch {
        setToast("Could not remove that message");
      }
    },
    [event],
  );

  const handleEdit = useCallback(
    async (wishId: string, message: string) => {
      if (!event) return;
      // Server returns the refreshed page: an edit can land on a reply nested
      // under another message, and re-grouping server-side beats patching a
      // tree here.
      const next = await ApiService.editCelebrationWish(event.id, wishId, message);
      setPayload(next);
      setToast("Message updated");
    },
    [event],
  );

  const handleReply = useCallback(
    async (parentWishId: string, message: string) => {
      if (!event) return;
      const next = await ApiService.postCelebrationWish(event.id, message, null, parentWishId);
      setPayload(next);
      setToast("Reply posted");
    },
    [event],
  );

  /**
   * Toggle a reaction, optimistically.
   *
   * A reaction is a tap and must feel like one, so the count moves immediately
   * and the server's answer replaces it when it lands. The endpoint returns
   * only the affected message's tallies, which is also why this does not simply
   * re-render from a fresh payload.
   */
  const handleReact = useCallback(
    async (wishId: string, kind: ReactionKind) => {
      if (!event) return;

      const applyTallies = (
        current: CelebrationPayload | null,
        targetId: string,
        update: (wish: CelebrationWish) => CelebrationWish,
      ): CelebrationPayload | null => {
        if (!current) return current;
        // The message may be a top-level wish or a reply under one, so both
        // levels are walked.
        const mapWish = (wish: CelebrationWish): CelebrationWish => {
          const mapped = wish.id === targetId ? update(wish) : wish;
          if (!mapped.replies?.length) return mapped;
          return { ...mapped, replies: mapped.replies.map(mapWish) };
        };
        return { ...current, wishes: current.wishes.map(mapWish) };
      };

      setPayload((current) =>
        applyTallies(current, wishId, (wish) => {
          const tallies = wish.reactions || [];
          const mine = tallies.find((entry) => entry.reacted)?.kind ?? null;

          // Tapping the kind already chosen clears it; tapping another moves
          // it. One reaction per person, so the old kind always loses a count
          // when a new one gains it.
          const next = tallies
            .map((entry) => {
              if (entry.kind === mine && mine !== kind) {
                return { ...entry, count: entry.count - 1, reacted: false };
              }
              if (entry.kind === kind) {
                return mine === kind
                  ? { ...entry, count: entry.count - 1, reacted: false }
                  : { ...entry, count: entry.count + 1, reacted: true };
              }
              return entry;
            })
            .filter((entry) => entry.count > 0);

          const chosen = mine !== kind && !next.some((entry) => entry.kind === kind);
          return {
            ...wish,
            reactions: chosen ? [...next, { kind, count: 1, reacted: true }] : next,
          };
        }),
      );

      try {
        const result = await ApiService.toggleWishReaction(event.id, wishId, kind);
        setPayload((current) =>
          applyTallies(current, result.wishId, (wish) => ({
            ...wish,
            reactions: result.reactions,
          })),
        );
      } catch {
        setToast("Could not save that reaction");
        // Re-read rather than trying to invert the optimistic change: the
        // server is the only thing that knows what actually stuck.
        loadedKeyRef.current = null;
        void load();
      }
    },
    [event, load],
  );

  const scrollToComposer = useCallback(() => {
    composerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  if (loading) {
    return (
      <Box sx={{ bgcolor: brand.pageCanvas, minHeight: "100vh", py: { xs: 2, sm: 4 } }}>
        <Container maxWidth="lg">
          <Skeleton variant="rounded" height={220} sx={{ borderRadius: 3 }} />
          <Skeleton variant="rounded" height={180} sx={{ borderRadius: 3, mt: 2 }} />
          <Skeleton variant="rounded" height={120} sx={{ borderRadius: 3, mt: 2 }} />
        </Container>
      </Box>
    );
  }

  if (error || !payload || !event) {
    return (
      <Box sx={{ bgcolor: brand.pageCanvas, minHeight: "100vh", py: { xs: 4, sm: 8 } }}>
        <Container maxWidth="sm">
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            {error || "Could not open this celebration."}
          </Alert>
          <Button
            variant="contained"
            onClick={() => navigate("/")}
            sx={{ mt: 2, borderRadius: 2, textTransform: "none", fontWeight: 700 }}
          >
            Go to Kinvia
          </Button>
        </Container>
      </Box>
    );
  }

  const honoreeName = event.primaryName || "Family member";

  return (
    <Box sx={{ bgcolor: brand.pageCanvas, minHeight: "100vh", py: { xs: 2, sm: 4 } }}>
      <Container maxWidth="lg">
        <MilestoneCard
          event={event}
          isFamily={isFamily}
          onShare={handleShare}
          onWriteWish={scrollToComposer}
        />

        {/* `mt: 0` used to sit here, out of Grid v1 habit: that version gave a
            spaced container a negative top margin which had to be cancelled.
            Grid v2 uses CSS gap instead, so there was nothing to cancel and the
            zero simply welded this grid to the hero card above it. The spacing
            matches the Stack rhythm inside the columns. */}
        <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mt: { xs: 2, sm: 2.5 } }}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Stack spacing={{ xs: 2, sm: 2.5 }}>
              <Box ref={composerRef}>
                <WishComposer
                  event={event}
                  isFamily={isFamily}
                  canPost={payload.canPost}
                  viewerRelation={payload.viewerRelation}
                  onSubmit={handlePost}
                  onRequestSignIn={openLoginModal}
                />
              </Box>

              <WishStream
                wishes={payload.wishes}
                eventType={event.eventType}
                isFamily={isFamily}
                canInteract={payload.canPost}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onReact={handleReact}
                onReply={handleReply}
                onRequestSignIn={openLoginModal}
              />
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Stack spacing={{ xs: 2, sm: 2.5 }}>
              {isFamily ? (
                <>
                  {payload.pedigree && (
                    <PedigreeAnchor
                      pedigree={payload.pedigree}
                      honoreeName={honoreeName}
                      honoreePersonId={event.primaryPersonId}
                    />
                  )}
                  {payload.history && (
                    <EventHistory
                      events={payload.history}
                      currentEventId={event.id}
                      honoreeName={honoreeName}
                    />
                  )}
                  {payload.otherMilestones && (
                    <OtherMilestones events={payload.otherMilestones} />
                  )}
                </>
              ) : (
                <VisitorNote honoreeName={honoreeName} />
              )}
            </Stack>
          </Grid>
        </Grid>

        <Typography
          sx={{
            mt: { xs: 3, sm: 5 },
            textAlign: "center",
            fontSize: 12,
            color: brand.slateMuted,
          }}
        >
          {tone.emoji} Celebrated on Kinvia
        </Typography>
      </Container>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        message={toast || ""}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Box>
  );
};

export default CelebrationPage;
