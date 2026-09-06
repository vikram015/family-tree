import React, { useCallback, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { Link, useParams } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import AutoStoriesOutlinedIcon from "@mui/icons-material/AutoStoriesOutlined";
import { ApiService, BusinessProfile } from "../../services/apiService";
import {
  businessCategoryColor,
  businessCategoryLabel,
} from "../Business/businessCategories";
import { businessCategoryIcon } from "../Business/businessCategoryIcon";
import { BusinessFormDialog } from "../Business/BusinessFormDialog";
import { useAuth } from "../hooks/useAuth";
import { RichText } from "../common/RichText";
import { hasRichTextContent, richTextToPlain } from "../common/richText";
import { brand } from "../../theme/brand";

/**
 * A single business's public page — where a search result for a business lands.
 *
 * The subject here is the business, not the person who runs it: what it does,
 * how to reach it, and where it is. The owner appears as a name — and, only for
 * a viewer who can actually open it, a link to their family tree — nothing more.
 * Their date of birth, gender and photo are personal details that happen to sit
 * in the same database row as the shop's phone number, and this page needs no
 * account to open, so the backend leaves them out of the payload entirely
 * rather than trusting this file not to render them.
 *
 * Everything below the header is conditional. A business with a name and a
 * phone number is a complete, respectable page; the story, hours, website and
 * cover photo appear as their owners fill them in.
 */

const panelSx = {
  borderRadius: 3,
  border: "1px solid",
  borderColor: brand.border,
  bgcolor: brand.surface,
  p: { xs: 2, md: 3 },
} as const;

const sectionHeadingSx = {
  fontWeight: 800,
  fontSize: 18,
  color: brand.ink,
} as const;

/** "October 14, 1954" from an ISO date, or just the year when it's January 1st
 *  — which is what the form stores when someone only knows the year. */
function formatFounded(iso?: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  if (date.getMonth() === 0 && date.getDate() === 1) return String(date.getFullYear());
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Adds a scheme so a bare "example.com" still opens as a link. */
function toHref(website: string): string {
  return /^https?:\/\//i.test(website) ? website : `https://${website}`;
}

/**
 * One specification: label on the left, value on the right, on a tinted strip.
 *
 * The design uses this shape for facts you scan rather than act on — it fits
 * far more into a phone screen than a stack of icon tiles did, and keeps the
 * values aligned so they read as a table.
 */
const SpecRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <Stack
    direction="row"
    spacing={2}
    alignItems="baseline"
    justifyContent="space-between"
    sx={{
      px: 1.5,
      py: 1.25,
      borderRadius: 2,
      bgcolor: brand.canvas,
    }}
  >
    <Typography sx={{ fontSize: 14, color: brand.slateMuted, flexShrink: 0 }}>
      {label}
    </Typography>
    <Box
      sx={{
        fontSize: 14,
        fontWeight: 700,
        color: brand.ink,
        textAlign: "right",
        minWidth: 0,
        wordBreak: "break-word",
      }}
    >
      {value}
    </Box>
  </Stack>
);

const DetailRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}> = ({ icon, label, value }) => (
  <Stack direction="row" spacing={1.5} alignItems="flex-start">
    <Box
      sx={{
        width: 38,
        height: 38,
        borderRadius: 2,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: brand.primarySoft,
        color: brand.primary,
      }}
    >
      {icon}
    </Box>
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ fontSize: 12, color: brand.slateMuted, fontWeight: 600 }}>
        {label}
      </Typography>
      <Box sx={{ fontWeight: 700, color: brand.ink, wordBreak: "break-word" }}>{value}</Box>
    </Box>
  </Stack>
);

const linkSx = {
  fontWeight: 700,
  color: brand.primary,
  textDecoration: "none",
  wordBreak: "break-word",
  "&:hover": { textDecoration: "underline" },
} as const;

export const BusinessProfilePage: React.FC = () => {
  const { businessId } = useParams<{ businessId: string }>();
  const { currentUser, userProfile, isSuperAdmin } = useAuth();

  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Whether this viewer can open the owner's tree. Starts false so the link
  // never flashes into view before the answer arrives.
  const [canOpenTree, setCanOpenTree] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const load = useCallback(() => {
    if (!businessId) return;
    setLoading(true);
    setError(null);
    ApiService.getBusinessProfile(businessId)
      .then(setBusiness)
      .catch((err: any) => {
        setBusiness(null);
        setError(
          err?.status === 404
            ? "This business is no longer listed."
            : "We couldn't load this business. Please try again.",
        );
      })
      .finally(() => setLoading(false));
  }, [businessId]);

  useEffect(load, [load]);

  // Family trees are shared with the people in them, so linking to one the
  // viewer cannot read would just hand them a locked door. Ask first, and only
  // then offer the link. Signed out is a "no" without a round trip.
  const ownerTreeId = business?.treeId;
  useEffect(() => {
    if (!ownerTreeId || !currentUser) {
      setCanOpenTree(false);
      return;
    }
    let active = true;
    ApiService.canReadTree(ownerTreeId).then((allowed) => {
      if (active) setCanOpenTree(allowed);
    });
    return () => {
      active = false;
    };
  }, [ownerTreeId, currentUser]);

  // Editing is the owner's own business, or a superadmin's. Anything subtler —
  // branch write access, tree admins — is the backend's call: it re-checks on
  // save, so a hidden button is a convenience, never the control.
  const canEdit = Boolean(
    business &&
      currentUser &&
      (isSuperAdmin() ||
        (business.ownerId && userProfile?.peopleId === business.ownerId)),
  );

  const categoryLabel = businessCategoryLabel(business?.category);
  const categoryColor = businessCategoryColor(business?.category);
  const place = [business?.locationName, business?.districtName, business?.stateName]
    .filter(Boolean)
    .join(", ");
  const founded = formatFounded(business?.foundedOn);

  return (
    <>
      <Helmet>
        <title>{business ? `${business.name} - Kinvia` : "Business - Kinvia"}</title>
        <meta
          name="description"
          content={
            business
              ? business.tagline ||
                richTextToPlain(business.description).slice(0, 155) ||
                `${business.name}${categoryLabel ? ` · ${categoryLabel}` : ""}${
                  place ? ` in ${place}` : ""
                }`
              : "A business listed on Kinvia."
          }
        />
      </Helmet>

      <Container maxWidth="lg" sx={{ py: { xs: 2, md: 5 } }}>
        <Button
          component={Link}
          to="/business"
          startIcon={<ArrowBackIcon />}
          sx={{ mb: 2, textTransform: "none", fontWeight: 700 }}
        >
          All businesses
        </Button>

        {loading ? (
          <Stack spacing={2}>
            <Skeleton variant="rounded" height={200} />
            <Skeleton variant="rounded" height={160} />
            <Skeleton variant="rounded" height={120} />
          </Stack>
        ) : error || !business ? (
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            {error || "This business is no longer listed."}
          </Alert>
        ) : (
          <>
            {/* ---------------------------------------------------- Header */}
            {/* Banner first, then a card that overlaps it — the arrangement the
                design uses. Overlaying the name and chips directly on the cover
                (as this did) puts them on top of whatever the cover photo has in
                that corner, and most business banners are already busy there. */}
            <Box sx={{ position: "relative" }}>
              <Box
                sx={{
                  position: "relative",
                  // Full width of the screen on a phone, computed from the
                  // viewport rather than by cancelling a parent's padding —
                  // that guessed at the gutter and could overshoot, which is
                  // what pushed the cover off the left edge.
                  width: { xs: "100vw", sm: "auto" },
                  ml: { xs: "calc(50% - 50vw)", sm: 0 },
                  borderRadius: { xs: 0, sm: 3 },
                  overflow: "hidden",
                  bgcolor: business.coverUrl ? brand.ink : `${categoryColor}14`,
                  border: { xs: "none", sm: "1px solid" },
                  borderBottom: "1px solid",
                  borderColor: brand.border,
                  // Without a cover there is no image to size the band, so it
                  // falls back to a fixed height.
                  height: business.coverUrl ? undefined : { xs: 130, sm: 200, md: 260 },
                }}
              >
                {business.coverUrl && (
                  <Box
                    component="img"
                    src={business.coverUrl}
                    alt=""
                    sx={{
                      display: "block",
                      width: "100%",
                      // On a phone the image sets its own height, so the whole
                      // banner is visible — most business covers are wide
                      // graphics with text in them, and cropping to a fixed
                      // height cuts the words off. Wider screens have room to
                      // crop to a consistent band.
                      height: { xs: "auto", sm: 240, md: 320 },
                      maxHeight: { xs: 260, sm: "none" },
                      objectFit: "cover",
                      objectPosition: "center",
                    }}
                  />
                )}

                {/* A scrim at the foot of the banner, so the card below always
                    separates from the photo instead of fighting it. */}
                {business.coverUrl && (
                  <Box
                    sx={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "linear-gradient(180deg, rgba(15,23,42,0) 55%, rgba(15,23,42,0.30) 100%)",
                      pointerEvents: "none",
                    }}
                  />
                )}
              </Box>

              <Box
                sx={{
                  position: "relative",
                  // Pulls the card up over the banner. Only the card overlaps;
                  // its contents sit on white.
                  mt: { xs: -5, sm: -6, md: -8 },
                  mx: { xs: 0, sm: 2, md: 3 },
                  px: { xs: 2, md: 3 },
                  py: { xs: 2, md: 3 },
                  borderRadius: 3,
                  border: "1px solid",
                  borderColor: brand.border,
                  bgcolor: brand.surface,
                  boxShadow: "0 18px 40px rgba(15,23,42,0.10)",
                }}
              >
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={{ xs: 2, md: 3 }}
                  alignItems={{ xs: "flex-start", md: "center" }}
                >
                  <Avatar
                    src={business.logoUrl || undefined}
                    variant="rounded"
                    sx={{
                      width: { xs: 68, sm: 84, md: 96 },
                      height: { xs: 68, sm: 84, md: 96 },
                      flexShrink: 0,
                      borderRadius: 3,
                      // Lifted onto the banner a little, the way a profile
                      // picture sits on a cover.
                      mt: { xs: -6, sm: -8, md: -9 },
                      border: "4px solid",
                      borderColor: brand.surface,
                      bgcolor: business.logoUrl ? brand.surface : `${categoryColor}14`,
                      boxShadow: "0 8px 24px rgba(15,23,42,0.14)",
                    }}
                  >
                    {businessCategoryIcon(business.category, 38)}
                  </Avatar>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      component="h1"
                      sx={{
                        fontWeight: 800,
                        fontSize: { xs: 22, sm: 26, md: 30 },
                        lineHeight: 1.25,
                        color: brand.ink,
                      }}
                    >
                      {business.name}
                    </Typography>
                    {business.tagline && (
                      <Typography sx={{ mt: 0.5, color: brand.slate }}>
                        {business.tagline}
                      </Typography>
                    )}
                    <Stack
                      direction="row"
                      spacing={1}
                      flexWrap="wrap"
                      useFlexGap
                      sx={{ mt: 1.5 }}
                    >
                      {categoryLabel && (
                        <Chip
                          size="small"
                          label={categoryLabel}
                          variant="outlined"
                          sx={{
                            borderColor: `${categoryColor}55`,
                            color: categoryColor,
                            fontWeight: 700,
                            bgcolor: brand.surface,
                          }}
                        />
                      )}
                      {founded && (
                        <Chip
                          size="small"
                          label={`Since ${founded}`}
                          sx={{
                            bgcolor: brand.accentSoft,
                            color: brand.accentDark,
                            fontWeight: 700,
                          }}
                        />
                      )}
                      {place && (
                        <Chip
                          size="small"
                          icon={<PlaceOutlinedIcon />}
                          label={place}
                          sx={{ bgcolor: brand.canvas, color: brand.slate, fontWeight: 600 }}
                        />
                      )}
                    </Stack>
                  </Box>

                  {canEdit && (
                    <Button
                      variant="contained"
                      startIcon={<EditOutlinedIcon />}
                      onClick={() => setEditOpen(true)}
                      sx={{
                        flexShrink: 0,
                        alignSelf: { xs: "stretch", md: "center" },
                        fontWeight: 700,
                        textTransform: "none",
                        minHeight: 44,
                      }}
                    >
                      Edit profile
                    </Button>
                  )}
                </Stack>

                {hasRichTextContent(business.description) && (
                  <>
                    <Divider sx={{ my: 2.5 }} />
                    <RichText value={business.description} sx={{ color: brand.slate }} />
                  </>
                )}
              </Box>
            </Box>

            {/* ------------------------------------------- Body: two columns */}
            <Box
              sx={{
                mt: { xs: 2, md: 2.5 },
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1.6fr) minmax(0, 1fr)" },
                gap: { xs: 2, md: 2.5 },
                alignItems: "start",
              }}
            >
              <Stack spacing={{ xs: 2, md: 2.5 }}>
                {hasRichTextContent(business.story) && (
                  <Box sx={panelSx}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                      <AutoStoriesOutlinedIcon sx={{ color: brand.primary }} />
                      <Typography component="h2" sx={sectionHeadingSx}>
                        The story
                      </Typography>
                    </Stack>
                    <RichText
                      value={business.story}
                      sx={{ color: brand.slate, lineHeight: 1.7 }}
                    />
                  </Box>
                )}

                <Box sx={panelSx}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                    <StorefrontOutlinedIcon sx={{ color: brand.primary }} />
                    <Typography component="h2" sx={sectionHeadingSx}>
                      Details
                    </Typography>
                  </Stack>
                  <Stack spacing={1}>
                    <SpecRow label="Category" value={categoryLabel || "Not set"} />
                    {founded && <SpecRow label="Founded" value={founded} />}
                    {place && <SpecRow label="Location" value={place} />}
                    {business.address && <SpecRow label="Address" value={business.address} />}
                    {business.website && (
                      <SpecRow
                        label="Website"
                        value={
                          <Typography
                            component="a"
                            href={toHref(business.website)}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ ...linkSx, fontSize: 14 }}
                          >
                            {business.website}
                          </Typography>
                        }
                      />
                    )}
                    {business.hours && <SpecRow label="Opening hours" value={business.hours} />}
                  </Stack>
                </Box>
              </Stack>

              <Stack spacing={{ xs: 2, md: 2.5 }}>
                <Box sx={panelSx}>
                  <Typography component="h2" sx={{ ...sectionHeadingSx, mb: 2 }}>
                    Contact
                  </Typography>
                  {business.contact || business.email ? (
                    <Stack spacing={2}>
                      {business.contact && (
                        <DetailRow
                          icon={<PhoneIcon fontSize="small" />}
                          label="Phone"
                          value={
                            <Typography
                              component="a"
                              href={`tel:${business.contact}`}
                              sx={linkSx}
                            >
                              {business.contact}
                            </Typography>
                          }
                        />
                      )}
                      {business.email && (
                        <DetailRow
                          icon={<EmailOutlinedIcon fontSize="small" />}
                          label="Email"
                          value={
                            <Typography
                              component="a"
                              href={`mailto:${business.email}`}
                              sx={linkSx}
                            >
                              {business.email}
                            </Typography>
                          }
                        />
                      )}
                    </Stack>
                  ) : (
                    <Typography sx={{ color: brand.slateMuted }}>
                      No contact details have been added for this business yet.
                    </Typography>
                  )}
                </Box>

                {business.ownerName && (
                  <Box sx={panelSx}>
                    <Typography component="h2" sx={{ ...sectionHeadingSx, mb: 2 }}>
                      Listed by
                    </Typography>
                    <DetailRow
                      icon={<PersonOutlineIcon fontSize="small" />}
                      label={business.treeName ? `${business.treeName} family` : "Owner"}
                      value={business.ownerName}
                    />
                    {business.treeId && canOpenTree && (
                      <Button
                        component={Link}
                        to={`/families?tree=${business.treeId}${
                          business.ownerId ? `&personId=${business.ownerId}` : ""
                        }`}
                        size="small"
                        sx={{ mt: 1.5, textTransform: "none", fontWeight: 700 }}
                      >
                        View their family tree
                      </Button>
                    )}
                  </Box>
                )}
              </Stack>
            </Box>

            <BusinessFormDialog
              open={editOpen}
              onClose={() => setEditOpen(false)}
              business={{
                id: business.id,
                name: business.name,
                category: business.category,
                description: business.description,
                contact: business.contact,
                email: business.email,
                ownerId: business.ownerId,
                owner: business.ownerName,
                tagline: business.tagline,
                story: business.story,
                foundedOn: business.foundedOn,
                website: business.website,
                address: business.address,
                hours: business.hours,
                logoUrl: business.logoUrl,
                coverUrl: business.coverUrl,
              }}
              personId={business.ownerId || undefined}
              onSaved={() => {
                setEditOpen(false);
                // Re-read rather than merging the PATCH response: images are
                // saved by their own endpoints, so the row on the server is the
                // only place that has everything.
                load();
              }}
            />
          </>
        )}
      </Container>
    </>
  );
};

export default BusinessProfilePage;
