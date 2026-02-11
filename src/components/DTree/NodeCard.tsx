/**
 * NodeCard - Pure SVG renderer for tree nodes.
 * Returns an SVG string (not React JSX) to be inserted into <g> elements.
 * This avoids foreignObject which has severe rendering bugs on Safari/iOS.
 */

// Color definitions for gender-based styling
const COLORS = {
  male: {
    bgGradientStart: "#e3f2fd",
    bgGradientEnd: "#bbdefb",
    border: "rgba(25, 118, 210, 0.3)",
    text: "#0d47a1",
    icon: "#1976d2",
  },
  female: {
    bgGradientStart: "#fce4ec",
    bgGradientEnd: "#f8bbd0",
    border: "rgba(194, 24, 91, 0.3)",
    text: "#880e4f",
    icon: "#c2185b",
  },
  person: {
    bgGradientStart: "#f5f5f5",
    bgGradientEnd: "#e0e0e0",
    border: "rgba(97, 97, 97, 0.3)",
    text: "#424242",
    icon: "#616161",
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

/**
 * Truncate text to fit within a given pixel width.
 * Approximate: ~7px per character at 14px font-size, 600 weight.
 */
function truncateText(text: string, maxWidth: number): string {
  const charWidth = 7.5;
  const maxChars = Math.floor(maxWidth / charWidth);
  if (text.length <= maxChars) return text;
  return text.substring(0, maxChars - 1) + "…";
}

/**
 * Build the gender icon SVG path elements.
 */
function genderIconSvg(
  gender: string,
  iconColor: string,
  x: number,
  y: number,
): string {
  const size = 16;
  if (gender === "male") {
    return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${iconColor}">
      <path d="M12 2c2.21 0 4 1.79 4 4s-1.79 4-4 4-4-1.79-4-4 1.79-4 4-4zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 7c2.67 0 8 1.34 8 4v3H4v-3c0-2.66 5.33-4 8-4z"/>
    </svg>`;
  } else if (gender === "female") {
    return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${iconColor}">
      <path d="M13.94 8.31C13.62 7.52 12.85 7 12 7s-1.62.52-1.94 1.31L7 16h2l1.25-3h3.5L15 16h2l-3.06-7.69zM11.5 11l.5-1.5.5 1.5h-1z"/>
      <circle cx="12" cy="4" r="2"/>
    </svg>`;
  }
  return "";
}

/**
 * Renders a node card as pure SVG string.
 * Called by builder.ts - inserted into a <g> element.
 *
 * @param name - Person's name
 * @param width - Card width
 * @param height - Card height
 * @param extra - Extra data (gender, id, dob, hierarchy, treeId, counts)
 * @param id - Node ID
 * @param nodeClass - CSS class (man/woman/person)
 * @param currentTreeId - Current tree ID for external link detection
 * @returns SVG string for the card content
 */
export function renderNodeCardSvg(
  name: string,
  width: number,
  height: number,
  extra: any,
  id: string,
  nodeClass: string,
  currentTreeId?: string,
): string {
  const gender = extra?.gender || "";
  const genderKey =
    gender === "male" ? "male" : gender === "female" ? "female" : "person";
  const colors = COLORS[genderKey];

  const gradientId = `grad-${id}`;
  const clipId = `clip-${id}`;
  const shadowId = `shadow-${id}`;
  const borderRadius = 10;
  const padding = 8;

  // Calculate text position
  const hasIcon = gender === "male" || gender === "female";
  const iconWidth = hasIcon ? 20 : 0; // 16px icon + 4px gap
  const textMaxWidth = width - padding * 2 - iconWidth;
  const displayName = truncateText(name, textMaxWidth);
  const escapedName = escapeXml(displayName);

  // Center text vertically and horizontally
  const centerX = width / 2;
  const centerY = height / 2;

  // External tree link
  const showExternalLink =
    currentTreeId && extra?.treeId && extra.treeId !== currentTreeId;

  let svg = "";

  // Definitions (gradient, clip-path, shadow)
  svg += `<defs>`;
  svg += `<linearGradient id="${gradientId}" x1="0" y1="0" x2="1" y2="1">`;
  svg += `<stop offset="0%" stop-color="${colors.bgGradientStart}"/>`;
  svg += `<stop offset="100%" stop-color="${colors.bgGradientEnd}"/>`;
  svg += `</linearGradient>`;
  svg += `<clipPath id="${clipId}">`;
  svg += `<rect x="0" y="0" width="${width}" height="${height}" rx="${borderRadius}" ry="0"/>`;
  svg += `</clipPath>`;
  svg += `<filter id="${shadowId}" x="-10%" y="-10%" width="130%" height="140%">`;
  svg += `<feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="rgba(2,6,23,0.06)" flood-opacity="1"/>`;
  svg += `</filter>`;
  svg += `</defs>`;

  // Card background with shadow
  svg += `<rect class="card-bg" x="0" y="0" width="${width}" height="${height}" rx="${borderRadius}" ry="0" `;
  svg += `fill="url(#${gradientId})" filter="url(#${shadowId})" `;
  svg += `stroke="${colors.border}" stroke-width="2" cursor="pointer"/>`;

  // Inner content group with clip-path
  svg += `<g clip-path="url(#${clipId})">`;

  // Gender icon + Name text
  if (hasIcon) {
    const totalContentWidth = iconWidth + escapedName.length * 7.5;
    const startX = Math.max(padding, centerX - totalContentWidth / 2);
    svg += genderIconSvg(gender, colors.icon, startX, centerY - 8);
    svg += `<text x="${startX + iconWidth}" y="${centerY}" `;
    svg += `font-family="'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" `;
    svg += `font-size="14" font-weight="600" fill="${colors.text}" `;
    svg += `dominant-baseline="central" cursor="pointer">`;
    svg += escapedName;
    svg += `</text>`;
  } else {
    svg += `<text x="${centerX}" y="${centerY}" `;
    svg += `text-anchor="middle" `;
    svg += `font-family="'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" `;
    svg += `font-size="14" font-weight="600" fill="${colors.text}" `;
    svg += `dominant-baseline="central" cursor="pointer">`;
    svg += escapedName;
    svg += `</text>`;
  }

  svg += `</g>`; // close clip group

  // Card outline (border on top)
  svg += `<rect class="card-outline" x="0" y="0" width="${width}" height="${height}" rx="${borderRadius}" ry="0" `;
  svg += `fill="none" stroke="${colors.border}" stroke-width="2" pointer-events="none"/>`;

  // Tooltip group (hidden by default, shown on hover via CSS)
  const tooltipWidth = Math.max(180, width + 40);
  const tooltipX = (width - tooltipWidth) / 2;
  let tooltipY = -12; // above the card
  const tooltipLineHeight = 18;

  // Build tooltip lines
  const tooltipLines: {
    text: string;
    size: number;
    opacity: number;
    weight: number;
  }[] = [];
  tooltipLines.push({
    text: escapeXml(name),
    size: 14,
    opacity: 1,
    weight: 700,
  });
  if (extra?.dob) {
    tooltipLines.push({
      text: `DOB: ${escapeXml(extra.dob)}`,
      size: 12,
      opacity: 0.85,
      weight: 400,
    });
  }
  const stats = `Parents: ${extra?.parentsCount || 0} · Children: ${extra?.childrenCount || 0} · Spouses: ${extra?.spousesCount || 0}`;
  tooltipLines.push({ text: stats, size: 11, opacity: 0.72, weight: 400 });

  if (extra?.hierarchy && extra.hierarchy.length > 0) {
    tooltipLines.push({
      text: "Ancestry:",
      size: 11,
      opacity: 0.9,
      weight: 600,
    });
    extra.hierarchy.forEach((h: any, i: number) => {
      const arrows = "↑ ".repeat(extra.hierarchy.length - i);
      tooltipLines.push({
        text: `${arrows}${escapeXml(h.name)}`,
        size: 10,
        opacity: 0.85,
        weight: 400,
      });
    });
  }

  tooltipLines.push({
    text: "Click to view details",
    size: 11,
    opacity: 0.72,
    weight: 400,
  });

  const tooltipPadding = 10;
  const tooltipHeight =
    tooltipLines.length * tooltipLineHeight + tooltipPadding * 2;
  const tooltipTop = tooltipY - tooltipHeight;

  svg += `<g class="node-tooltip-svg" opacity="0" pointer-events="none">`;
  svg += `<rect x="${tooltipX}" y="${tooltipTop}" width="${tooltipWidth}" height="${tooltipHeight}" `;
  svg += `rx="8" ry="8" fill="rgba(15,23,42,0.96)"/>`;
  tooltipLines.forEach((line, i) => {
    svg += `<text x="${tooltipX + tooltipPadding}" y="${tooltipTop + tooltipPadding + (i + 1) * tooltipLineHeight - 4}" `;
    svg += `font-family="'Segoe UI', Roboto, sans-serif" font-size="${line.size}" font-weight="${line.weight}" `;
    svg += `fill="white" opacity="${line.opacity}">`;
    svg += line.text;
    svg += `</text>`;
  });
  svg += `</g>`;

  // External tree link icon
  if (showExternalLink) {
    const linkX = width - 4;
    const linkY = -4;
    const linkR = 12;
    svg += `<g class="external-tree-icon" data-tree-id="${extra.treeId}" cursor="pointer">`;
    svg += `<circle cx="${linkX}" cy="${linkY}" r="${linkR}" fill="white" stroke="#1976d2" stroke-width="2"/>`;
    svg += `<text x="${linkX}" y="${linkY + 1}" text-anchor="middle" dominant-baseline="central" font-size="14">🔗</text>`;
    svg += `</g>`;
  }

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
