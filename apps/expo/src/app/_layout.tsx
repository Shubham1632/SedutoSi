/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { useEffect } from "react";
import { useColorScheme } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";

import { SupabaseProvider, useSession } from "@acme/api";
import { AlertHost } from "@acme/ui-native/alert";
import { darkColors, lightColors } from "@acme/ui-native/theme-colors";

import { supabase } from "~/lib/supabase";

import "../styles.css";
// Side-effect: installed extensions register their native boot handlers
// (e.g. notifications' foreground handler) via the generated registry.
import "~/ext/registry.generated";

const AppLightTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, ...lightColors },
};

const AppDarkTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, ...darkColors },
};

/**
 * Redirects between the (auth) and (app) route groups based on session state.
 * Route groups (parens) don't appear in the URL, so targets are "/sign-in" / "/".
 */
function AuthGate() {
  const { user, isLoading } = useSession();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === "(auth)";
    if (!user && !inAuthGroup) {
      router.replace("/sign-in");
    } else if (user && inAuthGroup) {
      router.replace("/");
    }
  }, [user, isLoading, segments, router]);

  return <Slot />;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <SafeAreaProvider>
      <SupabaseProvider client={supabase}>
        <ThemeProvider value={isDark ? AppDarkTheme : AppLightTheme}>
          <AuthGate />
          <StatusBar style={isDark ? "light" : "dark"} />
          <AlertHost />
        </ThemeProvider>
      </SupabaseProvider>
    </SafeAreaProvider>
  );
}
