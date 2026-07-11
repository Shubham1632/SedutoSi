import type { Provider, Session, User } from "@supabase/supabase-js";

import type { AppSupabaseClient } from "@acme/api";

import type { SignInInput, SignUpInput } from "./validators/auth";

export async function signInWithPassword(
  client: AppSupabaseClient,
  { email, password }: SignInInput,
  opts?: { captchaToken?: string },
): Promise<void> {
  const { error } = await client.auth.signInWithPassword({
    email,
    password,
    options: opts?.captchaToken
      ? { captchaToken: opts.captchaToken }
      : undefined,
  });
  if (error) throw error;
}

export async function signUpWithPassword(
  client: AppSupabaseClient,
  { email, password, displayName }: SignUpInput,
  opts?: { emailRedirectTo?: string; captchaToken?: string },
): Promise<{ user: User | null; session: Session | null }> {
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: displayName ? { display_name: displayName } : undefined,
      emailRedirectTo: opts?.emailRedirectTo,
      captchaToken: opts?.captchaToken,
    },
  });
  if (error) throw error;
  return data;
}

export async function verifySignUpCode(
  client: AppSupabaseClient,
  email: string,
  token: string,
): Promise<void> {
  const { error } = await client.auth.verifyOtp({
    email,
    token,
    type: "signup",
  });
  if (error) throw error;
}

export function signInWithOAuth(
  client: AppSupabaseClient,
  provider: Provider,
  opts?: { redirectTo?: string; skipBrowserRedirect?: boolean },
) {
  return client.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: opts?.redirectTo,
      skipBrowserRedirect: opts?.skipBrowserRedirect,
    },
  });
}

export async function signOut(client: AppSupabaseClient): Promise<void> {
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

export async function syncOAuthAvatar(
  client: AppSupabaseClient,
): Promise<void> {
  const { data: userData } = await client.auth.getUser();
  if (!userData.user) return;
  const metadata = userData.user.user_metadata as Record<string, unknown>;
  const providerAvatar =
    (metadata.avatar_url as string | undefined) ??
    (metadata.picture as string | undefined);
  if (!providerAvatar) return;

  const { data: profile } = await client
    .from("profiles")
    .select("avatar_url")
    .eq("id", userData.user.id)
    .single();
  if (profile?.avatar_url) return;

  await client
    .from("profiles")
    .update({ avatar_url: providerAvatar })
    .eq("id", userData.user.id);
}
