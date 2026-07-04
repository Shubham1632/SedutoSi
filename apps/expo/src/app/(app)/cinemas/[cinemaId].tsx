import { useMemo, useState } from "react";
import { FlatList, Image, Pressable, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import type { Movie } from "@acme/app";
import { useCinema, useCinemaMovies } from "@acme/app";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function dateKey(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

export default function CinemaDetailScreen() {
  const { cinemaId } = useLocalSearchParams<{ cinemaId: string }>();
  const router = useRouter();
  const { data: cinema, isLoading } = useCinema(cinemaId);
  const { data: movies, isLoading: moviesLoading } = useCinemaMovies(cinemaId);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const allDates = useMemo(() => {
    const dateSet = new Set<string>();
    movies?.forEach((entry) => {
      entry.showtimes.forEach((showtime) => {
        dateSet.add(dateKey(showtime.starts_at));
      });
    });
    return Array.from(dateSet)
      .sort()
      .map((date) => ({ date, label: formatDate(`${date}T00:00:00Z`) }));
  }, [movies]);

  const selectedDateKey = selectedDate ?? allDates[0]?.date ?? null;

  const moviesForDate = useMemo(() => {
    if (!selectedDateKey) return movies ?? [];
    return (movies ?? [])
      .map((entry) => ({
        ...entry,
        showtimes: entry.showtimes.filter(
          (showtime) => dateKey(showtime.starts_at) === selectedDateKey,
        ),
      }))
      .filter((entry) => entry.showtimes.length > 0);
  }, [movies, selectedDateKey]);

  return (
    <View className="bg-background flex-1">
      <Stack.Screen
        options={{
          title: cinema?.name ?? "Cinema",
        }}
      />

      <View className="border-border gap-3 border-b px-4 py-4">
        <Text className="text-foreground text-2xl font-bold">
          {cinema?.name ?? "Cinema"}
        </Text>
        {cinema?.neighborhood ? (
          <Text className="text-primary text-sm font-medium">
            {cinema.neighborhood}
          </Text>
        ) : null}
        {cinema?.address ? (
          <Text className="text-muted-foreground text-sm">
            {cinema.address}
          </Text>
        ) : null}
      </View>

      {isLoading || moviesLoading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-muted-foreground">Loading cinema details…</Text>
        </View>
      ) : !allDates.length ? (
        <View className="flex-1 items-center justify-center gap-2 p-6">
          <Text className="text-foreground text-center text-lg">
            No showtimes available right now
          </Text>
          <Text className="text-muted-foreground text-center">
            Check back later for showtimes.
          </Text>
        </View>
      ) : (
        <View className="flex-1">
          <View className="border-border border-b px-4 py-3">
            <FlatList
              data={allDates}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.date}
              contentContainerStyle={{ gap: 8 }}
              renderItem={({ item }) => {
                const selected = item.date === selectedDateKey;
                return (
                  <Pressable
                    onPress={() => setSelectedDate(item.date)}
                    className={
                      selected
                        ? "bg-primary rounded-full px-4 py-2"
                        : "border-border rounded-full border px-4 py-2"
                    }
                  >
                    <Text
                      className={
                        selected
                          ? "text-primary-foreground text-sm font-medium"
                          : "text-foreground text-sm font-medium"
                      }
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              }}
            />
          </View>

          {moviesForDate.length === 0 ? (
            <View className="flex-1 items-center justify-center gap-2 p-6">
              <Text className="text-foreground text-center text-lg">
                No movies playing on this date
              </Text>
              <Text className="text-muted-foreground text-center">
                Choose another date.
              </Text>
            </View>
          ) : (
            <FlatList
              data={moviesForDate}
              keyExtractor={(item) => item.movie.id}
              contentContainerClassName="p-4 gap-4"
              renderItem={({ item }) => {
                const movie = item.movie as Movie;
                return (
                  <Pressable
                    onPress={() => {
                      const base = `/cinemas/${encodeURIComponent(
                        String(cinemaId),
                      )}/${encodeURIComponent(String(movie.id))}`;
                      const path = selectedDateKey
                        ? `${base}?date=${encodeURIComponent(selectedDateKey)}`
                        : base;
                      router.push(path);
                    }}
                    className="bg-card overflow-hidden rounded-2xl"
                  >
                    {movie.poster_url ? (
                      <Image
                        source={{ uri: movie.poster_url }}
                        style={{ width: "100%", height: 200 }}
                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        className="bg-muted items-center justify-center"
                        style={{ height: 200 }}
                      >
                        <Text style={{ fontSize: 48 }}>🎬</Text>
                      </View>
                    )}
                    <View className="gap-2 p-4">
                      <Text className="text-foreground text-lg font-bold">
                        {movie.title}
                      </Text>
                      <Text className="text-muted-foreground text-sm">
                        {[movie.genre, movie.language]
                          .filter(Boolean)
                          .join(" · ")}
                      </Text>
                      <View className="flex-row items-center justify-between pt-2">
                        <Text className="text-muted-foreground text-sm">
                          Showtimes
                        </Text>
                        <Text className="text-primary text-sm font-medium">
                          {item.showtimes.length} times
                        </Text>
                      </View>
                      <View className="flex-row flex-wrap gap-2 pt-3">
                        {item.showtimes.slice(0, 3).map((showtime) => (
                          <View
                            key={showtime.id}
                            className="bg-muted rounded-full px-3 py-2"
                          >
                            <Text className="text-foreground text-xs">
                              {formatTime(showtime.starts_at)}
                            </Text>
                          </View>
                        ))}
                      </View>
                      {item.showtimes.length > 3 ? (
                        <Text className="text-muted-foreground pt-2 text-xs">
                          +{item.showtimes.length - 3} more
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              }}
            />
          )}
        </View>
      )}
    </View>
  );
}
