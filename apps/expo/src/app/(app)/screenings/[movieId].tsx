import { useMemo, useState } from "react";
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
