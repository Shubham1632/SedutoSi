import { FlatList, Text, View } from "react-native";
import { Stack } from "expo-router";

import type { Booking } from "@acme/app";
import { useMyBookings } from "@acme/app";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("it-IT", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function BookingsScreen() {
  const { data: bookings, isLoading } = useMyBookings();

  return (
    <View className="bg-background flex-1">
      <Stack.Screen options={{ title: "My Bookings" }} />
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-muted-foreground">Loading…</Text>
        </View>
      ) : !bookings?.length ? (
        <View className="flex-1 items-center justify-center gap-2 p-6">
          <Text className="text-foreground text-lg text-center">No bookings yet</Text>
          <Text className="text-muted-foreground text-center">
            Book a movie from the home screen.
          </Text>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id}
          contentContainerClassName="p-4 gap-3"
          renderItem={({ item }: { item: Booking }) => {
            const screening = item.screening as { starts_at?: string; movie?: { title?: string }; screen?: { cinema?: { name?: string } } } | undefined;
            return (
              <View className="bg-card rounded-xl p-4 gap-2">
                <View className="flex-row justify-between items-start gap-2">
                  <Text className="text-foreground font-bold text-base flex-1">
                    {screening?.movie?.title ?? "Movie"}
                  </Text>
                  <View
                    style={{
                      backgroundColor: item.status === "confirmed" ? "#dcfce7" : "#fee2e2",
                      borderRadius: 999,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                    }}
                  >
                    <Text
                      style={{
                        color: item.status === "confirmed" ? "#15803d" : "#dc2626",
                        fontSize: 11,
                        fontWeight: "600",
                      }}
                    >
                      {item.status}
                    </Text>
                  </View>
                </View>
                {screening?.starts_at && (
                  <Text className="text-muted-foreground text-sm">
                    {formatDateTime(screening.starts_at)}
                  </Text>
                )}
                {screening?.screen?.cinema?.name && (
                  <Text className="text-muted-foreground text-sm">
                    {screening.screen.cinema.name}
                  </Text>
                )}
                <View className="flex-row justify-between pt-1">
                  <Text className="text-muted-foreground text-sm">
                    {item.seats_count} seat{item.seats_count !== 1 ? "s" : ""}
                  </Text>
                  <Text className="text-foreground font-semibold">
                    €{Number(item.total_price).toFixed(2)}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}
