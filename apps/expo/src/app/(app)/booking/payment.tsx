import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import {
  useConfirmStripePayment,
  useCreateStripeCheckoutSession,
  useScreening,
} from "@acme/app";
import { Button } from "@acme/ui-native/button";

import { screeningDisplay, sortSeats } from "~/lib/booking";
import { getStripeRedirectTo, openStripeCheckout } from "~/lib/stripe-checkout";

export default function StripePaymentScreen() {
  const router = useRouter();
  const { screeningId, seats } = useLocalSearchParams<{
    screeningId: string;
    seats?: string;
  }>();
  const { data: screening, isLoading } = useScreening(screeningId);
  const createSession = useCreateStripeCheckoutSession();
  const confirmPayment = useConfirmStripePayment();
  const [isPaying, setIsPaying] = useState(false);

  const selected = sortSeats((seats ?? "").split(",").filter(Boolean));

  if (isLoading || !screening) {
    return (
      <View className="bg-background flex-1 items-center justify-center">
        <Stack.Screen options={{ title: "Payment" }} />
        <Text className="text-muted-foreground">Loading…</Text>
      </View>
    );
  }

  const info = screeningDisplay(screening);
  const total = selected.length * Number(screening.price);

  async function onPay() {
    setIsPaying(true);
    try {
      const redirectTo = getStripeRedirectTo();
      const url = await createSession.mutateAsync({
        screeningId,
        seatsCount: selected.length,
        redirectTo,
      });
      const result = await openStripeCheckout(url, redirectTo);

      if (result.status === "cancel" || !result.sessionId) {
        // User backed out of checkout — stay here so they can retry.
        return;
      }

      const booking = await confirmPayment.mutateAsync({
        sessionId: result.sessionId,
      });
      router.replace({
        pathname: "/booking/success",
        params: { bookingId: booking.id },
      });
    } catch (e) {
      router.replace({
        pathname: "/booking/failed",
        params: {
          message: e instanceof Error ? e.message : "Something went wrong.",
          screeningId,
          seats: selected.join(","),
        },
      });
    } finally {
      setIsPaying(false);
    }
  }

  return (
    <View className="bg-background flex-1">
      <Stack.Screen options={{ title: "Payment" }} />

      <ScrollView contentContainerClassName="p-5 gap-5">
        <View className="bg-card border-border gap-1 rounded-2xl border p-5">
          <Text className="text-foreground text-xl font-bold">
            {info.title}
          </Text>
          <Text className="text-muted-foreground text-sm">{info.when}</Text>
          {info.where && (
            <Text className="text-muted-foreground text-sm">{info.where}</Text>
          )}
          <Text className="text-muted-foreground mt-1 text-sm">
            {selected.length} seat{selected.length > 1 ? "s" : ""} ·{" "}
            {selected.join(", ")}
          </Text>
        </View>

        <View className="bg-card border-border gap-3 rounded-2xl border p-5">
          <View className="flex-row items-center justify-between">
            <Text className="text-foreground text-base font-semibold">
              Total
            </Text>
            <Text className="text-primary text-2xl font-extrabold">
              €{total.toFixed(2)}
            </Text>
          </View>
          <Text className="text-muted-foreground text-xs">
            Pay securely with Stripe — card, Apple Pay, Google Pay or Revolut
            Pay.
          </Text>
        </View>
      </ScrollView>

      <View className="border-border bg-card border-t px-5 pt-3 pb-6">
        <Button
          title={`Pay €${total.toFixed(2)} with Stripe`}
          loading={isPaying}
          disabled={selected.length === 0}
          onPress={() => void onPay()}
        />
      </View>
    </View>
  );
}
