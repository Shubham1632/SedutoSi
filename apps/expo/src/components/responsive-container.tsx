import type { ViewProps } from "react-native";
import { View } from "react-native";

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
