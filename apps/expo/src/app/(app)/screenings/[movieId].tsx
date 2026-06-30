import { FlatList, Pressable, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import type { Screening } from "@acme/app";
import { useMovie, useScreenings } from "@acme/app";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("it-IT", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ScreeningsScreen() {
  const { movieId } = useLocalSearchParams<{ movieId: string }>();
  const router = useRouter();
  const { data: movie } = useMovie(movieId);
  const { data: screenings, isLoading } = useScreenings(movieId);

  return (
    <View className="bg-background flex-1">
      <Stack.Screen options={{ title: movie?.title ?? "Select Showtime" }} />
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-muted-foreground">Loading showtimes…</Text>
        </View>
      ) : !screenings?.length ? (
        <View className="flex-1 items-center justify-center gap-2 p-6">
          <Text className="text-foreground text-center text-lg">
            No upcoming shows
          </Text>
          <Text className="text-muted-foreground text-center">
            Check back later.
          </Text>
        </View>
      ) : (
        <FlatList
          data={screenings}
          keyExtractor={(item) => item.id}
          contentContainerClassName="p-4 gap-3"
          renderItem={({ item }: { item: Screening }) => {
            const screen = item.screen as
              | {
                  name: string;
                  cinema?: { name: string; neighborhood?: string };
                }
              | undefined;
            return (
              <Pressable
                onPress={() => router.push(`/booking/${item.id}`)}
                className="bg-card gap-2 rounded-xl p-4"
              >
                <Text className="text-foreground text-base font-semibold">
                  {formatDateTime(item.starts_at)}
                </Text>
                {screen?.cinema && (
                  <Text className="text-muted-foreground text-sm">
                    {screen.cinema.name}
                    {screen.cinema.neighborhood
                      ? ` — ${screen.cinema.neighborhood}`
                      : ""}
                  </Text>
                )}
                <View className="flex-row items-center justify-between pt-1">
                  <Text className="text-primary text-base font-bold">
                    €{Number(item.price).toFixed(2)}
                  </Text>
                  <Text className="text-muted-foreground text-sm">
                    {item.available_seats} seats left
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}
