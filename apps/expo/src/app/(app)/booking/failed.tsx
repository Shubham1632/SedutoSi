import { ScrollView, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import { Button } from "@acme/ui-native/button";

export default function PaymentFailedScreen() {
  const router = useRouter();
  const { message, screeningId, seats } = useLocalSearchParams<{
    message?: string;
    screeningId?: string;
    seats?: string;
  }>();

  function onRetry() {
    if (!screeningId) {
      router.dismissAll();
      return;
    }
    router.replace({
      pathname: "/booking/payment",
      params: { screeningId, seats: seats ?? "" },
    });
  }

  return (
    <View className="bg-background flex-1">
      <Stack.Screen
        options={{
          title: "Payment Failed",
          headerBackVisible: false,
          gestureEnabled: false,
        }}
      />

      <ScrollView contentContainerClassName="flex-1 items-center justify-center gap-6 p-6">
        <View className="bg-destructive/10 h-20 w-20 items-center justify-center rounded-full">
          <Text className="text-destructive text-4xl">✕</Text>
        </View>

        <View className="items-center gap-1">
          <Text className="text-foreground text-2xl font-extrabold">
            Payment Failed
          </Text>
          <Text className="text-muted-foreground text-center text-sm">
            {message ?? "Something went wrong while processing your payment."}
          </Text>
        </View>
      </ScrollView>

      <View className="border-border bg-card gap-2 border-t px-5 pt-3 pb-6">
        <Button title="Try Again" onPress={onRetry} />
        <Button
          title="Back to Home"
          variant="outline"
          onPress={() => router.dismissAll()}
        />
      </View>
    </View>
  );
}
