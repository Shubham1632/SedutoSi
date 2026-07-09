import { FlatList, Pressable, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import type { Screening } from "@acme/app";
import {
  useCinema,
  useCinemaMovies,
  useScreeningsByCinemaAndMovie,
} from "@acme/app";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("it-IT", {
    weekday: "short",
    month: "short",
    day: "numeric",
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

export default function CinemaMovieScreen() {
  const { cinemaId, movieId, date } = useLocalSearchParams<{
    cinemaId: string;
    movieId: string;
    date?: string;
  }>();
  const router = useRouter();
  const { data: cinema } = useCinema(cinemaId);
  const { data: movies } = useCinemaMovies(cinemaId);
  const { data: screenings, isLoading } = useScreeningsByCinemaAndMovie(
    cinemaId,
    movieId,
    date,
  );
  const movie = movies?.find((entry) => entry.movie.id === movieId)?.movie;

  return (
    <View className="bg-background flex-1">
      <Stack.Screen
        options={{
          title: movie?.title ?? "Showtimes",
        }}
      />

      <View className="border-border gap-2 border-b px-4 py-4">
        <Text className="text-foreground text-xl font-bold">
          {movie?.title ?? "Showtimes"}
        </Text>
        <Text className="text-muted-foreground text-sm">
          {cinema?.name ?? "Cinema"}
          {cinema?.neighborhood ? ` — ${cinema.neighborhood}` : ""}
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-muted-foreground">Loading showtimes…</Text>
        </View>
      ) : !screenings?.length ? (
        <View className="flex-1 items-center justify-center gap-2 p-6">
          <Text className="text-foreground text-center text-lg">
            No showtimes available
          </Text>
          <Text className="text-muted-foreground text-center">
            Try another cinema or check back later.
          </Text>
        </View>
      ) : (
        <View className="flex-1">
          <FlatList
            data={screenings ?? []}
            keyExtractor={(item) => item.id}
            contentContainerClassName="p-4 gap-3"
            renderItem={({ item }: { item: Screening }) => {
              const screen = item.screen as
                | { name?: string; cinema?: { name?: string } }
                | undefined;
              return (
                <Pressable
                  onPress={() => router.push(`/booking/${item.id}`)}
                  className="bg-card gap-3 rounded-xl p-4"
                >
                  <Text className="text-foreground text-base font-semibold">
                    {formatDateTime(item.starts_at)}
                  </Text>
                  {screen?.name ? (
                    <Text className="text-muted-foreground text-sm">
                      Hall: {screen.name}
                    </Text>
                  ) : null}
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
        </View>
      )}
    </View>
  );
}
