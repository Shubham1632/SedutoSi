/**
 * @acme/app — shared, cross-platform feature logic (validators, auth actions,
 * data hooks). UI stays per-platform in apps/*; the logic lives here so native
 * and future web clients share one implementation.
 */

export * from "./validators/auth";
export * from "./auth";
export * from "./auth-settings";
export { zodFormResolver } from "./zod-resolver";
export { useAuthConfig } from "./hooks/use-auth-config";
export { useProfile, useUpdateProfile } from "./hooks/use-profile";
export { useDeleteAccount } from "./hooks/use-delete-account";

// Movie booking hooks
export * from "./hooks/use-movies";
