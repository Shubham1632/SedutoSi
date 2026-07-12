import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
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
  useUploadAvatar,
  zodFormResolver,
} from "@acme/app";
import { appAlert } from "@acme/ui-native/alert";
import { Button } from "@acme/ui-native/button";
import { Input } from "@acme/ui-native/input";
import { Text } from "@acme/ui-native/text";

import { ResponsiveContainer } from "~/components/responsive-container";
import { supabase } from "~/lib/supabase";
import logo from "../../../../assets/logo.png";

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
      <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
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
  const tabBarHeight = useBottomTabBarHeight();
  const primaryForeground = useColorScheme() === "dark" ? "#2b2118" : "#ffffff";
  const { user } = useSession();
  const profile = useProfile();
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();
  const deleteAccount = useDeleteAccount();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  async function onPickAvatar() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      appAlert(
        "Permission needed",
        "Allow photo library access to change your avatar.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    setIsUploadingAvatar(true);
    try {
      const avatarUrl = await uploadAvatar.mutateAsync({
        uri: result.assets[0].uri,
      });
      await updateProfile.mutateAsync({
        displayName: profile.data?.display_name ?? "",
        avatarUrl,
      });
    } catch (e) {
      appAlert("Could not update avatar", msg(e));
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  async function onSignOut() {
    setIsSigningOut(true);
    try {
      await signOut(supabase);
      queryClient.clear();
    } catch (e) {
      appAlert("Sign out failed", msg(e));
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
      appAlert("Save failed", msg(e));
    }
  }

  function onDelete() {
    appAlert(
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
                appAlert("Delete failed", msg(e));
              }
            })(),
        },
      ],
    );
  }

  function onSignOutPress() {
    appAlert("Sign out", "Are you sure you want to sign out?", [
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
        paddingBottom: tabBarHeight + 24,
      }}
    >
      <ResponsiveContainer style={{ rowGap: 28 }}>
        <Text className="text-foreground text-2xl font-bold">Profile</Text>

        <View className="bg-card border-border gap-5 rounded-2xl border p-6">
          <View className="flex-row items-center gap-4">
            <Pressable
              onPress={() => void onPickAvatar()}
              disabled={isUploadingAvatar}
              className="h-16 w-16 active:opacity-70"
            >
              {profile.data?.avatar_url ? (
                <Image
                  source={{ uri: profile.data.avatar_url }}
                  style={{ width: 64, height: 64, borderRadius: 32 }}
                />
              ) : (
                <View className="bg-primary h-16 w-16 items-center justify-center rounded-full">
                  <Text className="text-primary-foreground text-xl font-bold">
                    {initials(displayName, user?.email)}
                  </Text>
                </View>
              )}
              <View
                className="bg-primary border-background absolute right-0 bottom-0 h-6 w-6 items-center justify-center rounded-full border-2"
                pointerEvents="none"
              >
                {isUploadingAvatar ? (
                  <ActivityIndicator
                    size="small"
                    color="white"
                    style={{ transform: [{ scale: 0.6 }] }}
                  />
                ) : (
                  <Ionicons name="pencil" size={12} color={primaryForeground} />
                )}
              </View>
            </Pressable>
            <View className="flex-1 gap-1">
              <Text className="text-foreground text-lg font-bold">
                {displayName ?? "Add your name"}
              </Text>
              <Text className="text-muted-foreground text-sm">
                {user?.email}
              </Text>
            </View>
            <Pressable
              onPress={() => setIsEditing((v) => !v)}
              className="border-border h-9 w-9 items-center justify-center rounded-full border active:opacity-70"
            >
              <Ionicons
                name={isEditing ? "close" : "pencil"}
                size={16}
                color="#9ca3af"
              />
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
          <Divider />
          <MenuRow
            label="Add Live Event"
            subtitle="Create and publish your own event"
            onPress={() => router.push("/events/create")}
          />
        </Section>

        <Section title="Payments">
          <MenuRow
            label="Payment Methods"
            subtitle="Manage saved cards"
            onPress={() => router.push("/payment-methods")}
          />
        </Section>

        <Section title="Support">
          <MenuRow
            label="Help & Support"
            onPress={() =>
              appAlert("Help & Support", "Contact us at support@sedutosi.com")
            }
          />
          <Divider />
          <MenuRow
            label="Rate the App"
            onPress={() => appAlert("Thanks!", "Coming soon.")}
          />
          <Divider />
          <MenuRow
            label="Share the App"
            onPress={() => appAlert("Share", "Coming soon.")}
          />
        </Section>

        <Section title="Legal">
          <MenuRow
            label="Terms & Conditions"
            onPress={() => appAlert("Terms & Conditions", "Coming soon.")}
          />
          <Divider />
          <MenuRow
            label="Privacy Policy"
            onPress={() => appAlert("Privacy Policy", "Coming soon.")}
          />
        </Section>

        <Section title="Account">
          <MenuRow
            label={isSigningOut ? "Signing out…" : "Sign Out"}
            onPress={onSignOutPress}
          />
          <Divider />
          <MenuRow label="Delete Account" destructive onPress={onDelete} />
        </Section>

        <View style={{ width: "100%", alignItems: "center", marginTop: 8 }}>
          <Image
            source={logo}
            style={{ width: 48, height: 44 }}
            resizeMode="contain"
          />
        </View>

        <Text className="text-muted-foreground text-center text-xs">
          SedutoSi v1.0.0
        </Text>
      </ResponsiveContainer>
    </ScrollView>
  );
}
