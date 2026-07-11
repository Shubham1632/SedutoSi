import type { Booking, LiveEvent, Screening } from "@acme/app";

export const ROWS = ["A", "B", "C", "D", "E", "F", "G", "H", "J", "K"] as const;
export const SEATS_PER_ROW = 14;
export const AISLE_AFTER = 7;
export const MAX_SEATS = 8;

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

export function sortSeats(seats: string[]) {
  return [...seats].sort((a, b) => {
    const rowA = a.slice(0, 1);
    const rowB = b.slice(0, 1);
    if (rowA !== rowB) return rowA.localeCompare(rowB);
    return Number(a.slice(1)) - Number(b.slice(1));
  });
}

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

export function cosmeticOccupiedSeats(screeningId: string) {
  const set = new Set<string>();
  if (!screeningId) return set;
  for (const row of ROWS) {
    for (let n = 1; n <= SEATS_PER_ROW; n++) {
      const id = `${row}${n}`;
      if (hash(`${screeningId}:${id}`) % 100 < 15) set.add(id);
    }
  }
  return set;
}

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

export function eventDisplay(event: LiveEvent) {
  return {
    title: event.title,
    when: formatDateTime(event.starts_at),
    where: event.location ?? undefined,
  };
}

export function bookingDisplay(booking: Booking) {
  if (booking.screening) return screeningDisplay(booking.screening);
  if (booking.event) return eventDisplay(booking.event);
  return { title: "Booking", when: "", where: undefined };
}
