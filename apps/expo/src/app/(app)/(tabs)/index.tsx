import { useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useRouter } from "expo-router";
import { LegendList } from "@legendapp/list";

import type { Movie } from "@acme/app";
import { useMovies } from "@acme/app";

import { useResponsive } from "~/lib/use-responsive";

function SearchButton({
  active,
  onPress,
}: {
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} hitSlop={12} style={{ paddingHorizontal: 8 }}>
      <Ionicons name={active ? "close" : "search"} size={20} color="#9ca3af" />
    </Pressable>
  );
}

export default function MoviesScreen() {
  const { width } = useResponsive();
  const numColumns =
    width >= 1200 ? 5 : width >= 900 ? 4 : width >= 600 ? 3 : 2;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { data: movies, isLoading } = useMovies();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  const filters = useMemo(() => {
    const languages = new Set<string>();
    movies?.forEach((m) => m.language && languages.add(m.language));
    return ["All", ...Array.from(languages)];
  }, [movies]);

  const filteredMovies = useMemo(() => {
    let list = movies ?? [];
    if (activeFilter !== "All") {
      list = list.filter((m) => m.language === activeFilter);
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((m) => m.title.toLowerCase().includes(q));
    }
    return list;
  }, [movies, activeFilter, query]);

  return (
    <View className="bg-background flex-1" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-start justify-between px-4 pt-4">
        <View className="gap-1">
          <Text className="text-foreground text-2xl font-bold">
            Now Showing
          </Text>
          <Text className="text-muted-foreground text-sm">
            Milan {movies?.length ? `· ${movies.length} Movies` : ""}
          </Text>
        </View>
        <SearchButton
          active={searchOpen}
          onPress={() => {
            setSearchOpen((open) => !open);
            setQuery("");
          }}
        />
      </View>

      {searchOpen && (
        <View className="px-4 pt-3">
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search movies…"
            autoFocus
            className="bg-card border-border text-foreground rounded-lg border px-3 py-2"
          />
        </View>
      )}

      <View
        style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 }}
      >
        <FlatList
          data={filters}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item}
          extraData={activeFilter}
          contentContainerStyle={{ gap: 8 }}
          renderItem={({ item }) => {
            const selected = item === activeFilter;
            return (
              <Pressable
                onPress={() => setActiveFilter(item)}
                className={
                  selected
                    ? "bg-primary rounded-[20px] px-4 py-2"
                    : "border-border rounded-[20px] border px-4 py-2"
                }
              >
                <Text
                  className={
                    selected
                      ? "text-primary-foreground text-sm font-medium"
                      : "text-foreground text-sm font-medium"
                  }
                >
                  {item}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-muted-foreground">Loading movies…</Text>
        </View>
      ) : filteredMovies.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-2 p-6">
          <Text className="text-foreground text-center text-lg">
            No movies found
          </Text>
        </View>
      ) : (
        <LegendList
          data={filteredMovies}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          key={numColumns}
          contentContainerStyle={{ padding: 16, gap: 16 }}
          columnWrapperStyle={{ gap: 16 }}
          ListFooterComponent={<View style={{ height: tabBarHeight + 16 }} />}
          renderItem={({ item }: { item: Movie }) => (
            <Pressable
              onPress={() => router.push(`/movies/${item.id}`)}
              className="bg-card flex-1 overflow-hidden rounded-xl"
            >
              <View>
                {item.poster_url ? (
                  <Image
                    source={{ uri: item.poster_url }}
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
                    style={{ height: 220 }}
                  >
                    <Ionicons name="film-outline" size={36} color="#9ca3af" />
                  </View>
                )}
                {item.rating ? (
                  <View className="bg-foreground/80 absolute top-2 left-2 rounded-md px-2 py-0.5">
                    <Text className="text-background text-xs font-semibold">
                      {item.rating}
                    </Text>
                  </View>
                ) : null}
              </View>
              <View className="gap-1 p-3">
                <Text
                  className="text-foreground text-sm font-bold"
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                <Text
                  className="text-muted-foreground text-xs"
                  numberOfLines={1}
                >
                  {[item.genre, item.language].filter(Boolean).join(" · ")}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
