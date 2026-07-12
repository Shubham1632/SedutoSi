import { ScrollView, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useBooking } from "@acme/app";
import { Button } from "@acme/ui-native/button";

import { ResponsiveContainer } from "~/components/responsive-container";
import { bookingDisplay } from "~/lib/booking";
import { useThemeColors } from "~/lib/use-theme-colors";

export default function PaymentSuccessScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { data: booking, isLoading } = useBooking(bookingId);

  const info = booking ? bookingDisplay(booking) : null;
  const unitLabel = booking?.event_id ? "ticket" : "seat";

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
        <ResponsiveContainer
          maxWidth={480}
          style={{ alignItems: "center", gap: 24 }}
        >
          <View className="bg-primary/10 h-20 w-20 items-center justify-center rounded-full">
            <Ionicons name="checkmark" size={40} color={colors.primary} />
          </View>

          <View className="items-center gap-1">
            <Text className="text-foreground text-2xl font-extrabold">
              Payment Successful
            </Text>
            <Text className="text-muted-foreground text-center text-sm">
              {booking?.event_id
                ? "Your tickets are booked. See you there!"
                : "Your tickets are booked. Enjoy the movie!"}
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
                  {booking.seats_count} {unitLabel}
                  {booking.seats_count !== 1 ? "s" : ""}
                </Text>
                <Text className="text-primary text-xl font-extrabold">
                  {Number(booking.total_price) > 0
                    ? `€${Number(booking.total_price).toFixed(2)}`
                    : "Free"}
                </Text>
              </View>
            </View>
          )}
        </ResponsiveContainer>
      </ScrollView>

      <View className="border-border bg-card gap-2 border-t px-5 pt-3 pb-6">
        <ResponsiveContainer maxWidth={480} style={{ gap: 8 }}>
          <Button
            title="View My Bookings"
            onPress={() => {
              router.dismissAll();
              router.push("/bookings");
            }}
          />
          <Button
            title="Back to Home"
            variant="outline"
            onPress={() => router.dismissAll()}
          />
        </ResponsiveContainer>
      </View>
    </View>
  );
}
