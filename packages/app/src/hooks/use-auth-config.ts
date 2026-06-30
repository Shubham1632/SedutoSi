"use client";

import type { AuthSettings } from "../auth-settings";
import { DEFAULT_AUTH_SETTINGS } from "../auth-settings";

/**
 * Returns the default auth config (email + password sign-in).
 * The CMS-backed dynamic config was removed; extend this if you need
 * runtime-configurable auth methods.
 */
export function useAuthConfig(): AuthSettings {
  return DEFAULT_AUTH_SETTINGS;
}
