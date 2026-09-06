import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  IconButton,
  InputAdornment,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import BusinessIcon from "@mui/icons-material/Business";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import ShortTextOutlinedIcon from "@mui/icons-material/ShortTextOutlined";
import LanguageOutlinedIcon from "@mui/icons-material/LanguageOutlined";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import ScheduleOutlinedIcon from "@mui/icons-material/ScheduleOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import CloseIcon from "@mui/icons-material/Close";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { ApiService } from "../../services/apiService";
import {
  BUSINESS_CATEGORY_OPTIONS,
  isPresetCategory,
} from "./businessCategories";
import { phoneFromCustomFields } from "./businessContact";
import { PersonSearchField } from "../BusinessPage/PersonSearchField";
import { RichTextEditor } from "../common/RichTextEditor";
import { DateField } from "../common/DateField";
import { hasRichTextContent } from "../common/richText";
import { brand } from "../../theme/brand";

const CUSTOM_CATEGORY = "__custom__";

/** Lazy, like every other use of it: the cropper pulls in a sizeable dependency. */
const ImageCropper = React.lazy(() => import("../ImageCropper/ImageCropper"));

export interface BusinessFormValue {
  id?: string;
  name?: string;
  category?: string | null;
  description?: string | null;
  contact?: string | null;
  email?: string | null;
  owner?: string | null;
  ownerId?: string | null;
  // Profile fields. Absent on directory cards, present when the dialog is
  // opened from a business's own page.
  tagline?: string | null;
  story?: string | null;
  foundedOn?: string | null;
  website?: string | null;
  address?: string | null;
  hours?: string | null;
  logoUrl?: string | null;
  coverUrl?: string | null;
}

interface BusinessFormDialogProps {
  open: boolean;
  onClose: () => void;
  /** Business being edited; omit or null to create a new one. */
  business?: BusinessFormValue | null;
  /** Owner person id when the owner is fixed (Profile, node details, add-node flow). */
  personId?: string | null;
  /** Show an owner search/select field (used on the Business page). */
  enableOwnerSelect?: boolean;
  /** Location scope for the owner search. */
  locationId?: string;
  /** Contact number prefilled for NEW businesses (e.g. the person's phone). */
  defaultContact?: string;
  /** Called after a successful create/update with the API result. */
  onSaved?: (result: any) => void;
}

/**
 * One numbered card, matching the reference's numbered sections.
 *
 * Defined here rather than inside `BusinessFormDialog`: a component declared in
 * a render body is a NEW component type on every render, so React unmounts and
 * remounts its whole subtree each keystroke — which loses focus (it jumped back
 * to the autofocused name field) and throws away the caret position.
 */
const FormSection: React.FC<{
  index: number;
  title: string;
  subtitle: string;
  innerRef: (el: HTMLDivElement | null) => void;
  children: React.ReactNode;
}> = ({ index, title, subtitle, innerRef, children }) => (
  <Box
    ref={innerRef}
    sx={{
      p: { xs: 2, md: 3 },
      borderRadius: 3,
      border: "1px solid",
      borderColor: brand.border,
      bgcolor: brand.surface,
    }}
  >
    <Stack direction="row" spacing={1.25} alignItems="center">
      <Box
        sx={{
          width: 24,
          height: 24,
          borderRadius: 1,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: brand.primarySoft,
          color: brand.primary,
          fontSize: 12,
          fontWeight: 800,
        }}
      >
        {index}
      </Box>
      <Typography sx={{ fontWeight: 800, fontSize: 17, color: brand.ink }}>{title}</Typography>
    </Stack>
    <Typography sx={{ mt: 0.5, mb: 2.5, fontSize: 13.5, color: brand.slateMuted }}>
      {subtitle}
    </Typography>
    {children}
  </Box>
);

type SectionId = "visuals" | "details" | "contact" | "owner";

/**
 * Create and edit a business.
 *
 * Laid out as a wide, sectioned editor rather than one long column of inputs:
 * a business profile now has enough fields that a narrow dialog turns into a
 * scroll with no landmarks. The left rail names the sections and jumps between
 * them, the right holds one card per section, and the footer keeps the save
 * action in view — so the shape of the form is visible before you start
 * filling it in. Below `md` the rail is dropped and the dialog goes full
 * screen: on a phone the sections read fine as a single column.
 */
export function BusinessFormDialog({
  open,
  onClose,
  business,
  personId,
  enableOwnerSelect = false,
  locationId,
  defaultContact,
  onSaved,
}: BusinessFormDialogProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("md"));
  const isEdit = Boolean(business?.id);

  const [name, setName] = useState("");
  const [categorySelect, setCategorySelect] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [description, setDescription] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [owner, setOwner] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [tagline, setTagline] = useState("");
  const [story, setStory] = useState("");
  const [foundedOn, setFoundedOn] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [hours, setHours] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
  const [coverUrl, setCoverUrl] = useState<string | undefined>(undefined);
  const [imageBusy, setImageBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [error, setError] = useState("");
  /** Set on the first edit, so a late-arriving fetch never clobbers typing. */
  const dirtyRef = useRef(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<Partial<Record<SectionId, HTMLDivElement | null>>>({});
  // Stable per section: an inline arrow would be a new ref callback every
  // render, making React detach and re-attach each node for nothing.
  const sectionRefSetters = useMemo(
    () =>
      ({
        visuals: (el: HTMLDivElement | null) => {
          sectionRefs.current.visuals = el;
        },
        details: (el: HTMLDivElement | null) => {
          sectionRefs.current.details = el;
        },
        contact: (el: HTMLDivElement | null) => {
          sectionRefs.current.contact = el;
        },
        owner: (el: HTMLDivElement | null) => {
          sectionRefs.current.owner = el;
        },
      }) as Record<SectionId, (el: HTMLDivElement | null) => void>,
    [],
  );
  const [activeSection, setActiveSection] = useState<SectionId>("details");

  /** Fills every field from one business record. */
  const populate = useCallback(
    (b: BusinessFormValue, options: { withDefaults?: boolean } = {}) => {
      setName(b.name || "");
      setDescription(b.description || "");
      setContact(
        b.id ? b.contact || "" : b.contact || (options.withDefaults ? defaultContact || "" : ""),
      );
      setEmail(b.email || "");
      setOwner(b.owner || "");
      setOwnerId(b.ownerId || "");
      setTagline(b.tagline || "");
      setStory(b.story || "");
      // The date field wants YYYY-MM-DD; the API returns a full timestamp.
      setFoundedOn((b.foundedOn || "").slice(0, 10));
      setWebsite(b.website || "");
      setAddress(b.address || "");
      setHours(b.hours || "");
      setLogoUrl(b.logoUrl || undefined);
      setCoverUrl(b.coverUrl || undefined);

      const cat = (b.category || "").trim();
      if (!cat) {
        setCategorySelect("");
        setCustomCategory("");
      } else if (isPresetCategory(cat)) {
        setCategorySelect(cat);
        setCustomCategory("");
      } else {
        setCategorySelect(CUSTOM_CATEGORY);
        setCustomCategory(cat);
      }
    },
    [defaultContact],
  );

  useEffect(() => {
    if (!open) return;
    populate(business || {}, { withDefaults: true });
    setError("");
    setActiveSection(business?.id ? "visuals" : "details");
    dirtyRef.current = false;
  }, [open, business, populate]);

  /**
   * Load the full record before letting anyone save it.
   *
   * Callers hand this dialog whatever business object they happen to hold, and
   * most of those are partial: the directory listing and `getBusinessesByPerson`
   * return a name, category, description and contact — no story, tagline,
   * website, address, hours or founding date. Populating from a partial row
   * would show those fields as empty AND, on save, write them back as null,
   * silently wiping data the owner had entered elsewhere. So the dialog fetches
   * the complete record itself and refuses to save until it has it.
   */
  useEffect(() => {
    if (!open || !business?.id) {
      setLoadingRecord(false);
      return;
    }
    let active = true;
    setLoadingRecord(true);
    ApiService.getBusinessProfile(business.id)
      .then((full) => {
        // Never overwrite something the user has already started typing.
        if (!active || dirtyRef.current) return;
        populate({ ...full, owner: business.owner || full.ownerName } as BusinessFormValue);
      })
      .catch((e: any) => {
        if (!active) return;
        console.error("Failed to load the business for editing:", e);
        setError("We couldn't load this business's saved details. Close and try again.");
      })
      .finally(() => {
        if (active) setLoadingRecord(false);
      });
    return () => {
      active = false;
    };
  }, [open, business?.id, business?.owner, populate]);


  const resolvedCategory = useMemo(() => {
    if (categorySelect === CUSTOM_CATEGORY) {
      return customCategory.trim() || null;
    }
    return categorySelect || null;
  }, [categorySelect, customCategory]);

  /** Sections in order. Visuals need a saved row to attach images to, and the
   *  owner section only exists where an owner can be chosen or is known. */
  const sections = useMemo(() => {
    const list: Array<{ id: SectionId; label: string; icon: React.ReactNode }> = [];
    if (isEdit && business?.id) {
      list.push({ id: "visuals", label: "Logo & cover", icon: <ImageOutlinedIcon fontSize="small" /> });
    }
    list.push({ id: "details", label: "Business details", icon: <StorefrontOutlinedIcon fontSize="small" /> });
    list.push({ id: "contact", label: "Location & contact", icon: <PlaceOutlinedIcon fontSize="small" /> });
    if (enableOwnerSelect || owner) {
      list.push({ id: "owner", label: "Owner & family", icon: <AccountTreeOutlinedIcon fontSize="small" /> });
    }
    return list;
  }, [isEdit, business?.id, enableOwnerSelect, owner]);

  /**
   * How much of the profile is filled in.
   *
   * Counted from the fields actually on this form, not a stored score — the
   * number moves as you type, and it tells the owner what a visitor will and
   * won't find on the page.
   */
  const completeness = useMemo(() => {
    const filled = [
      name.trim(),
      resolvedCategory,
      hasRichTextContent(description),
      tagline.trim(),
      foundedOn,
      website.trim(),
      address.trim(),
      hours.trim(),
      hasRichTextContent(story),
      contact.trim(),
      email.trim(),
      logoUrl,
      coverUrl,
    ];
    const done = filled.filter(Boolean).length;
    return { done, total: filled.length, percent: Math.round((done / filled.length) * 100) };
  }, [
    name,
    resolvedCategory,
    description,
    tagline,
    foundedOn,
    website,
    address,
    hours,
    story,
    contact,
    email,
    logoUrl,
    coverUrl,
  ]);

  const scrollToSection = useCallback((id: SectionId) => {
    const el = sectionRefs.current[id];
    const container = scrollRef.current;
    if (!el || !container) return;
    // scrollIntoView would also scroll the page behind the dialog on some
    // browsers; moving the container itself keeps the movement local.
    container.scrollTo({ top: el.offsetTop - 12, behavior: "smooth" });
    setActiveSection(id);
  }, []);

  const handleScroll = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;
    // The section whose top has passed the container's top most recently is
    // the one being read.
    const marker = container.scrollTop + 24;
    let current: SectionId = sections[0]?.id || "details";
    for (const section of sections) {
      const el = sectionRefs.current[section.id];
      if (el && el.offsetTop <= marker) current = section.id;
    }
    setActiveSection(current);
  }, [sections]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Business name is required.");
      scrollToSection("details");
      return;
    }
    if (!resolvedCategory) {
      setError("Category is required.");
      scrollToSection("details");
      return;
    }
    const resolvedPersonId = enableOwnerSelect ? ownerId || null : personId || null;
    if (enableOwnerSelect && !resolvedPersonId) {
      setError("Please select an owner for this business.");
      scrollToSection("owner");
      return;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email address.");
      scrollToSection("contact");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const payload = {
        name: name.trim(),
        category: resolvedCategory,
        description: hasRichTextContent(description) ? description : null,
        contact: contact.trim() || null,
        email: email.trim() || null,
        peopleId: resolvedPersonId,
        tagline: tagline.trim() || null,
        story: hasRichTextContent(story) ? story : null,
        foundedOn: foundedOn || null,
        website: website.trim() || null,
        address: address.trim() || null,
        hours: hours.trim() || null,
      };
      const result = business?.id
        ? await ApiService.updateBusiness(business.id, payload)
        : await ApiService.createBusiness(payload);
      onSaved?.(result);
      onClose();
    } catch (e: any) {
      console.error("Failed to save business:", e);
      setError(e?.message || "Failed to save business. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  /** Wraps a setter so the first keystroke marks the form dirty. */
  const edited = useCallback(
    <T,>(setter: (value: T) => void) =>
      (value: T) => {
        dirtyRef.current = true;
        setter(value);
      },
    [],
  );

  const adornment = (icon: React.ReactNode) => (
    <InputAdornment position="start">{icon}</InputAdornment>
  );

  const sectionIndex = (id: SectionId) => sections.findIndex((s) => s.id === id) + 1;

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      maxWidth="lg"
      fullWidth
      fullScreen={fullScreen}
      PaperProps={{
        sx: {
          borderRadius: fullScreen ? 0 : 3,
          // Tall enough that the left rail has something to anchor to, capped
          // so the dialog never outgrows a laptop screen.
          height: fullScreen ? "100%" : "min(88vh, 880px)",
          bgcolor: brand.canvas,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          bgcolor: brand.surface,
          borderBottom: "1px solid",
          borderColor: brand.border,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800, fontSize: 19, color: brand.ink }}>
            {isEdit ? "Edit business profile" : "Add a business"}
          </Typography>
          <Typography sx={{ fontSize: 13, color: brand.slateMuted }} noWrap>
            {isEdit
              ? name || "Untitled business"
              : "Everything except the name and category can be filled in later."}
          </Typography>
        </Box>
        <IconButton onClick={onClose} disabled={saving} aria-label="Close" sx={{ flexShrink: 0 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, display: "flex", minHeight: 0 }}>
        {/* Left rail — desktop only. On a phone the sections stack and the rail
            would cost more space than it saves. */}
        <Box
          sx={{
            display: { xs: "none", md: "flex" },
            flexDirection: "column",
            gap: 2,
            width: 268,
            flexShrink: 0,
            p: 2.5,
            borderRight: "1px solid",
            borderColor: brand.border,
          }}
        >
          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.09em",
              textTransform: "uppercase",
              color: brand.slateMuted,
            }}
          >
            Sections
          </Typography>
          <Stack spacing={0.5}>
            {sections.map((section, index) => {
              const active = activeSection === section.id;
              return (
                <Box
                  key={section.id}
                  component="button"
                  type="button"
                  onClick={() => scrollToSection(section.id)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    width: "100%",
                    px: 1.25,
                    py: 1,
                    border: "none",
                    borderRadius: 2,
                    cursor: "pointer",
                    textAlign: "left",
                    font: "inherit",
                    fontWeight: 700,
                    fontSize: 14,
                    color: active ? brand.primary : brand.slate,
                    bgcolor: active ? brand.primarySoft : "transparent",
                    "&:hover": { bgcolor: active ? brand.primarySoft : brand.canvas },
                  }}
                >
                  <Box
                    sx={{
                      width: 22,
                      height: 22,
                      borderRadius: 1,
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 800,
                      bgcolor: active ? brand.primary : brand.border,
                      color: active ? brand.surface : brand.slate,
                    }}
                  >
                    {index + 1}
                  </Box>
                  {section.label}
                </Box>
              );
            })}
          </Stack>

          {/* Real, computed from the fields on this form — not a stored score. */}
          <Box
            sx={{
              mt: "auto",
              p: 2,
              borderRadius: 2,
              border: "1px solid",
              borderColor: brand.border,
              bgcolor: brand.surface,
            }}
          >
            <Typography sx={{ fontWeight: 700, fontSize: 13, color: brand.ink }}>
              Profile completeness
            </Typography>
            <LinearProgress
              variant="determinate"
              value={completeness.percent}
              sx={{ my: 1, height: 6, borderRadius: 999 }}
            />
            <Typography sx={{ fontSize: 12, color: brand.slateMuted }}>
              {completeness.done} of {completeness.total} details filled. Anything
              left blank is simply left off the public page.
            </Typography>
          </Box>
        </Box>

        {/* Right: the sections themselves. */}
        <Box
          ref={scrollRef}
          onScroll={handleScroll}
          sx={{ flex: 1, minWidth: 0, overflowY: "auto", p: { xs: 2, md: 3 } }}
        >
          <Stack spacing={2.5}>
            {isEdit && business?.id && (
              <FormSection
                innerRef={sectionRefSetters.visuals}
                index={sectionIndex("visuals")}
                title="Logo & cover"
                subtitle="A square logo and a wide cover photo. Both are saved as soon as you pick them."
              >
                <Stack direction={{ xs: "column", sm: "row" }} spacing={3}>
                  <Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1, color: brand.ink }}>
                      Logo
                    </Typography>
                    <Suspense fallback={<CircularProgress size={20} />}>
                      <ImageCropper
                        currentPhoto={logoUrl}
                        previewVariant="rounded"
                        previewSize={104}
                        uploading={imageBusy}
                        // A shop logo is a file someone already has, not a photo
                        // they take on the spot — and the trigger belongs on the
                        // image, the way every app does an avatar.
                        allowCamera={false}
                        triggerVariant="overlay"
                        onCropped={async (blob) => {
                          setImageBusy(true);
                          try {
                            setLogoUrl(
                              await ApiService.uploadBusinessImage(business.id!, "logo", blob),
                            );
                          } catch (e: any) {
                            setError(e?.message || "Failed to upload the logo.");
                          } finally {
                            setImageBusy(false);
                          }
                        }}
                        onRemove={async () => {
                          setImageBusy(true);
                          try {
                            await ApiService.removeBusinessImage(business.id!, "logo");
                            setLogoUrl(undefined);
                          } catch (e: any) {
                            setError(e?.message || "Failed to remove the logo.");
                          } finally {
                            setImageBusy(false);
                          }
                        }}
                      />
                    </Suspense>
                  </Box>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1, color: brand.ink }}>
                      Cover photo
                    </Typography>
                    {/* No cropper here: the cropper is fixed to 1:1 and a banner
                        is wide. The profile page uses object-fit, so any shape
                        works — a wide photo simply looks best. */}
                    <Box
                      sx={{
                        position: "relative",
                        height: 140,
                        borderRadius: 2,
                        overflow: "hidden",
                        border: "1px dashed",
                        borderColor: brand.border,
                        backgroundImage: coverUrl ? `url(${coverUrl})` : undefined,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        bgcolor: coverUrl ? undefined : brand.canvas,
                        display: "flex",
                        alignItems: "flex-end",
                        justifyContent: "flex-end",
                        gap: 1,
                        p: 1.25,
                      }}
                    >
                      {!coverUrl && (
                        <Typography
                          sx={{
                            position: "absolute",
                            inset: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 13,
                            color: brand.slateMuted,
                          }}
                        >
                          No cover photo yet
                        </Typography>
                      )}
                      <Button
                        component="label"
                        size="small"
                        variant="contained"
                        disabled={imageBusy}
                        sx={{ textTransform: "none", fontWeight: 700, zIndex: 1 }}
                      >
                        {coverUrl ? "Replace" : "Upload"}
                        <input
                          hidden
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            e.target.value = "";
                            if (!file) return;
                            setImageBusy(true);
                            try {
                              setCoverUrl(
                                await ApiService.uploadBusinessImage(business.id!, "cover", file),
                              );
                            } catch (err: any) {
                              setError(err?.message || "Failed to upload the cover photo.");
                            } finally {
                              setImageBusy(false);
                            }
                          }}
                        />
                      </Button>
                      {coverUrl && (
                        <Button
                          size="small"
                          variant="contained"
                          color="inherit"
                          disabled={imageBusy}
                          sx={{ textTransform: "none", fontWeight: 700, zIndex: 1 }}
                          onClick={async () => {
                            setImageBusy(true);
                            try {
                              await ApiService.removeBusinessImage(business.id!, "cover");
                              setCoverUrl(undefined);
                            } catch (err: any) {
                              setError(err?.message || "Failed to remove the cover photo.");
                            } finally {
                              setImageBusy(false);
                            }
                          }}
                        >
                          Remove
                        </Button>
                      )}
                    </Box>
                  </Box>
                </Stack>
              </FormSection>
            )}

            <FormSection
              innerRef={sectionRefSetters.details}
              index={sectionIndex("details")}
              title="Business details"
              subtitle="What it is called, what it does, and when it started."
            >
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
                  gap: 2.25,
                }}
              >
                <TextField
                  label="Business name"
                  value={name}
                  onChange={(e) => edited(setName)(e.target.value)}
                  fullWidth
                  required
                  autoFocus
                  placeholder="Shop or company name"
                  InputProps={{ startAdornment: adornment(<BusinessIcon fontSize="small" />) }}
                  sx={{ gridColumn: { md: "1 / -1" } }}
                />

                <TextField
                  label="Tagline"
                  value={tagline}
                  onChange={(e) => edited(setTagline)(e.target.value)}
                  fullWidth
                  inputProps={{ maxLength: 160 }}
                  placeholder="e.g. Handmade sweets since 1972"
                  helperText="One line under the name on the profile page."
                  InputProps={{
                    startAdornment: adornment(<ShortTextOutlinedIcon fontSize="small" />),
                  }}
                  sx={{ gridColumn: { md: "1 / -1" } }}
                />

                <FormControl fullWidth required>
                  <InputLabel shrink>Category</InputLabel>
                  <Select
                    value={categorySelect}
                    onChange={(e) => edited(setCategorySelect)(e.target.value)}
                    label="Category"
                    displayEmpty
                    startAdornment={adornment(<CategoryOutlinedIcon fontSize="small" />)}
                  >
                    <MenuItem value="" disabled>
                      Select a category
                    </MenuItem>
                    {BUSINESS_CATEGORY_OPTIONS.map((category) => (
                      <MenuItem key={category.id} value={category.id}>
                        {category.displayName}
                      </MenuItem>
                    ))}
                    <MenuItem value={CUSTOM_CATEGORY}>Other (type your own)</MenuItem>
                  </Select>
                </FormControl>

                {categorySelect === CUSTOM_CATEGORY ? (
                  <TextField
                    label="Custom category"
                    value={customCategory}
                    onChange={(e) => edited(setCustomCategory)(e.target.value)}
                    fullWidth
                    placeholder="e.g. Catering, Transport"
                    InputProps={{
                      startAdornment: adornment(<CategoryOutlinedIcon fontSize="small" />),
                    }}
                  />
                ) : (
                  <DateField
                    label="Founded on"
                    value={foundedOn}
                    onChange={edited(setFoundedOn)}
                    disableFuture
                    helperText="Only know the year? Use the 1st of January."
                  />
                )}

                {categorySelect === CUSTOM_CATEGORY && (
                  <DateField
                    label="Founded on"
                    value={foundedOn}
                    onChange={edited(setFoundedOn)}
                    disableFuture
                    helperText="Only know the year? Use the 1st of January."
                  />
                )}

                <Box sx={{ gridColumn: { md: "1 / -1" } }}>
                  <RichTextEditor
                    label="Short description"
                    value={description}
                    onChange={edited(setDescription)}
                    minHeight={120}
                    placeholder="A sentence or two — this is what shows on directory cards."
                  />
                </Box>

                <Box sx={{ gridColumn: { md: "1 / -1" } }}>
                  <RichTextEditor
                    label="The story"
                    value={story}
                    onChange={edited(setStory)}
                    minHeight={220}
                    placeholder="How it started, who runs it now, what it is known for."
                    helperText="Headings, lists and quotes are available in the toolbar."
                  />
                </Box>
              </Box>
            </FormSection>

            <FormSection
              innerRef={sectionRefSetters.contact}
              index={sectionIndex("contact")}
              title="Location & contact"
              subtitle="How a customer reaches the business, and when it is open."
            >
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
                  gap: 2.25,
                }}
              >
                <TextField
                  label="Website"
                  value={website}
                  onChange={(e) => edited(setWebsite)(e.target.value)}
                  fullWidth
                  placeholder="https://example.com"
                  InputProps={{
                    startAdornment: adornment(<LanguageOutlinedIcon fontSize="small" />),
                    endAdornment: website.trim() ? (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          aria-label="Open website in a new tab"
                          href={
                            /^https?:\/\//i.test(website.trim())
                              ? website.trim()
                              : `https://${website.trim()}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <OpenInNewIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ) : null,
                  }}
                  sx={{ gridColumn: { md: "1 / -1" } }}
                />

                <TextField
                  label="Address"
                  value={address}
                  onChange={(e) => edited(setAddress)(e.target.value)}
                  fullWidth
                  placeholder="Shop or office address"
                  InputProps={{ startAdornment: adornment(<PlaceOutlinedIcon fontSize="small" />) }}
                  sx={{ gridColumn: { md: "1 / -1" } }}
                />

                <TextField
                  label="Contact number"
                  value={contact}
                  onChange={(e) => edited(setContact)(e.target.value)}
                  fullWidth
                  placeholder="Phone number"
                  InputProps={{ startAdornment: adornment(<PhoneOutlinedIcon fontSize="small" />) }}
                />

                <TextField
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => edited(setEmail)(e.target.value)}
                  fullWidth
                  placeholder="Email"
                  InputProps={{ startAdornment: adornment(<EmailOutlinedIcon fontSize="small" />) }}
                />

                <TextField
                  label="Opening hours"
                  value={hours}
                  onChange={(e) => edited(setHours)(e.target.value)}
                  fullWidth
                  placeholder="e.g. Mon to Sat, 10am - 8pm"
                  InputProps={{
                    startAdornment: adornment(<ScheduleOutlinedIcon fontSize="small" />),
                  }}
                  sx={{ gridColumn: { md: "1 / -1" } }}
                />
              </Box>
            </FormSection>

            {(enableOwnerSelect || owner) && (
              <FormSection
                innerRef={sectionRefSetters.owner}
                index={sectionIndex("owner")}
                title="Owner & family"
                subtitle="The person this business is listed under. Their family tree is what links it to a lineage."
              >
                {enableOwnerSelect ? (
                  <PersonSearchField
                    label="Owner name"
                    placeholder="Enter owner name and search"
                    searchValue={owner}
                    onSearchValueChange={(value) => edited(setOwner)(value)}
                    onPersonSelect={async (person) => {
                      dirtyRef.current = true;
                      setOwner(person?.name || "");
                      setOwnerId(person?.id || "");
                      if (person?.id && !contact.trim()) {
                        try {
                          const map = await ApiService.getPersonCustomFields(person.id);
                          setContact(phoneFromCustomFields(map) || "");
                        } catch {
                          // ignore failures silently
                        }
                      }
                    }}
                    selectedPerson={ownerId ? { id: ownerId, name: owner } : null}
                    locationId={locationId}
                    writableOnly
                    startIcon={<PersonOutlineIcon fontSize="small" />}
                  />
                ) : (
                  <Stack
                    direction="row"
                    spacing={1.5}
                    alignItems="center"
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: brand.canvas,
                      border: "1px solid",
                      borderColor: brand.border,
                    }}
                  >
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 2,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: brand.primarySoft,
                        color: brand.primary,
                      }}
                    >
                      <PersonOutlineIcon />
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: 12, color: brand.slateMuted, fontWeight: 600 }}>
                        Listed under
                      </Typography>
                      <Typography sx={{ fontWeight: 700, color: brand.ink }}>{owner}</Typography>
                    </Box>
                  </Stack>
                )}
              </FormSection>
            )}
          </Stack>
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          px: { xs: 2, md: 3 },
          py: 2,
          gap: 1.5,
          bgcolor: brand.surface,
          borderTop: "1px solid",
          borderColor: brand.border,
        }}
      >
        {error ? (
          <FormHelperText error sx={{ mr: "auto", fontSize: 13 }}>
            {error}
          </FormHelperText>
        ) : (
          <Typography sx={{ mr: "auto", fontSize: 13, color: brand.slateMuted }}>
            {isEdit
              ? "Changes go live on the business's public page as soon as you save."
              : "You can add the story, photos and hours after it is created."}
          </Typography>
        )}
        <Button onClick={onClose} disabled={saving} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving || loadingRecord || !name.trim() || !resolvedCategory}
          sx={{ fontWeight: 700, minHeight: 44, px: 3 }}
        >
          {saving
            ? "Saving…"
            : loadingRecord
              ? "Loading…"
              : isEdit
                ? "Save changes"
                : "Add business"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
