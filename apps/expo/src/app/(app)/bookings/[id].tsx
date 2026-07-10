import { Image, ScrollView, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { Stack, useLocalSearchParams } from "expo-router";

import { useBooking } from "@acme/app";

import { formatDateTime, sortSeats } from "~/lib/booking";

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: booking, isLoading } = useBooking(id);

  const isEvent = !!booking?.event_id;
  const screening = booking?.screening;
  const movie = screening?.movie;
  const cinema = screening?.screen?.cinema;
  const event = booking?.event;
  const isConfirmed = booking?.status === "confirmed";

  if (isLoading || !booking) {
    return (
      <View className="bg-background flex-1 items-center justify-center">
        <Stack.Screen options={{ title: "Booking" }} />
        <Text className="text-muted-foreground">Loading…</Text>
      </View>
    );
  }

  const title = isEvent ? (event?.title ?? "Event") : (movie?.title ?? "Movie");
  const imageUrl = isEvent ? event?.image_url : movie?.poster_url;
  const startsAt = isEvent ? event?.starts_at : screening?.starts_at;
  const seats = sortSeats(booking.seats);
  const ticketCode = `SEDUTOSI:${booking.id}`;
  const reference = booking.id.slice(0, 8).toUpperCase();

  return (
    <ScrollView className="bg-background flex-1">
      <Stack.Screen options={{ title }} />

      {/* Poster / cover banner */}
      <View style={{ height: 220 }}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        ) : (
          <View className="bg-muted h-full w-full items-center justify-center">
            <Text style={{ fontSize: 56 }}>{isEvent ? "🎟️" : "🎬"}</Text>
          </View>
        )}
        <View
          className="absolute inset-x-0 bottom-0 justify-end p-5"
          style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
        >
          <View className="flex-row items-center gap-2">
            <View
              style={{
                backgroundColor: isConfirmed ? "#dcfce7" : "#fee2e2",
                borderRadius: 999,
                paddingHorizontal: 8,
                paddingVertical: 2,
              }}
            >
              <Text
                style={{
                  color: isConfirmed ? "#15803d" : "#dc2626",
                  fontSize: 11,
                  fontWeight: "600",
                }}
              >
                {booking.status}
              </Text>
            </View>
          </View>
          <Text className="mt-1 text-2xl font-extrabold text-white">
            {title}
          </Text>
          {startsAt && (
            <Text className="text-sm text-white/85">
              {formatDateTime(startsAt)}
            </Text>
          )}
        </View>
      </View>

      <View className="gap-5 p-5">
        {/* Ticket / QR card */}
        <View className="bg-card border-border overflow-hidden rounded-2xl border">
          <View className="items-center gap-3 p-6">
            <View className="rounded-2xl bg-white p-4">
              <QRCode value={ticketCode} size={180} />
            </View>
            <Text className="text-muted-foreground text-xs">
              Show this code at the entrance
            </Text>
            <Text
              className="text-foreground text-lg font-bold"
              style={{ letterSpacing: 3 }}
            >
              {reference}
            </Text>
          </View>

          <View
            className="border-border"
            style={{ borderTopWidth: 1, borderStyle: "dashed" }}
          />

          <View className="gap-3 p-5">
            {isEvent ? (
              event?.location && (
                <View className="flex-row items-center justify-between gap-4">
                  <Text className="text-muted-foreground text-sm">
                    Location
                  </Text>
                  <Text
                    className="text-foreground flex-1 text-right text-sm font-medium"
                    numberOfLines={2}
                  >
                    {event.location}
                  </Text>
                </View>
              )
            ) : (
              <>
                {cinema?.name && (
                  <View className="flex-row items-center justify-between">
                    <Text className="text-muted-foreground text-sm">
                      Cinema
                    </Text>
                    <Text className="text-foreground text-sm font-medium">
                      {cinema.name}
                    </Text>
                  </View>
                )}
                {screening?.screen?.name && (
                  <View className="flex-row items-center justify-between">
                    <Text className="text-muted-foreground text-sm">
                      Screen
                    </Text>
                    <Text className="text-foreground text-sm font-medium">
                      {screening.screen.name}
                    </Text>
                  </View>
                )}
                {cinema?.address && (
                  <View className="flex-row items-center justify-between gap-4">
                    <Text className="text-muted-foreground text-sm">
                      Address
                    </Text>
                    <Text
                      className="text-foreground flex-1 text-right text-sm font-medium"
                      numberOfLines={2}
                    >
                      {cinema.address}
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        </View>

        {/* Seats (movies only — events are general admission) */}
        {!isEvent && (
          <View className="bg-card border-border gap-3 rounded-2xl border p-5">
            <Text className="text-muted-foreground text-xs font-medium uppercase">
              Your seats
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {seats.map((seatId) => (
                <View
                  key={seatId}
                  className="bg-primary/10 rounded-lg px-3 py-1.5"
                >
                  <Text className="text-primary text-sm font-semibold">
                    {seatId}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Price */}
        <View className="bg-card border-border gap-3 rounded-2xl border p-5">
          <View className="flex-row items-center justify-between">
            <Text className="text-muted-foreground text-sm">
              {booking.seats_count} {isEvent ? "ticket" : "seat"}
              {booking.seats_count !== 1 ? "s" : ""}
            </Text>
            <Text className="text-foreground text-sm">
              Booked {new Date(booking.created_at).toLocaleDateString("it-IT")}
            </Text>
          </View>
          <View className="border-border flex-row items-center justify-between border-t pt-3">
            <Text className="text-foreground text-base font-semibold">
              Total paid
            </Text>
            <Text className="text-primary text-2xl font-extrabold">
              {Number(booking.total_price) > 0
                ? `€${Number(booking.total_price).toFixed(2)}`
                : "Free"}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
