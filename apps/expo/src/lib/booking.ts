import type { Screening } from "@acme/app";

// --- Seat map layout (identical for every screening for now) -----------------
export const ROWS = ["A", "B", "C", "D", "E", "F", "G", "H", "J", "K"] as const;
export const SEATS_PER_ROW = 14;
export const AISLE_AFTER = 7; // center aisle gap after this seat number
export const MAX_SEATS = 8; // hard cap per booking

export type SeatStatus = "available" | "selected" | "occupied";

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("it-IT", {
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
// server-side — it's cosmetic).
function hash(seed: string) {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) {
    h = (h << 5) + h + seed.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
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
