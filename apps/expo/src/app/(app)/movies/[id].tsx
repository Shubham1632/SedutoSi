import { Image, ScrollView, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import { useMovie } from "@acme/app";
import { Button } from "@acme/ui-native/button";

export default function MovieScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: movie, isLoading } = useMovie(id);

  if (isLoading || !movie) {
    return (
      <View className="bg-background flex-1 items-center justify-center">
        <Stack.Screen options={{ title: "Loading…" }} />
        <Text className="text-muted-foreground">Loading…</Text>
      </View>
    );
  }

  const meta = [
    movie.genre,
    `${movie.duration_minutes} min`,
    movie.language,
    movie.rating,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <ScrollView className="bg-background flex-1">
      <Stack.Screen options={{ title: movie.title }} />
      <View className="items-center px-8 pt-6">
        {movie.poster_url ? (
          <Image
            source={{ uri: movie.poster_url }}
            style={{
              width: "70%",
              aspectRatio: 2 / 3,
              borderRadius: 16,
            }}
            resizeMode="cover"
          />
        ) : (
          <View
            className="bg-muted items-center justify-center rounded-2xl"
            style={{ width: "70%", aspectRatio: 2 / 3 }}
          >
            <Text style={{ fontSize: 64 }}>🎬</Text>
          </View>
        )}
      </View>
      <View className="gap-4 p-6">
        <View className="gap-1">
          <Text className="text-foreground text-2xl font-bold">
            {movie.title}
          </Text>
          {meta ? (
            <Text className="text-muted-foreground text-sm">{meta}</Text>
          ) : null}
        </View>
        {movie.description ? (
          <Text className="text-foreground leading-6">{movie.description}</Text>
        ) : null}
        <Button
          title="Book Tickets"
          onPress={() => router.push(`/screenings/${movie.id}`)}
        />
      </View>
    </ScrollView>
  );
}
