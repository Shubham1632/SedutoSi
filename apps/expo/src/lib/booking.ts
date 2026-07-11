import type { Booking, LiveEvent, Screening } from "@acme/app";

// --- Seat map layout (identical for every screening for now) -----------------
export const ROWS = ["A", "B", "C", "D", "E", "F", "G", "H", "J", "K"] as const;
export const SEATS_PER_ROW = 14;
export const AISLE_AFTER = 7; // center aisle gap after this seat number
export const MAX_SEATS = 8; // hard cap per booking

export type SeatStatus = "available" | "selected" | "occupied";

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Seat ids sorted by row then seat number, e.g. ["A3", "A10", "B1"]. */
export function sortSeats(seats: string[]) {
  return [...seats].sort((a, b) => {
    const rowA = a.slice(0, 1);
    const rowB = b.slice(0, 1);
    if (rowA !== rowB) return rowA.localeCompare(rowB);
    return Number(a.slice(1)) - Number(b.slice(1));
  });
}

// Stable pseudo-random hash so "occupied" seats look realistic yet stay
// consistent for a given screening across visits (occupancy isn't tracked
// server-side — it's cosmetic). djb2's own output is weak for strings that
// only differ in their last character or two (e.g. "F10" vs "F11" vs "F12"),
// which made consecutive seat numbers hash to nearby values and cluster into
// long unnatural streaks — a Murmur3-style finalizer mixes those bits properly.
function hash(seed: string) {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) {
    h = (h << 5) + h + seed.charCodeAt(i);
    h |= 0;
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/**
 * A deterministic, cosmetic set of "taken" seats for a screening — filler so
 * the theater doesn't look empty. Real occupancy (`useBookedSeats`) is
 * unioned on top of this in the seat selection screen; the two are
 * independent, so a seat can look cosmetically taken without ever having
 * been actually booked, and vice versa.
 */
export function cosmeticOccupiedSeats(screeningId: string) {
  const set = new Set<string>();
  if (!screeningId) return set;
  for (const row of ROWS) {
    for (let n = 1; n <= SEATS_PER_ROW; n++) {
      const id = `${row}${n}`;
      if (hash(`${screeningId}:${id}`) % 100 < 15) set.add(id); // ~15% taken
    }
  }
  return set;
}

/** Flattened, display-ready fields from a (possibly-nested) screening row. */
export function screeningDisplay(screening: Screening) {
  const movie = screening.movie as { title?: string } | undefined;
  const screen = screening.screen as
    | { name?: string; cinema?: { name?: string; neighborhood?: string } }
    | undefined;
  const cinema = screen?.cinema;
  return {
    title: movie?.title ?? "Movie",
    when: formatDateTime(screening.starts_at),
    where: cinema
      ? `${cinema.name}${screen.name ? ` · ${screen.name}` : ""}`
      : undefined,
  };
}

/** Flattened, display-ready fields from a live event row. */
export function eventDisplay(event: LiveEvent) {
  return {
    title: event.title,
    when: formatDateTime(event.starts_at),
    where: event.location ?? undefined,
  };
}

/**
 * Flattened, display-ready fields from a booking — a booking is always
 * exactly one of a movie screening or a live event (enforced by the
 * `bookings_screening_or_event_check` constraint).
 */
export function bookingDisplay(booking: Booking) {
  if (booking.screening) return screeningDisplay(booking.screening);
  if (booking.event) return eventDisplay(booking.event);
  return { title: "Booking", when: "", where: undefined };
}
