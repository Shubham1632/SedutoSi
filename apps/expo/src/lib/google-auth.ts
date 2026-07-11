import * as QueryParams from "expo-auth-session/build/QueryParams";
import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";

import { signInWithOAuth, syncOAuthAvatar } from "@acme/app";

import { supabase } from "~/lib/supabase";

/**
 * Google sign-in that works inside plain Expo Go — no custom dev client or
 * native build required. It never talks to Google directly: Supabase's own
 * `/auth/v1/callback` (an https endpoint Supabase hosts) is the redirect URI
 * registered with Google, so the OAuth code exchange happens server-side.
 * Supabase then redirects to `redirectTo`, which `makeRedirectUri()` resolves
 * to Expo Go's own `exp://<lan-ip>:8081` deep link — a scheme already
 * registered with the OS, so no app-scheme registration or dev build is
 * needed to receive it.
 *
 * That LAN IP must be on Supabase's Redirect URLs allow list *exactly*
 * (Authentication → URL Configuration → Redirect URLs) — Supabase's wildcard
 * matching doesn't reliably cover custom URI schemes, and Expo Go itself only
 * routes an `exp://` deep link back into the app if the host matches the
 * experience it's actually connected to (so a stand-in like `localhost`
 * doesn't work either). It changes only when your dev machine's LAN IP
 * changes (switching networks, DHCP renewal) — logged below so it's easy to
 * copy the current value when that happens.
 */
export async function signInWithGoogle(): Promise<"success" | "cancelled"> {
  const debuggerHost =
    Constants.expoConfig?.hostUri ?? Constants.manifest?.debuggerHost;

  const redirectTo = `exp://${debuggerHost}`;
  console.log("[google-auth] redirectTo:", redirectTo);

  const { data, error } = await signInWithOAuth(supabase, "google", {
    redirectTo,
    skipBrowserRedirect: true,
  });
  if (error) throw error;
  if (!data.url) throw new Error("Google sign-in did not return a URL.");

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== "success") return "cancelled";

  const { params, errorCode } = QueryParams.getQueryParams(result.url);
  if (errorCode) throw new Error(errorCode);
  if (params.error_description) throw new Error(params.error_description);

  if (params.code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
      params.code,
    );
    if (exchangeError) throw exchangeError;
    await syncOAuthAvatar(supabase).catch(() => undefined);
    return "success";
  }

  if (params.access_token && params.refresh_token) {
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    });
    if (sessionError) throw sessionError;
    await syncOAuthAvatar(supabase).catch(() => undefined);
    return "success";
  }

  throw new Error("Google sign-in did not return a session.");
}
