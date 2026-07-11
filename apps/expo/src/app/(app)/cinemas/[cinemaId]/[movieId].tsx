import { FlatList, Pressable, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import type { Screening } from "@acme/app";
import {
  useCinema,
  useCinemaMovies,
  useScreeningsByCinemaAndMovie,
} from "@acme/app";

import { ResponsiveContainer } from "~/components/responsive-container";
import { useResponsive } from "~/lib/use-responsive";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CinemaMovieScreen() {
  const { cinemaId, movieId, date } = useLocalSearchParams<{
    cinemaId: string;
    movieId: string;
    date?: string;
  }>();
  const { width } = useResponsive();
  const numColumns = width >= 1200 ? 3 : width >= 800 ? 2 : 1;
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
        <ResponsiveContainer maxWidth={1000} style={{ gap: 8 }}>
          <Text className="text-foreground text-xl font-bold">
            {movie?.title ?? "Showtimes"}
          </Text>
          <Text className="text-muted-foreground text-sm">
            {cinema?.name ?? "Cinema"}
            {cinema?.neighborhood ? ` — ${cinema.neighborhood}` : ""}
          </Text>
        </ResponsiveContainer>
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
            data={screenings}
            keyExtractor={(item) => item.id}
            numColumns={numColumns}
            key={numColumns}
            contentContainerStyle={{
              padding: 16,
              gap: 12,
              width: "100%",
              maxWidth: 1000,
              alignSelf: "center",
            }}
            columnWrapperStyle={numColumns > 1 ? { gap: 12 } : undefined}
            renderItem={({ item }: { item: Screening }) => {
              const screen = item.screen as
                | { name?: string; cinema?: { name?: string } }
                | undefined;
              return (
                <View style={numColumns > 1 ? { flex: 1 } : undefined}>
                  <Pressable
                    onPress={() => router.push(`/booking/${item.id}`)}
                    className="bg-card gap-3 rounded-2xl border border-gray-300 p-4 shadow-sm active:opacity-80 dark:border-gray-700"
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
                </View>
              );
            }}
          />
        </View>
      )}
    </View>
  );
}
