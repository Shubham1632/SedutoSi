import { useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import { useCreateBooking, useScreening } from "@acme/app";
import { Button } from "@acme/ui-native/button";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("it-IT", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function BookingScreen() {
  const { screeningId } = useLocalSearchParams<{ screeningId: string }>();
  const router = useRouter();
  const { data: screening, isLoading } = useScreening(screeningId);
  const createBooking = useCreateBooking();
  const [seats, setSeats] = useState(1);

  if (isLoading || !screening) {
    return (
      <View className="bg-background flex-1 items-center justify-center">
        <Stack.Screen options={{ title: "Book Tickets" }} />
        <Text className="text-muted-foreground">Loading…</Text>
      </View>
    );
  }

  const movie = screening.movie as { title?: string } | undefined;
  const screen = screening.screen as { name?: string; cinema?: { name?: string; neighborhood?: string } } | undefined;
  const total = seats * Number(screening.price);
  const maxSeats = Math.min(screening.available_seats, 8);

  async function onConfirm() {
    try {
      await createBooking.mutateAsync({ screeningId, seatsCount: seats, totalPrice: total });
      Alert.alert("Booking Confirmed!", `You've booked ${seats} seat${seats > 1 ? "s" : ""}.`, [
        { text: "My Bookings", onPress: () => router.replace("/bookings") },
        { text: "Home", onPress: () => router.replace("/") },
      ]);
    } catch (e) {
      Alert.alert("Booking failed", e instanceof Error ? e.message : "Please try again.");
    }
  }

  return (
    <ScrollView className="bg-background flex-1" contentContainerClassName="p-6 gap-6">
      <Stack.Screen options={{ title: "Confirm Booking" }} />

      <View className="bg-card rounded-xl p-4 gap-3">
        <Text className="text-foreground text-xl font-bold">{movie?.title ?? "Movie"}</Text>
        <Text className="text-muted-foreground">{formatDateTime(screening.starts_at)}</Text>
        {screen?.cinema && (
          <Text className="text-muted-foreground">
            {screen.cinema.name}
            {screen.cinema.neighborhood ? ` — ${screen.cinema.neighborhood}` : ""}
          </Text>
        )}
        {screen?.name && (
          <Text className="text-muted-foreground text-sm">Hall: {screen.name}</Text>
        )}
      </View>

      <View className="bg-card rounded-xl p-4 gap-4">
        <Text className="text-foreground font-semibold">Number of seats</Text>
        <View className="flex-row items-center gap-6">
          <Button
            title="−"
            variant="outline"
            onPress={() => setSeats((s) => Math.max(1, s - 1))}
          />
          <Text className="text-foreground text-2xl font-bold">{seats}</Text>
          <Button
            title="+"
            variant="outline"
            onPress={() => setSeats((s) => Math.min(s + 1, maxSeats))}
          />
        </View>
        <View className="flex-row justify-between">
          <Text className="text-muted-foreground">Price per seat</Text>
          <Text className="text-foreground">€{Number(screening.price).toFixed(2)}</Text>
        </View>
        <View className="flex-row justify-between border-t border-border pt-3">
          <Text className="text-foreground font-semibold text-base">Total</Text>
          <Text className="text-primary text-lg font-bold">€{total.toFixed(2)}</Text>
        </View>
      </View>

      <Button
        title={`Confirm · €${total.toFixed(2)}`}
        loading={createBooking.isPending}
        onPress={() => void onConfirm()}
      />
    </ScrollView>
  );
}
