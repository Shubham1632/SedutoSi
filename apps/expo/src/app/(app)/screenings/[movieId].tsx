import { useMemo, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import type { Screening } from "@acme/app";
import { useMovie, useScreenings } from "@acme/app";

import { ResponsiveContainer } from "~/components/responsive-container";
import { useResponsive } from "~/lib/use-responsive";

function formatScreeningParts(iso: string) {
  const date = new Date(iso);
  const dateLabel = date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const timeLabel = date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return { dateLabel, timeLabel };
}

type SortKey = "time" | "price" | "seats";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "time", label: "Time" },
  { key: "price", label: "Price" },
  { key: "seats", label: "Seats" },
];

function sortScreenings(screenings: Screening[], sortBy: SortKey) {
  const sorted = [...screenings];
  switch (sortBy) {
    case "price":
      sorted.sort((a, b) => Number(a.price) - Number(b.price));
      break;
    case "seats":
      sorted.sort((a, b) => b.available_seats - a.available_seats);
      break;
    case "time":
    default:
      sorted.sort(
        (a, b) =>
          new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
      );
      break;
  }
  return sorted;
}

export default function ScreeningsScreen() {
  const { movieId } = useLocalSearchParams<{ movieId: string }>();
  const { width } = useResponsive();
  const numColumns = width >= 1200 ? 3 : width >= 800 ? 2 : 1;
  const router = useRouter();
  const { data: movie } = useMovie(movieId);
  const {
    data: screenings,
    isLoading,
    isError,
    refetch,
  } = useScreenings(movieId);
  const [sortBy, setSortBy] = useState<SortKey>("time");

  const sortedScreenings = useMemo(
    () => sortScreenings(screenings ?? [], sortBy),
    [screenings, sortBy],
  );

  return (
    <View className="bg-background flex-1">
      <Stack.Screen options={{ title: movie?.title ?? "Select Showtime" }} />
      {!isLoading && screenings?.length ? (
        <ResponsiveContainer maxWidth={960}>
          <View className="flex-row gap-2 px-4 pt-4 pb-1">
            <Text className="text-muted-foreground self-center text-sm">
              Sort by
            </Text>
            {SORT_OPTIONS.map((option) => {
              const selected = option.key === sortBy;
              return (
                <Pressable
                  key={option.key}
                  onPress={() => setSortBy(option.key)}
                  className={
                    selected
                      ? "bg-primary rounded-full px-3 py-1.5"
                      : "border-border rounded-full border px-3 py-1.5"
                  }
                >
                  <Text
                    className={
                      selected
                        ? "text-primary-foreground text-xs font-medium"
                        : "text-foreground text-xs font-medium"
                    }
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ResponsiveContainer>
      ) : null}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-muted-foreground">Loading showtimes…</Text>
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center gap-3 p-6">
          <Text className="text-foreground text-center text-lg">
            Could not load showtimes
          </Text>
          <Text className="text-muted-foreground text-center text-sm">
            Check your connection and try again.
          </Text>
          <Pressable
            onPress={() => void refetch()}
            className="bg-primary rounded-full px-6 py-2.5"
          >
            <Text className="text-primary-foreground font-medium">Retry</Text>
          </Pressable>
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
          data={sortedScreenings}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          key={numColumns}
          contentContainerStyle={{
            padding: 16,
            gap: 12,
            width: "100%",
            maxWidth: 960,
            alignSelf: "center",
          }}
          columnWrapperStyle={numColumns > 1 ? { gap: 12 } : undefined}
          renderItem={({ item }: { item: Screening }) => {
            const screen = item.screen as
              | {
                  name: string;
                  cinema?: { name: string; neighborhood?: string };
                }
              | undefined;
            const { dateLabel, timeLabel } = formatScreeningParts(
              item.starts_at,
            );
            const lowSeats = item.available_seats <= 10;
            return (
              <View style={numColumns > 1 ? { flex: 1 } : undefined}>
                <Pressable
                  onPress={() => router.push(`/booking/${item.id}`)}
                  className="bg-card gap-3 rounded-2xl border border-gray-300 p-4 shadow-sm active:opacity-80 dark:border-gray-700"
                >
                  <View className="flex-row items-center gap-3">
                    <View
                      className="bg-primary/15 items-center justify-center rounded-xl px-3 py-2"
                      style={{ minWidth: 72 }}
                    >
                      <Text className="text-primary text-base font-extrabold">
                        {timeLabel}
                      </Text>
                      <Text className="text-primary/80 text-[10px] font-medium uppercase">
                        {dateLabel}
                      </Text>
                    </View>
                    <View className="flex-1 gap-1">
                      {screen?.cinema && (
                        <View className="flex-row items-center gap-1">
                          <Ionicons name="business" size={13} color="#9ca3af" />
                          <Text
                            className="text-foreground text-sm font-semibold"
                            numberOfLines={1}
                          >
                            {screen.cinema.name}
                          </Text>
                        </View>
                      )}
                      {screen?.cinema?.neighborhood ? (
                        <Text
                          className="text-muted-foreground text-xs"
                          numberOfLines={1}
                        >
                          {screen.cinema.neighborhood}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  <View className="flex-row items-center justify-between border-t border-gray-300 pt-3 dark:border-gray-700">
                    <Text className="text-foreground text-lg font-extrabold">
                      €{Number(item.price).toFixed(2)}
                    </Text>
                    <View className="flex-row items-center gap-1.5">
                      <View
                        className={
                          lowSeats
                            ? "bg-destructive h-2 w-2 rounded-full"
                            : "bg-primary h-2 w-2 rounded-full"
                        }
                      />
                      <Text
                        className={
                          lowSeats
                            ? "text-destructive text-xs font-semibold"
                            : "text-muted-foreground text-xs font-medium"
                        }
                      >
                        {item.available_seats} left
                      </Text>
                    </View>
                  </View>
                </Pressable>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}
