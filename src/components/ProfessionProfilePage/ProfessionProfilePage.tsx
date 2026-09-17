import React, { useCallback, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useParams, Link as RouterLink } from "react-router-dom";
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import WorkOutlineOutlinedIcon from "@mui/icons-material/WorkOutlineOutlined";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import LinkIcon from "@mui/icons-material/Link";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import { ApiService, ProfessionProfile } from "../../services/apiService";
import { RichText } from "../common/RichText";
import { brand } from "../../theme/brand";
import { ProfessionFormDialog } from "./ProfessionFormDialog";
import { useAuth } from "../hooks/useAuth";

/**
 * One person's working life.
 *
 * Every section here is backed by a stored value: there are no invented
 * metrics, and a section with nothing in it does not render. That is why the
 * page can look sparse on a new profile — the emptiness is honest, and the
 * fastest way to fill it is the edit form.
 *
 * What the viewer sees is decided by the server (see professionProfileService):
 * a redacted field arrives as null and simply doesn't appear.
 */

const CANVAS = "#f8faff";
const BORDER = "#e2e8f0";

const VISIBILITY_LABEL: Record<string, string> = {
  public: "Visible to anyone",
  family: "Visible to family only",
  private: "Private to you",
};

/** A titled white panel. The page is a column of these. */
const Panel: React.FC<{
  title?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, icon, action, children }) => (
  <Box
    component="section"
    sx={{
      bgcolor: brand.surface,
      borderRadius: 3,
      border: `1px solid ${BORDER}`,
      boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
      p: { xs: 2.5, md: 3 },
    }}
  >
    {title && (
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={1}
        sx={{ mb: 2 }}
      >
        <Stack direction="row" alignItems="center" spacing={1.25}>
          {icon && (
            <Box
              sx={{
                width: 30,
                height: 30,
                borderRadius: 2,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: brand.primarySoft,
                color: brand.primaryDark,
                "& .MuiSvgIcon-root": { fontSize: 17 },
              }}
            >
              {icon}
            </Box>
          )}
          <Typography sx={{ fontWeight: 800, fontSize: 17, color: brand.ink }}>
            {title}
          </Typography>
        </Stack>
        {action}
      </Stack>
    )}
    {children}
  </Box>
);

/** One label/value row in the rail. */
const RailRow: React.FC<{ icon: React.ReactNode; label: string; children: React.ReactNode }> = ({
  icon,
  label,
  children,
}) => (
  <Stack direction="row" spacing={1.25} alignItems="flex-start">
    <Box sx={{ color: brand.slateMuted, mt: "2px", "& .MuiSvgIcon-root": { fontSize: 17 } }}>
      {icon}
    </Box>
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ fontSize: 11, color: brand.slateMuted }}>{label}</Typography>
      <Box sx={{ fontSize: 13.5, fontWeight: 600, color: brand.ink, wordBreak: "break-word" }}>
        {children}
      </Box>
    </Box>
  </Stack>
);

/** Years worked, as the profile records it. */
function experienceLabel(years?: number | null): string | null {
  if (years === null || years === undefined) return null;
  const value = Number(years);
  if (!Number.isFinite(value) || value <= 0) return null;
  const rounded = Number.isInteger(value) ? value : Math.round(value * 10) / 10;
  return `${rounded} ${rounded === 1 ? "year" : "years"}`;
}

function milestoneYears(start?: number | null, end?: number | null): string {
  if (!start && !end) return "";
  if (start && !end) return `${start} – Present`;
  if (!start && end) return String(end);
  return `${start} – ${end}`;
}

export const ProfessionProfilePage: React.FC = () => {
  const { peopleId } = useParams<{ peopleId: string }>();
  const { canEditProfessionProfile } = useAuth();
  const [profile, setProfile] = useState<ProfessionProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  // Only meaningful when there is no profile yet: `canEdit` comes with a
  // profile, but an empty page still has to know whether to offer creating one.
  const [canCreate, setCanCreate] = useState(false);

  const load = useCallback(async () => {
    if (!peopleId) return;
    setLoading(true);
    try {
      const loaded = await ApiService.getProfessionProfile(peopleId);
      setProfile(loaded);
      if (loaded) {
        setCanCreate(false);
        return;
      }
      // A profile is its subject's to create, so this needs no server round
      // trip: it is the same self-or-superadmin rule the PUT enforces. It used
      // to ask the write-access API, which answered the broader question of who
      // may edit this *person* — and so offered custodians a button the server
      // now refuses.
      setCanCreate(canEditProfessionProfile(peopleId));
    } catch (error) {
      console.error("Failed to load profession profile:", error);
      setProfile(null);
      setCanCreate(false);
    } finally {
      setLoading(false);
    }
  }, [peopleId, canEditProfessionProfile]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <Box sx={{ bgcolor: CANVAS, minHeight: "100vh", py: 8, textAlign: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!profile) {
    return (
      <Box sx={{ bgcolor: CANVAS, minHeight: "100vh", py: { xs: 6, md: 10 } }}>
        <Container maxWidth="sm">
          <Panel>
            <Typography sx={{ fontWeight: 800, fontSize: 19, color: brand.ink, mb: 1 }}>
              No profession profile here
            </Typography>
            <Typography sx={{ fontSize: 14.5, color: brand.slate }}>
              {canCreate
                ? "Add what they do for a living, where they studied, and what they can help younger relatives with."
                : "Either this person hasn't added one, or it isn't shared with you. Profiles are visible to family by default."}
            </Typography>
            {canCreate && peopleId && (
              <Button
                variant="contained"
                startIcon={<EditOutlinedIcon />}
                onClick={() => setEditOpen(true)}
                sx={{
                  mt: 2.5,
                  textTransform: "none",
                  fontWeight: 800,
                  borderRadius: 2,
                  px: 2.5,
                  bgcolor: brand.primaryDark,
                  "&:hover": { bgcolor: "#1e40af" },
                }}
              >
                Add profession profile
              </Button>
            )}
          </Panel>
        </Container>
        {canCreate && peopleId && (
          <ProfessionFormDialog
            open={editOpen}
            onClose={() => setEditOpen(false)}
            peopleId={peopleId}
            profile={null}
            onSaved={() => {
              setEditOpen(false);
              void load();
            }}
          />
        )}
      </Box>
    );
  }

  const experience = experienceLabel(profile.totalExperienceYears);
  const skillGroups = profile.skills.reduce<Record<string, string[]>>((groups, skill) => {
    const key = skill.category?.trim() || "Skills";
    groups[key] = groups[key] || [];
    groups[key].push(skill.name);
    return groups;
  }, {});

  // Counts are facts about the record, not achievements — shown only when the
  // record actually holds something.
  const facts = [
    experience ? { label: "Experience", value: experience } : null,
    profile.milestones.length
      ? { label: "Career milestones", value: String(profile.milestones.length) }
      : null,
    profile.skills.length ? { label: "Skills listed", value: String(profile.skills.length) } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  const hasCoordinates =
    profile.workEmail ||
    profile.workLocation ||
    profile.contactPhone ||
    profile.linkedinUrl ||
    profile.portfolioUrl;

  return (
    <>
      <Helmet>
        <title>
          {profile.personName
            ? `${profile.personName} — ${profile.title} | Kinvia`
            : "Profession profile | Kinvia"}
        </title>
      </Helmet>

      <Box sx={{ bgcolor: CANVAS, minHeight: "100vh", py: { xs: 3, md: 5 } }}>
        <Container maxWidth={false} sx={{ maxWidth: 1200, px: { xs: 2, md: 4 } }}>
          {/* ---- Hero ------------------------------------------------------ */}
          <Panel>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={{ xs: 2, sm: 3 }}
              alignItems={{ xs: "flex-start", sm: "center" }}
              justifyContent="space-between"
            >
              <Stack direction="row" spacing={2.5} alignItems="center" sx={{ minWidth: 0 }}>
                <Avatar
                  src={profile.personPhotoUrl || undefined}
                  sx={{ width: 76, height: 76, bgcolor: brand.primarySoft, color: brand.primaryDark, fontWeight: 800, fontSize: 26 }}
                >
                  {(profile.personName || "?").charAt(0)}
                </Avatar>

                <Box sx={{ minWidth: 0 }}>
                  <Stack direction="row" spacing={1} alignItems="baseline" flexWrap="wrap" useFlexGap>
                    <Typography
                      component="h1"
                      sx={{ fontWeight: 800, fontSize: { xs: 24, md: 30 }, letterSpacing: "-0.02em", color: brand.ink }}
                    >
                      {profile.personName || "Unnamed"}
                    </Typography>
                    {profile.personNameHindi && (
                      <Typography sx={{ fontSize: 16, color: brand.slateMuted }}>
                        ({profile.personNameHindi})
                      </Typography>
                    )}
                  </Stack>

                  <Typography sx={{ mt: 0.25, fontSize: { xs: 15, md: 17 }, fontWeight: 700, color: brand.primaryDark }}>
                    {profile.title}
                  </Typography>

                  <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
                    {profile.sector && <Chip size="small" label={profile.sector} sx={{ bgcolor: "#f1f5f9", fontWeight: 600 }} />}
                    {profile.subSpecialization && (
                      <Chip size="small" label={profile.subSpecialization} sx={{ bgcolor: "#f1f5f9", fontWeight: 600 }} />
                    )}
                    {profile.organization && (
                      <Chip
                        size="small"
                        icon={<WorkOutlineOutlinedIcon />}
                        label={profile.organization}
                        sx={{ bgcolor: brand.primarySoft, color: brand.primaryDark, fontWeight: 600 }}
                      />
                    )}
                  </Stack>
                </Box>
              </Stack>

              {profile.canEdit && (
                <Button
                  variant="contained"
                  startIcon={<EditOutlinedIcon />}
                  onClick={() => setEditOpen(true)}
                  sx={{
                    flexShrink: 0,
                    minHeight: 42,
                    px: 2.25,
                    borderRadius: 2,
                    fontWeight: 700,
                    textTransform: "none",
                    bgcolor: brand.primaryDark,
                    "&:hover": { bgcolor: "#1e40af" },
                  }}
                >
                  Edit profession
                </Button>
              )}
            </Stack>

            {facts.length > 0 && (
              <>
                <Divider sx={{ my: 2.5 }} />
                <Stack direction="row" spacing={{ xs: 3, md: 6 }} flexWrap="wrap" useFlexGap>
                  {facts.map((fact) => (
                    <Box key={fact.label}>
                      <Typography sx={{ fontSize: { xs: 20, md: 24 }, fontWeight: 800, color: brand.ink, lineHeight: 1.2 }}>
                        {fact.value}
                      </Typography>
                      <Typography sx={{ fontSize: 11.5, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: brand.slateMuted }}>
                        {fact.label}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </>
            )}
          </Panel>

          {/* ---- Body + rail ----------------------------------------------- */}
          <Box
            sx={{
              mt: 3,
              display: "grid",
              gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 8fr) minmax(0, 4fr)" },
              gap: 3,
              alignItems: "start",
            }}
          >
            <Stack spacing={3} sx={{ minWidth: 0 }}>
              {profile.summary && (
                <Panel title="About their work" icon={<WorkOutlineOutlinedIcon />}>
                  <Box sx={{ fontSize: 14.5, lineHeight: 1.7, color: brand.slate }}>
                    <RichText value={profile.summary} />
                  </Box>
                </Panel>
              )}

              {profile.skills.length > 0 && (
                <Panel title="Skills and disciplines" icon={<AccountTreeOutlinedIcon />}>
                  <Stack spacing={2.5}>
                    {Object.entries(skillGroups).map(([group, names]) => (
                      <Box key={group}>
                        <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: brand.slateMuted, mb: 1 }}>
                          {group}
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          {names.map((name) => (
                            <Chip
                              key={name}
                              label={name}
                              size="small"
                              sx={{ bgcolor: "#f8fafc", border: `1px solid ${BORDER}`, fontWeight: 600, borderRadius: 1.5 }}
                            />
                          ))}
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                </Panel>
              )}

              {profile.milestones.length > 0 && (
                <Panel title="Career so far" icon={<WorkOutlineOutlinedIcon />}>
                  <Stack spacing={0}>
                    {profile.milestones.map((milestone, index) => (
                      <Stack key={milestone.id || index} direction="row" spacing={2}>
                        {/* A rail rather than a bullet list: the dots and the
                            line are what make a sequence readable at a glance. */}
                        <Stack alignItems="center" sx={{ flexShrink: 0, pt: 0.5 }}>
                          <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: brand.primary }} />
                          {index < profile.milestones.length - 1 && (
                            <Box sx={{ width: 2, flex: 1, minHeight: 28, bgcolor: BORDER, mt: 0.5 }} />
                          )}
                        </Stack>

                        <Box sx={{ flex: 1, pb: index < profile.milestones.length - 1 ? 3 : 0, minWidth: 0 }}>
                          <Stack direction="row" justifyContent="space-between" spacing={2} flexWrap="wrap" useFlexGap>
                            <Typography sx={{ fontWeight: 700, fontSize: 15, color: brand.ink }}>
                              {milestone.title}
                            </Typography>
                            <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: brand.primaryDark, whiteSpace: "nowrap" }}>
                              {milestoneYears(milestone.startYear, milestone.endYear)}
                            </Typography>
                          </Stack>
                          {(milestone.organization || milestone.location) && (
                            <Typography sx={{ fontSize: 13, color: brand.primaryDark, mt: 0.25 }}>
                              {[milestone.organization, milestone.location].filter(Boolean).join(" · ")}
                            </Typography>
                          )}
                          {milestone.description && (
                            <Typography sx={{ fontSize: 13.5, color: brand.slate, mt: 0.75, lineHeight: 1.6 }}>
                              {milestone.description}
                            </Typography>
                          )}
                        </Box>
                      </Stack>
                    ))}
                  </Stack>
                </Panel>
              )}

              {(profile.highestDegree || profile.university || profile.certifications) && (
                <Panel title="Education and certifications" icon={<SchoolOutlinedIcon />}>
                  <Stack spacing={1.5}>
                    {(profile.highestDegree || profile.university) && (
                      <Box>
                        <Typography sx={{ fontWeight: 700, fontSize: 14.5, color: brand.ink }}>
                          {profile.highestDegree || "Qualification"}
                        </Typography>
                        {profile.university && (
                          <Typography sx={{ fontSize: 13.5, color: brand.slate }}>
                            {profile.university}
                          </Typography>
                        )}
                      </Box>
                    )}
                    {profile.certifications && (
                      <Box>
                        <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: brand.slateMuted, mb: 0.5 }}>
                          Certifications
                        </Typography>
                        <Typography sx={{ fontSize: 13.5, color: brand.slate, lineHeight: 1.6 }}>
                          {profile.certifications}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </Panel>
              )}
            </Stack>

            {/* ---- Rail ---------------------------------------------------- */}
            <Stack spacing={3} sx={{ minWidth: 0 }}>
              {/* Only the owner sees this: to everyone else it is a statement
                  about someone else's settings, which is not their business. */}
              {profile.canEdit && (
                <Panel title="Who can see this" icon={<LockOutlinedIcon />}>
                  <Stack spacing={1.25}>
                    <Chip
                      label={VISIBILITY_LABEL[profile.visibility] || profile.visibility}
                      sx={{ alignSelf: "flex-start", bgcolor: brand.primarySoft, color: brand.primaryDark, fontWeight: 700 }}
                    />
                    <Typography sx={{ fontSize: 12.5, color: brand.slateMuted, lineHeight: 1.6 }}>
                      {profile.visibility === "public"
                        ? profile.showEmployerPublicly
                          ? "Anyone can see this profile, including your employer."
                          : "Anyone can see your role, but your employer and work contact details stay hidden."
                        : profile.visibility === "family"
                          ? "Only people who can already see this family tree."
                          : "Only you and this tree's custodians."}
                    </Typography>
                  </Stack>
                </Panel>
              )}

              {hasCoordinates && (
                <Panel title="Get in touch" icon={<EmailOutlinedIcon />}>
                  <Stack spacing={1.75}>
                    {profile.workEmail && (
                      <RailRow icon={<EmailOutlinedIcon />} label="Work email">
                        <Box component="a" href={`mailto:${profile.workEmail}`} sx={{ color: brand.primaryDark, textDecoration: "none" }}>
                          {profile.workEmail}
                        </Box>
                      </RailRow>
                    )}
                    {/* Only reaches the client when its owner switched it on;
                        for everyone else the server sends null. The owner sees
                        their own either way, with a note saying which. */}
                    {profile.contactPhone && (
                      <RailRow icon={<PhoneOutlinedIcon />} label="Phone">
                        <Box
                          component="a"
                          href={`tel:${profile.contactPhone.replace(/[^\d+]/g, "")}`}
                          sx={{ color: brand.primaryDark, textDecoration: "none" }}
                        >
                          {profile.contactPhone}
                        </Box>
                        {profile.canEdit && !profile.showContact && (
                          <Typography
                            sx={{ fontSize: 11.5, fontWeight: 500, color: brand.slateMuted, mt: 0.25 }}
                          >
                            Hidden from everyone else
                          </Typography>
                        )}
                      </RailRow>
                    )}
                    {profile.workLocation && (
                      <RailRow icon={<PlaceOutlinedIcon />} label="Based in">
                        {profile.workLocation}
                      </RailRow>
                    )}
                    {profile.linkedinUrl && (
                      <RailRow icon={<LinkIcon />} label="LinkedIn">
                        <Box component="a" href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" sx={{ color: brand.primaryDark, textDecoration: "none" }}>
                          View profile
                        </Box>
                      </RailRow>
                    )}
                    {profile.portfolioUrl && (
                      <RailRow icon={<LinkIcon />} label="Portfolio or code">
                        <Box component="a" href={profile.portfolioUrl} target="_blank" rel="noopener noreferrer" sx={{ color: brand.primaryDark, textDecoration: "none" }}>
                          Open link
                        </Box>
                      </RailRow>
                    )}
                  </Stack>
                </Panel>
              )}

              {profile.mentorshipAvailable && (
                <Panel title="Open to mentoring" icon={<GroupsOutlinedIcon />}>
                  <Stack spacing={1.5}>
                    <Typography sx={{ fontSize: 13.5, color: brand.slate, lineHeight: 1.6 }}>
                      Offers guidance to students and younger relatives from the family.
                    </Typography>
                    {!!profile.mentorshipAreas?.length && (
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {profile.mentorshipAreas.map((area) => (
                          <Chip key={area} size="small" label={area} sx={{ bgcolor: "#ECFDF5", color: "#047857", fontWeight: 600, borderRadius: 1.5 }} />
                        ))}
                      </Stack>
                    )}
                    {profile.mentorshipNote && (
                      <Typography sx={{ fontSize: 12.5, color: brand.slateMuted, lineHeight: 1.6 }}>
                        {profile.mentorshipNote}
                      </Typography>
                    )}
                  </Stack>
                </Panel>
              )}

              {profile.treeId && (
                <Panel>
                  <Stack direction="row" spacing={1.25} alignItems="center">
                    <AccountTreeOutlinedIcon sx={{ fontSize: 18, color: brand.slateMuted }} />
                    <Typography
                      component={RouterLink}
                      to={`/families?tree=${profile.treeId}&personId=${profile.peopleId}`}
                      sx={{ fontSize: 13.5, fontWeight: 700, color: brand.primaryDark, textDecoration: "none" }}
                    >
                      See {profile.personName || "them"} in the family tree
                    </Typography>
                  </Stack>
                </Panel>
              )}
            </Stack>
          </Box>
        </Container>
      </Box>

      {profile.canEdit && peopleId && (
        <ProfessionFormDialog
          open={editOpen}
          onClose={() => setEditOpen(false)}
          peopleId={peopleId}
          profile={profile}
          onSaved={() => {
            setEditOpen(false);
            void load();
          }}
        />
      )}
    </>
  );
};

export default ProfessionProfilePage;
