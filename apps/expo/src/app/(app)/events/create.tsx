import { useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  Text as RNText,
  ScrollView,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Controller, useForm } from "react-hook-form";

import type { CreateEventFormInput } from "@acme/app";
import {
  createEventSchema,
  EVENT_CATEGORIES,
  EVENT_MIN_DURATION_MS,
  EVENT_MIN_LEAD_TIME_MS,
  useCreateEvent,
  useUploadEventImage,
  zodFormResolver,
} from "@acme/app";
import { appAlert } from "@acme/ui-native/alert";
import { Button } from "@acme/ui-native/button";
import { Input } from "@acme/ui-native/input";
import { Text } from "@acme/ui-native/text";

import { ResponsiveContainer } from "~/components/responsive-container";

const msg = (e: unknown) =>
  e instanceof Error ? e.message : "Something went wrong";

function blankToNull(value: string | undefined) {
  if (!value) return null;
  return value;
}

function addMs(date: Date | undefined, fallback: Date, ms: number) {
  const base = date ?? fallback;
  return new Date(base.getTime() + ms);
}

function formatDateTime(date: Date) {
  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text className="text-foreground text-sm font-medium">{children}</Text>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <Text className="text-destructive text-sm">{message}</Text>;
}

function DateTimeField({
  label,
  value,
  onChange,
  minimumDate,
}: {
  label: string;
  value: Date | undefined;
  onChange: (date: Date) => void;
  minimumDate?: Date;
}) {
  const [step, setStep] = useState<"closed" | "date" | "time">("closed");
  const [pendingDate, setPendingDate] = useState<Date | null>(null);

  function open() {
    setStep("date");
  }

  function onPickDateOrDateTime(_event: unknown, selected?: Date) {
    if (Platform.OS === "android") setStep("closed");
    if (!selected) return;
    if (Platform.OS === "android") {
      setPendingDate(selected);
      setStep("time");
    } else {
      onChange(selected);
    }
  }

  function onPickTime(_event: unknown, selected?: Date) {
    setStep("closed");
    if (!selected || !pendingDate) return;
    const combined = new Date(pendingDate);
    combined.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
    onChange(combined);
    setPendingDate(null);
  }

  return (
    <View className="gap-1.5">
      <FieldLabel>{label}</FieldLabel>
      <Pressable
        onPress={open}
        className="border-input bg-background h-12 justify-center rounded-md border px-3"
      >
        <RNText className={value ? "text-foreground" : "text-gray-400"}>
          {value ? formatDateTime(value) : "Select date & time"}
        </RNText>
      </Pressable>

      {step === "date" && (
        <DateTimePicker
          value={value ?? pendingDate ?? minimumDate ?? new Date()}
          mode={Platform.OS === "ios" ? "datetime" : "date"}
          minimumDate={minimumDate}
          onChange={onPickDateOrDateTime}
        />
      )}
      {step === "time" && Platform.OS === "android" && (
        <DateTimePicker
          value={pendingDate ?? new Date()}
          mode="time"
          onChange={onPickTime}
        />
      )}
    </View>
  );
}

export default function CreateEventScreen() {
  const router = useRouter();
  const createEvent = useCreateEvent();
  const uploadImage = useUploadEventImage();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateEventFormInput>({
    resolver: zodFormResolver(createEventSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "music",
      location: "",
      imageUri: "",
      price: "",
      capacity: "",
    },
  });

  const imageUri = watch("imageUri");
  const category = watch("category");
  const startsAt = watch("startsAt") as Date | undefined;

  const minStartsAt = new Date(Date.now() + EVENT_MIN_LEAD_TIME_MS);
  const minEndsAt = addMs(startsAt, minStartsAt, EVENT_MIN_DURATION_MS);

  async function onPickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      appAlert(
        "Permission needed",
        "Allow photo library access to add a cover image.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    setValue("imageUri", result.assets[0].uri, { shouldValidate: true });
  }

  async function onSubmit(values: CreateEventFormInput) {
    setIsSubmitting(true);
    try {
      const imageUrl = await uploadImage.mutateAsync({ uri: values.imageUri });
      const event = await createEvent.mutateAsync({
        title: values.title,
        description: blankToNull(values.description),
        category: values.category,
        location: blankToNull(values.location),
        imageUrl,
        startsAt: values.startsAt.toISOString(),
        endsAt: values.endsAt ? values.endsAt.toISOString() : null,
        price: values.price ? Number(values.price) : null,
        capacity: values.capacity ? Number(values.capacity) : null,
      });
      router.replace({
        pathname: "/events/[eventId]",
        params: { eventId: event.id },
      });
    } catch (e) {
      appAlert("Could not create event", msg(e));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View className="bg-background flex-1">
      <Stack.Screen
        options={{ title: "Add Live Event", headerBackTitle: "Profile" }}
      />
      <ScrollView contentContainerClassName="p-5 pb-10">
        <ResponsiveContainer style={{ gap: 20 }}>
          <View className="gap-1.5">
            <FieldLabel>Cover image</FieldLabel>
            <Pressable
              onPress={() => void onPickImage()}
              className="bg-muted overflow-hidden rounded-2xl"
              style={{ height: 160 }}
            >
              {imageUri ? (
                <Image
                  source={{ uri: imageUri }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
              ) : (
                <View className="flex-1 items-center justify-center gap-2">
                  <Ionicons name="image-outline" size={32} color="#9ca3af" />
                  <Text className="text-muted-foreground text-sm">
                    Tap to choose a photo
                  </Text>
                </View>
              )}
            </Pressable>
            <FieldError message={errors.imageUri?.message} />
          </View>

          <View className="gap-1.5">
            <FieldLabel>Title</FieldLabel>
            <Controller
              control={control}
              name="title"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="e.g. Jazz Night at Navigli"
                />
              )}
            />
            <FieldError message={errors.title?.message} />
          </View>

          <View className="gap-1.5">
            <FieldLabel>Description</FieldLabel>
            <Controller
              control={control}
              name="description"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="What should people know?"
                  multiline
                  numberOfLines={4}
                  style={{
                    height: 96,
                    paddingTop: 10,
                    textAlignVertical: "top",
                  }}
                />
              )}
            />
            <FieldError message={errors.description?.message} />
          </View>

          <View className="gap-1.5">
            <FieldLabel>Category</FieldLabel>
            <View className="flex-row flex-wrap gap-2">
              {EVENT_CATEGORIES.map((c) => {
                const selected = c === category;
                return (
                  <Pressable
                    key={c}
                    onPress={() =>
                      setValue("category", c, { shouldValidate: true })
                    }
                    className={
                      selected
                        ? "bg-primary rounded-full px-3 py-1.5"
                        : "border-border rounded-full border px-3 py-1.5"
                    }
                  >
                    <Text
                      className={
                        selected
                          ? "text-primary-foreground text-xs font-medium capitalize"
                          : "text-foreground text-xs font-medium capitalize"
                      }
                    >
                      {c}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <FieldError message={errors.category?.message} />
          </View>

          <View className="gap-1.5">
            <FieldLabel>Location</FieldLabel>
            <Controller
              control={control}
              name="location"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="e.g. Navigli, Milano"
                />
              )}
            />
            <FieldError message={errors.location?.message} />
          </View>

          <Controller
            control={control}
            name="startsAt"
            render={({ field: { onChange, value } }) => (
              <DateTimeField
                label="Starts at (at least 24h from now)"
                value={value}
                onChange={onChange}
                minimumDate={minStartsAt}
              />
            )}
          />
          <FieldError message={errors.startsAt?.message} />

          <Controller
            control={control}
            name="endsAt"
            render={({ field: { onChange, value } }) => (
              <DateTimeField
                label="Ends at (optional, at least 15 min after start)"
                value={value}
                onChange={onChange}
                minimumDate={minEndsAt}
              />
            )}
          />
          <FieldError message={errors.endsAt?.message} />

          <View className="flex-row gap-4">
            <View className="flex-1 gap-1.5">
              <FieldLabel>Price € (blank = free)</FieldLabel>
              <Controller
                control={control}
                name="price"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                  />
                )}
              />
              <FieldError message={errors.price?.message} />
            </View>
            <View className="flex-1 gap-1.5">
              <FieldLabel>Capacity (blank = unlimited)</FieldLabel>
              <Controller
                control={control}
                name="capacity"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="e.g. 100"
                    keyboardType="number-pad"
                  />
                )}
              />
              <FieldError message={errors.capacity?.message} />
            </View>
          </View>

          <Button
            title="Publish Event"
            loading={isSubmitting}
            onPress={() => void handleSubmit(onSubmit)()}
          />
        </ResponsiveContainer>
      </ScrollView>
    </View>
  );
}
