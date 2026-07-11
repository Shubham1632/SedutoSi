import { ScrollView, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import { useEvent } from "@acme/app";
import { Button } from "@acme/ui-native/button";

import { ResponsiveContainer } from "~/components/responsive-container";
import { eventDisplay } from "~/lib/booking";

export default function EventBookingSummaryScreen() {
  const router = useRouter();
  const { eventId, quantity } = useLocalSearchParams<{
    eventId: string;
    quantity?: string;
  }>();
  const { data: event, isLoading } = useEvent(eventId);

  const ticketCount = Math.max(1, Number(quantity ?? 1));

  if (isLoading || !event) {
    return (
      <View className="bg-background flex-1 items-center justify-center">
        <Stack.Screen options={{ title: "Booking Summary" }} />
        <Text className="text-muted-foreground">Loading…</Text>
      </View>
    );
  }

  const info = eventDisplay(event);
  const pricePerTicket = event.price != null ? Number(event.price) : 0;
  const total = ticketCount * pricePerTicket;

  function onContinueToPayment() {
    router.push({
      pathname: "/event-booking/payment",
      params: { eventId, quantity: String(ticketCount) },
    });
  }

  return (
    <View className="bg-background flex-1">
      <Stack.Screen options={{ title: "Booking Summary" }} />

      <ScrollView contentContainerClassName="p-5 gap-5">
        <ResponsiveContainer style={{ gap: 20 }}>
          <View className="bg-card border-border gap-1 rounded-2xl border p-5">
            <Text className="text-foreground text-xl font-bold">
              {info.title}
            </Text>
            <Text className="text-muted-foreground text-sm">{info.when}</Text>
            {info.where && (
              <Text className="text-muted-foreground text-sm">
                {info.where}
              </Text>
            )}
          </View>

          <View className="bg-card border-border gap-3 rounded-2xl border p-5">
            <View className="flex-row items-center justify-between">
              <Text className="text-muted-foreground text-sm">
                Price per ticket
              </Text>
              <Text className="text-foreground text-sm">
                {pricePerTicket > 0 ? `€${pricePerTicket.toFixed(2)}` : "Free"}
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-muted-foreground text-sm">Tickets</Text>
              <Text className="text-foreground text-sm">× {ticketCount}</Text>
            </View>
            <View className="border-border flex-row items-center justify-between border-t pt-3">
              <Text className="text-foreground text-base font-semibold">
                Total
              </Text>
              <Text className="text-primary text-2xl font-extrabold">
                {pricePerTicket > 0 ? `€${total.toFixed(2)}` : "Free"}
              </Text>
            </View>
          </View>
        </ResponsiveContainer>
      </ScrollView>

      <View className="border-border bg-card border-t px-5 pt-3 pb-6">
        <ResponsiveContainer>
          <Button
            title={
              pricePerTicket > 0
                ? `Continue to Payment · €${total.toFixed(2)}`
                : "Continue"
            }
            onPress={onContinueToPayment}
          />
        </ResponsiveContainer>
      </View>
    </View>
  );
}
