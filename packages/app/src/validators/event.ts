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
  .refine((d) => !d.endsAt || d.endsAt > d.startsAt, {
    message: "End time must be after the start time",
    path: ["endsAt"],
  })
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
