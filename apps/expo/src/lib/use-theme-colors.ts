import { useColorScheme } from "react-native";

import { darkColors, lightColors } from "@acme/ui-native/theme-colors";

export function useThemeColors() {
  return useColorScheme() === "dark" ? darkColors : lightColors;
}
