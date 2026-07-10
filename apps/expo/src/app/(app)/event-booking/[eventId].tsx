import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import { useEvent, useEventTicketsSold } from "@acme/app";
import { Button } from "@acme/ui-native/button";

import { eventDisplay } from "~/lib/booking";

const MAX_TICKETS_PER_BOOKING = 10;

export default function EventTicketQuantityScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const router = useRouter();
  const { data: event, isLoading } = useEvent(eventId);
  const { data: ticketsSold } = useEventTicketsSold(eventId);
  const [quantity, setQuantity] = useState(1);

  const remaining = useMemo(() => {
    if (event?.capacity == null) return null;
    return Math.max(0, event.capacity - (ticketsSold ?? 0));
  }, [event, ticketsSold]);

  const maxQuantity = Math.max(
    1,
    Math.min(MAX_TICKETS_PER_BOOKING, remaining ?? MAX_TICKETS_PER_BOOKING),
  );

  if (isLoading || !event) {
    return (
      <View className="bg-background flex-1 items-center justify-center">
        <Stack.Screen options={{ title: "Book Tickets" }} />
        <Text className="text-muted-foreground">Loading…</Text>
      </View>
    );
  }

  const info = eventDisplay(event);
  const pricePerTicket = event.price != null ? Number(event.price) : 0;
  const total = quantity * pricePerTicket;
  const soldOut = remaining !== null && remaining <= 0;

  function onContinue() {
    router.push({
      pathname: "/event-booking/summary",
      params: { eventId, quantity: String(quantity) },
    });
  }

  return (
    <View className="bg-background flex-1">
      <Stack.Screen options={{ title: "Book Tickets" }} />

      <ScrollView contentContainerClassName="gap-6 p-5">
        <View className="bg-card border-border gap-1 rounded-2xl border p-5">
          <Text className="text-foreground text-xl font-bold">
            {info.title}
          </Text>
          <Text className="text-muted-foreground text-sm">{info.when}</Text>
          {info.where && (
            <Text className="text-muted-foreground text-sm">{info.where}</Text>
          )}
          {remaining !== null && (
            <Text className="text-muted-foreground mt-1 text-xs">
              {soldOut
                ? "Sold out"
                : `${remaining} ticket${remaining === 1 ? "" : "s"} left`}
            </Text>
          )}
        </View>

        {!soldOut && (
          <View className="bg-card border-border items-center gap-4 rounded-2xl border p-6">
            <Text className="text-muted-foreground text-xs font-medium uppercase">
              Tickets
            </Text>
            <View className="flex-row items-center gap-6">
              <Pressable
                onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                className="border-border h-11 w-11 items-center justify-center rounded-full border active:opacity-70"
                style={{ opacity: quantity <= 1 ? 0.4 : 1 }}
              >
                <Text className="text-foreground text-xl font-bold">−</Text>
              </Pressable>
              <Text className="text-foreground w-10 text-center text-3xl font-extrabold">
                {quantity}
              </Text>
              <Pressable
                onPress={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
                disabled={quantity >= maxQuantity}
                className="border-border h-11 w-11 items-center justify-center rounded-full border active:opacity-70"
                style={{ opacity: quantity >= maxQuantity ? 0.4 : 1 }}
              >
                <Text className="text-foreground text-xl font-bold">+</Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>

      <View className="border-border bg-card border-t px-5 pt-3 pb-6">
        <View className="mb-3 flex-row items-end justify-between">
          <Text className="text-muted-foreground text-xs">
            {pricePerTicket > 0
              ? `${quantity} × €${pricePerTicket.toFixed(2)}`
              : "Free"}
          </Text>
          <Text className="text-foreground text-2xl font-extrabold">
            {pricePerTicket > 0 ? `€${total.toFixed(2)}` : "Free"}
          </Text>
        </View>
        <Button
          title={
            soldOut
              ? "Sold Out"
              : pricePerTicket > 0
                ? `Continue · €${total.toFixed(2)}`
                : "Continue"
          }
          disabled={soldOut}
          onPress={onContinue}
        />
      </View>
    </View>
  );
}
