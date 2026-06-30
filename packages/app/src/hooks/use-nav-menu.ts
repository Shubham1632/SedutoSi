"use client";

export interface NavMenuEntry {
  key: string;
  label: string;
  href: string;
  icon?: string;
}

// CMS-driven nav removed. Navigation is handled by expo-router screens.
export function useNavMenu(_platform: "web" | "native" = "native") {
  return { data: [] as NavMenuEntry[], isLoading: false, error: null };
}
