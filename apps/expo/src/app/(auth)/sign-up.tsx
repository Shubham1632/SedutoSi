import { useState } from "react";
import { Alert, View } from "react-native";
import { Link } from "expo-router";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { Controller, useForm } from "react-hook-form";

import type { SignUpInput } from "@acme/app";
import { signUpSchema, signUpWithPassword, verifySignUpCode } from "@acme/app";
import { Button } from "@acme/ui-native/button";
import { Input } from "@acme/ui-native/input";
import { Text } from "@acme/ui-native/text";

import { supabase } from "~/lib/supabase";

const msg = (e: unknown) =>
  e instanceof Error ? e.message : "Something went wrong";

export default function SignUp() {
  // Set when sign-up needs email confirmation (the Supabase project default):
  // swaps the form for a 6-digit code entry. No email links/deep-links involved.
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpInput>({
    resolver: standardSchemaResolver(signUpSchema),
    defaultValues: { displayName: "", email: "", password: "" },
  });

  async function onSubmit(values: SignUpInput) {
    try {
      const { session } = await signUpWithPassword(supabase, values);
      // With email confirmations off there's a session already — AuthGate redirects.
      if (!session) setConfirmEmail(values.email);
    } catch (e) {
      Alert.alert("Sign up failed", msg(e));
    }
  }

  if (confirmEmail) {
    return (
      <CheckEmail email={confirmEmail} onBack={() => setConfirmEmail(null)} />
    );
  }

  return (
    <View className="bg-background flex-1 justify-center gap-4 p-6">
      <Text className="text-3xl font-bold">Create account</Text>

      <View className="gap-1">
        <Controller
          control={control}
          name="displayName"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              placeholder="Name"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
            />
          )}
        />
        {errors.displayName && (
          <Text className="text-destructive text-sm">
            {errors.displayName.message}
          </Text>
        )}
      </View>

      <View className="gap-1">
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              placeholder="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
            />
          )}
        />
        {errors.email && (
          <Text className="text-destructive text-sm">
            {errors.email.message}
          </Text>
        )}
      </View>

      <View className="gap-1">
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              placeholder="Password"
              secureTextEntry
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
            />
          )}
        />
        {errors.password && (
          <Text className="text-destructive text-sm">
            {errors.password.message}
          </Text>
        )}
      </View>

      <Button
        title="Create account"
        loading={isSubmitting}
        onPress={() => void handleSubmit(onSubmit)()}
      />

      <View className="flex-row justify-center">
        <Link href="/sign-in">
          <Text className="text-primary">Already have an account? Sign in</Text>
        </Link>
      </View>
    </View>
  );
}

/** Post-sign-up email confirmation: a 6-digit code, no email links/deep-links. */
function CheckEmail({
  email,
  onBack,
}: {
  email: string;
  onBack: () => void;
}) {
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  async function onVerify() {
    setVerifying(true);
    try {
      await verifySignUpCode(supabase, email, code.trim());
      // Session established — AuthGate routes into the app.
    } catch (e) {
      Alert.alert("That code didn't work", msg(e));
      setVerifying(false);
    }
  }

  return (
    <View className="bg-background flex-1 justify-center gap-4 p-6">
      <Text className="text-center text-3xl font-bold">Check your email</Text>
      <Text className="text-muted-foreground text-center">
        Enter the 6-digit code we sent to{" "}
        <Text className="text-foreground font-medium">{email}</Text>.
      </Text>

      <Input
        placeholder="Enter code"
        keyboardType="number-pad"
        autoComplete="one-time-code"
        className="text-center"
        value={code}
        onChangeText={setCode}
      />
      <Button
        title="Confirm"
        loading={verifying}
        disabled={verifying || !code.trim()}
        onPress={() => void onVerify()}
      />

      <View className="flex-row justify-center">
        <Text className="text-primary" onPress={onBack}>
          Back to signup
        </Text>
      </View>
    </View>
  );
}
