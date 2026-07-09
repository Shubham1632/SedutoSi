import { useState } from "react";
import { Alert, View } from "react-native";
import { Link } from "expo-router";
import { Controller, useForm } from "react-hook-form";

import type { SignInInput } from "@acme/app";
import { signInSchema, signInWithPassword, zodFormResolver } from "@acme/app";
import { Button } from "@acme/ui-native/button";
import { Input } from "@acme/ui-native/input";
import { Text } from "@acme/ui-native/text";

import { GoogleSignInButton } from "~/components/google-sign-in-button";
import { signInWithGoogle } from "~/lib/google-auth";
import { supabase } from "~/lib/supabase";

const msg = (e: unknown) =>
  e instanceof Error ? e.message : "Something went wrong";

export default function SignIn() {
  const [googleLoading, setGoogleLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({
    resolver: zodFormResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: SignInInput) {
    try {
      await signInWithPassword(supabase, values);
    } catch (e) {
      Alert.alert("Sign in failed", msg(e));
    }
  }

  async function onGoogleSignIn() {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      // Session established on success — AuthGate routes into the app.
    } catch (e) {
      Alert.alert("Google sign-in failed", msg(e));
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <View className="bg-background flex-1 justify-center gap-4 p-6">
      <Text className="text-3xl font-bold">Welcome back</Text>

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
        title="Sign in"
        loading={isSubmitting}
        onPress={() => void handleSubmit(onSubmit)()}
      />

      <View className="flex-row items-center gap-3">
        <View className="bg-border h-px flex-1" />
        <Text className="text-muted-foreground text-xs uppercase">or</Text>
        <View className="bg-border h-px flex-1" />
      </View>

      <GoogleSignInButton
        loading={googleLoading}
        onPress={() => void onGoogleSignIn()}
      />

      <View className="flex-row justify-center">
        <Link href="/sign-up">
          <Text className="text-primary">Create account</Text>
        </Link>
      </View>
    </View>
  );
}
