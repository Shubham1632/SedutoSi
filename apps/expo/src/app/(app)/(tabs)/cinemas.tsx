import { useMemo, useState } from "react";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LegendList } from "@legendapp/list";

import type { Cinema } from "@acme/app";
import { useCinemas } from "@acme/app";

function SearchButton({
  active,
  onPress,
}: {
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} hitSlop={12} style={{ paddingHorizontal: 8 }}>
      <Text className="text-foreground" style={{ fontSize: 20 }}>
        {active ? "✕" : "🔍"}
      </Text>
    </Pressable>
  );
}

export default function CinemasScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
    <View className="bg-background flex-1" style={{ paddingTop: insets.top }}>
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

      <View className="px-4 pt-3">
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
          contentContainerStyle={{ padding: 16, gap: 16 }}
          renderItem={({ item }: { item: Cinema }) => (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/cinemas/[cinemaId]",
                  params: { cinemaId: item.id },
                })
              }
              className="bg-background border-border overflow-hidden rounded-xl border"
            >
              <View className="gap-2 p-4">
                <View className="flex-row items-center justify-between">
                  <Text className="text-foreground text-base font-semibold">
                    {item.name}
                  </Text>
                </View>
                <Text
                  className="text-muted-foreground text-sm"
                  numberOfLines={2}
                >
                  {item.address}
                </Text>
                {item.neighborhood ? (
                  <Text className="text-primary text-sm font-medium">
                    {item.neighborhood}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
