import { z } from "zod/v4";

export const EVENT_CATEGORIES = [
  "music",
  "theater",
  "comedy",
  "sports",
  "art",
  "exhibition",
  "festival",
  "food",
  "film",
  "workshop",
  "other",
] as const;

/** Organizers must give at least this much lead time before an event starts. */
export const EVENT_MIN_LEAD_TIME_MS = 24 * 60 * 60 * 1000;
/** Minimum gap between an event's start and end time, when an end time is set. */
export const EVENT_MIN_DURATION_MS = 15 * 60 * 1000;

export const createEventSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(120),
    description: z.string().max(2000).optional(),
    category: z.string().min(1, "Pick a category"),
    location: z.string().max(200).optional(),
    imageUri: z.string().min(1, "Add a cover image"),
    startsAt: z.date({ error: "Pick a start date & time" }),
    endsAt: z.date().optional(),
    price: z.string().optional(),
    capacity: z.string().optional(),
  })
  .refine((d) => d.startsAt.getTime() >= Date.now() + EVENT_MIN_LEAD_TIME_MS, {
    message: "Start time must be at least 24 hours from now",
    path: ["startsAt"],
  })
  .refine(
    (d) =>
      !d.endsAt ||
      d.endsAt.getTime() >= d.startsAt.getTime() + EVENT_MIN_DURATION_MS,
    {
      message: "End time must be at least 15 minutes after the start time",
      path: ["endsAt"],
    },
  )
  .refine(
    (d) => !d.price || (!isNaN(Number(d.price)) && Number(d.price) >= 0),
    { message: "Enter a valid price", path: ["price"] },
  )
  .refine(
    (d) =>
      !d.capacity ||
      (Number.isInteger(Number(d.capacity)) && Number(d.capacity) > 0),
    { message: "Enter a valid capacity", path: ["capacity"] },
  );

export type CreateEventFormInput = z.infer<typeof createEventSchema>;
