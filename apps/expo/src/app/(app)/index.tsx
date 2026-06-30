import { FlatList, Image, Pressable, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";

import { useMovies } from "@acme/app";

export default function HomeScreen() {
  const router = useRouter();
  const { data: movies, isLoading } = useMovies();

  return (
    <View className="bg-background flex-1">
      <Stack.Screen options={{ title: "CinemaMilano" }} />
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-muted-foreground">Loading movies…</Text>
        </View>
      ) : (
        <FlatList
          data={movies}
          keyExtractor={(item) => item.id}
          contentContainerClassName="p-4 gap-4"
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/movies/${item.id}`)}
              className="bg-card rounded-xl overflow-hidden"
            >
              {item.poster_url ? (
                <Image
                  source={{ uri: item.poster_url }}
                  style={{ width: "100%", height: 192 }}
                  resizeMode="cover"
                />
              ) : (
                <View className="bg-muted items-center justify-center" style={{ height: 192 }}>
                  <Text className="text-muted-foreground text-4xl">🎬</Text>
                </View>
              )}
              <View className="p-4 gap-1">
                <Text className="text-foreground text-lg font-bold">{item.title}</Text>
                <Text className="text-muted-foreground text-sm">
                  {[item.genre, `${item.duration_minutes} min`, item.language]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
