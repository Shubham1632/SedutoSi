import { useMemo, useState } from "react";
import { Alert, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import { useScreening } from "@acme/app";
import { Button } from "@acme/ui-native/button";

import { SeatMap } from "~/components/seat-map";
import {
  MAX_SEATS,
  occupiedSeats,
  screeningDisplay,
  sortSeats,
} from "~/lib/booking";

export default function SeatSelectionScreen() {
  const { screeningId } = useLocalSearchParams<{ screeningId: string }>();
  const router = useRouter();
  const { data: screening, isLoading } = useScreening(screeningId);
  const [selected, setSelected] = useState<string[]>([]);

  const occupied = useMemo(() => occupiedSeats(screeningId), [screeningId]);

  if (isLoading || !screening) {
    return (
      <View className="bg-background flex-1 items-center justify-center">
        <Stack.Screen options={{ title: "Select Seats" }} />
        <Text className="text-muted-foreground">Loading…</Text>
      </View>
    );
  }

  const info = screeningDisplay(screening);
  const pricePerSeat = Number(screening.price);
  const total = selected.length * pricePerSeat;
  const maxSeats = Math.min(screening.available_seats, MAX_SEATS);

  function toggleSeat(id: string) {
    if (occupied.has(id)) return;
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((s) => s !== id);
      if (prev.length >= maxSeats) {
        Alert.alert(
          "Seat limit reached",
          `You can select up to ${maxSeats} seat${maxSeats > 1 ? "s" : ""}.`,
        );
        return prev;
      }
      return [...prev, id];
    });
  }

  function onContinue() {
    router.push({
      pathname: "/booking/summary",
      params: { screeningId, seats: sortSeats(selected).join(",") },
    });
  }

  return (
    <View className="bg-background flex-1">
      <Stack.Screen options={{ title: "Select Seats" }} />

      {/* Screening summary + live seat count */}
      <View className="border-border bg-card border-b px-5 py-4">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Text
              className="text-foreground text-lg font-bold"
              numberOfLines={1}
            >
              {info.title}
            </Text>
            <Text className="text-muted-foreground mt-0.5 text-xs">
              {info.when}
            </Text>
            {info.where && (
              <Text className="text-muted-foreground text-xs" numberOfLines={1}>
                {info.where}
              </Text>
            )}
          </View>
          <View className="bg-primary/10 items-center rounded-xl px-3 py-2">
            <Text className="text-primary text-xl font-extrabold">
              {selected.length}
            </Text>
            <Text className="text-primary text-[10px] font-medium uppercase">
              Selected
            </Text>
          </View>
        </View>
      </View>

      <SeatMap
        occupied={occupied}
        selected={selected}
        onToggleSeat={toggleSeat}
      />

      {/* Footer: live price + continue CTA */}
      <View className="border-border bg-card border-t px-5 pt-3 pb-6">
        <View className="mb-3 flex-row items-end justify-between">
          <View>
            <Text className="text-muted-foreground text-xs">
              {selected.length > 0
                ? `${selected.length} × €${pricePerSeat.toFixed(2)}`
                : "No seats selected"}
            </Text>
            <Text className="text-foreground text-2xl font-extrabold">
              €{total.toFixed(2)}
            </Text>
          </View>
          {selected.length > 0 && (
            <Text className="text-muted-foreground max-w-[55%] text-right text-xs">
              {sortSeats(selected).join(", ")}
            </Text>
          )}
        </View>
        <Button
          title={
            selected.length > 0
              ? `Continue · €${total.toFixed(2)}`
              : "Select a seat to continue"
          }
          disabled={selected.length === 0}
          onPress={onContinue}
        />
      </View>
    </View>
  );
}
