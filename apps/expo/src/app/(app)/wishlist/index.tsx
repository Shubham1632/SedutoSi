import { Image, Pressable, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { LegendList } from "@legendapp/list";

import type { Wishlist } from "@acme/app";
import { useToggleWishlist, useWishlist } from "@acme/app";
import { appAlert } from "@acme/ui-native/alert";
import { Text } from "@acme/ui-native/text";

export default function WishlistScreen() {
  const router = useRouter();
  const { data: wishlist, isLoading } = useWishlist();
  const toggleWishlist = useToggleWishlist();

  function onRemove(movieId: string) {
    appAlert("Remove from wishlist", "Remove this movie from your wishlist?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () =>
          void toggleWishlist.mutateAsync({ movieId, wishlisted: false }),
      },
    ]);
  }

  return (
    <View className="bg-background flex-1">
      <Stack.Screen options={{ title: "Wishlist" }} />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-muted-foreground">Loading wishlist…</Text>
        </View>
      ) : !wishlist?.length ? (
        <View className="flex-1 items-center justify-center gap-2 p-6">
          <Text className="text-foreground text-center text-lg">
            Your wishlist is empty
          </Text>
          <Text className="text-muted-foreground text-center">
            Tap the heart on any movie to save it here.
          </Text>
        </View>
      ) : (
        <LegendList
          data={wishlist}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item }: { item: Wishlist }) => {
            const movie = item.movie;
            if (!movie) return null;

            return (
              <Pressable
                onPress={() => router.push(`/movies/${movie.id}`)}
                className="bg-card flex-row gap-3 overflow-hidden rounded-xl p-3"
              >
                {movie.poster_url ? (
                  <Image
                    source={{ uri: movie.poster_url }}
                    style={{ width: 60, height: 90, borderRadius: 8 }}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    className="bg-muted items-center justify-center rounded-lg"
                    style={{ width: 60, height: 90 }}
                  >
                    <Text style={{ fontSize: 24 }}>🎬</Text>
                  </View>
                )}
                <View className="flex-1 justify-center gap-1">
                  <Text className="text-foreground text-base font-semibold">
                    {movie.title}
                  </Text>
                  <Text className="text-muted-foreground text-sm">
                    {[movie.genre, movie.language].filter(Boolean).join(" · ")}
                  </Text>
                </View>
                <Pressable
                  onPress={() => onRemove(movie.id)}
                  hitSlop={12}
                  className="px-2"
                >
                  <Text style={{ fontSize: 20 }}>♥</Text>
                </Pressable>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}
