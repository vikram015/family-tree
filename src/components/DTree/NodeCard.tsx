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
  w: 200, // total card width
  h: 64, // total card height
  img_w: 64, // image width (full card height)
  img_h: 64, // image height (full card height)
  img_x: 0, // image x offset from card left
  img_y: 0, // image y offset from card top
  text_x: 72, // text x start (after image + gap)
  text_y: 23, // text y position (baseline from card top)
  r: 8, // border radius
};

// Color definitions for gender-based styling
const COLORS = {
  male: {
    bgGradientStart: "#e3f2fd",
    bgGradientEnd: "#bbdefb",
    border: "rgba(25, 118, 210, 0.35)",
    text: "#0d47a1",
    placeholderBg: "#bbdefb",
    placeholderIcon: "#1565c0",
  },
  female: {
    bgGradientStart: "#fce4ec",
    bgGradientEnd: "#f8bbd0",
    border: "rgba(194, 24, 91, 0.35)",
    text: "#880e4f",
    placeholderBg: "#f8bbd0",
    placeholderIcon: "#ad1457",
  },
  person: {
    bgGradientStart: "#f5f5f5",
    bgGradientEnd: "#e0e0e0",
    border: "rgba(97, 97, 97, 0.35)",
    text: "#424242",
    placeholderBg: "#e0e0e0",
    placeholderIcon: "#616161",
  },
  // Deceased variants — muted/greyed-out tones
  male_deceased: {
    bgGradientStart: "#e0e0e0",
    bgGradientEnd: "#bdbdbd",
    border: "rgba(117, 117, 117, 0.45)",
    text: "#546e7a",
    placeholderBg: "#cfd8dc",
    placeholderIcon: "#78909c",
  },
  female_deceased: {
    bgGradientStart: "#e0e0e0",
    bgGradientEnd: "#bdbdbd",
    border: "rgba(117, 117, 117, 0.45)",
    text: "#6d4c6e",
    placeholderBg: "#d7ccd8",
    placeholderIcon: "#8e6b8f",
  },
  person_deceased: {
    bgGradientStart: "#e0e0e0",
    bgGradientEnd: "#bdbdbd",
    border: "rgba(117, 117, 117, 0.45)",
    text: "#616161",
    placeholderBg: "#bdbdbd",
    placeholderIcon: "#757575",
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

/**
 * Truncate text to fit within a given pixel width.
 * Approximate: ~7px per character at 13px font-size, 600 weight.
 */
function truncateText(text: string, maxWidth: number): string {
  const charWidth = 7;
  const maxChars = Math.floor(maxWidth / charWidth);
  if (text.length <= maxChars) return text;
  return text.substring(0, maxChars - 1) + "…";
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
  canEditTree: boolean = true,
): string {
  const gender = extra?.gender || "";
  const isDeceased = extra?.isAlive === false;
  const genderBase =
    gender === "male" ? "male" : gender === "female" ? "female" : "person";
  const colorKey = isDeceased ? `${genderBase}_deceased` : genderBase;
  const colors = COLORS[colorKey as keyof typeof COLORS];
  const photo = extra?.photo || "";

  const dim = CARD_DIM;
  const gradientId = `grad-${id}`;
  const clipId = `clip-${id}`;
  const imgClipId = `imgclip-${id}`;
  const shadowId = `shadow-${id}`;

  // Text
  const textMaxWidth = dim.w - dim.text_x - 10;
  const displayName = truncateText(name, textMaxWidth);
  const escapedName = escapeXml(displayName);

  // External tree link
  const showExternalLink =
    currentTreeId && extra?.treeId && extra.treeId !== currentTreeId;

  let svg = "";

  // === Definitions ===
  svg += `<defs>`;
  svg += `<linearGradient id="${gradientId}" x1="0" y1="0" x2="1" y2="1">`;
  svg += `<stop offset="0%" stop-color="${colors.bgGradientStart}"/>`;
  svg += `<stop offset="100%" stop-color="${colors.bgGradientEnd}"/>`;
  svg += `</linearGradient>`;
  svg += `<clipPath id="${clipId}">`;
  svg += `<rect x="0" y="0" width="${dim.w}" height="${dim.h}" rx="${dim.r}" ry="${dim.r}"/>`;
  svg += `</clipPath>`;
  svg += `<clipPath id="${imgClipId}">`;
  svg += `<rect x="${dim.img_x}" y="${dim.img_y}" width="${dim.img_w}" height="${dim.img_h}" rx="4"/>`;
  svg += `</clipPath>`;
  svg += `<filter id="${shadowId}" x="-15%" y="-15%" width="140%" height="150%">`;
  svg += `<feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(2,6,23,0.08)" flood-opacity="1"/>`;
  svg += `</filter>`;
  svg += `</defs>`;

  // === Card background ===
  const mainHighlight = isMain ? `stroke-width="2.5"` : `stroke-width="1.5"`;
  svg += `<rect class="card-bg" data-person-id="${extra?.id || ""}" x="0" y="0" width="${dim.w}" height="${dim.h}" rx="${dim.r}" ry="${dim.r}" `;
  svg += `fill="url(#${gradientId})" filter="url(#${shadowId})" `;
  svg += `stroke="${colors.border}" ${mainHighlight} cursor="pointer"/>`;

  // === Clipped inner content ===
  svg += `<g clip-path="url(#${clipId})">`;

  // --- Image or Placeholder ---
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

  // --- Name text ---
  svg += `<text x="${dim.text_x}" y="${dim.text_y}" `;
  svg += `font-family="'Manrope', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" `;
  svg += `font-size="13" font-weight="600" fill="${colors.text}" `;
  svg += `dominant-baseline="auto" cursor="pointer">`;
  svg += escapedName;
  svg += `</text>`;

  // --- Subtitle line 1 (DOB) ---
  const subtitleMaxWidth = dim.w - dim.text_x - 10;
  const dobValue = extra?.dob ? formatDisplayDate(extra.dob) : "-";
  const dobLine = truncateText(`DOB: ${dobValue}`, Math.max(30, subtitleMaxWidth));
  svg += `<text x="${dim.text_x}" y="${dim.text_y + 16}" `;
  svg += `font-family="'Manrope', 'Segoe UI', Roboto, sans-serif" `;
  svg += `font-size="10" fill="${colors.text}" opacity="0.6" `;
  svg += `dominant-baseline="auto" cursor="pointer">`;
  svg += escapeXml(dobLine);
  svg += `</text>`;

  // --- Subtitle line 2 (Children + deceased) ---
  const childrenCount =
    typeof extra?.childrenCount === "number" ? extra.childrenCount : 0;
  const childrenParts: string[] = [];
  if (childrenCount > 0) childrenParts.push(`Children: ${childrenCount}`);
  if (isDeceased) childrenParts.push("Deceased");
  const childrenRaw = childrenParts.join(" | ");
  const childrenLine = childrenRaw
    ? truncateText(childrenRaw, Math.max(30, subtitleMaxWidth))
    : "";
  if (childrenLine) {
    svg += `<text x="${dim.text_x}" y="${dim.text_y + 28}" `;
    svg += `font-family="'Manrope', 'Segoe UI', Roboto, sans-serif" `;
    svg += `font-size="10" fill="${colors.text}" opacity="0.6" `;
    svg += `dominant-baseline="auto" cursor="pointer">`;
    svg += escapeXml(childrenLine);
    svg += `</text>`;
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

  // === External tree link icon ===
  if (showExternalLink) {
    const linkX = dim.w - 4;
    const linkY = -4;
    const linkR = 10;
    svg += `<g class="external-tree-icon" data-tree-id="${extra.treeId}" data-person-id="${extra.id}" cursor="pointer">`;
    svg += `<circle cx="${linkX}" cy="${linkY}" r="${linkR}" fill="white" stroke="#1976d2" stroke-width="1.5"/>`;
    svg += `<text x="${linkX}" y="${linkY + 1}" text-anchor="middle" dominant-baseline="central" font-size="11">></text>`;
    svg += `</g>`;
  }

  // === Action icons (edit + add) INSIDE the card — desktop only ===
  if (canEditTree && extra?.id && !extra?._placeholder && !isMobile) {
    const iconR = 8;
    const gap = 4;
    // Position: bottom-right inside the card
    const iconY = dim.h - iconR - 6;
    const cx2 = dim.w - iconR - 5; // add icon (rightmost)
    const cx1 = cx2 - iconR * 2 - gap; // edit icon (left of add)

    // Edit icon button
    svg += `<g class="node-action-icon node-edit-icon" data-node-id="${extra.id}" cursor="pointer">`;
    svg += `<circle cx="${cx1}" cy="${iconY}" r="${iconR}" fill="white" stroke="#9e9e9e" stroke-width="1"/>`;
    svg += `<title>Edit</title>`;
    svg += `<g transform="translate(${cx1 - 4}, ${iconY - 4}) scale(0.33)">`;
    svg += `<path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="#757575"/>`;
    svg += `</g>`;
    svg += `</g>`;

    // Add relative icon button
    svg += `<g class="node-action-icon node-add-icon" data-node-id="${extra.id}" cursor="pointer">`;
    svg += `<circle cx="${cx2}" cy="${iconY}" r="${iconR}" fill="white" stroke="#66bb6a" stroke-width="1"/>`;
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
  svg += `fill="white" stroke="${colors.border}" stroke-width="1.5" stroke-dasharray="6 3" cursor="pointer" opacity="0.85"/>`;

  // Plus icon circle on the left (where image would be)
  const plusCx = dim.img_x + dim.img_w / 2;
  const plusCy = dim.img_y + dim.img_h / 2;
  svg += `<circle cx="${plusCx}" cy="${plusCy}" r="14" fill="${colors.bgGradientStart}" stroke="${colors.border}" stroke-width="1"/>`;
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

