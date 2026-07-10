import { useEffect, useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import { useBookedSeats, useScreening } from "@acme/app";
import { appAlert } from "@acme/ui-native/alert";
import { Button } from "@acme/ui-native/button";

import { SeatMap } from "~/components/seat-map";
import {
  cosmeticOccupiedSeats,
  MAX_SEATS,
  screeningDisplay,
  sortSeats,
} from "~/lib/booking";

export default function SeatSelectionScreen() {
  const { screeningId } = useLocalSearchParams<{ screeningId: string }>();
  const router = useRouter();
  const { data: screening, isLoading } = useScreening(screeningId);
  const { data: bookedSeats } = useBookedSeats(screeningId);
  const [rawSelected, setRawSelected] = useState<string[]>([]);

  const cosmetic = useMemo(
    () => cosmeticOccupiedSeats(screeningId),
    [screeningId],
  );
  const occupied = useMemo(
    () => new Set([...cosmetic, ...(bookedSeats ?? [])]),
    [cosmetic, bookedSeats],
  );
  // Someone else may have booked a seat the user picked while this screen
  // stayed open (booked-seats polls every 10s) — never show/submit it as
  // selected once that happens, even though it's still in `rawSelected`.
  const selected = useMemo(
    () => rawSelected.filter((id) => !occupied.has(id)),
    [rawSelected, occupied],
  );

  const previouslyTakenRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!bookedSeats) return;
    const newlyTaken = rawSelected.filter(
      (id) => bookedSeats.has(id) && !previouslyTakenRef.current.has(id),
    );
    previouslyTakenRef.current = bookedSeats;
    if (newlyTaken.length === 0) return;
    appAlert(
      "Seat no longer available",
      `Seat${newlyTaken.length > 1 ? "s" : ""} ${newlyTaken.join(", ")} ${
        newlyTaken.length > 1 ? "were" : "was"
      } just booked by someone else and removed from your selection.`,
    );
    // rawSelected intentionally omitted: this only needs to run when the
    // booked-seats set changes, not on every keystroke of selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookedSeats]);

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
    setRawSelected((prev) => {
      if (prev.includes(id)) return prev.filter((s) => s !== id);
      if (selected.length >= maxSeats) {
        appAlert(
          "Seat limit reached",
          `You can select up to ${maxSeats} seat${maxSeats > 1 ? "s" : ""}.`,
        );
        return prev;
      }
      return [...prev, id];
    });
  }

  function onContinue() {
    const seats = sortSeats(selected);
    // This screen stays mounted (React Navigation keeps prior stack screens
    // alive) and keeps polling booked-seats in the background while the user
    // is on summary/payment. Clear the selection now so that when their own
    // payment succeeds a moment later, the "did someone else take my seat"
    // watcher above has nothing left to (wrongly) flag as taken.
    setRawSelected([]);
    router.push({
      pathname: "/booking/summary",
      params: { screeningId, seats: seats.join(",") },
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
