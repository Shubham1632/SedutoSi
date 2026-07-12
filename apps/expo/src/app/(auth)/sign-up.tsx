import { useState } from "react";
import { View } from "react-native";
import { Link } from "expo-router";
import { Controller, useForm } from "react-hook-form";

import type { SignUpInput } from "@acme/app";
import {
  signUpSchema,
  signUpWithPassword,
  verifySignUpCode,
  zodFormResolver,
} from "@acme/app";
import { appAlert } from "@acme/ui-native/alert";
import { Button } from "@acme/ui-native/button";
import { Input } from "@acme/ui-native/input";
import { Text } from "@acme/ui-native/text";

import { BrandMark } from "~/components/brand-mark";
import { GoogleSignInButton } from "~/components/google-sign-in-button";
import { ResponsiveContainer } from "~/components/responsive-container";
import { signInWithGoogle } from "~/lib/google-auth";
import { supabase } from "~/lib/supabase";
import { useResponsive } from "~/lib/use-responsive";

const msg = (e: unknown) =>
  e instanceof Error ? e.message : "Something went wrong";

export default function SignUp() {
  const { width } = useResponsive();
  const isWide = width >= 700;
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpInput>({
    resolver: zodFormResolver(signUpSchema),
    defaultValues: { displayName: "", email: "", password: "" },
  });

  async function onSubmit(values: SignUpInput) {
    try {
      const { session } = await signUpWithPassword(supabase, values);
      if (!session) setConfirmEmail(values.email);
    } catch (e) {
      appAlert("Sign up failed", msg(e));
    }
  }

  async function onGoogleSignIn() {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      appAlert("Google sign-in failed", msg(e));
    } finally {
      setGoogleLoading(false);
    }
  }

  if (confirmEmail) {
    return (
      <CheckEmail email={confirmEmail} onBack={() => setConfirmEmail(null)} />
    );
  }

  return (
    <View className="bg-background flex-1 justify-center p-6">
      <ResponsiveContainer
        maxWidth={isWide ? 920 : 420}
        style={
          isWide
            ? { flexDirection: "row", alignItems: "center", gap: 48 }
            : undefined
        }
      >
        {isWide && (
          <View style={{ flex: 1 }}>
            <BrandMark size="lg" />
          </View>
        )}

        <View style={{ gap: 16, flex: isWide ? 1 : undefined }}>
          {!isWide && <BrandMark size="sm" />}

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

          <View className="flex-row items-center gap-3">
            <View className="bg-border h-px flex-1" />
            <Text className="text-muted-foreground text-xs uppercase">
              or
            </Text>
            <View className="bg-border h-px flex-1" />
          </View>

          <GoogleSignInButton
            loading={googleLoading}
            onPress={() => void onGoogleSignIn()}
          />

          <View className="flex-row justify-center">
            <Link href="/sign-in">
              <Text className="text-primary">
                Already have an account? Sign in
              </Text>
            </Link>
          </View>
        </View>
      </ResponsiveContainer>
    </View>
  );
}

function CheckEmail({ email, onBack }: { email: string; onBack: () => void }) {
  const { width } = useResponsive();
  const isWide = width >= 700;
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  async function onVerify() {
    setVerifying(true);
    try {
      await verifySignUpCode(supabase, email, code.trim());
    } catch (e) {
      appAlert("That code didn't work", msg(e));
      setVerifying(false);
    }
  }

  return (
    <View className="bg-background flex-1 justify-center p-6">
      <ResponsiveContainer
        maxWidth={isWide ? 920 : 420}
        style={
          isWide
            ? { flexDirection: "row", alignItems: "center", gap: 48 }
            : undefined
        }
      >
        {isWide && (
          <View style={{ flex: 1 }}>
            <BrandMark size="lg" />
          </View>
        )}

        <View style={{ gap: 16, flex: isWide ? 1 : undefined }}>
          {!isWide && <BrandMark size="sm" />}

          <Text className="text-center text-3xl font-bold">
            Check your email
          </Text>
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
      </ResponsiveContainer>
    </View>
  );
}
