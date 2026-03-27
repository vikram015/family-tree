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

// Card dimensions (similar to family-chart)
export const CARD_DIM = {
  w: 220,
  h: 78,
  img_w: 56,
  img_h: 56,
  img_x: 10,
  img_y: 11,
  text_x: 76,
  text_y: 26,
  r: 16,
};

// Color definitions for gender-based styling
const COLORS = {
  male: {
    surfaceStart: "#ffffff",
    surfaceEnd: "#f5faff",
    accentStart: "#5bb8ff",
    accentEnd: "#1976d2",
    border: "rgba(25, 118, 210, 0.18)",
    text: "#103b73",
    subtext: "#5b7fa8",
    placeholderBg: "#dff1ff",
    placeholderIcon: "#1976d2",
    pillBg: "#e8f4ff",
    pillText: "#155aa9",
  },
  female: {
    surfaceStart: "#ffffff",
    surfaceEnd: "#fff7fb",
    accentStart: "#ff9fc1",
    accentEnd: "#d94b86",
    border: "rgba(217, 75, 134, 0.18)",
    text: "#7a1f50",
    subtext: "#9a5e7f",
    placeholderBg: "#ffe1ec",
    placeholderIcon: "#c73774",
    pillBg: "#fff0f6",
    pillText: "#b03067",
  },
  person: {
    surfaceStart: "#ffffff",
    surfaceEnd: "#f8fafc",
    accentStart: "#94a3b8",
    accentEnd: "#64748b",
    border: "rgba(100, 116, 139, 0.18)",
    text: "#243447",
    subtext: "#64748b",
    placeholderBg: "#e8edf3",
    placeholderIcon: "#64748b",
    pillBg: "#f1f5f9",
    pillText: "#475569",
  },
  male_deceased: {
    surfaceStart: "#fbfbfc",
    surfaceEnd: "#f1f4f8",
    accentStart: "#93b0cf",
    accentEnd: "#637b96",
    border: "rgba(99, 123, 150, 0.2)",
    text: "#44596f",
    subtext: "#73869b",
    placeholderBg: "#cfd8dc",
    placeholderIcon: "#78909c",
    pillBg: "#edf2f7",
    pillText: "#60758c",
  },
  female_deceased: {
    surfaceStart: "#fcfbfc",
    surfaceEnd: "#f5f2f7",
    accentStart: "#c5a7be",
    accentEnd: "#8f6b8c",
    border: "rgba(143, 107, 140, 0.2)",
    text: "#6d4f69",
    subtext: "#8b7287",
    placeholderBg: "#d7ccd8",
    placeholderIcon: "#8e6b8f",
    pillBg: "#f5eff6",
    pillText: "#83697f",
  },
  person_deceased: {
    surfaceStart: "#fbfbfb",
    surfaceEnd: "#f3f4f6",
    accentStart: "#b6bcc7",
    accentEnd: "#7c8797",
    border: "rgba(124, 135, 151, 0.22)",
    text: "#545c67",
    subtext: "#7a8594",
    placeholderBg: "#bdbdbd",
    placeholderIcon: "#757575",
    pillBg: "#eef1f4",
    pillText: "#667180",
  },
};

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatDisplayDate(value?: string): string {
  if (!value) return "";
  const raw = String(value).trim();
  const datePart = raw.includes("T") ? raw.split("T")[0] : raw;
  const parts = datePart.split("-");
  if (parts.length === 3) {
    const [y, m, d] = parts;
    if (y.length === 4 && m.length >= 1 && d.length >= 1) {
      return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
    }
  }
  return value;
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
 * Truncate text to fit within a given pixel width.
 * Approximate: ~7px per character at 13px font-size, 600 weight.
 */
function truncateText(text: string, maxWidth: number): string {
  const charWidth = 6.5; // Adjusted average width per character
  const maxChars = Math.floor(maxWidth / charWidth);
  if (text.length <= maxChars) return text;
  return text.substring(0, maxChars - 1) + "…";
}

function estimatePillWidth(label: string): number {
  return Math.max(34, Math.ceil(label.length * 6.4) + 16);
}

function renderPill(
  x: number,
  y: number,
  label: string,
  bg: string,
  text: string,
  opacity = 1,
): string {
  const width = estimatePillWidth(label);
  return (
    `<rect x="${x}" y="${y}" width="${width}" height="18" rx="9" fill="${bg}" opacity="${opacity}"/>` +
    `<text x="${x + width / 2}" y="${y + 12}" text-anchor="middle" font-family="'Manrope', 'Segoe UI', Roboto, sans-serif" font-size="9.5" font-weight="700" fill="${text}" opacity="${opacity}">${escapeXml(label)}</text>`
  );
}

function renderStatusAvatarBadge(
  x: number,
  y: number,
  isDeceased: boolean,
): string {
  if (!isDeceased) {
    return "";
  }

  const fill = isDeceased ? "#fff4eb" : "#fff8ef";
  const stroke = isDeceased ? "#f59e0b" : "#fdba74";
  const icon = isDeceased ? "#c2410c" : "#d97706";
  const badgeX = x - 10;
  const badgeY = y - 10;
  return (
    `<g>` +
    `<rect x="${badgeX}" y="${badgeY}" width="20" height="20" rx="7" fill="${fill}" stroke="${stroke}" stroke-width="1.2"/>` +
    `<text x="${x}" y="${y + 0.5}" text-anchor="middle" dominant-baseline="central" font-family="'Noto Sans Devanagari', 'Mangal', serif" font-size="11.5" font-weight="700" fill="${icon}">ॐ</text>` +
    `</g>`
  );
}

function renderReadOnlyBadge(x: number, y: number): string {
  return (
    `<g class="readonly-badge">` +
    `<title>Read-only node</title>` +
    `<path d="M${x - 7.5} ${y} C${x - 4.5} ${y - 5}, ${x + 4.5} ${y - 5}, ${x + 7.5} ${y} C${x + 4.5} ${y + 5}, ${x - 4.5} ${y + 5}, ${x - 7.5} ${y}Z" fill="none" stroke="#d97706" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<circle cx="${x}" cy="${y}" r="2.2" fill="#d97706"/>` +
    `</g>`
  );
}

function renderBirthdayBadge(x: number, y: number): string {
  return (
    `<g class="birthday-badge">` +
    `<title>Birthday today</title>` +
    `<rect x="${x - 11}" y="${y - 11}" width="22" height="22" rx="8" fill="#fff7ed" stroke="#fb923c" stroke-width="1.2"/>` +
    `<text x="${x}" y="${y + 0.5}" text-anchor="middle" dominant-baseline="central" font-family="'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif" font-size="12">🎂</text>` +
    `</g>`
  );
}

/**
 * Male placeholder icon (person silhouette)
 */
function malePlaceholderSvg(
  x: number,
  y: number,
  w: number,
  h: number,
  bgColor: string,
  iconColor: string,
): string {
  const cx = x + w / 2;
  const cy = y + h / 2;
  return (
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${bgColor}"/>` +
    `<g transform="translate(${cx - 10}, ${cy - 12})">` +
    `<circle cx="10" cy="6" r="5" fill="${iconColor}"/>` +
    `<path d="M10 13c-5.5 0-10 2.5-10 5v2h20v-2c0-2.5-4.5-5-10-5z" fill="${iconColor}"/>` +
    `</g>`
  );
}

/**
 * Female placeholder icon (person with dress silhouette)
 */
function femalePlaceholderSvg(
  x: number,
  y: number,
  w: number,
  h: number,
  bgColor: string,
  iconColor: string,
): string {
  const cx = x + w / 2;
  const cy = y + h / 2;
  return (
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${bgColor}"/>` +
    `<g transform="translate(${cx - 10}, ${cy - 12})">` +
    `<circle cx="10" cy="5" r="4.5" fill="${iconColor}"/>` +
    `<path d="M10 11c-3 0-5.5 1-7 2.5L5 22h10l2-8.5c-1.5-1.5-4-2.5-7-2.5z" fill="${iconColor}"/>` +
    `</g>`
  );
}

/**
 * Neutral placeholder icon
 */
function neutralPlaceholderSvg(
  x: number,
  y: number,
  w: number,
  h: number,
  bgColor: string,
  iconColor: string,
): string {
  const cx = x + w / 2;
  const cy = y + h / 2;
  return (
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${bgColor}"/>` +
    `<g transform="translate(${cx - 10}, ${cy - 12})">` +
    `<circle cx="10" cy="6" r="5" fill="${iconColor}"/>` +
    `<path d="M10 13c-5.5 0-10 2.5-10 5v2h20v-2c0-2.5-4.5-5-10-5z" fill="${iconColor}" opacity="0.7"/>` +
    `</g>`
  );
}

/**
 * Renders a node card as pure SVG string.
 * Layout: [Image/Placeholder | Name + Subtitle]
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
): string {
  const gender = extra?.gender || "";
  const isDeceased = extra?.isAlive === false;
  const isReadOnly = extra?.isReadOnly === true;
  const isBirthdayToday = !isDeceased && isMonthDayToday(extra?.dob);
  const genderBase =
    gender === "male" ? "male" : gender === "female" ? "female" : "person";
  const colorKey = isDeceased ? `${genderBase}_deceased` : genderBase;
  const colors = COLORS[colorKey as keyof typeof COLORS];
  const photo = extra?.photo || "";

  const dim = CARD_DIM;
  const gradientId = `grad-${id}`;
  const accentId = `accent-${id}`;
  const avatarBgId = `avatar-${id}`;
  const clipId = `clip-${id}`;
  const imgClipId = `imgclip-${id}`;
  const shadowId = `shadow-${id}`;
  const shineId = `shine-${id}`;

  const hasActionIcons = Boolean(
    canEditNode && extra?.id && !extra?._placeholder && !isMobile,
  );
  // External tree link
  const showExternalLink =
    currentTreeId && extra?.treeId && extra.treeId !== currentTreeId;

  const actionIconsReservedWidth = hasActionIcons ? 50 : 0;
  const externalLinkReservedWidth = showExternalLink ? 24 : 0;
  
  // Name and Subtitle are on upper rows, so they only need to avoid the external link icon (top right)
  const textUpperRightPadding = 12 + externalLinkReservedWidth;
  const textMaxWidth = dim.w - dim.text_x - textUpperRightPadding;
  
  const resolvedName = extra?.nameHindi || name;
  const displayName = truncateText(resolvedName, textMaxWidth);
  const escapedName = escapeXml(displayName);

  let svg = "";

  // === Definitions ===
  svg += `<defs>`;
  svg += `<linearGradient id="${gradientId}" x1="0" y1="0" x2="1" y2="1">`;
  svg += `<stop offset="0%" stop-color="${colors.surfaceStart}"/>`;
  svg += `<stop offset="100%" stop-color="${colors.surfaceEnd}"/>`;
  svg += `</linearGradient>`;
  svg += `<linearGradient id="${accentId}" x1="0" y1="0" x2="1" y2="1">`;
  svg += `<stop offset="0%" stop-color="${colors.accentStart}"/>`;
  svg += `<stop offset="100%" stop-color="${colors.accentEnd}"/>`;
  svg += `</linearGradient>`;
  svg += `<linearGradient id="${avatarBgId}" x1="0" y1="0" x2="1" y2="1">`;
  svg += `<stop offset="0%" stop-color="${colors.placeholderBg}"/>`;
  svg += `<stop offset="100%" stop-color="${colors.surfaceEnd}"/>`;
  svg += `</linearGradient>`;
  svg += `<linearGradient id="${shineId}" x1="0" y1="0" x2="1" y2="1">`;
  svg += `<stop offset="0%" stop-color="#ffffff" stop-opacity="0.72"/>`;
  svg += `<stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>`;
  svg += `</linearGradient>`;
  svg += `<clipPath id="${clipId}">`;
  svg += `<rect x="0" y="0" width="${dim.w}" height="${dim.h}" rx="${dim.r}" ry="${dim.r}"/>`;
  svg += `</clipPath>`;
  svg += `<clipPath id="${imgClipId}">`;
  svg += `<rect x="${dim.img_x}" y="${dim.img_y}" width="${dim.img_w}" height="${dim.img_h}" rx="16"/>`;
  svg += `</clipPath>`;
  svg += `<filter id="${shadowId}" x="-20%" y="-20%" width="150%" height="170%">`;
  svg += `<feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#0f172a" flood-opacity="0.12"/>`;
  svg += `</filter>`;
  svg += `</defs>`;

  const mainHighlight = isMain ? `stroke-width="2.5"` : `stroke-width="1.5"`;
  svg += `<rect class="card-bg" data-person-id="${extra?.id || ""}" x="0" y="0" width="${dim.w}" height="${dim.h}" rx="${dim.r}" ry="${dim.r}" `;
  svg += `fill="url(#${gradientId})" filter="url(#${shadowId})" `;
  svg += `stroke="${colors.border}" ${mainHighlight} cursor="pointer"/>`;
  svg += `<path d="M14 0 H${dim.w * 0.56} C${dim.w * 0.48} 16, ${dim.w * 0.28} 12, 14 34 Z" fill="url(#${shineId})" opacity="0.24"/>`;

  // === Clipped inner content ===
  svg += `<g clip-path="url(#${clipId})">`;

  // --- Image or Placeholder ---
  svg += `<rect x="${dim.img_x}" y="${dim.img_y}" width="${dim.img_w}" height="${dim.img_h}" rx="16" fill="url(#${avatarBgId})"/>`;
  if (photo) {
    svg += `<image href="${escapeXml(photo)}" `;
    svg += `x="${dim.img_x}" y="${dim.img_y}" width="${dim.img_w}" height="${dim.img_h}" `;
    svg += `clip-path="url(#${imgClipId})" preserveAspectRatio="xMidYMid slice"/>`;
  } else {
    if (gender === "male") {
      svg += malePlaceholderSvg(
        dim.img_x,
        dim.img_y,
        dim.img_w,
        dim.img_h,
        colors.placeholderBg,
        colors.placeholderIcon,
      );
    } else if (gender === "female") {
      svg += femalePlaceholderSvg(
        dim.img_x,
        dim.img_y,
        dim.img_w,
        dim.img_h,
        colors.placeholderBg,
        colors.placeholderIcon,
      );
    } else {
      svg += neutralPlaceholderSvg(
        dim.img_x,
        dim.img_y,
        dim.img_w,
        dim.img_h,
        colors.placeholderBg,
        colors.placeholderIcon,
      );
    }
  }

  svg += renderStatusAvatarBadge(dim.img_x + dim.img_w - 2, dim.img_y + 3, isDeceased);

  svg += `<text x="${dim.text_x}" y="${dim.text_y}" `;
  svg += `font-family="'Manrope', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" `;
  svg += `font-size="14" font-weight="700" fill="${colors.text}" `;
  svg += `dominant-baseline="auto" cursor="pointer">`;
  svg += escapedName;
  svg += `</text>`;

  const dobValue = extra?.dob ? formatDisplayDate(extra.dob) : "DOB unavailable";
  const deceasedDateValue =
    isDeceased && extra?.deceasedDate
      ? formatDisplayDate(extra.deceasedDate)
      : null;
  const metaLineRaw = deceasedDateValue
    ? `${dobValue} - ${deceasedDateValue}`
    : dobValue;
  const metaLine = truncateText(metaLineRaw, Math.max(30, textMaxWidth));
  svg += `<text x="${dim.text_x}" y="${dim.text_y + 16}" `;
  svg += `font-family="'Manrope', 'Segoe UI', Roboto, sans-serif" `;
  svg += `font-size="10.5" fill="${colors.subtext}" opacity="0.95" `;
  svg += `dominant-baseline="auto" cursor="pointer">`;
  svg += escapeXml(metaLine);
  svg += `</text>`;

  const childrenCount =
    typeof extra?.childrenCount === "number" ? extra.childrenCount : 0;
  let pillX = dim.text_x;
  const pillY = dim.h - 24;
  const pillRowRightLimit = dim.w - (12 + actionIconsReservedWidth);
  if (childrenCount > 0) {
    const childrenLabel = `${childrenCount} ${childrenCount === 1 ? "child" : "children"}`;
    const childrenWidth = estimatePillWidth(childrenLabel);
    if (pillX + childrenWidth <= pillRowRightLimit) {
      svg += renderPill(pillX, pillY, childrenLabel, colors.pillBg, colors.pillText);
      pillX += childrenWidth + 6;
    }
  }
  if (isHighlighted) {
    const focusLabel = "Focused";
    const focusWidth = estimatePillWidth(focusLabel);
    const focusX = pillX;
    if (focusX + focusWidth <= pillRowRightLimit) {
      svg += renderPill(focusX, pillY, focusLabel, "#fff7e8", "#d97706", 0.98);
    }
  }

  svg += `</g>`; // close clip group

  // === Card outline ===
  svg += `<rect class="card-outline" x="0" y="0" width="${dim.w}" height="${dim.h}" rx="${dim.r}" ry="${dim.r}" `;
  svg += `fill="none" stroke="${colors.border}" ${mainHighlight} pointer-events="none"/>`;

  // === Main node glow ===
  if (isMain) {
    svg += `<rect class="card-main-glow" x="-2" y="-2" width="${dim.w + 4}" height="${dim.h + 4}" rx="${dim.r + 2}" ry="${dim.r + 2}" `;
    svg += `fill="none" stroke="${colors.border}" stroke-width="1" opacity="0.4" pointer-events="none"/>`;
  }

  if (isHighlighted) {
    svg += `<rect class="card-focus-ring" x="-5" y="-5" width="${dim.w + 10}" height="${dim.h + 10}" rx="${dim.r + 5}" ry="${dim.r + 5}" `;
    svg += `fill="none" stroke="#ff9800" stroke-width="3" pointer-events="none"/>`;
  }

  if (isReadOnly && extra?.id && !extra?._placeholder) {
    svg += renderReadOnlyBadge(2, 2);
  }

  if (isBirthdayToday) {
    const birthdayBadgeX = dim.w;
    const birthdayBadgeY = dim.h / 2;
    svg += renderBirthdayBadge(birthdayBadgeX, birthdayBadgeY);
  }

  // === External tree link icon ===
  if (showExternalLink) {
    const linkX = dim.w - 6;
    const linkY = 6;
    const linkR = 10;
    svg += `<g class="external-tree-icon" data-tree-id="${extra.treeId}" data-person-id="${extra.id}" cursor="pointer">`;
    svg += `<circle cx="${linkX}" cy="${linkY}" r="${linkR}" fill="#ffffff" stroke="${colors.accentEnd}" stroke-width="1.5"/>`;
    svg += `<path d="M${linkX - 3.5} ${linkY + 2.5} L${linkX + 2.5} ${linkY - 3.5} M${linkX - 0.5} ${linkY - 3.5} H${linkX + 2.5} V${linkY - 0.5}" stroke="${colors.accentEnd}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
    svg += `</g>`;
  }

  // === Action icons (edit + add) INSIDE the card — desktop only ===
  if (canEditNode && extra?.id && !extra?._placeholder && !isMobile) {
    const iconR = 8;
    const gap = 4;
    // Position: bottom-right inside the card
    const iconY = dim.h - iconR - 8;
    const cx2 = dim.w - iconR - 8;
    const cx1 = cx2 - iconR * 2 - gap; // edit icon (left of add)

    // Edit icon button
    svg += `<g class="node-action-icon node-edit-icon" data-node-id="${extra.id}" cursor="pointer">`;
    svg += `<circle cx="${cx1}" cy="${iconY}" r="${iconR}" fill="#ffffff" stroke="#cbd5e1" stroke-width="1"/>`;
    svg += `<title>Edit</title>`;
    svg += `<g transform="translate(${cx1 - 4}, ${iconY - 4}) scale(0.33)">`;
    svg += `<path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="#757575"/>`;
    svg += `</g>`;
    svg += `</g>`;

    // Add relative icon button
    svg += `<g class="node-action-icon node-add-icon" data-node-id="${extra.id}" cursor="pointer">`;
    svg += `<circle cx="${cx2}" cy="${iconY}" r="${iconR}" fill="#ffffff" stroke="#86efac" stroke-width="1"/>`;
    svg += `<title>Add Relative</title>`;
    svg += `<line x1="${cx2 - 3.5}" y1="${iconY}" x2="${cx2 + 3.5}" y2="${iconY}" stroke="#4caf50" stroke-width="1.8" stroke-linecap="round"/>`;
    svg += `<line x1="${cx2}" y1="${iconY - 3.5}" x2="${cx2}" y2="${iconY + 3.5}" stroke="#4caf50" stroke-width="1.8" stroke-linecap="round"/>`;
    svg += `</g>`;
  }

  return svg;
}

/**
 * Renders a placeholder "Add Relative" card in the tree.
 * These appear as dashed-border cards with a + icon and label like "Add Father".
 * Clicking them triggers the add-relative flow.
 */
export function renderPlaceholderCardSvg(
  name: string,
  extra: any,
  id: string,
  nodeClass: string,
): string {
  const dim = CARD_DIM;
  const relType: string = extra?._placeholderType || "";
  const targetNodeId: string = extra?._targetNodeId || "";

  // Use gender-appropriate colors for the placeholder
  const isMaleType = ["father", "son"].includes(relType);
  const isFemaleType = ["mother", "daughter"].includes(relType);
  const colorKey = isMaleType ? "male" : isFemaleType ? "female" : "person";
  const colors = COLORS[colorKey];

  let svg = "";

  // Dashed border card background
  svg += `<rect class="placeholder-card-bg" x="0" y="0" width="${dim.w}" height="${dim.h}" rx="${dim.r}" ry="${dim.r}" `;
  svg += `fill="#ffffff" stroke="${colors.border}" stroke-width="1.5" stroke-dasharray="6 3" cursor="pointer" opacity="0.92"/>`;

  // Plus icon circle on the left (where image would be)
  const plusCx = dim.img_x + dim.img_w / 2;
  const plusCy = dim.img_y + dim.img_h / 2;
  svg += `<circle cx="${plusCx}" cy="${plusCy}" r="14" fill="${colors.pillBg}" stroke="${colors.border}" stroke-width="1"/>`;
  svg += `<line x1="${plusCx - 6}" y1="${plusCy}" x2="${plusCx + 6}" y2="${plusCy}" stroke="${colors.placeholderIcon}" stroke-width="2" stroke-linecap="round"/>`;
  svg += `<line x1="${plusCx}" y1="${plusCy - 6}" x2="${plusCx}" y2="${plusCy + 6}" stroke="${colors.placeholderIcon}" stroke-width="2" stroke-linecap="round"/>`;

  // Label text
  svg += `<text x="${dim.text_x}" y="${dim.h / 2 + 1}" `;
  svg += `font-family="'Manrope', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" `;
  svg += `font-size="12" font-weight="500" fill="${colors.text}" opacity="0.7" `;
  svg += `dominant-baseline="central" cursor="pointer">`;
  svg += escapeXml(name);
  svg += `</text>`;

  // Invisible hit area with data attributes for click handling
  svg += `<rect class="placeholder-click-target" data-rel-type="${relType}" data-target-node-id="${targetNodeId}" `;
  svg += `x="0" y="0" width="${dim.w}" height="${dim.h}" fill="transparent" cursor="pointer"/>`;

  return svg;
}

/**
 * Renders a marriage node as pure SVG string.
 */
export function renderMarriageNodeSvg(
  size: number,
  id: string,
  nodeClass: string,
): string {
  const r = size / 2;
  return `<circle cx="${r}" cy="${r}" r="${r}" fill="black" class="${nodeClass}" id="node${id}"/>`;
}
