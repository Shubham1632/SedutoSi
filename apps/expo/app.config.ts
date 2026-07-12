import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "SedutoSi",
  slug: "sedutosi",
  scheme: process.env.EXPO_PUBLIC_AUTH_SCHEME ?? "sedutosi",
  version: "0.1.0",
  orientation: "portrait",
  icon: "./assets/icon-light.png",
  userInterfaceStyle: "automatic",
  updates: {
    fallbackToCacheTimeout: 0,
  },
  newArchEnabled: true,
  assetBundlePatterns: ["**/*"],
  ios: {
    bundleIdentifier: "com.example.sedutosi",
    supportsTablet: true,
    icon: {
      light: "./assets/icon-light.png",
      dark: "./assets/icon-dark.png",
    },
  },
  android: {
    package: "com.example.sedutosi",
    adaptiveIcon: {
      foregroundImage: "./assets/logo-padded.png",
      backgroundColor: "#eeeae1",
    },
    edgeToEdgeEnabled: true,
  },
  extra: {
    eas: {
      projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
    },
  },
  experiments: {
    tsconfigPaths: true,
    typedRoutes: true,
    reactCanary: true,
    reactCompiler: true,
  },
  plugins: [
    "expo-router",
    "expo-notifications",
    "expo-secure-store",
    "expo-web-browser",
    [
      "expo-image-picker",
      {
        photosPermission:
          "SedutoSi uses your photo library to pick a cover image for a live event you're creating.",
      },
    ],
    [
      "expo-splash-screen",
      {
        backgroundColor: "#eeeae1",
        image: "./assets/logo-padded.png",
        dark: {
          backgroundColor: "#22273f",
          image: "./assets/logo-padded.png",
        },
      },
    ],
  ],
});
