import "react-native-url-polyfill/auto";

import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@acme/api/types";

import { clientEnv } from "./env";

/**
 * Native Supabase client. Sessions persist via AsyncStorage and auto-refresh.
 * (AsyncStorage rather than expo-secure-store: Supabase session payloads can
 * exceed SecureStore's 2 KB per-value limit.)
 */
export const supabase = createClient<Database>(
  clientEnv.SUPABASE_URL,
  clientEnv.SUPABASE_ANON_KEY,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: "pkce",
    },
  },
);

// Supabase's recommended RN wiring: pause the auto-refresh timer while
// backgrounded so it doesn't race a foreground sign-in/out with a token
// refresh (which otherwise shows up as occasional multi-second stalls).
AppState.addEventListener("change", (state) => {
  if (state === "active") {
    void supabase.auth.startAutoRefresh();
  } else {
    void supabase.auth.stopAutoRefresh();
  }
});
