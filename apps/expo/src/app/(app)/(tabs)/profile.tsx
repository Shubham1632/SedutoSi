import { useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";

import type { UpdateProfileInput } from "@acme/app";
import { useSession } from "@acme/api";
import {
  signOut,
  updateProfileSchema,
  useDeleteAccount,
  useProfile,
  useUpdateProfile,
  zodFormResolver,
} from "@acme/app";
import { Button } from "@acme/ui-native/button";
import { Input } from "@acme/ui-native/input";
import { Text } from "@acme/ui-native/text";

import { supabase } from "~/lib/supabase";

const msg = (e: unknown) =>
  e instanceof Error ? e.message : "Something went wrong";

function initials(
  name: string | null | undefined,
  email: string | null | undefined,
) {
  const source = name?.trim() ?? email?.trim() ?? "";
  if (!source) return "?";
  const parts = source.split(/\s+/).filter(Boolean);
  const [first = "", second = ""] = parts;
  if (second) {
    return `${first.charAt(0)}${second.charAt(0)}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function MenuRow({
  label,
  subtitle,
  onPress,
  destructive,
}: {
  label: string;
  subtitle?: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 px-5 py-4 active:opacity-70"
    >
      <View className="flex-1 gap-0.5">
        <Text
          className={
            destructive
              ? "text-destructive text-base font-medium"
              : "text-foreground text-base font-medium"
          }
        >
          {label}
        </Text>
        {subtitle ? (
          <Text className="text-muted-foreground text-xs">{subtitle}</Text>
        ) : null}
      </View>
      <Text className="text-muted-foreground text-lg">›</Text>
    </Pressable>
  );
}

function Section({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <View className="gap-2.5">
      {title ? (
        <Text className="text-muted-foreground px-1.5 text-xs font-semibold tracking-wide uppercase">
          {title}
        </Text>
      ) : null}
      <View className="bg-card border-border overflow-hidden rounded-2xl border">
        {children}
      </View>
    </View>
  );
}

function Divider() {
  return <View className="bg-border ml-5 h-px" />;
}

export default function Profile() {
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const profile = useProfile();
  const updateProfile = useUpdateProfile();
  const deleteAccount = useDeleteAccount();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  async function onSignOut() {
    setIsSigningOut(true);
    try {
      await signOut(supabase);
      // Drop any cached per-user data (profile, bookings) so the next
      // sign-in doesn't briefly show the previous user's stale cache.
      queryClient.clear();
    } catch (e) {
      Alert.alert("Sign out failed", msg(e));
    } finally {
      setIsSigningOut(false);
    }
  }

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateProfileInput>({
    resolver: zodFormResolver(updateProfileSchema),
    values: {
      displayName: profile.data?.display_name ?? "",
      avatarUrl: profile.data?.avatar_url ?? "",
    },
  });

  async function onSave(values: UpdateProfileInput) {
    try {
      await updateProfile.mutateAsync(values);
      setIsEditing(false);
    } catch (e) {
      Alert.alert("Save failed", msg(e));
    }
  }

  function onDelete() {
    Alert.alert(
      "Delete account",
      "This permanently deletes your account and all your data.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            void (async () => {
              try {
                await deleteAccount.mutateAsync();
              } catch (e) {
                Alert.alert("Delete failed", msg(e));
              }
            })(),
        },
      ],
    );
  }

  function onSignOutPress() {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: () => void onSignOut(),
      },
    ]);
  }

  const displayName = profile.data?.display_name;

  return (
    <ScrollView
      className="bg-background flex-1"
      contentContainerStyle={{
        paddingTop: insets.top + 20,
        paddingHorizontal: 20,
        paddingBottom: 56,
        rowGap: 28,
      }}
    >
      <Text className="text-foreground text-2xl font-bold">Profile</Text>

      {/* Header card */}
      <View className="bg-card border-border gap-5 rounded-2xl border p-6">
        <View className="flex-row items-center gap-4">
          <View className="bg-primary h-16 w-16 items-center justify-center rounded-full">
            <Text className="text-primary-foreground text-xl font-bold">
              {initials(displayName, user?.email)}
            </Text>
          </View>
          <View className="flex-1 gap-1">
            <Text className="text-foreground text-lg font-bold">
              {displayName ?? "Add your name"}
            </Text>
            <Text className="text-muted-foreground text-sm">{user?.email}</Text>
          </View>
          <Pressable
            onPress={() => setIsEditing((v) => !v)}
            className="border-border h-9 w-9 items-center justify-center rounded-full border active:opacity-70"
          >
            <Text className="text-muted-foreground text-sm">
              {isEditing ? "✕" : "✎"}
            </Text>
          </Pressable>
        </View>

        {isEditing ? (
          <View className="border-border gap-3 border-t pt-5">
            <View className="gap-1.5">
              <Text className="text-sm font-medium">Display name</Text>
              <Controller
                control={control}
                name="displayName"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Your name"
                  />
                )}
              />
              {errors.displayName && (
                <Text className="text-destructive text-sm">
                  {errors.displayName.message}
                </Text>
              )}
            </View>
            <Button
              title="Save"
              loading={updateProfile.isPending}
              onPress={() => void handleSubmit(onSave)()}
            />
          </View>
        ) : null}
      </View>

      {/* Activity */}
      <Section title="Activity">
        <MenuRow
          label="My Bookings"
          subtitle="View your ticket history"
          onPress={() => router.push("/bookings")}
        />
        <Divider />
        <MenuRow
          label="Wishlist"
          subtitle="Movies you want to watch"
          onPress={() => router.push("/wishlist")}
        />
      </Section>

      {/* Payments */}
      <Section title="Payments">
        <MenuRow
          label="Payment Methods"
          subtitle="Manage saved cards"
          onPress={() => router.push("/payment-methods")}
        />
      </Section>

      {/* Support */}
      <Section title="Support">
        <MenuRow
          label="Help & Support"
          onPress={() =>
            Alert.alert("Help & Support", "Contact us at support@sedutosi.com")
          }
        />
        <Divider />
        <MenuRow
          label="Rate the App"
          onPress={() => Alert.alert("Thanks!", "Coming soon.")}
        />
        <Divider />
        <MenuRow
          label="Share the App"
          onPress={() => Alert.alert("Share", "Coming soon.")}
        />
      </Section>

      {/* Legal */}
      <Section title="Legal">
        <MenuRow
          label="Terms & Conditions"
          onPress={() => Alert.alert("Terms & Conditions", "Coming soon.")}
        />
        <Divider />
        <MenuRow
          label="Privacy Policy"
          onPress={() => Alert.alert("Privacy Policy", "Coming soon.")}
        />
      </Section>

      {/* Account actions */}
      <Section title="Account">
        <MenuRow
          label={isSigningOut ? "Signing out…" : "Sign Out"}
          onPress={onSignOutPress}
        />
        <Divider />
        <MenuRow label="Delete Account" destructive onPress={onDelete} />
      </Section>

      <Text className="text-muted-foreground mt-1 text-center text-xs">
        SedutoSi v1.0.0
      </Text>
    </ScrollView>
  );
}
