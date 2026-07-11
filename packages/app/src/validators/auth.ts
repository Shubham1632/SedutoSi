import { z } from "zod/v4";

export const emailSchema = z.email("Enter a valid email");

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const signUpSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, "Use at least 8 characters"),
  displayName: z.string().min(1, "Name is required").max(80).optional(),
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export const updateProfileSchema = z.object({
  displayName: z.string().min(1, "Name is required").max(80),
  avatarUrl: z.union([z.url("Enter a valid URL"), z.literal("")]).optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
