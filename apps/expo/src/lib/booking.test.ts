import { describe, expect, it } from "vitest";

import type { Booking, LiveEvent, Screening } from "@acme/app";

import {
  AISLE_AFTER,
  bookingDisplay,
  cosmeticOccupiedSeats,
  eventDisplay,
  formatDateTime,
  MAX_SEATS,
  ROWS,
  screeningDisplay,
  SEATS_PER_ROW,
  sortSeats,
} from "./booking";

describe("sortSeats", () => {
  it("sorts by row then numerically by seat number", () => {
    expect(sortSeats(["B1", "A10", "A3", "A2"])).toEqual([
      "A2",
      "A3",
      "A10",
      "B1",
    ]);
  });

  it("does not mutate the input array", () => {
    const input = ["C1", "A1"];
    const copy = [...input];
    sortSeats(input);
    expect(input).toEqual(copy);
  });

  it("returns an empty array for no seats", () => {
    expect(sortSeats([])).toEqual([]);
  });
});

describe("cosmeticOccupiedSeats", () => {
  it("returns an empty set for an empty screening id", () => {
    expect(cosmeticOccupiedSeats("").size).toBe(0);
  });

  it("is deterministic for the same screening id", () => {
    const a = cosmeticOccupiedSeats("screening-1");
    const b = cosmeticOccupiedSeats("screening-1");
    expect([...a].sort()).toEqual([...b].sort());
  });

  it("differs across screening ids (not a constant set)", () => {
    const a = cosmeticOccupiedSeats("screening-1");
    const b = cosmeticOccupiedSeats("screening-2");
    expect([...a].sort()).not.toEqual([...b].sort());
  });

  it("only contains valid seat ids within the board bounds", () => {
    const occupied = cosmeticOccupiedSeats("screening-3");
    for (const id of occupied) {
      const row = id.slice(0, 1);
      const num = Number(id.slice(1));
      expect(ROWS).toContain(row);
      expect(num).toBeGreaterThanOrEqual(1);
      expect(num).toBeLessThanOrEqual(SEATS_PER_ROW);
    }
  });

  it("occupies roughly 15% of seats (within a wide tolerance)", () => {
    const total = ROWS.length * SEATS_PER_ROW;
    const occupied = cosmeticOccupiedSeats("screening-4").size;
    const ratio = occupied / total;
    expect(ratio).toBeGreaterThan(0.05);
    expect(ratio).toBeLessThan(0.3);
  });
});

describe("formatDateTime", () => {
  it("formats an ISO string into a long, human-readable date/time", () => {
    // Avoid asserting the exact hour: toLocaleString renders in the runner's
    // local timezone, not UTC. Just check the overall shape: a weekday, a
    // day-of-month, a month name, and an HH:MM time.
    const formatted = formatDateTime("2026-03-05T18:30:00.000Z");
    expect(formatted).toMatch(/^[A-Za-z]+ \d{1,2} [A-Za-z]+ at \d{2}:\d{2}$/);
    expect(formatted).toContain("March");
  });
});

describe("screeningDisplay", () => {
  const screening = {
    id: "s1",
    movie_id: "m1",
    screen_id: "sc1",
    starts_at: "2026-03-05T18:30:00.000Z",
    ends_at: "2026-03-05T20:30:00.000Z",
    price: 12,
    available_seats: 50,
    movie: { title: "Dune" },
    screen: {
      name: "Screen 3",
      cinema: { name: "Odeon", neighborhood: "Centro" },
    },
  } as unknown as Screening;

  it("flattens movie title, formatted time, and cinema/screen location", () => {
    const display = screeningDisplay(screening);
    expect(display.title).toBe("Dune");
    expect(display.where).toBe("Odeon · Screen 3");
    expect(display.when).toBe(formatDateTime(screening.starts_at));
  });

  it("falls back to a generic title when the movie is missing", () => {
    const display = screeningDisplay({
      ...screening,
      movie: undefined,
    } as Screening);
    expect(display.title).toBe("Movie");
  });

  it("omits `where` when there is no cinema", () => {
    const display = screeningDisplay({
      ...screening,
      screen: { name: "Screen 3" } as never,
    } as Screening);
    expect(display.where).toBeUndefined();
  });

  it("omits the screen name from `where` when the screen has none", () => {
    const display = screeningDisplay({
      ...screening,
      screen: { cinema: { name: "Odeon" } } as never,
    } as Screening);
    expect(display.where).toBe("Odeon");
  });
});

describe("eventDisplay", () => {
  it("flattens title, formatted time, and location", () => {
    const event = {
      id: "e1",
      title: "Live Jazz",
      description: null,
      category: "music",
      location: "Piazza Duomo",
      image_url: null,
      starts_at: "2026-04-01T20:00:00.000Z",
      ends_at: null,
      price: null,
      capacity: null,
      created_by: null,
    } as LiveEvent;

    const display = eventDisplay(event);
    expect(display.title).toBe("Live Jazz");
    expect(display.where).toBe("Piazza Duomo");
    expect(display.when).toBe(formatDateTime(event.starts_at));
  });

  it("omits `where` when there is no location", () => {
    const event = {
      id: "e2",
      title: "Pop-up",
      description: null,
      category: "art",
      location: null,
      image_url: null,
      starts_at: "2026-04-01T20:00:00.000Z",
      ends_at: null,
      price: null,
      capacity: null,
      created_by: null,
    } as LiveEvent;

    expect(eventDisplay(event).where).toBeUndefined();
  });
});

describe("bookingDisplay", () => {
  const baseBooking = {
    id: "b1",
    user_id: "u1",
    screening_id: null,
    event_id: null,
    seats: [],
    seats_count: 1,
    total_price: 10,
    status: "confirmed",
    created_at: "2026-01-01T00:00:00.000Z",
  } as unknown as Booking;

  it("prefers the screening when a booking has one", () => {
    const booking = {
      ...baseBooking,
      screening: {
        id: "s1",
        movie_id: "m1",
        screen_id: "sc1",
        starts_at: "2026-03-05T18:30:00.000Z",
        ends_at: "2026-03-05T20:30:00.000Z",
        price: 12,
        available_seats: 50,
        movie: { title: "Dune" },
      },
    } as unknown as Booking;
    expect(bookingDisplay(booking).title).toBe("Dune");
  });

  it("falls back to the event when there is no screening", () => {
    const booking = {
      ...baseBooking,
      event: {
        id: "e1",
        title: "Live Jazz",
        starts_at: "2026-04-01T20:00:00.000Z",
        location: "Piazza Duomo",
      },
    } as unknown as Booking;
    expect(bookingDisplay(booking).title).toBe("Live Jazz");
  });

  it("falls back to a generic booking when neither is present", () => {
    expect(bookingDisplay(baseBooking)).toEqual({
      title: "Booking",
      when: "",
      where: undefined,
    });
  });
});

describe("seat map constants", () => {
  it("keeps the aisle within the row and the seat cap positive", () => {
    expect(AISLE_AFTER).toBeGreaterThan(0);
    expect(AISLE_AFTER).toBeLessThan(SEATS_PER_ROW);
    expect(MAX_SEATS).toBeGreaterThan(0);
  });
});
