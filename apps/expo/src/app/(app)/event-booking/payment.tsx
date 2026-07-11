import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import {
  useBookFreeEvent,
  useConfirmStripePayment,
  useCreateStripeCheckoutSession,
  useEvent,
} from "@acme/app";
import { Button } from "@acme/ui-native/button";

import { ResponsiveContainer } from "~/components/responsive-container";
import { eventDisplay } from "~/lib/booking";
import { getStripeRedirectTo, openStripeCheckout } from "~/lib/stripe-checkout";

export default function EventPaymentScreen() {
  const router = useRouter();
  const { eventId, quantity } = useLocalSearchParams<{
    eventId: string;
    quantity?: string;
  }>();
  const { data: event, isLoading } = useEvent(eventId);
  const createSession = useCreateStripeCheckoutSession();
  const confirmPayment = useConfirmStripePayment();
  const bookFreeEvent = useBookFreeEvent();
  const [isPaying, setIsPaying] = useState(false);

  const ticketCount = Math.max(1, Number(quantity ?? 1));

  if (isLoading || !event) {
    return (
      <View className="bg-background flex-1 items-center justify-center">
        <Stack.Screen options={{ title: "Payment" }} />
        <Text className="text-muted-foreground">Loading…</Text>
      </View>
    );
  }

  const info = eventDisplay(event);
  const pricePerTicket = event.price != null ? Number(event.price) : 0;
  const isFree = pricePerTicket <= 0;
  const total = ticketCount * pricePerTicket;

  function goToFailure(e: unknown) {
    router.replace({
      pathname: "/booking/failed",
      params: {
        message: e instanceof Error ? e.message : "Something went wrong.",
        eventId,
        quantity: String(ticketCount),
      },
    });
  }

  async function onPayWithStripe() {
    setIsPaying(true);
    try {
      const redirectTo = getStripeRedirectTo();
      const url = await createSession.mutateAsync({
        eventId,
        quantity: ticketCount,
        redirectTo,
      });
      const result = await openStripeCheckout(url, redirectTo);

      if (result.status === "cancel" || !result.sessionId) {
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
      goToFailure(e);
    } finally {
      setIsPaying(false);
    }
  }

  async function onBookFree() {
    setIsPaying(true);
    try {
      const booking = await bookFreeEvent.mutateAsync({
        eventId,
        quantity: ticketCount,
      });
      router.replace({
        pathname: "/booking/success",
        params: { bookingId: booking.id },
      });
    } catch (e) {
      goToFailure(e);
    } finally {
      setIsPaying(false);
    }
  }

  return (
    <View className="bg-background flex-1">
      <Stack.Screen options={{ title: isFree ? "Confirm" : "Payment" }} />

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
            <Text className="text-muted-foreground mt-1 text-sm">
              {ticketCount} ticket{ticketCount > 1 ? "s" : ""}
            </Text>
          </View>

          <View className="bg-card border-border gap-3 rounded-2xl border p-5">
            <View className="flex-row items-center justify-between">
              <Text className="text-foreground text-base font-semibold">
                Total
              </Text>
              <Text className="text-primary text-2xl font-extrabold">
                {isFree ? "Free" : `€${total.toFixed(2)}`}
              </Text>
            </View>
            <Text className="text-muted-foreground text-xs">
              {isFree
                ? "This event is free — just confirm to reserve your spot."
                : "Pay securely with Stripe — card, Apple Pay, Google Pay or Revolut Pay."}
            </Text>
          </View>
        </ResponsiveContainer>
      </ScrollView>

      <View className="border-border bg-card border-t px-5 pt-3 pb-6">
        <ResponsiveContainer>
          <Button
            title={
              isFree
                ? "Confirm Booking"
                : `Pay €${total.toFixed(2)} with Stripe`
            }
            loading={isPaying}
            onPress={() => void (isFree ? onBookFree() : onPayWithStripe())}
          />
        </ResponsiveContainer>
      </View>
    </View>
  );
}
