/* Extensions removed — movie booking app uses Supabase directly. */
import type * as React from "react";

export interface ExtInstalled {
  slug: string;
  name: string;
  version: string;
  system: boolean;
}

export interface ExtNavDefault {
  key: string;
  extension: string;
  title: string;
  href: string;
  icon?: string;
  order: number;
}

export const extInstalled: ExtInstalled[] = [];
export const extNavDefaults: { native: ExtNavDefault[] } = { native: [] };
export const extWidgets: { slug: string; Widget: React.ComponentType }[] = [];

export function hasExtension(_slug: string): boolean {
  return false;
}
