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
import { useRouter } from "expo-router";
import { LegendList } from "@legendapp/list";

import type { LiveEvent } from "@acme/app";
import { useEvents } from "@acme/app";

import { useResponsive } from "~/lib/use-responsive";

const CATEGORY_ICON: Record<string, string> = {
  music: "🎵",
  concert: "🎵",
  theater: "🎭",
  theatre: "🎭",
  comedy: "🎤",
  sports: "⚽",
  art: "🎨",
  exhibition: "🖼️",
  festival: "🎉",
  food: "🍝",
  film: "🎬",
  workshop: "🛠️",
};

function categoryIcon(category: string) {
  return CATEGORY_ICON[category.toLowerCase()] ?? "🎟️";
}

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

function formatEventDate(startsAt: string) {
  const date = new Date(startsAt);
  const dateLabel = date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const timeLabel = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${dateLabel} · ${timeLabel}`;
}

export default function EventsScreen() {
  const { width } = useResponsive();
  const numColumns =
    width >= 1200 ? 4 : width >= 900 ? 3 : width >= 600 ? 2 : 1;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: events, isLoading } = useEvents();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  const filters = useMemo(() => {
    const categories = new Set<string>();
    events?.forEach((event) => categories.add(event.category));
    return ["All", ...Array.from(categories)];
  }, [events]);

  const filteredEvents = useMemo(() => {
    let list = events ?? [];
    if (activeFilter !== "All") {
      list = list.filter((event) => event.category === activeFilter);
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (event) =>
          event.title.toLowerCase().includes(q) ||
          (event.description?.toLowerCase().includes(q) ?? false) ||
          (event.location?.toLowerCase().includes(q) ?? false),
      );
    }
    return list;
  }, [events, activeFilter, query]);

  return (
    <View className="bg-background flex-1" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-start justify-between px-4 pt-4">
        <View className="gap-1">
          <Text className="text-foreground text-2xl font-bold">
            Live Events
          </Text>
          <Text className="text-muted-foreground text-sm">
            {`Milan ${events?.length ? `· ${events.length} upcoming` : ""}`}
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
            placeholder="Search events…"
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

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-muted-foreground">Loading events…</Text>
        </View>
      ) : filteredEvents.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-2 p-6">
          <Text className="text-foreground text-center text-lg">
            No events found
          </Text>
          <Text className="text-muted-foreground text-center">
            Try another search or filter.
          </Text>
        </View>
      ) : (
        <LegendList
          data={filteredEvents}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          key={numColumns} // force remount when column count changes (RN requirement)
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: insets.bottom + 90,
            gap: 16,
          }}
          columnWrapperStyle={numColumns > 1 ? { gap: 16 } : undefined}
          renderItem={({ item }: { item: LiveEvent }) => (
            <View style={numColumns > 1 ? { flex: 1 } : undefined}>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/events/[eventId]",
                    params: { eventId: item.id },
                  })
                }
                className="bg-card overflow-hidden rounded-2xl border border-gray-300 shadow-sm active:opacity-80 dark:border-gray-700"
              >
                <View>
                  {item.image_url ? (
                    <Image
                      source={{ uri: item.image_url }}
                      style={{ width: "100%", height: 140 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      className="bg-muted"
                      style={{
                        width: "100%",
                        height: 140,
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 4,
                      }}
                    >
                      <Text style={{ fontSize: 32, opacity: 0.4 }}>🖼️</Text>
                      <Text className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
                        No image yet
                      </Text>
                    </View>
                  )}
                  <View className="bg-background/90 absolute top-2 left-2 flex-row items-center gap-1 rounded-full px-2.5 py-1">
                    <Text style={{ fontSize: 11 }}>
                      {categoryIcon(item.category)}
                    </Text>
                    <Text className="text-foreground text-[10px] font-bold tracking-wide uppercase">
                      {item.category}
                    </Text>
                  </View>
                  <View
                    className={
                      item.price != null
                        ? "bg-background/90 absolute top-2 right-2 rounded-full px-2.5 py-1"
                        : "bg-primary absolute top-2 right-2 rounded-full px-2.5 py-1"
                    }
                  >
                    <Text
                      className={
                        item.price != null
                          ? "text-foreground text-xs font-bold"
                          : "text-primary-foreground text-xs font-bold"
                      }
                    >
                      {item.price != null
                        ? `€${item.price.toFixed(2)}`
                        : "FREE"}
                    </Text>
                  </View>
                </View>
                <View className="gap-1.5 p-4">
                  <Text
                    className="text-foreground text-base font-bold"
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <Text className="text-muted-foreground text-xs">
                    🕐 {formatEventDate(item.starts_at)}
                  </Text>
                  {item.location ? (
                    <Text
                      className="text-muted-foreground text-xs"
                      numberOfLines={1}
                    >
                      📍 {item.location}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}
