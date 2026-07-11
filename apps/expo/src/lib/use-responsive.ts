import { useWindowDimensions } from "react-native";

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  const isDesktop = width >= 1024;

  return { width, height, isLandscape, isTablet, isDesktop };
}
