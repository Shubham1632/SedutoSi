import { Image, Pressable, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { LegendList } from "@legendapp/list";

import type { Wishlist } from "@acme/app";
import { useToggleWishlist, useWishlist } from "@acme/app";
import { appAlert } from "@acme/ui-native/alert";

import { useResponsive } from "~/lib/use-responsive";

export default function WishlistScreen() {
  const { width } = useResponsive();
  const numColumns =
    width >= 1200 ? 5 : width >= 900 ? 4 : width >= 600 ? 3 : 2;
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
        <>
          <View className="px-4 pt-4 pb-1">
            <Text className="text-muted-foreground text-sm">
              {wishlist.length} movie{wishlist.length !== 1 ? "s" : ""} saved
            </Text>
          </View>

          <LegendList
            data={wishlist}
            keyExtractor={(item) => item.id}
            numColumns={numColumns}
            key={numColumns}
            contentContainerStyle={{
              padding: 16,
              gap: 16,
              width: "100%",
              maxWidth: 1300,
              alignSelf: "center",
            }}
            columnWrapperStyle={{ gap: 16 }}
            renderItem={({ item }: { item: Wishlist }) => {
              const movie = item.movie;
              if (!movie) return null;

              return (
                <View style={{ flex: 1 }}>
                  <Pressable
                    onPress={() => router.push(`/movies/${movie.id}`)}
                    className="bg-card overflow-hidden rounded-xl"
                  >
                    <View>
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
                          className="bg-muted items-center justify-center"
                          style={{ width: "100%", aspectRatio: 2 / 3 }}
                        >
                          <Text style={{ fontSize: 40 }}>🎬</Text>
                        </View>
                      )}
                      <Pressable
                        onPress={() => onRemove(movie.id)}
                        hitSlop={12}
                        className="bg-background/90 absolute top-2 right-2 h-9 w-9 items-center justify-center rounded-full"
                      >
                        <Text style={{ fontSize: 16 }}>♥</Text>
                      </Pressable>
                    </View>
                    <View className="gap-1 p-3">
                      <Text
                        className="text-foreground text-sm font-bold"
                        numberOfLines={1}
                      >
                        {movie.title}
                      </Text>
                      <Text
                        className="text-muted-foreground text-xs"
                        numberOfLines={1}
                      >
                        {[movie.genre, movie.language]
                          .filter(Boolean)
                          .join(" · ")}
                      </Text>
                    </View>
                  </Pressable>
                </View>
              );
            }}
          />
        </>
      )}
    </View>
  );
}
