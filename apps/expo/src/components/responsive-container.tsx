import type { ViewProps } from "react-native";
import { View } from "react-native";

/**
 * Centers content and caps its width on tablet/desktop landscape so text and
 * cards don't stretch edge-to-edge on big screens. Style-only (no className)
 * so it composes safely around children that mix className + style.
 */
export function ResponsiveContainer({
  maxWidth = 640,
  style,
  ...props
}: ViewProps & { maxWidth?: number }) {
  return (
    <View
      style={[{ width: "100%", maxWidth, alignSelf: "center" }, style]}
      {...props}
    />
  );
}
