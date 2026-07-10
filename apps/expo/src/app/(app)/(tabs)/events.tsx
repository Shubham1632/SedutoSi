import { useMemo, useState } from "react";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LegendList } from "@legendapp/list";

import type { LiveEvent } from "@acme/app";
import { useEvents } from "@acme/app";

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
          contentContainerStyle={{ padding: 16, gap: 16 }}
          renderItem={({ item }: { item: LiveEvent }) => (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/events/[eventId]",
                  params: { eventId: item.id },
                })
              }
              className="bg-background border-border overflow-hidden rounded-xl border"
            >
              <View className="gap-2 p-4">
                <View className="flex-row items-center justify-between">
                  <Text className="text-foreground text-base font-semibold">
                    {item.title}
                  </Text>
                  <Text className="text-primary text-xs font-medium uppercase">
                    {item.category}
                  </Text>
                </View>
                <Text className="text-muted-foreground text-sm">
                  {formatEventDate(item.starts_at)}
                </Text>
                {item.location ? (
                  <Text className="text-muted-foreground text-sm">
                    {item.location}
                  </Text>
                ) : null}
                {item.price != null ? (
                  <Text className="text-foreground text-sm font-medium">
                    €{item.price.toFixed(2)}
                  </Text>
                ) : (
                  <Text className="text-primary text-sm font-medium">Free</Text>
                )}
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
