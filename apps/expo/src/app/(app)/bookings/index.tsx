import { FlatList, Image, Pressable, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";

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
  const router = useRouter();
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
          <Text className="text-foreground text-center text-lg">
            No bookings yet
          </Text>
          <Text className="text-muted-foreground text-center">
            Book a movie from the home screen.
          </Text>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id}
          contentContainerClassName="p-4 gap-4"
          renderItem={({ item }: { item: Booking }) => {
            const screening = item.screening as
              | {
                  starts_at?: string;
                  movie?: { title?: string; poster_url?: string | null };
                  screen?: { cinema?: { name?: string } };
                }
              | undefined;
            const isConfirmed = item.status === "confirmed";

            return (
              <Pressable
                onPress={() => router.push(`/bookings/${item.id}`)}
                className="bg-card border-border overflow-hidden rounded-2xl border active:opacity-80"
                style={{
                  shadowColor: "#000",
                  shadowOpacity: 0.08,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 3 },
                  elevation: 2,
                }}
              >
                <View className="flex-row">
                  {screening?.movie?.poster_url ? (
                    <Image
                      source={{ uri: screening.movie.poster_url }}
                      style={{ width: 96, height: "auto" }}
                      className="self-stretch"
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      className="bg-muted items-center justify-center"
                      style={{ width: 96 }}
                    >
                      <Text style={{ fontSize: 32 }}>🎬</Text>
                    </View>
                  )}

                  <View className="flex-1 justify-between gap-2 p-4">
                    <View className="flex-row items-start justify-between gap-2">
                      <Text
                        className="text-foreground flex-1 text-base font-bold"
                        numberOfLines={2}
                      >
                        {screening?.movie?.title ?? "Movie"}
                      </Text>
                      <View
                        style={{
                          backgroundColor: isConfirmed ? "#dcfce7" : "#fee2e2",
                          borderRadius: 999,
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                        }}
                      >
                        <Text
                          style={{
                            color: isConfirmed ? "#15803d" : "#dc2626",
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
                      <Text
                        className="text-muted-foreground text-sm"
                        numberOfLines={1}
                      >
                        {screening.screen.cinema.name}
                      </Text>
                    )}

                    <View className="flex-row items-center justify-between pt-1">
                      <Text className="text-muted-foreground text-sm">
                        {item.seats_count} seat
                        {item.seats_count !== 1 ? "s" : ""}
                      </Text>
                      <Text className="text-primary font-semibold">
                        €{Number(item.total_price).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}
