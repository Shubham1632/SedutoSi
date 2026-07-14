import { useEffect } from "react";
import { useColorScheme } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";

import { SupabaseProvider, useSession } from "@acme/api";
import { AlertHost } from "@acme/ui-native/alert";
import { darkColors, lightColors } from "@acme/ui-native/theme-colors";

import { supabase } from "~/lib/supabase";
import { ThemePreferenceProvider } from "~/lib/theme-preference";

import "../styles.css";

const AppLightTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, ...lightColors },
};

const AppDarkTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, ...darkColors },
};

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
      <ThemePreferenceProvider>
        <SupabaseProvider client={supabase}>
          <ThemeProvider value={isDark ? AppDarkTheme : AppLightTheme}>
            <AuthGate />
            <StatusBar style={isDark ? "light" : "dark"} />
            <AlertHost />
          </ThemeProvider>
        </SupabaseProvider>
      </ThemePreferenceProvider>
    </SafeAreaProvider>
  );
}
