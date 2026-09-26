import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import PublicOutlinedIcon from "@mui/icons-material/PublicOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import {
  ApiService,
  ProfessionMilestone,
  ProfessionProfile,
  ProfessionVisibility,
} from "../../services/apiService";
import { PlacePicker, PlaceValue } from "../PlacePicker/PlacePicker";
import { brand } from "../../theme/brand";

const RichTextEditor = React.lazy(() =>
  import("../common/RichTextEditor").then((m) => ({ default: m.RichTextEditor })),
);

/**
 * The profession profile editor.
 *
 * Sectioned rather than stepped: the design draws five numbered steps, but this
 * is an edit form for a record that already exists — someone fixing their job
 * title should not walk through five screens to reach Save.
 *
 * Every field maps to a stored column. Nothing here is decorative.
 */

const EMPLOYMENT_MODES = [
  { value: "employed", label: "Employed" },
  { value: "self_employed", label: "Self-employed" },
  { value: "founder", label: "Founder / business owner" },
  { value: "student", label: "Student" },
  { value: "retired", label: "Retired" },
];

const MENTORSHIP_AREAS = [
  "Career guidance",
  "Higher education",
  "Exam preparation",
  "Interview practice",
  "Starting a business",
  "Government service",
];

const VISIBILITY_CHOICES: Array<{
  value: ProfessionVisibility;
  label: string;
  detail: string;
  icon: React.ReactNode;
}> = [
  {
    value: "public",
    label: "Public",
    detail: "Anyone can find this, including people outside your family.",
    icon: <PublicOutlinedIcon />,
  },
  {
    value: "family",
    label: "Family only",
    detail: "Only people who can already see this family tree.",
    icon: <GroupsOutlinedIcon />,
  },
  {
    value: "private",
    label: "Private",
    detail: "Only you and this tree's custodians.",
    icon: <LockOutlinedIcon />,
  },
];

const SectionHeading: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <Box sx={{ mb: 2 }}>
    <Typography sx={{ fontWeight: 800, fontSize: 16, color: brand.ink }}>{title}</Typography>
    {subtitle && (
      <Typography sx={{ fontSize: 13, color: brand.slateMuted, mt: 0.25 }}>{subtitle}</Typography>
    )}
  </Box>
);

export interface ProfessionFormDialogProps {
  open: boolean;
  onClose: () => void;
  peopleId: string;
  profile?: ProfessionProfile | null;
  onSaved: () => void;
}

export const ProfessionFormDialog: React.FC<ProfessionFormDialogProps> = ({
  open,
  onClose,
  peopleId,
  profile,
  onSaved,
}) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("md"));

  const [title, setTitle] = useState("");
  const [sector, setSector] = useState("");
  const [subSpecialization, setSubSpecialization] = useState("");
  const [employmentMode, setEmploymentMode] = useState("");
  const [organization, setOrganization] = useState("");
  const [experience, setExperience] = useState("");
  const [summary, setSummary] = useState("");
  const [highestDegree, setHighestDegree] = useState("");
  const [university, setUniversity] = useState("");
  const [certifications, setCertifications] = useState("");
  const [workEmail, setWorkEmail] = useState("");
  const [workLocation, setWorkLocation] = useState("");
  /**
   * The work place, as a real point rather than typed text.
   *
   * `workLocation` stays as the label the profile and the directory card
   * display; it is filled from whatever place is chosen, so the two never
   * disagree and old profiles keep the text their owner typed.
   */
  const [workPlace, setWorkPlace] = useState<PlaceValue | null>(null);
  const [contactPhone, setContactPhone] = useState("");
  const [showContact, setShowContact] = useState(false);
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [visibility, setVisibility] = useState<ProfessionVisibility>("family");
  const [showPhoneToCloseKin, setShowPhoneToCloseKin] = useState(false);
  const [allowMentorshipRequests, setAllowMentorshipRequests] = useState(false);
  const [showEmployerPublicly, setShowEmployerPublicly] = useState(false);
  const [mentorshipAvailable, setMentorshipAvailable] = useState(false);
  const [mentorshipAreas, setMentorshipAreas] = useState<string[]>([]);
  const [mentorshipNote, setMentorshipNote] = useState("");
  const [milestones, setMilestones] = useState<ProfessionMilestone[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [error, setError] = useState("");

  // Reset from the record every time the dialog opens, so a cancelled edit
  // never leaks into the next one.
  //
  // `apply` is separated from the effect because the dialog re-reads the full
  // record on open: callers may hand it a listing-sized summary with no
  // milestones or skills, and saving that back would delete the ones it never
  // received.
  const applyProfile = useCallback((profile?: ProfessionProfile | null) => {
    setTitle(profile?.title || "");
    setSector(profile?.sector || "");
    setSubSpecialization(profile?.subSpecialization || "");
    setEmploymentMode(profile?.employmentMode || "");
    setOrganization(profile?.organization || "");
    setExperience(
      profile?.totalExperienceYears === null || profile?.totalExperienceYears === undefined
        ? ""
        : String(profile.totalExperienceYears),
    );
    setSummary(profile?.summary || "");
    setHighestDegree(profile?.highestDegree || "");
    setUniversity(profile?.university || "");
    setCertifications(profile?.certifications || "");
    setWorkEmail(profile?.workEmail || "");
    setWorkLocation(profile?.workLocation || "");
    setWorkPlace(
      profile?.workPlaceId && profile?.workLatitude != null && profile?.workLongitude != null
        ? {
            placeId: profile.workPlaceId,
            name: profile.workPlaceName || profile.workLocation || "",
            address: profile.workPlaceAddress || profile.workLocation || "",
            latitude: Number(profile.workLatitude),
            longitude: Number(profile.workLongitude),
          }
        : null,
    );
    setContactPhone(profile?.contactPhone || "");
    setShowContact(Boolean(profile?.showContact));
    setLinkedinUrl(profile?.linkedinUrl || "");
    setPortfolioUrl(profile?.portfolioUrl || "");
    setVisibility(profile?.visibility || "family");
    setShowPhoneToCloseKin(Boolean(profile?.showPhoneToCloseKin));
    setAllowMentorshipRequests(Boolean(profile?.allowMentorshipRequests));
    setShowEmployerPublicly(Boolean(profile?.showEmployerPublicly));
    setMentorshipAvailable(Boolean(profile?.mentorshipAvailable));
    setMentorshipAreas(profile?.mentorshipAreas || []);
    setMentorshipNote(profile?.mentorshipNote || "");
    setMilestones(profile?.milestones?.length ? [...profile.milestones] : []);
    setSkills((profile?.skills || []).map((skill) => skill.name));
    setSkillInput("");
  }, []);

  // Read through a ref so a parent re-render that hands over an equal-but-new
  // profile object cannot reset a form the user is typing into.
  const profileRef = useRef(profile);
  profileRef.current = profile;

  useEffect(() => {
    if (!open) return;
    setError("");
    // Paint immediately from whatever the caller had…
    applyProfile(profileRef.current);

    // …then correct it with the authoritative record, which always carries the
    // milestones and skills.
    let active = true;
    if (peopleId) {
      setLoadingProfile(true);
      ApiService.getProfessionProfile(peopleId)
        .then((full) => {
          // A person with no profile yet still gets a tag-only stand-in (title
          // built from their profession tags) — that is display data, not
          // something to pre-fill a new profile with.
          if (active && full && full.hasProfile !== false) applyProfile(full);
        })
        .catch((err) => {
          console.error("Failed to load profession profile for editing:", err);
        })
        .finally(() => {
          if (active) setLoadingProfile(false);
        });
    }
    return () => {
      active = false;
    };
  }, [open, peopleId, applyProfile]);

  const canSave = useMemo(
    () => title.trim().length > 0 && Boolean(workPlace?.placeId) && !saving && !loadingProfile,
    [title, workPlace, saving, loadingProfile],
  );

  const updateMilestone = (index: number, patch: Partial<ProfessionMilestone>) => {
    setMilestones((current) =>
      current.map((milestone, i) => (i === index ? { ...milestone, ...patch } : milestone)),
    );
  };

  const addSkill = () => {
    const value = skillInput.trim();
    if (!value) return;
    // Case-insensitive: "React" and "react" are the same skill, and two chips
    // that read the same look like a bug.
    if (skills.some((skill) => skill.toLowerCase() === value.toLowerCase())) {
      setSkillInput("");
      return;
    }
    setSkills((current) => [...current, value]);
    setSkillInput("");
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError("A profession title is required.");
      return;
    }
    // Same rule as a business listing, and for the same reason: the directory
    // is browsed by place. Typed text could not answer "who works near here",
    // so this has to be a chosen place with coordinates behind it.
    if (!workPlace?.placeId || workPlace.latitude == null || workPlace.longitude == null) {
      setError("Choose where you work from the suggestions — it's how people find you.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const years = Number(experience);
      await ApiService.saveProfessionProfile(peopleId, {
        title: title.trim(),
        sector: sector.trim() || null,
        subSpecialization: subSpecialization.trim() || null,
        employmentMode: employmentMode || null,
        organization: organization.trim() || null,
        totalExperienceYears: experience.trim() && Number.isFinite(years) ? years : null,
        summary: summary || null,
        highestDegree: highestDegree.trim() || null,
        university: university.trim() || null,
        certifications: certifications.trim() || null,
        workEmail: workEmail.trim() || null,
        // The label mirrors the chosen place, so the card and the point agree.
        workLocation: workPlace.name || workPlace.address || workLocation.trim() || null,
        workPlaceId: workPlace.placeId,
        workPlaceName: workPlace.name || null,
        workPlaceAddress: workPlace.address || null,
        workLatitude: workPlace.latitude,
        workLongitude: workPlace.longitude,
        contactPhone: contactPhone.trim() || null,
        // Kept in step with the number: clearing the field also retires the
        // switch, so a re-added number is never silently published.
        showContact: contactPhone.trim() ? showContact : false,
        linkedinUrl: linkedinUrl.trim() || null,
        portfolioUrl: portfolioUrl.trim() || null,
        visibility,
        showPhoneToCloseKin,
        allowMentorshipRequests,
        showEmployerPublicly,
        mentorshipAvailable,
        mentorshipAreas: mentorshipAreas.length ? mentorshipAreas : null,
        mentorshipNote: mentorshipNote.trim() || null,
        milestones: milestones
          .filter((milestone) => milestone.title?.trim())
          .map((milestone, index) => ({ ...milestone, sortOrder: index })),
        skills: skills.map((name, index) => ({ name, sortOrder: index })),
      });
      onSaved();
    } catch (err: any) {
      console.error("Failed to save profession profile:", err);
      setError(err?.message || "We couldn't save this profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      fullScreen={fullScreen}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: fullScreen ? 0 : 3 } }}
    >
      <DialogTitle sx={{ pr: 6, fontWeight: 800 }}>
        {profile ? "Edit profession profile" : "Add profession profile"}
        <IconButton
          onClick={onClose}
          disabled={saving}
          sx={{ position: "absolute", right: 12, top: 12 }}
          aria-label="Close"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ bgcolor: "#f8faff" }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        <Stack spacing={2.5}>
          {/* ---- Role ---------------------------------------------------- */}
          {/* Title, work email and contact number carry made-up autocomplete
              tokens: Chrome ignores "off" and would otherwise fill them from the
              viewer's saved address card, which reads as data we pre-filled. */}
          <Box sx={{ p: 2.5, bgcolor: "#fff", borderRadius: 3, border: "1px solid #e2e8f0" }}>
            <SectionHeading title="Role" subtitle="What you do, and where." />
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
              <TextField
                label="Profession title"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                fullWidth
                inputProps={{ autoComplete: "profession-title" }}
                placeholder="e.g. Software architect"
                sx={{ gridColumn: { sm: "1 / -1" } }}
              />
              <TextField label="Industry or sector" value={sector} onChange={(e) => setSector(e.target.value)} fullWidth />
              <TextField
                label="Specialisation"
                value={subSpecialization}
                onChange={(e) => setSubSpecialization(e.target.value)}
                fullWidth
              />
              <TextField select label="Employment" value={employmentMode} onChange={(e) => setEmploymentMode(e.target.value)} fullWidth>
                <MenuItem value="">Not set</MenuItem>
                {EMPLOYMENT_MODES.map((mode) => (
                  <MenuItem key={mode.value} value={mode.value}>
                    {mode.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField label="Organisation" value={organization} onChange={(e) => setOrganization(e.target.value)} fullWidth />
              <TextField
                label="Years of experience"
                value={experience}
                onChange={(e) => setExperience(e.target.value.replace(/[^0-9.]/g, ""))}
                fullWidth
                inputProps={{ inputMode: "decimal" }}
                InputProps={{ endAdornment: <InputAdornment position="end">years</InputAdornment> }}
              />
            </Box>

            <Box sx={{ mt: 2 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: brand.slate, mb: 0.75 }}>
                About your work
              </Typography>
              <Suspense fallback={<TextField fullWidth multiline minRows={4} disabled />}>
                <RichTextEditor value={summary} onChange={setSummary} placeholder="What you work on, in your own words." />
              </Suspense>
            </Box>
          </Box>

          {/* ---- Visibility ---------------------------------------------- */}
          <Box sx={{ p: 2.5, bgcolor: "#fff", borderRadius: 3, border: "1px solid #e2e8f0" }}>
            <SectionHeading
              title="Who can see this"
              subtitle="Your profile carries an employer and work contact details, so it stays with family unless you say otherwise."
            />
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
              {VISIBILITY_CHOICES.map((choice) => {
                const active = visibility === choice.value;
                return (
                  <Box
                    key={choice.value}
                    role="button"
                    tabIndex={0}
                    onClick={() => setVisibility(choice.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setVisibility(choice.value);
                      }
                    }}
                    sx={{
                      flex: 1,
                      p: 2,
                      cursor: "pointer",
                      borderRadius: 2.5,
                      border: "1px solid",
                      borderColor: active ? brand.primary : "#e2e8f0",
                      bgcolor: active ? brand.primarySoft : "#fff",
                      transition: "border-color 140ms ease, background-color 140ms ease",
                    }}
                  >
                    <Box sx={{ color: active ? brand.primaryDark : brand.slateMuted, mb: 0.75 }}>
                      {choice.icon}
                    </Box>
                    <Typography sx={{ fontWeight: 700, fontSize: 14, color: brand.ink }}>
                      {choice.label}
                    </Typography>
                    <Typography sx={{ fontSize: 12.5, color: brand.slateMuted, lineHeight: 1.5 }}>
                      {choice.detail}
                    </Typography>
                  </Box>
                );
              })}
            </Stack>

            <Divider sx={{ my: 2 }} />
            <Stack spacing={0.5}>
              <FormControlLabel
                control={<Checkbox checked={showEmployerPublicly} onChange={(e) => setShowEmployerPublicly(e.target.checked)} />}
                label={
                  <Box>
                    <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>Show my employer publicly</Typography>
                    <Typography sx={{ fontSize: 12, color: brand.slateMuted }}>
                      Off means public visitors see your role but not who you work for.
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                control={<Checkbox checked={allowMentorshipRequests} onChange={(e) => setAllowMentorshipRequests(e.target.checked)} />}
                label={<Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>Let relatives message me about career guidance</Typography>}
              />
            </Stack>
          </Box>

          {/* ---- Experience ---------------------------------------------- */}
          <Box sx={{ p: 2.5, bgcolor: "#fff", borderRadius: 3, border: "1px solid #e2e8f0" }}>
            <SectionHeading title="Education and career history" />
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2, mb: 2 }}>
              <TextField label="Highest qualification" value={highestDegree} onChange={(e) => setHighestDegree(e.target.value)} fullWidth />
              <TextField label="University or institute" value={university} onChange={(e) => setUniversity(e.target.value)} fullWidth />
              <TextField
                label="Certifications"
                value={certifications}
                onChange={(e) => setCertifications(e.target.value)}
                fullWidth
                sx={{ gridColumn: { sm: "1 / -1" } }}
                placeholder="Separate with commas"
              />
            </Box>

            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: brand.slate }}>
                Previous roles
              </Typography>
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => setMilestones((current) => [...current, { title: "" }])}
                sx={{ textTransform: "none", fontWeight: 700 }}
              >
                Add role
              </Button>
            </Stack>

            <Stack spacing={1.5}>
              {milestones.length === 0 && (
                <Typography sx={{ fontSize: 13, color: brand.slateMuted }}>
                  No roles added yet.
                </Typography>
              )}
              {milestones.map((milestone, index) => (
                <Box key={index} sx={{ p: 1.75, borderRadius: 2, bgcolor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                  <Stack direction="row" justifyContent="flex-end">
                    <IconButton
                      size="small"
                      aria-label="Remove role"
                      onClick={() => setMilestones((current) => current.filter((_, i) => i !== index))}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "2fr 2fr 1fr 1fr" }, gap: 1.5 }}>
                    <TextField size="small" label="Role" value={milestone.title} onChange={(e) => updateMilestone(index, { title: e.target.value })} />
                    <TextField size="small" label="Organisation" value={milestone.organization || ""} onChange={(e) => updateMilestone(index, { organization: e.target.value })} />
                    <TextField
                      size="small"
                      label="From"
                      value={milestone.startYear ?? ""}
                      onChange={(e) => updateMilestone(index, { startYear: e.target.value ? Number(e.target.value.replace(/\D/g, "")) : null })}
                      inputProps={{ inputMode: "numeric", maxLength: 4 }}
                    />
                    <TextField
                      size="small"
                      label="To"
                      placeholder="Present"
                      value={milestone.endYear ?? ""}
                      onChange={(e) => updateMilestone(index, { endYear: e.target.value ? Number(e.target.value.replace(/\D/g, "")) : null })}
                      inputProps={{ inputMode: "numeric", maxLength: 4 }}
                    />
                    <TextField
                      size="small"
                      label="What you did"
                      value={milestone.description || ""}
                      onChange={(e) => updateMilestone(index, { description: e.target.value })}
                      multiline
                      minRows={2}
                      sx={{ gridColumn: { sm: "1 / -1" } }}
                    />
                  </Box>
                </Box>
              ))}
            </Stack>

            <Divider sx={{ my: 2 }} />
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: brand.slate, mb: 1 }}>Skills</Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
              <TextField
                size="small"
                fullWidth
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSkill();
                  }
                }}
                placeholder="Type a skill and press Enter"
              />
              <Button onClick={addSkill} sx={{ textTransform: "none", fontWeight: 700, flexShrink: 0 }}>
                Add
              </Button>
            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {skills.map((skill) => (
                <Chip
                  key={skill}
                  label={skill}
                  onDelete={() => setSkills((current) => current.filter((item) => item !== skill))}
                  sx={{ borderRadius: 1.5, bgcolor: "#f1f5f9", fontWeight: 600 }}
                />
              ))}
            </Stack>
          </Box>

          {/* ---- Coordinates --------------------------------------------- */}
          <Box sx={{ p: 2.5, bgcolor: "#fff", borderRadius: 3, border: "1px solid #e2e8f0" }}>
            <SectionHeading
              title="How people reach you about work"
              subtitle="All optional. Your phone number stays hidden until you switch it on."
            />
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
              <TextField
                label="Work email"
                type="email"
                value={workEmail}
                onChange={(e) => setWorkEmail(e.target.value)}
                fullWidth
                inputProps={{ autoComplete: "profession-work-email" }}
              />
              <Box sx={{ gridColumn: { sm: "1 / -1" } }}>
                <PlacePicker
                  value={workPlace}
                  onChange={(place) => {
                    setWorkPlace(place);
                    setWorkLocation(place?.name || place?.address || "");
                  }}
                  label="Where you work"
                  required
                  placeholder="Search for the city, town, or area"
                  helperText="Required — this is how people searching nearby find you."
                />
              </Box>
              <TextField
                label="Contact number"
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                fullWidth
                placeholder="e.g. 98765 43210"
                inputProps={{ inputMode: "tel", maxLength: 32, autoComplete: "profession-contact-phone" }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PhoneOutlinedIcon sx={{ fontSize: 18, color: brand.slateMuted }} />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField label="LinkedIn" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} fullWidth placeholder="https://..." />
              <TextField
                label="Portfolio or code"
                value={portfolioUrl}
                onChange={(e) => setPortfolioUrl(e.target.value)}
                fullWidth
                placeholder="https://..."
                sx={{ gridColumn: { sm: "1 / -1" } }}
              />
            </Box>

            {/* The switch sits next to the number rather than in the visibility
                section, because it is a decision about this field: you make it
                while you are looking at what you just typed. */}
            <Box
              sx={{
                mt: 2,
                px: 2,
                py: 1.25,
                borderRadius: 2.5,
                bgcolor: showContact ? brand.primarySoft : "#f8fafc",
                border: "1px solid",
                borderColor: showContact ? `${brand.primary}55` : "#e2e8f0",
                transition: "background-color 140ms ease, border-color 140ms ease",
                opacity: contactPhone.trim() ? 1 : 0.6,
              }}
            >
              <FormControlLabel
                sx={{ m: 0, alignItems: "center", width: "100%" }}
                control={
                  <Switch
                    checked={showContact}
                    disabled={!contactPhone.trim()}
                    onChange={(e) => setShowContact(e.target.checked)}
                  />
                }
                label={
                  <Box sx={{ ml: 0.5 }}>
                    <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: brand.ink }}>
                      Show my contact number on my profession profile
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: brand.slateMuted, lineHeight: 1.5 }}>
                      {!contactPhone.trim()
                        ? "Add a number above to turn this on."
                        : showContact
                          ? visibility === "public"
                            ? "Anyone who can open your profile will see this number."
                            : "People who can see this family tree will see this number."
                          : "Saved, but hidden — only you can see it."}
                    </Typography>
                  </Box>
                }
              />
            </Box>
          </Box>

          {/* ---- Mentorship ---------------------------------------------- */}
          <Box sx={{ p: 2.5, bgcolor: "#fff", borderRadius: 3, border: "1px solid #e2e8f0" }}>
            <SectionHeading title="Helping the next generation" />
            <FormControlLabel
              control={<Switch checked={mentorshipAvailable} onChange={(e) => setMentorshipAvailable(e.target.checked)} />}
              label={<Typography sx={{ fontSize: 14, fontWeight: 600 }}>I&apos;m open to guiding students and younger relatives</Typography>}
            />

            {mentorshipAvailable && (
              <Box sx={{ mt: 2 }}>
                <Typography sx={{ fontSize: 12.5, color: brand.slateMuted, mb: 1 }}>
                  What you can help with
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                  {MENTORSHIP_AREAS.map((area) => {
                    const active = mentorshipAreas.includes(area);
                    return (
                      <Chip
                        key={area}
                        label={area}
                        onClick={() =>
                          setMentorshipAreas((current) =>
                            active ? current.filter((item) => item !== area) : [...current, area],
                          )
                        }
                        sx={{
                          borderRadius: 1.5,
                          fontWeight: 600,
                          cursor: "pointer",
                          bgcolor: active ? "#ECFDF5" : "#f1f5f9",
                          color: active ? "#047857" : brand.slate,
                        }}
                      />
                    );
                  })}
                </Stack>
                <TextField
                  label="When you're usually free"
                  value={mentorshipNote}
                  onChange={(e) => setMentorshipNote(e.target.value)}
                  fullWidth
                  placeholder="e.g. Saturday mornings"
                />
              </Box>
            )}
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={saving} sx={{ textTransform: "none", fontWeight: 700 }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!canSave}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
          sx={{ textTransform: "none", fontWeight: 800, borderRadius: 2, px: 3, bgcolor: brand.primaryDark, "&:hover": { bgcolor: "#1e40af" } }}
        >
          {saving ? "Saving…" : "Save profile"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProfessionFormDialog;
