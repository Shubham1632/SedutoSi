import { ActivityIndicator, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";

import { useEvent } from "@acme/app";

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
  const { data: event, isLoading } = useEvent(eventId);

  if (isLoading || !event) {
    return (
      <View className="bg-background flex-1 items-center justify-center">
        <Stack.Screen options={{ title: "Event" }} />
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View className="bg-background flex-1">
      <Stack.Screen options={{ title: event.title }} />

      <View className="gap-4 p-4">
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
          <Text className="text-foreground text-sm font-medium">
            📍 {event.location}
          </Text>
        ) : null}

        {event.description ? (
          <Text className="text-foreground text-sm leading-5">
            {event.description}
          </Text>
        ) : null}

        <Text className="text-foreground text-lg font-semibold">
          {event.price != null ? `€${event.price.toFixed(2)}` : "Free"}
        </Text>
      </View>
    </View>
  );
}
