import { parseClientEnv } from "@acme/config/env";

export const clientEnv = parseClientEnv({
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  APP_URL: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000",
});

export { extEnv } from "../ext/env.generated";
