import * as QueryParams from "expo-auth-session/build/QueryParams";
import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";

import { signInWithOAuth, syncOAuthAvatar } from "@acme/app";

import { supabase } from "~/lib/supabase";

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
