import { Linking, Platform } from "react-native";

export function openMapsSearch(query: string): void {
  const encoded = encodeURIComponent(query);
  const url = Platform.select({
    ios: `maps://?q=${encoded}`,
    android: `geo:0,0?q=${encoded}`,
    default: `https://maps.google.com/?q=${encoded}`,
  });

  Linking.openURL(url).catch(() => {
    Linking.openURL(`https://maps.google.com/?q=${encoded}`).catch(() => {
      /* no-op: maps app unavailable and web fallback failed */
    });
  });
}
