import type { PressableProps } from "react-native";
import { ActivityIndicator, Pressable } from "react-native";

import { cn } from "@acme/ui-native/cn";
import { Text } from "@acme/ui-native/text";

import { GoogleIcon } from "./google-icon";

export function GoogleSignInButton({
  loading = false,
  disabled,
  className,
  ...props
}: PressableProps & { loading?: boolean; className?: string }) {
  const isDisabled = disabled ?? loading;
  return (
    <Pressable
      className={cn(
        "border-input bg-background h-12 flex-row items-center justify-center gap-3 rounded-md border",
        isDisabled && "opacity-50",
        className,
      )}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <ActivityIndicator />
      ) : (
        <>
          <GoogleIcon />
          <Text className="text-foreground text-base font-medium">
            Continue with Google
          </Text>
        </>
      )}
    </Pressable>
  );
}
