import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import { useSession } from "@acme/api";
import { useMovie, useToggleWishlist, useWishlist } from "@acme/app";
import { Button } from "@acme/ui-native/button";

import { ResponsiveContainer } from "~/components/responsive-container";
import { useResponsive } from "~/lib/use-responsive";

export default function MovieScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useSession();
  const { width } = useResponsive();
  const isWide = width >= 700;
  const { data: movie, isLoading } = useMovie(id);
  const { data: wishlist } = useWishlist();
  const toggleWishlist = useToggleWishlist();

  if (isLoading || !movie) {
    return (
      <View className="bg-background flex-1 items-center justify-center">
        <Stack.Screen options={{ title: "Loading…" }} />
        <Text className="text-muted-foreground">Loading…</Text>
      </View>
    );
  }

  const isWishlisted = wishlist?.some((w) => w.movie_id === movie.id) ?? false;

  function onToggleWishlist() {
    if (!user) {
      router.push("/sign-in");
      return;
    }
    if (!movie) return;
    toggleWishlist.mutate({ movieId: movie.id, wishlisted: !isWishlisted });
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
      <ResponsiveContainer
        maxWidth={900}
        style={
          isWide ? { flexDirection: "row", gap: 24, padding: 24 } : undefined
        }
      >
        <View style={isWide ? { width: 280 } : undefined}>
          <View className="items-center px-8 pt-6">
            <View style={{ width: isWide ? "100%" : "70%" }}>
              {movie.poster_url ? (
                <Image
                  source={{ uri: movie.poster_url }}
                  style={{
                    width: "100%",
                    aspectRatio: 2 / 3,
                    borderRadius: 16,
                  }}
                  resizeMode="cover"
                />
              ) : (
                <View
                  className="bg-muted items-center justify-center rounded-2xl"
                  style={{ width: "100%", aspectRatio: 2 / 3 }}
                >
                  <Text style={{ fontSize: 64 }}>🎬</Text>
                </View>
              )}
              <Pressable
                onPress={onToggleWishlist}
                hitSlop={12}
                className="bg-background/90 absolute top-2 right-2 h-10 w-10 items-center justify-center rounded-full"
              >
                <Text style={{ fontSize: 20 }}>
                  {isWishlisted ? "♥" : "♡"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
        <View style={isWide ? { flex: 1 } : undefined}>
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
              <Text className="text-foreground leading-6">
                {movie.description}
              </Text>
            ) : null}
            <Button
              title="Book Tickets"
              onPress={() => router.push(`/screenings/${movie.id}`)}
            />
          </View>
        </View>
      </ResponsiveContainer>
    </ScrollView>
  );
}
