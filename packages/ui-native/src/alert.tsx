import { useEffect, useState } from "react";
import { Modal, Pressable, View } from "react-native";

import { Button } from "./button";
import { Text } from "./text";

export interface AlertButton {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void;
}

interface AlertState {
  title: string;
  message?: string;
  buttons: AlertButton[];
}

let listener: ((state: AlertState | null) => void) | null = null;

export function appAlert(
  title: string,
  message?: string,
  buttons: AlertButton[] = [{ text: "OK" }],
) {
  listener?.({ title, message, buttons });
}

function buttonVariant(style: AlertButton["style"]) {
  if (style === "destructive") return "destructive" as const;
  if (style === "cancel") return "outline" as const;
  return "default" as const;
}

export function AlertHost() {
  const [state, setState] = useState<AlertState | null>(null);

  useEffect(() => {
    listener = setState;
    return () => {
      listener = null;
    };
  }, []);

  const dismiss = (onPress?: () => void) => {
    setState(null);
    onPress?.();
  };

  return (
    <Modal
      visible={state !== null}
      transparent
      animationType="fade"
      onRequestClose={() => setState(null)}
    >
      <Pressable
        className="flex-1 items-center justify-center bg-black/60 p-6"
        onPress={() => setState(null)}
      >
        <Pressable
          className="bg-card border-border w-full max-w-sm gap-4 rounded-2xl border p-5"
          onPress={(e) => e.stopPropagation()}
        >
          {state ? (
            <>
              <View className="gap-1.5">
                <Text className="text-foreground text-lg font-bold">
                  {state.title}
                </Text>
                {state.message ? (
                  <Text className="text-muted-foreground text-sm">
                    {state.message}
                  </Text>
                ) : null}
              </View>
              <View className="gap-2">
                {state.buttons.map((b) => (
                  <Button
                    key={b.text}
                    title={b.text}
                    variant={buttonVariant(b.style)}
                    onPress={() => dismiss(b.onPress)}
                  />
                ))}
              </View>
            </>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
