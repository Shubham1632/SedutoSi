import { ScrollView, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import { useScreening } from "@acme/app";
import { Button } from "@acme/ui-native/button";

import { screeningDisplay, sortSeats } from "~/lib/booking";

export default function BookingSummaryScreen() {
  const router = useRouter();
  const { screeningId, seats } = useLocalSearchParams<{
    screeningId: string;
    seats?: string;
  }>();
  const { data: screening, isLoading } = useScreening(screeningId);

  const selected = sortSeats((seats ?? "").split(",").filter(Boolean));

  if (isLoading || !screening) {
    return (
      <View className="bg-background flex-1 items-center justify-center">
        <Stack.Screen options={{ title: "Booking Summary" }} />
        <Text className="text-muted-foreground">Loading…</Text>
      </View>
    );
  }

  const info = screeningDisplay(screening);
  const pricePerSeat = Number(screening.price);
  const total = selected.length * pricePerSeat;

  function onContinueToPayment() {
    router.push({
      pathname: "/booking/payment",
      params: { screeningId, seats: selected.join(",") },
    });
  }

  return (
    <View className="bg-background flex-1">
      <Stack.Screen options={{ title: "Booking Summary" }} />

      <ScrollView contentContainerClassName="p-5 gap-5">
        {/* Movie / showtime */}
        <View className="bg-card border-border gap-1 rounded-2xl border p-5">
          <Text className="text-foreground text-xl font-bold">
            {info.title}
          </Text>
          <Text className="text-muted-foreground text-sm">{info.when}</Text>
          {info.where && (
            <Text className="text-muted-foreground text-sm">{info.where}</Text>
          )}
        </View>

        {/* Seats */}
        <View className="bg-card border-border gap-3 rounded-2xl border p-5">
          <Text className="text-muted-foreground text-xs font-medium uppercase">
            Your seats
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {selected.map((id) => (
              <View key={id} className="bg-primary/10 rounded-lg px-3 py-1.5">
                <Text className="text-primary text-sm font-semibold">{id}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Price breakdown */}
        <View className="bg-card border-border gap-3 rounded-2xl border p-5">
          <View className="flex-row items-center justify-between">
            <Text className="text-muted-foreground text-sm">
              Price per seat
            </Text>
            <Text className="text-foreground text-sm">
              €{pricePerSeat.toFixed(2)}
            </Text>
          </View>
          <View className="flex-row items-center justify-between">
            <Text className="text-muted-foreground text-sm">Seats</Text>
            <Text className="text-foreground text-sm">× {selected.length}</Text>
          </View>
          <View className="border-border flex-row items-center justify-between border-t pt-3">
            <Text className="text-foreground text-base font-semibold">
              Total
            </Text>
            <Text className="text-primary text-2xl font-extrabold">
              €{total.toFixed(2)}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Payment CTA */}
      <View className="border-border bg-card border-t px-5 pt-3 pb-6">
        <Button
          title={`Continue to Payment · €${total.toFixed(2)}`}
          disabled={selected.length === 0}
          onPress={onContinueToPayment}
        />
      </View>
    </View>
  );
}
