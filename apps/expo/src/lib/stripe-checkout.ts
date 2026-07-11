import * as QueryParams from "expo-auth-session/build/QueryParams";
import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";

export function getStripeRedirectTo(): string {
  const debuggerHost =
    Constants.expoConfig?.hostUri ?? Constants.manifest?.debuggerHost;
  return `exp://${debuggerHost}`;
}

export interface StripeCheckoutResult {
  status: "success" | "cancel";
  sessionId?: string;
}

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
