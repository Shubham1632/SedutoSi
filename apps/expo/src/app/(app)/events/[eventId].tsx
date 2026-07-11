import { useMemo } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import { useEvent, useEventTicketsSold } from "@acme/app";
import { Button } from "@acme/ui-native/button";

import { ResponsiveContainer } from "~/components/responsive-container";
import { openMapsSearch } from "~/lib/maps";

function formatEventDateTime(startsAt: string, endsAt?: string | null) {
  const start = new Date(startsAt);
  const dateLabel = start.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const startTime = start.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  if (!endsAt) return `${dateLabel} · ${startTime}`;
  const endTime = new Date(endsAt).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${dateLabel} · ${startTime} – ${endTime}`;
}

export default function EventDetailScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const router = useRouter();
  const { data: event, isLoading } = useEvent(eventId);
  const { data: ticketsSold } = useEventTicketsSold(eventId);

  const remaining = useMemo(() => {
    if (event?.capacity == null) return null;
    return Math.max(0, event.capacity - (ticketsSold ?? 0));
  }, [event, ticketsSold]);

  if (isLoading || !event) {
    return (
      <View className="bg-background flex-1 items-center justify-center">
        <Stack.Screen options={{ title: "Event" }} />
        <ActivityIndicator />
      </View>
    );
  }

  const soldOut = remaining !== null && remaining <= 0;

  return (
    <View className="bg-background flex-1">
      <Stack.Screen options={{ title: event.title }} />

      <ScrollView contentContainerClassName="gap-4 pb-4">
        {event.image_url ? (
          <Image
            source={{ uri: event.image_url }}
            style={{ width: "100%", height: 220 }}
            resizeMode="cover"
          />
        ) : (
          <View
            className="bg-muted items-center justify-center"
            style={{ width: "100%", height: 220 }}
          >
            <Text style={{ fontSize: 48, opacity: 0.4 }}>🖼️</Text>
          </View>
        )}

        <ResponsiveContainer maxWidth={800}>
          <View className="gap-4 px-4">
            <View className="gap-1">
              <Text className="text-primary text-xs font-medium uppercase">
                {event.category}
              </Text>
              <Text className="text-foreground text-2xl font-bold">
                {event.title}
              </Text>
            </View>

            <Text className="text-muted-foreground text-sm">
              {formatEventDateTime(event.starts_at, event.ends_at)}
            </Text>

            {event.location ? (
              <Pressable onPress={() => openMapsSearch(event.location ?? "")}>
                <Text className="text-foreground text-sm font-medium">
                  📍 {event.location}
                </Text>
              </Pressable>
            ) : null}

            {event.description ? (
              <Text className="text-foreground text-sm leading-5">
                {event.description}
              </Text>
            ) : null}

            <View className="flex-row items-center justify-between">
              <Text className="text-foreground text-lg font-semibold">
                {event.price != null && event.price > 0
                  ? `€${event.price.toFixed(2)}`
                  : "Free"}
              </Text>
              {remaining !== null && (
                <Text className="text-muted-foreground text-xs">
                  {soldOut
                    ? "Sold out"
                    : `${remaining} ticket${remaining === 1 ? "" : "s"} left`}
                </Text>
              )}
            </View>
          </View>
        </ResponsiveContainer>
      </ScrollView>

      <View className="border-border bg-card border-t px-5 pt-3 pb-6">
        <ResponsiveContainer maxWidth={800}>
          <Button
            title={soldOut ? "Sold Out" : "Book Tickets"}
            disabled={soldOut}
            onPress={() =>
              router.push({
                pathname: "/event-booking/[eventId]",
                params: { eventId },
              })
            }
          />
        </ResponsiveContainer>
      </View>
    </View>
  );
}
