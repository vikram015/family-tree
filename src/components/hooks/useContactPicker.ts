import { useCallback, useMemo } from "react";

/** One selectable phone number, flattened out of a picked contact. */
export type ContactCandidate = {
  /** Stable list key — the API gives contacts no id of their own. */
  key: string;
  name: string;
  /** Exactly as stored on the device, e.g. "+91 98765 43210". */
  rawPhone: string;
  /** Last 10 digits — what the invite field expects. */
  phone: string;
};

export type ContactPickerResult =
  | { status: "unsupported" }
  /** Sheet dismissed, or nothing picked. */
  | { status: "cancelled" }
  /** Contacts were picked but none carried a usable 10-digit number. */
  | { status: "empty" }
  | { status: "error" }
  | { status: "selected"; candidates: ContactCandidate[] };

type PickedContact = {
  name?: string[];
  tel?: string[];
};

/** Indian mobile numbers reach us as +91…, 0…, or bare 10 digits. */
function toTenDigits(value: string): string | null {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  return digits.slice(-10);
}

/**
 * Opens the browser's native contact picker so the user can pick who to invite
 * instead of typing a number.
 *
 * Backed by the Contact Picker API (`navigator.contacts.select`), which is
 * Android Chromium only — iOS keeps it behind an experimental flag and desktop
 * has no support at all. `supported` is false everywhere else, and callers are
 * expected to hide the affordance rather than show a broken one; typing the
 * number by hand always stays available.
 *
 * The API deliberately gives no readable address book: it renders its own sheet
 * (with its own search), and we only ever see the entries the user hands over.
 * Nothing is persisted here — permission is asked again on every call.
 *
 * `pickContacts` must be called straight from a user gesture (a click handler);
 * without transient activation the browser rejects the request.
 */
export function useContactPicker() {
  const supported = useMemo(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      return false;
    }
    if (!("contacts" in navigator) || !("ContactsManager" in window)) {
      return false;
    }
    // Secure context and a top-level frame are both hard requirements.
    if (!window.isSecureContext) return false;
    return window.top === window.self;
  }, []);

  const pickContacts = useCallback(async (): Promise<ContactPickerResult> => {
    if (!supported) {
      return { status: "unsupported" };
    }

    let picked: PickedContact[];
    try {
      // Multi-select: one trip through the sheet can offer several people, and
      // a single contact can carry several numbers. The caller disambiguates.
      picked = await (navigator as any).contacts.select(["name", "tel"], {
        multiple: true,
      });
    } catch {
      // Dismissed mid-flight, missing user gesture, or picker unavailable.
      return { status: "error" };
    }

    if (!Array.isArray(picked) || picked.length === 0) {
      return { status: "cancelled" };
    }

    const candidates: ContactCandidate[] = [];
    const seen = new Set<string>();

    picked.forEach((contact, contactIndex) => {
      const name = (contact?.name || []).find((entry) => entry?.trim())?.trim();
      (contact?.tel || []).forEach((rawPhone, telIndex) => {
        const phone = toTenDigits(rawPhone);
        // Same number twice (duplicate contacts, or home == mobile) is noise.
        if (!phone || seen.has(phone)) return;
        seen.add(phone);
        candidates.push({
          key: `${contactIndex}-${telIndex}-${phone}`,
          name: name || "Unnamed contact",
          rawPhone: String(rawPhone || "").trim() || phone,
          phone,
        });
      });
    });

    if (candidates.length === 0) {
      return { status: "empty" };
    }

    return { status: "selected", candidates };
  }, [supported]);

  return { supported, pickContacts };
}
