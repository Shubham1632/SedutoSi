import * as QueryParams from "expo-auth-session/build/QueryParams";
import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";

/**
 * Redirect target for the Stripe Checkout web session — same trick as Google
 * sign-in (~/lib/google-auth.ts): Expo Go's `exp://<lan-ip>:8081` deep link
 * is already registered with the OS, so no custom-scheme/dev-build setup is
 * needed to receive the redirect back from Stripe's hosted checkout page.
 * Must be computed once per checkout attempt and reused for both the
 * checkout-session request (its success/cancel URLs are baked in at
 * creation) and the browser session below.
 */
export function getStripeRedirectTo(): string {
  const debuggerHost =
    Constants.expoConfig?.hostUri ?? Constants.manifest?.debuggerHost;
  return `exp://${debuggerHost}`;
}

export interface StripeCheckoutResult {
  status: "success" | "cancel";
  sessionId?: string;
}

/**
 * Opens a Stripe Checkout URL in the system browser and waits for the
 * redirect back. Card declines are handled inside Stripe's own Checkout UI
 * (the user can retry there without leaving the page) — this only resolves
 * once the user completes payment or backs out, so "cancel" here means the
 * user abandoned checkout, not that a payment attempt failed.
 */
export async function openStripeCheckout(
  url: string,
  redirectTo: string,
): Promise<StripeCheckoutResult> {
  const result = await WebBrowser.openAuthSessionAsync(url, redirectTo);
  if (result.type !== "success") return { status: "cancel" };

  const { params } = QueryParams.getQueryParams(result.url);
  if (params.status === "success" && typeof params.session_id === "string") {
    return { status: "success", sessionId: params.session_id };
  }
  return { status: "cancel" };
}
