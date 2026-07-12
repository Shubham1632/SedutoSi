import { useMemo, useState } from "react";
import { FlatList, Image, Pressable, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import type { Booking } from "@acme/app";
import { useMyBookings } from "@acme/app";

import { ResponsiveContainer } from "~/components/responsive-container";
import { useResponsive } from "~/lib/use-responsive";

type BookingFilter = "all" | "movies" | "events";

const FILTERS: { key: BookingFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "movies", label: "Movies" },
  { key: "events", label: "Events" },
];

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function BookingsScreen() {
  const { width } = useResponsive();
  const numColumns = width >= 1100 ? 3 : width >= 700 ? 2 : 1;
  const router = useRouter();
  const { data: bookings, isLoading } = useMyBookings();
  const [filter, setFilter] = useState<BookingFilter>("all");

  const filteredBookings = useMemo(() => {
    if (!bookings) return bookings;
    if (filter === "movies") return bookings.filter((b) => b.screening_id);
    if (filter === "events") return bookings.filter((b) => b.event_id);
    return bookings;
  }, [bookings, filter]);

  return (
    <View className="bg-background flex-1">
      <Stack.Screen options={{ title: "My Bookings" }} />

      <ResponsiveContainer maxWidth={1100}>
        <View className="flex-row gap-2 px-4 pt-4">
          {FILTERS.map(({ key, label }) => {
            const selected = key === filter;
            return (
              <Pressable
                key={key}
                onPress={() => setFilter(key)}
                className={
                  selected
                    ? "bg-primary rounded-full px-4 py-2"
                    : "rounded-full border border-gray-300 px-4 py-2 dark:border-gray-700"
                }
              >
                <Text
                  className={
                    selected
                      ? "text-primary-foreground text-sm font-medium"
                      : "text-foreground text-sm font-medium"
                  }
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ResponsiveContainer>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-muted-foreground">Loading…</Text>
        </View>
      ) : !filteredBookings?.length ? (
        <View className="flex-1 items-center justify-center gap-2 p-6">
          <Text className="text-foreground text-center text-lg">
            No bookings yet
          </Text>
          <Text className="text-muted-foreground text-center">
            {filter === "events"
              ? "Book a live event to see it here."
              : filter === "movies"
                ? "Book a movie from the home screen."
                : "Book a movie or live event to see it here."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredBookings}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          key={numColumns}
          contentContainerStyle={{
            padding: 16,
            gap: 16,
            width: "100%",
            maxWidth: 1100,
            alignSelf: "center",
          }}
          columnWrapperStyle={numColumns > 1 ? { gap: 16 } : undefined}
          renderItem={({ item }: { item: Booking }) => {
            const isConfirmed = item.status === "confirmed";
            const isEvent = !!item.event_id;

            const imageUrl = isEvent
              ? item.event?.image_url
              : item.screening?.movie?.poster_url;
            const title = isEvent
              ? (item.event?.title ?? "Event")
              : (item.screening?.movie?.title ?? "Movie");
            const startsAt = isEvent
              ? item.event?.starts_at
              : item.screening?.starts_at;
            const subtitle = isEvent
              ? item.event?.location
              : item.screening?.screen?.cinema?.name;
            const unitLabel = isEvent ? "ticket" : "seat";

            return (
              <View style={numColumns > 1 ? { flex: 1 } : undefined}>
                <Pressable
                  onPress={() => router.push(`/bookings/${item.id}`)}
                  className="bg-card overflow-hidden rounded-2xl border border-gray-300 shadow-sm active:opacity-80 dark:border-gray-700"
                >
                  <View className="flex-row">
                    {imageUrl ? (
                      <Image
                        source={{ uri: imageUrl }}
                        style={{ width: 96, height: "auto" }}
                        className="self-stretch"
                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        className="bg-muted items-center justify-center"
                        style={{ width: 96 }}
                      >
                        <Ionicons
                          name={isEvent ? "ticket-outline" : "film-outline"}
                          size={32}
                          color="#9ca3af"
                        />
                      </View>
                    )}

                    <View className="flex-1 justify-between gap-2 p-4">
                      <View className="flex-row items-start justify-between gap-2">
                        <Text
                          className="text-foreground flex-1 text-base font-bold"
                          numberOfLines={2}
                        >
                          {title}
                        </Text>
                        <View
                          style={{
                            backgroundColor: isConfirmed
                              ? "#dcfce7"
                              : "#fee2e2",
                            borderRadius: 999,
                            borderWidth: 1,
                            borderColor: isConfirmed ? "#86efac" : "#fca5a5",
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                          }}
                        >
                          <Text
                            style={{
                              color: isConfirmed ? "#15803d" : "#dc2626",
                              fontSize: 11,
                              fontWeight: "600",
                            }}
                          >
                            {item.status}
                          </Text>
                        </View>
                      </View>

                      {startsAt && (
                        <Text className="text-muted-foreground text-sm">
                          {formatDateTime(startsAt)}
                        </Text>
                      )}
                      {subtitle && (
                        <Text
                          className="text-muted-foreground text-sm"
                          numberOfLines={1}
                        >
                          {subtitle}
                        </Text>
                      )}

                      <View className="flex-row items-center justify-between border-t border-gray-100 pt-2 dark:border-gray-800">
                        <Text className="text-muted-foreground text-sm">
                          {item.seats_count} {unitLabel}
                          {item.seats_count !== 1 ? "s" : ""}
                        </Text>
                        <Text className="text-primary font-semibold">
                          {Number(item.total_price) > 0
                            ? `€${Number(item.total_price).toFixed(2)}`
                            : "Free"}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}
