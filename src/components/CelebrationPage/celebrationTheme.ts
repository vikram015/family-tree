import { SxProps, Theme } from "@mui/material";
import { brand } from "../../theme/brand";
import { CelebrationEventType } from "../../services/apiService";

/**
 * How each kind of celebration looks.
 *
 * A birthday, a wedding anniversary and a remembrance are not the same
 * occasion, and rendering all three in the brand blue with a different emoji
 * was the quickest way to make a memorial page feel like a notification. Each
 * gets its own ground, accent and vocabulary; the layout underneath is
 * identical so the page is still recognisably one thing.
 */

export interface CelebrationTone {
  /** Word used in headings: "Birthday", "Anniversary", "Remembrance". */
  noun: string;
  /**
   * Leading line above the name, on the day itself.
   *
   * Only correct when the event is actually today — use `eyebrowFor`, which
   * picks this or a past-tense form. Reading this field directly is what made
   * a card headed "Celebrating today" sit above "10th birthday, in 2026".
   */
  eyebrow: string;
  emoji: string;
  accent: string;
  accentSoft: string;
  /** The hero card's ground. */
  surface: string;
  /** What the composer invites. */
  composerTitle: string;
  composerHint: string;
  /** Verb for the stream heading: "wishes", "blessings", "memories". */
  contributionNoun: string;
  /** Ready-made lines offered above the box. */
  prompts: string[];
}

const BIRTHDAY: CelebrationTone = {
  noun: "Birthday",
  eyebrow: "Celebrating today",
  emoji: "🎂",
  accent: "#b45309",
  accentSoft: "#fef3c7",
  // The warm ivory-into-amber the dashboard already uses for the day's events,
  // so arriving here from the Today strip is continuous.
  surface: "linear-gradient(135deg, #fdfbf7 0%, #fff7eb 50%, #fef3c7 100%)",
  composerTitle: "Add your wish",
  composerHint: "A birthday wish, a memory, or just hello.",
  contributionNoun: "wishes",
  prompts: [
    "Wishing you health and happiness always 🎂",
    "जन्मदिन की हार्दिक शुभकामनाएं 🙏",
    "Many happy returns of the day!",
    "Thinking of you today ❤️",
  ],
};

const ANNIVERSARY: CelebrationTone = {
  noun: "Anniversary",
  eyebrow: "Marking the years",
  emoji: "💍",
  accent: "#047857",
  accentSoft: "#d1fae5",
  surface: "linear-gradient(135deg, #f7fdfb 0%, #ecfdf5 52%, #d1fae5 100%)",
  composerTitle: "Send your congratulations",
  composerHint: "A note to the couple.",
  contributionNoun: "messages",
  prompts: [
    "Congratulations on this milestone! 💍",
    "शादी की सालगिरह मुबारक हो",
    "Wishing you many more years together",
    "So happy for you both ❤️",
  ],
};

const REMEMBRANCE: CelebrationTone = {
  noun: "Remembrance",
  eyebrow: "In loving memory",
  emoji: "🕯️",
  accent: "#475569",
  accentSoft: "#e2e8f0",
  // Deliberately the quietest of the three: cool, near-grey, no warmth and no
  // celebratory tint. A memorial should not glow.
  surface: "linear-gradient(135deg, #fcfdfe 0%, #f6f8fb 55%, #eef2f7 100%)",
  composerTitle: "Share a memory",
  composerHint: "Something you remember, or a few words for the family.",
  contributionNoun: "memories",
  prompts: [
    "Remembering you always 🕯️",
    "विनम्र श्रद्धांजलि 🙏",
    "Your stories are still told in this house",
    "Thinking of the family today",
  ],
};

const TONES: Record<CelebrationEventType, CelebrationTone> = {
  birthday: BIRTHDAY,
  anniversary: ANNIVERSARY,
  remembrance: REMEMBRANCE,
};

export function toneFor(eventType: CelebrationEventType | string): CelebrationTone {
  return TONES[eventType as CelebrationEventType] || BIRTHDAY;
}

/**
 * The line above the name, in the right tense.
 *
 * A celebration page outlives its day — last year's wall is still readable, and
 * a link forwarded on Tuesday gets opened on Friday. Announcing "Celebrating
 * today" on all of them was wrong most of the time.
 */
export function eyebrowFor(
  eventType: CelebrationEventType | string,
  isToday: boolean,
  year: number,
): string {
  const tone = toneFor(eventType);
  if (isToday) return tone.eyebrow;
  if (eventType === "remembrance") return "In loving memory";
  if (eventType === "anniversary") return `Anniversary · ${year}`;
  return `Birthday · ${year}`;
}

/** "68th", "40th", "3rd" — the ordinal in front of the occasion. */
export function ordinal(value: number | null | undefined): string {
  // Zero is excluded along with the negatives and the nulls: a "0th birthday"
  // is what a first year of life, or a bad date in the data, renders as, and
  // callers all fall back to the plain noun when this returns empty.
  if (value === null || value === undefined || !Number.isFinite(value) || value < 1) {
    return "";
  }
  const remainderTen = value % 10;
  const remainderHundred = value % 100;
  if (remainderTen === 1 && remainderHundred !== 11) return `${value}st`;
  if (remainderTen === 2 && remainderHundred !== 12) return `${value}nd`;
  if (remainderTen === 3 && remainderHundred !== 13) return `${value}rd`;
  return `${value}th`;
}

/**
 * The headline under the name: "Celebrating her 68th Birthday today".
 *
 * Falls back cleanly when the ordinal is unknown — a remembrance for someone
 * with no recorded year of death still has a heading, it just has no number in
 * it.
 */
export function headlineFor(
  eventType: CelebrationEventType | string,
  occurrenceNumber: number | null,
  isToday: boolean,
  year: number,
): string {
  const tone = toneFor(eventType);
  const nth = ordinal(occurrenceNumber);
  const when = isToday ? "today" : `in ${year}`;

  if (eventType === "remembrance") {
    return nth ? `${nth} remembrance, ${when}` : `Remembered ${when}`;
  }
  return nth ? `${nth} ${tone.noun.toLowerCase()}, ${when}` : `${tone.noun} ${when}`;
}

/** "3 days ago" — enough precision for a guestbook, no date library needed. */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const minutes = Math.floor((Date.now() - then) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

/** Whether the event's date is today, which changes the tense everywhere. */
export function isEventToday(eventDate: string | null): boolean {
  if (!eventDate) return false;
  const today = new Date();
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
    today.getDate(),
  ).padStart(2, "0")}`;
  return eventDate.slice(0, 10) === iso;
}

/** The page's standard card. Matches the dashboard's panels so the two read as
 *  one product. */
export const cardSx: SxProps<Theme> = {
  borderRadius: 3,
  border: "1px solid",
  borderColor: brand.border,
  bgcolor: brand.surface,
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
};
