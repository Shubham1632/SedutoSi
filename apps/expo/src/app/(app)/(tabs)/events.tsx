import { Text, View } from "react-native";
import { Stack } from "expo-router";

function SearchButtonPlaceholder() {
  return (
    <Text style={{ fontSize: 20, color: "#fff", paddingHorizontal: 8 }}>
      🔍
    </Text>
  );
}

export default function EventsScreen() {
  return (
    <View className="bg-background flex-1 items-center justify-center gap-2 p-6">
      <Stack.Screen
        options={{ headerRight: () => <SearchButtonPlaceholder /> }}
      />
      <Text className="text-4xl">🎟️</Text>
      <Text className="text-foreground text-lg font-semibold">Live Events</Text>
      <Text className="text-muted-foreground text-center text-sm">
        Coming soon.
      </Text>
    </View>
  );
}
