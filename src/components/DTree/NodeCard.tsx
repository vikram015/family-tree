/**
 * NodeCard - Pure SVG renderer for tree nodes.
 * Returns an SVG string (not React JSX) to be inserted into <g> elements.
 * This avoids foreignObject which has severe rendering bugs on Safari/iOS.
 *
 * Layout: [Image/Placeholder | Name Text]
 * - Image area on the left with person photo or gender placeholder
 * - Name text on the right
 * - Similar to family-chart card_dim layout
 */
import "./NodeCard.css";
/**
 * Card geometry.
 *
 * Two sizes, not one card with pieces hidden on mobile — the old layout kept
 * desktop's dimensions everywhere and simply dropped the action icons on
 * phones, leaving a permanently empty corner. The mobile card is taller and
 * wider so the space goes to the name (which wraps to two lines) instead of
 * to chrome the user can't tap anyway.
 */
type CardDim = {
  w: number;
  h: number;
  r: number;
  pad: number;
  avatar: number;
  gap: number;
  nameSize: number;
  metaSize: number;
  lineH: number;
  /** Legacy aliases — TreeViewer and the layout engine read w/h only. */
  img_w: number;
  img_h: number;
  img_x: number;
  img_y: number;
  text_x: number;
  text_y: number;
};

function buildDim(base: {
  w: number;
  h: number;
  r: number;
  pad: number;
  avatar: number;
  gap: number;
  nameSize: number;
  metaSize: number;
  lineH: number;
}): CardDim {
  const img_x = base.pad + 2;
  const img_y = Math.round((base.h - base.avatar) / 2);
  return {
    ...base,
    img_w: base.avatar,
    img_h: base.avatar,
    img_x,
    img_y,
    text_x: img_x + base.avatar + base.gap,
    text_y: Math.round(base.h / 2),
  };
}

const DIM_DESKTOP = buildDim({
  w: 236,
  h: 84,
  r: 14,
  pad: 12,
  avatar: 44,
  gap: 10,
  nameSize: 15,
  metaSize: 12,
  lineH: 18,
});

const DIM_MOBILE = buildDim({
  w: 220,
  h: 88,
  r: 16,
  pad: 12,
  avatar: 48,
  gap: 10,
  nameSize: 15.5,
  metaSize: 12,
  lineH: 18,
});

/** Desktop dimensions — the default the layout engine sizes nodes with. */
export const CARD_DIM = DIM_DESKTOP;

export function getCardDim(isMobile?: boolean): CardDim {
  return isMobile ? DIM_MOBILE : DIM_DESKTOP;
}

/**
 * One neutral surface for everyone.
 *
 * The card used to carry six full palettes (male/female/unknown, each with a
 * deceased variant), which turned a zoomed-out tree into a patchwork of blue
 * and pink boxes and fought the app's blue/slate system. Gender is one bit of
 * data, so it gets one 4px edge bar; everything else is shared.
 */
const SURFACE = {
  bg: "#ffffff",
  bgDeceased: "#fbfcfd",
  border: "#e2e8f0",
  borderStrong: "#cbd5e1",
  selected: "#0d6efd",
  focus: "#f59e0b",
  ink: "#0f172a",
  inkMuted: "#64748b",
  meta: "#475569",
  metaDeceased: "#8494a8",
};

/** Gender marker. Present and readable, but never the card's identity. */
const EDGE_BAR: Record<string, string> = {
  male: "#2563eb",
  female: "#db2777",
  person: "#94a3b8",
  deceased: "#94a3b8",
};

const AVATAR_TINTS = [
  { bg: "#e0f2fe", fg: "#0369a1" },
  { bg: "#dcfce7", fg: "#15803d" },
  { bg: "#fef3c7", fg: "#b45309" },
  { bg: "#ede9fe", fg: "#6d28d9" },
  { bg: "#ffe4e6", fg: "#be123c" },
];

/** Same seeded tint the homepage avatars use, so one person looks consistent
 *  wherever they appear. */
function avatarTintFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_TINTS[hash % AVATAR_TINTS.length];
}
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const DEVANAGARI_REGEX = /[\u0900-\u097F]/;
const DEVANAGARI_FONT_STACK =
  "'Noto Sans Devanagari', 'Kohinoor Devanagari', 'Devanagari Sangam MN', 'Nirmala UI', 'Mangal', sans-serif";
const DEFAULT_FONT_STACK =
  "'Manrope', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

function normalizeDisplayText(text: string): string {
  return text.normalize("NFC");
}

function hasDevanagari(text: string): boolean {
  return DEVANAGARI_REGEX.test(text);
}

function encodeSvgTextContent(text: string): string {
  let encoded = "";
  for (const char of text) {
    switch (char) {
      case "&":
        encoded += "&amp;";
        break;
      case "<":
        encoded += "&lt;";
        break;
      case ">":
        encoded += "&gt;";
        break;
      case '"':
        encoded += "&quot;";
        break;
      case "'":
        encoded += "&apos;";
        break;
      default: {
        const codePoint = char.codePointAt(0);
        if (codePoint == null) continue;
        encoded += codePoint > 127 ? `&#x${codePoint.toString(16)};` : char;
      }
    }
  }
  return encoded;
}

function isMonthDayToday(value?: string): boolean {
  if (!value) return false;

  const raw = String(value).trim();
  const datePart = raw.includes("T") ? raw.split("T")[0] : raw;
  const exactMatch = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  let month: number | undefined;
  let day: number | undefined;

  if (exactMatch) {
    month = Number(exactMatch[2]);
    day = Number(exactMatch[3]);
  } else {
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return false;
    month = parsed.getMonth() + 1;
    day = parsed.getDate();
  }

  const today = new Date();
  return month === today.getMonth() + 1 && day === today.getDate();
}

/**
 * Derive up to two initials from a display name (first + last word).
 */
function getNodeInitials(name: string): string {
  const normalized = normalizeDisplayText((name || "").trim());
  if (!normalized) return "?";
  const parts = normalized.split(/\s+/).filter(Boolean);
  const firstGrapheme = (str: string): string => {
    if (!str) return "";
    if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
      for (const seg of new Intl.Segmenter(undefined, {
        granularity: "grapheme",
      }).segment(str)) {
        return seg.segment;
      }
      return "";
    }
    return Array.from(str)[0] || "";
  };
  const first = firstGrapheme(parts[0]);
  const last = parts.length > 1 ? firstGrapheme(parts[parts.length - 1]) : "";
  return (first + last) || "?";
}


/**
 * Real text measurement, cached.
 *
 * Truncation used to assume ~6.5px per character, which clips Devanagari and
 * wide Latin names inconsistently — "MMM" and "iii" are not the same width.
 * A detached canvas measures what the browser will actually draw.
 */
let measureCtx: CanvasRenderingContext2D | null | undefined;
const measureCache = new Map<string, number>();
const MEASURE_CACHE_LIMIT = 4000;

function measureText(
  text: string,
  fontSize: number,
  fontWeight: number,
  fontFamily: string,
): number {
  if (!text) return 0;
  const key = `${fontWeight}|${fontSize}|${fontFamily}|${text}`;
  const cached = measureCache.get(key);
  if (cached !== undefined) return cached;

  if (measureCtx === undefined) {
    try {
      measureCtx = document.createElement("canvas").getContext("2d");
    } catch {
      measureCtx = null; // Non-browser context (SSR, tests) — fall back below.
    }
  }

  let width: number;
  if (measureCtx) {
    measureCtx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    width = measureCtx.measureText(text).width;
  } else {
    width = text.length * fontSize * 0.55;
  }

  // Bound the cache: a large tree with many distinct names would otherwise
  // grow it without limit across re-renders.
  if (measureCache.size > MEASURE_CACHE_LIMIT) measureCache.clear();
  measureCache.set(key, width);
  return width;
}

function toGraphemes(text: string): string[] {
  if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
    return Array.from(
      new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text),
      (segment) => segment.segment,
    );
  }
  return Array.from(text);
}

/** Trim to fit, appending an ellipsis only when something was actually cut. */
function ellipsize(
  text: string,
  maxWidth: number,
  fontSize: number,
  fontWeight: number,
  fontFamily: string,
): string {
  if (measureText(text, fontSize, fontWeight, fontFamily) <= maxWidth) {
    return text;
  }
  const graphemes = toGraphemes(text);
  let lo = 0;
  let hi = graphemes.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const candidate = graphemes.slice(0, mid).join("") + "…";
    if (measureText(candidate, fontSize, fontWeight, fontFamily) <= maxWidth) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return lo > 0 ? graphemes.slice(0, lo).join("") + "…" : "…";
}

/**
 * Wrap a name across at most `maxLines`, breaking on spaces.
 *
 * Two lines is the single biggest win for narrow screens: "Ramesh Kumar
 * Sharma" reads in full instead of collapsing to "Ramesh Ku…".
 */
function wrapText(
  text: string,
  maxWidth: number,
  maxLines: number,
  fontSize: number,
  fontWeight: number,
  fontFamily: string,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (measureText(candidate, fontSize, fontWeight, fontFamily) <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    if (lines.length === maxLines) {
      // No room left — fold the remainder back onto the last line and clip it.
      const rest = [current, ...words.slice(words.indexOf(word))].join(" ");
      lines[maxLines - 1] = ellipsize(
        rest.trim(),
        maxWidth,
        fontSize,
        fontWeight,
        fontFamily,
      );
      return lines;
    }
    current = word;
  }

  if (current) lines.push(current);

  if (lines.length > maxLines) {
    const overflow = lines.slice(maxLines - 1).join(" ");
    lines.length = maxLines - 1;
    lines.push(ellipsize(overflow, maxWidth, fontSize, fontWeight, fontFamily));
  } else if (lines.length > 0) {
    const last = lines.length - 1;
    lines[last] = ellipsize(
      lines[last],
      maxWidth,
      fontSize,
      fontWeight,
      fontFamily,
    );
  }

  return lines;
}

/** Year-only date, for the compact meta line ("1948", not "12/04/1948"). */
function yearOf(value?: string): string {
  if (!value) return "";
  const match = String(value).trim().match(/(\d{4})/);
  return match ? match[1] : "";
}

/** Circular avatar with initials, used when the person has no photo. */
function initialsAvatarSvg(
  cx: number,
  cy: number,
  radius: number,
  bgColor: string,
  textColor: string,
  initials: string,
): string {
  const isDevanagari = hasDevanagari(initials);
  const display = isDevanagari ? initials : initials.toUpperCase();
  const fontSize = Math.round(radius * 0.82);
  let out = `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${bgColor}"/>`;
  // SVG text for both scripts — see the name rendering note in
  // renderNodeCardSvg for why foreignObject is no longer used here.
  const family = isDevanagari ? DEVANAGARI_FONT_STACK : DEFAULT_FONT_STACK;
  const langAttrs = isDevanagari ? ` lang="hi" xml:lang="hi"` : "";
  const content = isDevanagari
    ? escapeXml(display)
    : encodeSvgTextContent(display);
  out += `<text x="${cx}" y="${cy}"${langAttrs} text-anchor="middle" dominant-baseline="central" font-family="${family}" font-size="${fontSize}" font-weight="700" fill="${textColor}">${content}</text>`;
  return out;
}

/**
 * One status marker, pinned to the avatar's corner.
 *
 * The card previously stacked a deceased badge, a read-only badge and a
 * birthday badge in different places, all potentially at once. Only the most
 * newsworthy one shows, and it sits in a single predictable spot.
 */
function statusBadgeSvg(
  cx: number,
  cy: number,
  kind: "birthday" | "deceased" | "readonly",
): string {
  const r = 9;
  if (kind === "birthday") {
    return (
      `<g class="birthday-badge"><title>Birthday today</title>` +
      `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff7ed" stroke="#fb923c" stroke-width="1.2"/>` +
      `<text x="${cx}" y="${cy + 0.5}" text-anchor="middle" dominant-baseline="central" font-family="'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif" font-size="10">🎂</text>` +
      `</g>`
    );
  }
  if (kind === "deceased") {
    return (
      `<g><title>Deceased</title>` +
      `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.2"/>` +
      `<text x="${cx}" y="${cy + 0.5}" text-anchor="middle" dominant-baseline="central" font-family="'Noto Sans Devanagari', 'Mangal', serif" font-size="10" font-weight="700" fill="#64748b">ॐ</text>` +
      `</g>`
    );
  }
  return (
    `<g class="readonly-badge"><title>Read-only node</title>` +
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fffbeb" stroke="#fcd34d" stroke-width="1.2"/>` +
    `<path d="M${cx - 4.5} ${cy} C${cx - 2.7} ${cy - 3}, ${cx + 2.7} ${cy - 3}, ${cx + 4.5} ${cy} C${cx + 2.7} ${cy + 3}, ${cx - 2.7} ${cy + 3}, ${cx - 4.5} ${cy}Z" fill="none" stroke="#b45309" stroke-width="1.2"/>` +
    `<circle cx="${cx}" cy="${cy}" r="1.4" fill="#b45309"/>` +
    `</g>`
  );
}

/**
 * Renders a node card as pure SVG string.
 * Layout: [gender edge bar | circular avatar | name (up to 2 lines) + meta]
 */
export function renderNodeCardSvg(
  name: string,
  extra: any,
  id: string,
  nodeClass: string,
  currentTreeId?: string,
  isMain?: boolean,
  isHighlighted?: boolean,
  isMobile?: boolean,
  canEditNode: boolean = true,
  isNameClickable: boolean = true,
): string {
  // On mobile the name is not separately clickable (tapping the card opens
  // details), which also frees the whole width for the name itself.
  isNameClickable = isNameClickable && !isMobile;

  const dim = getCardDim(isMobile);
  const gender = extra?.gender || "";
  const isDeceased = extra?.isAlive === false;
  const isReadOnly = extra?.isReadOnly === true;
  const isBirthdayToday = !isDeceased && isMonthDayToday(extra?.dob);
  const photo = extra?.photo || "";

  const genderKey =
    gender === "male" ? "male" : gender === "female" ? "female" : "person";
  const barColor = isDeceased ? EDGE_BAR.deceased : EDGE_BAR[genderKey];
  const surfaceFill = isDeceased ? SURFACE.bgDeceased : SURFACE.bg;
  const nameColor = isDeceased ? SURFACE.inkMuted : SURFACE.ink;
  const metaColor = isDeceased ? SURFACE.metaDeceased : SURFACE.meta;

  const clipId = `clip-${id}`;
  const imgClipId = `imgclip-${id}`;
  const shadowId = `shadow-${id}`;

  const showExternalLink = Boolean(
    currentTreeId && extra?.treeId && extra.treeId !== currentTreeId,
  );
  const hasActionIcons = Boolean(
    canEditNode && extra?.id && !extra?._placeholder && !isMobile,
  );

  // Name occupies the full text column; only the external-link chip (top right)
  // intrudes on it. On mobile there are no action icons at all, so the meta
  // line gets the full width too rather than reserving space for nothing.
  const textX = dim.text_x;
  const nameRight = dim.w - dim.pad - (showExternalLink ? 20 : 0);
  const nameMaxWidth = Math.max(40, nameRight - textX);
  const metaRight = dim.w - dim.pad - (hasActionIcons ? 46 : 0);
  const metaMaxWidth = Math.max(40, metaRight - textX);

  const resolvedName =
    extra?.preferredName ||
    name ||
    extra?.nameEnglish ||
    extra?.nameHindi ||
    "";
  const normalizedName = normalizeDisplayText(resolvedName);
  const isDevanagariName = hasDevanagari(normalizedName);
  const nameFontFamily = isDevanagariName
    ? DEVANAGARI_FONT_STACK
    : DEFAULT_FONT_STACK;

  const nameLines = wrapText(
    normalizedName,
    nameMaxWidth,
    2,
    dim.nameSize,
    700,
    nameFontFamily,
  );
  const lineCount = Math.max(1, nameLines.length);

  const lineH = dim.lineH;

  // Meta: real facts only. The old card printed "DOB unavailable" on every
  // dateless person, repeating the same apology across the whole tree.
  const birthYear = yearOf(extra?.dob);
  const deathYear = isDeceased ? yearOf(extra?.deceasedDate) : "";
  const childrenCount =
    typeof extra?.childrenCount === "number" ? extra.childrenCount : 0;
  const metaParts: string[] = [];
  if (birthYear && deathYear) metaParts.push(`${birthYear}–${deathYear}`);
  else if (birthYear) metaParts.push(birthYear);
  else if (deathYear) metaParts.push(`d. ${deathYear}`);
  if (childrenCount > 0) {
    metaParts.push(`${childrenCount} ${childrenCount === 1 ? "child" : "children"}`);
  }
  // Prefer dropping the least important part over clipping a word in half —
  // "1921–1998 · 5 child…" reads worse than "1921–1998".
  let metaLine = "";
  for (let take = metaParts.length; take > 0; take -= 1) {
    const candidate = metaParts.slice(0, take).join(" · ");
    if (
      measureText(candidate, dim.metaSize, 600, DEFAULT_FONT_STACK) <=
      metaMaxWidth
    ) {
      metaLine = candidate;
      break;
    }
    if (take === 1) {
      metaLine = ellipsize(
        candidate,
        metaMaxWidth,
        dim.metaSize,
        600,
        DEFAULT_FONT_STACK,
      );
    }
  }

  // Centre the text block against the avatar so one- and two-line names both
  // sit optically balanced.
  const META_GAP = 15; // last name baseline -> meta baseline
  const blockHeight = lineCount * lineH + (metaLine ? META_GAP : 0);
  const blockTop = Math.round((dim.h - blockHeight) / 2);
  const firstBaseline = blockTop + Math.round(dim.nameSize * 0.9);
  const metaBaseline = firstBaseline + (lineCount - 1) * lineH + META_GAP;

  const avatarR = dim.avatar / 2;
  const avatarCx = dim.img_x + avatarR;
  const avatarCy = dim.img_y + avatarR;

  let svg = "";

  svg += `<defs>`;
  svg += `<clipPath id="${clipId}">`;
  svg += `<rect x="0" y="0" width="${dim.w}" height="${dim.h}" rx="${dim.r}" ry="${dim.r}"/>`;
  svg += `</clipPath>`;
  svg += `<clipPath id="${imgClipId}">`;
  svg += `<circle cx="${avatarCx}" cy="${avatarCy}" r="${avatarR}"/>`;
  svg += `</clipPath>`;
  // A whisper of a shadow. The old dy=8/blur=8 turned to mud once fifty cards
  // were on screen at tree zoom levels.
  svg += `<filter id="${shadowId}" x="-10%" y="-10%" width="130%" height="140%">`;
  svg += `<feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="#0f172a" flood-opacity="0.10"/>`;
  svg += `</filter>`;
  svg += `</defs>`;

  // === Surface ===
  // One state at a time: selected reads as a blue border, focused adds an outer
  // ring. No stacked glow + ring + double outline.
  const borderColor = isMain ? SURFACE.selected : SURFACE.border;
  const borderWidth = isMain ? 2 : 1;
  svg += `<rect class="card-bg" data-person-id="${extra?.id || ""}" x="0" y="0" width="${dim.w}" height="${dim.h}" rx="${dim.r}" ry="${dim.r}" `;
  svg += `fill="${surfaceFill}" filter="url(#${shadowId})" stroke="${borderColor}" stroke-width="${borderWidth}" cursor="pointer"/>`;

  svg += `<g clip-path="url(#${clipId})">`;
  // Gender edge bar — 4px of chrome instead of a whole palette.
  svg += `<rect x="0" y="0" width="4" height="${dim.h}" fill="${barColor}"/>`;

  // --- Avatar ---
  if (photo) {
    svg += `<circle cx="${avatarCx}" cy="${avatarCy}" r="${avatarR}" fill="#f1f5f9"/>`;
    svg += `<image href="${escapeXml(photo)}" x="${dim.img_x}" y="${dim.img_y}" width="${dim.avatar}" height="${dim.avatar}" `;
    svg += `clip-path="url(#${imgClipId})" preserveAspectRatio="xMidYMid slice"/>`;
  } else {
    const initialsSource =
      [extra?.nameEnglish, name, extra?.preferredName, normalizedName]
        .map((s: any) => (s ? String(s).trim() : ""))
        .find((s: string) => s && !hasDevanagari(s)) || normalizedName;
    const tint = avatarTintFor(extra?.id || normalizedName || id);
    svg += initialsAvatarSvg(
      avatarCx,
      avatarCy,
      avatarR,
      tint.bg,
      tint.fg,
      getNodeInitials(initialsSource),
    );
  }

  // --- Name ---
  svg += `<g class="node-name-group">`;
  // One rendering path for every script.
  //
  // Devanagari used to go through a foreignObject because older WebKit did not
  // shape Indic text in SVG <text>. That cost us two visible defects: the
  // browser rasterizes foreignObject content, so names blurred under the tree's
  // zoom transform, and its box-model baseline never matched the SVG baseline
  // Latin names sit on, leaving Hindi cards with a wider name-to-meta gap.
  // Drawing both as <text> keeps the glyphs vector-sharp at any zoom and makes
  // the vertical rhythm identical by construction. Devanagari lines carry the
  // lang attributes that NodeCard.css already hangs its shaping rules on, and
  // must use raw Unicode (escapeXml) — numeric character references break
  // matra positioning and conjunct formation.
  nameLines.forEach((line, index) => {
    const isLast = index === nameLines.length - 1;
    svg += `<text class="${isNameClickable ? "node-name-click-target" : ""}" data-node-id="${extra?.id || ""}" `;
    if (isDevanagariName) svg += `lang="hi" xml:lang="hi" `;
    svg += `x="${textX}" y="${firstBaseline + index * lineH}" `;
    svg += `font-family="${nameFontFamily}" font-size="${dim.nameSize}" font-weight="700" fill="${nameColor}" `;
    svg += `cursor="${isNameClickable ? "pointer" : "default"}">`;
    svg += isDevanagariName
      ? escapeXml(line)
      : encodeSvgTextContent(line);
    if (isNameClickable && isLast) {
      svg += `<tspan class="node-name-hover-icon" dx="3" opacity="0">↗</tspan>`;
    }
    svg += `</text>`;
  });
  svg += `</g>`;

  // --- Meta ---
  if (metaLine) {
    svg += `<text x="${textX}" y="${metaBaseline}" font-family="${DEFAULT_FONT_STACK}" `;
    svg += `font-size="${dim.metaSize}" font-weight="600" fill="${metaColor}" cursor="pointer">`;
    svg += escapeXml(metaLine);
    svg += `</text>`;
  }

  svg += `</g>`; // close clip group

  // --- Single status marker on the avatar's corner ---
  const badgeKind = isBirthdayToday
    ? "birthday"
    : isDeceased
      ? "deceased"
      : isReadOnly && extra?.id && !extra?._placeholder
        ? "readonly"
        : null;
  if (badgeKind) {
    const offset = avatarR * 0.72;
    svg += statusBadgeSvg(avatarCx + offset, avatarCy + offset, badgeKind);
  }

  // --- Focus ring (navigated-to person) ---
  if (isHighlighted) {
    svg += `<rect class="card-focus-ring" x="-3" y="-3" width="${dim.w + 6}" height="${dim.h + 6}" rx="${dim.r + 3}" ry="${dim.r + 3}" `;
    svg += `fill="none" stroke="${SURFACE.focus}" stroke-width="2" pointer-events="none"/>`;
  }

  // --- External tree link ---
  if (showExternalLink) {
    const linkX = dim.w - 14;
    const linkY = 14;
    svg += `<g class="external-tree-icon" data-tree-id="${extra.treeId}" data-person-id="${extra.id}" cursor="pointer">`;
    svg += `<circle cx="${linkX}" cy="${linkY}" r="9" fill="#ffffff" stroke="${SURFACE.borderStrong}" stroke-width="1.2"/>`;
    svg += `<path d="M${linkX - 3.2} ${linkY + 2.2} L${linkX + 2.2} ${linkY - 3.2} M${linkX - 0.6} ${linkY - 3.2} H${linkX + 2.2} V${linkY - 0.4}" stroke="${SURFACE.inkMuted}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
    svg += `</g>`;
  }

  // --- Action icons, desktop only (mobile opens the sheet on tap) ---
  if (hasActionIcons) {
    const iconR = 9;
    const gap = 5;
    const iconY = dim.h - iconR - 8;
    const cx2 = dim.w - iconR - 8;
    const cx1 = cx2 - iconR * 2 - gap;

    svg += `<g class="node-action-icon node-edit-icon" data-node-id="${extra.id}" cursor="pointer">`;
    svg += `<circle cx="${cx1}" cy="${iconY}" r="${iconR}" fill="#ffffff" stroke="${SURFACE.borderStrong}" stroke-width="1"/>`;
    svg += `<title>Edit</title>`;
    svg += `<g transform="translate(${cx1 - 4.5}, ${iconY - 4.5}) scale(0.375)">`;
    svg += `<path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="${SURFACE.inkMuted}"/>`;
    svg += `</g>`;
    svg += `</g>`;

    svg += `<g class="node-action-icon node-add-icon" data-node-id="${extra.id}" cursor="pointer">`;
    svg += `<circle cx="${cx2}" cy="${iconY}" r="${iconR}" fill="#ffffff" stroke="#86efac" stroke-width="1"/>`;
    svg += `<title>Add Relative</title>`;
    svg += `<line x1="${cx2 - 4}" y1="${iconY}" x2="${cx2 + 4}" y2="${iconY}" stroke="#16a34a" stroke-width="1.8" stroke-linecap="round"/>`;
    svg += `<line x1="${cx2}" y1="${iconY - 4}" x2="${cx2}" y2="${iconY + 4}" stroke="#16a34a" stroke-width="1.8" stroke-linecap="round"/>`;
    svg += `</g>`;
  }

  return svg;
}

/**
 * Renders a placeholder "Add Relative" card — dashed, deliberately quieter than
 * a real person so it reads as an invitation rather than a member of the family.
 */
export function renderPlaceholderCardSvg(
  name: string,
  extra: any,
  id: string,
  nodeClass: string,
  isMobile?: boolean,
): string {
  const dim = getCardDim(isMobile);
  const relType: string = extra?._placeholderType || "";
  const targetNodeId: string = extra?._targetNodeId || "";

  const isMaleType = ["father", "son"].includes(relType);
  const isFemaleType = ["mother", "daughter"].includes(relType);
  const barColor = isMaleType
    ? EDGE_BAR.male
    : isFemaleType
      ? EDGE_BAR.female
      : EDGE_BAR.person;

  const avatarR = dim.avatar / 2;
  const avatarCx = dim.img_x + avatarR;
  const avatarCy = dim.img_y + avatarR;

  let svg = "";
  svg += `<rect class="placeholder-card-bg" x="0.75" y="0.75" width="${dim.w - 1.5}" height="${dim.h - 1.5}" rx="${dim.r}" ry="${dim.r}" `;
  svg += `fill="#ffffff" stroke="${SURFACE.borderStrong}" stroke-width="1.5" stroke-dasharray="5 4" cursor="pointer"/>`;

  svg += `<circle cx="${avatarCx}" cy="${avatarCy}" r="${avatarR}" fill="#f8fafc" stroke="${SURFACE.border}" stroke-width="1"/>`;
  svg += `<line x1="${avatarCx - 7}" y1="${avatarCy}" x2="${avatarCx + 7}" y2="${avatarCy}" stroke="${barColor}" stroke-width="2" stroke-linecap="round"/>`;
  svg += `<line x1="${avatarCx}" y1="${avatarCy - 7}" x2="${avatarCx}" y2="${avatarCy + 7}" stroke="${barColor}" stroke-width="2" stroke-linecap="round"/>`;

  const label = ellipsize(
    name || "Add relative",
    dim.w - dim.text_x - dim.pad,
    dim.nameSize - 1,
    600,
    DEFAULT_FONT_STACK,
  );
  svg += `<text x="${dim.text_x}" y="${dim.h / 2 + 1}" font-family="${DEFAULT_FONT_STACK}" `;
  svg += `font-size="${dim.nameSize - 1}" font-weight="600" fill="${SURFACE.inkMuted}" `;
  svg += `dominant-baseline="central" cursor="pointer">`;
  svg += escapeXml(label);
  svg += `</text>`;

  svg += `<rect class="placeholder-click-target" data-rel-type="${relType}" data-target-node-id="${targetNodeId}" `;
  svg += `x="0" y="0" width="${dim.w}" height="${dim.h}" fill="transparent" cursor="pointer"/>`;

  return svg;
}

/**
 * Renders a marriage node — the small joint where two partners meet.
 * Muted to match the connector lines instead of a hard black dot.
 */
export function renderMarriageNodeSvg(
  size: number,
  id: string,
  nodeClass: string,
): string {
  const r = size / 2;
  return (
    `<circle cx="${r}" cy="${r}" r="${r}" fill="${SURFACE.borderStrong}" ` +
    `class="${nodeClass}" id="node${id}"/>`
  );
}
