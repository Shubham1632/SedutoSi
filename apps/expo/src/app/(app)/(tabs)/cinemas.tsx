import { useMemo, useState } from "react";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LegendList } from "@legendapp/list";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import type { Cinema } from "@acme/app";
import { useCinemas } from "@acme/app";

import { openMapsSearch } from "~/lib/maps";
import { useResponsive } from "~/lib/use-responsive";
import { useThemeColors } from "~/lib/use-theme-colors";

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

export default function CinemasScreen() {
  const { width } = useResponsive();
  const numColumns = width >= 1200 ? 3 : width >= 700 ? 2 : 1;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const colors = useThemeColors();
  const { data: cinemas, isLoading } = useCinemas();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  const filters = useMemo(() => {
    const neighborhoods = new Set<string>();
    cinemas?.forEach((cinema) => {
      if (cinema.neighborhood) {
        neighborhoods.add(cinema.neighborhood);
      }
    });
    return ["All", ...Array.from(neighborhoods)];
  }, [cinemas]);

  const filteredCinemas = useMemo(() => {
    let list = cinemas ?? [];
    if (activeFilter !== "All") {
      list = list.filter((cinema) => cinema.neighborhood === activeFilter);
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (cinema) =>
          cinema.name.toLowerCase().includes(q) ||
          cinema.address.toLowerCase().includes(q) ||
          cinema.neighborhood?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [cinemas, activeFilter, query]);

  return (
    <View className="bg-background flex-1">
      <View style={{ backgroundColor: colors.header, paddingTop: insets.top }}>
        <View className="flex-row items-start justify-between px-4 pt-4">
          <View className="gap-1">
            <Text className="text-foreground text-2xl font-bold">
              Cinema Halls
            </Text>
            <Text className="text-muted-foreground text-sm">
              {`Milan ${cinemas?.length ? `· ${cinemas.length} locations` : ""}`}
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
              placeholder="Search cinemas…"
              autoFocus
              className="bg-card border-border text-foreground rounded-lg border px-3 py-2"
            />
          </View>
        )}

        <View className="px-4 pt-3 pb-3">
          <FlatList
            data={filters}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item}
            contentContainerStyle={{ gap: 8 }}
            renderItem={({ item }) => {
              const selected = item === activeFilter;
              return (
                <Pressable
                  onPress={() => setActiveFilter(item)}
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
                    {item}
                  </Text>
                </Pressable>
              );
            }}
          />
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-muted-foreground">Loading cinemas…</Text>
        </View>
      ) : filteredCinemas.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-2 p-6">
          <Text className="text-foreground text-center text-lg">
            No cinemas found
          </Text>
          <Text className="text-muted-foreground text-center">
            Try another search or filter.
          </Text>
        </View>
      ) : (
        <LegendList
          data={filteredCinemas}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          key={numColumns}
          contentContainerStyle={{ padding: 16, gap: 16 }}
          columnWrapperStyle={numColumns > 1 ? { gap: 16 } : undefined}
          ListFooterComponent={<View style={{ height: tabBarHeight + 16 }} />}
          renderItem={({ item }: { item: Cinema }) => (
            <View style={numColumns > 1 ? { flex: 1 } : undefined}>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/cinemas/[cinemaId]",
                    params: { cinemaId: item.id },
                  })
                }
                className="bg-card overflow-hidden rounded-2xl border border-gray-300 shadow-sm active:opacity-80 dark:border-gray-700"
              >
                <View className="flex-row items-center gap-3 p-4">
                  <View className="bg-primary/15 h-12 w-12 items-center justify-center rounded-full">
                    <Ionicons
                      name="business"
                      size={22}
                      color={colors.primary}
                    />
                  </View>
                  <View className="flex-1 gap-1">
                    <Text
                      className="text-foreground text-base font-bold"
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    <Pressable
                      onPress={() => openMapsSearch(item.address)}
                      className="flex-row items-center gap-1"
                    >
                      <Ionicons
                        name="location-outline"
                        size={12}
                        color="#9ca3af"
                      />
                      <Text
                        className="text-muted-foreground text-xs"
                        numberOfLines={1}
                      >
                        {item.address}
                      </Text>
                    </Pressable>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
                </View>
                <View className="flex-row items-center justify-between border-t border-gray-300 px-4 py-2.5 dark:border-gray-700">
                  {item.neighborhood ? (
                    <View className="bg-primary/10 rounded-full px-2.5 py-1">
                      <Text className="text-primary text-xs font-semibold">
                        {item.neighborhood}
                      </Text>
                    </View>
                  ) : (
                    <View />
                  )}
                  <View className="flex-row items-center gap-1">
                    <Text className="text-primary text-xs font-semibold">
                      View showtimes
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={12}
                      color={colors.primary}
                    />
                  </View>
                </View>
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}
