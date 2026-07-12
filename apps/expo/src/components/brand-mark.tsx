import { Image, View } from "react-native";

import { Text } from "@acme/ui-native/text";

import logo from "../../assets/logo.png";

const SIZES = {
  sm: { logo: { width: 132, height: 121 }, text: "text-3xl", gap: 6 },
  lg: { logo: { width: 220, height: 202 }, text: "text-5xl", gap: 12 },
} as const;

export function BrandMark({ size = "sm" }: { size?: keyof typeof SIZES }) {
  const s = SIZES[size];
  return (
    <View style={{ width: "100%", alignItems: "center", gap: s.gap }}>
      <Image source={logo} style={s.logo} resizeMode="contain" />
      <Text className={`${s.text} font-bold`}>
        Seduto
        <Text className={`text-primary ${s.text} font-bold`}>Sì</Text>
      </Text>
    </View>
  );
}
