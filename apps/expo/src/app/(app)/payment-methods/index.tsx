import { Alert, Pressable, View } from "react-native";
import { Stack } from "expo-router";
import { LegendList } from "@legendapp/list";

import type { PaymentMethod } from "@acme/app";
import { useDeletePaymentMethod, usePaymentMethods } from "@acme/app";
import { Button } from "@acme/ui-native/button";
import { Text } from "@acme/ui-native/text";

const BRAND_LABEL: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
};

export default function PaymentMethodsScreen() {
  const { data: methods, isLoading } = usePaymentMethods();
  const deleteMethod = useDeletePaymentMethod();

  function onAddCard() {
    // TODO: wire up @stripe/stripe-react-native PaymentSheet here.
    // Stripe handles card capture + tokenization; on success you get a
    // paymentMethodId back, which you send to your backend to attach
    // to the user. Raw card data never touches this app or your server.
    Alert.alert("Add card", "Card entry via Stripe goes here.");
  }

  function onRemove(id: string) {
    Alert.alert("Remove card", "Remove this payment method?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => void deleteMethod.mutateAsync({ id }),
      },
    ]);
  }

  return (
    <View className="bg-background flex-1">
      <Stack.Screen options={{ title: "Payment Methods" }} />

      <View className="flex-1 p-4">
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-muted-foreground">Loading…</Text>
          </View>
        ) : !methods?.length ? (
          <View className="flex-1 items-center justify-center gap-2 pb-20">
            <Text className="text-foreground text-center text-lg">
              No payment methods saved
            </Text>
            <Text className="text-muted-foreground text-center">
              Add a card to speed up checkout.
            </Text>
          </View>
        ) : (
          <LegendList
            data={methods}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
            renderItem={({ item }: { item: PaymentMethod }) => (
              <View className="bg-card border-border flex-row items-center gap-3 rounded-xl border p-4">
                <View className="bg-muted h-10 w-14 items-center justify-center rounded-md">
                  <Text className="text-foreground text-xs font-bold">
                    {BRAND_LABEL[item.brand] ?? item.brand}
                  </Text>
                </View>
                <View className="flex-1 gap-0.5">
                  <Text className="text-foreground text-base font-medium">
                    •••• •••• •••• {item.last4}
                  </Text>
                  <Text className="text-muted-foreground text-xs">
                    Expires {String(item.exp_month).padStart(2, "0")}/
                    {item.exp_year}
                    {item.is_default ? "  ·  Default" : ""}
                  </Text>
                </View>
                <Pressable onPress={() => onRemove(item.id)} hitSlop={12}>
                  <Text className="text-destructive text-sm font-medium">
                    Remove
                  </Text>
                </Pressable>
              </View>
            )}
          />
        )}
      </View>

      <View className="border-border border-t p-4">
        <Button title="Add Card" onPress={onAddCard} />
      </View>
    </View>
  );
}
