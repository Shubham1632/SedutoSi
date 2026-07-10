import { ScrollView, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import { useBooking } from "@acme/app";
import { Button } from "@acme/ui-native/button";

import { screeningDisplay } from "~/lib/booking";

export default function PaymentSuccessScreen() {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { data: booking, isLoading } = useBooking(bookingId);

  const info = booking?.screening ? screeningDisplay(booking.screening) : null;

  return (
    <View className="bg-background flex-1">
      <Stack.Screen
        options={{
          title: "Payment Successful",
          headerBackVisible: false,
          gestureEnabled: false,
        }}
      />

      <ScrollView contentContainerClassName="flex-1 items-center justify-center gap-6 p-6">
        <View className="bg-primary/10 h-20 w-20 items-center justify-center rounded-full">
          <Text className="text-primary text-4xl">✓</Text>
        </View>

        <View className="items-center gap-1">
          <Text className="text-foreground text-2xl font-extrabold">
            Payment Successful
          </Text>
          <Text className="text-muted-foreground text-center text-sm">
            Your tickets are booked. Enjoy the movie!
          </Text>
        </View>

        {isLoading || !booking ? (
          <Text className="text-muted-foreground">Loading your ticket…</Text>
        ) : (
          <View className="bg-card border-border w-full gap-2 rounded-2xl border p-5">
            {info && (
              <>
                <Text className="text-foreground text-lg font-bold">
                  {info.title}
                </Text>
                <Text className="text-muted-foreground text-sm">
                  {info.when}
                </Text>
                {info.where && (
                  <Text className="text-muted-foreground text-sm">
                    {info.where}
                  </Text>
                )}
              </>
            )}
            <View className="border-border mt-2 flex-row items-center justify-between border-t pt-3">
              <Text className="text-muted-foreground text-sm">
                {booking.seats_count} seat
                {booking.seats_count !== 1 ? "s" : ""}
              </Text>
              <Text className="text-primary text-xl font-extrabold">
                €{Number(booking.total_price).toFixed(2)}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View className="border-border bg-card gap-2 border-t px-5 pt-3 pb-6">
        <Button
          title="View My Bookings"
          onPress={() => {
            // Clear the whole booking flow (seat selection, summary, payment)
            // out of the stack first, so back from Bookings lands on Home
            // instead of falling through to one of those screens.
            router.dismissAll();
            router.push("/bookings");
          }}
        />
        <Button
          title="Back to Home"
          variant="outline"
          onPress={() => router.dismissAll()}
        />
      </View>
    </View>
  );
}
