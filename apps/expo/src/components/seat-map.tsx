import type { ComponentProps } from "react";
import { useState } from "react";
import {
  Animated,
  PanResponder,
  Pressable,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { SeatStatus } from "~/lib/booking";
import { AISLE_AFTER, ROWS, SEATS_PER_ROW } from "~/lib/booking";

const GAP = 4;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

type Colors = ReturnType<typeof seatColors>;

function seatColors(dark: boolean) {
  return dark
    ? {
        available: "#2C2A35",
        availableBorder: "#413E4D",
        occupied: "#6B3A42",
        selected: "#f2934a",
        selectedText: "#2B2118",
        label: "#7C7A86",
        screen: "#f2934a",
      }
    : {
        available: "#EEEBF4",
        availableBorder: "#DAD4E4",
        occupied: "#A79FB5",
        selected: "#e2711d",
        selectedText: "#FFFFFF",
        label: "#8A8594",
        screen: "#e2711d",
      };
}

export interface SeatMapProps {
  occupied: Set<string>;
  selected: string[];
  onToggleSeat: (id: string) => void;
}

export function SeatMap({ occupied, selected, onToggleSeat }: SeatMapProps) {
  const dark = useColorScheme() === "dark";
  const C = seatColors(dark);
  const { width } = useWindowDimensions();

  const totalCells = SEATS_PER_ROW + 1 + 2;
  const seat = Math.min(
    26,
    Math.max(
      16,
      Math.floor((width - 24 - GAP * (totalCells + 1)) / totalCells),
    ),
  );
  const boardWidth = totalCells * (seat + GAP);
  const boardHeight = ROWS.length * (seat + GAP) + seat + 32;

  const pinch = usePinchZoom(boardWidth, boardHeight);

  const statusOf = (id: string): SeatStatus => {
    if (selected.includes(id)) return "selected";
    if (occupied.has(id)) return "occupied";
    return "available";
  };

  return (
    <>
      <View className="flex-row items-center justify-between px-5 py-3">
        <View className="flex-row items-center gap-4">
          <LegendDot
            color={C.available}
            border={C.availableBorder}
            label="Free"
          />
          <LegendDot color={C.selected} label="Selected" />
          <LegendDot color={C.occupied} label="Taken" />
        </View>
        <View className="border-border flex-row items-center gap-1 rounded-full border p-0.5">
          <ZoomButton icon="remove" onPress={pinch.zoomOut} />
          <ZoomButton icon="scan-outline" small onPress={pinch.reset} />
          <ZoomButton icon="add" onPress={pinch.zoomIn} />
        </View>
      </View>

      <View
        style={{
          flex: 1,
          overflow: "hidden",
          alignItems: "center",
          justifyContent: "center",
        }}
        {...pinch.panHandlers}
      >
        <Animated.View style={{ transform: pinch.transform }}>
          <ScreenIndicator seat={seat} colors={C} />
          {ROWS.map((row) => (
            <View
              key={row}
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: GAP,
              }}
            >
              <RowLabel text={row} size={seat} color={C.label} />
              {Array.from({ length: SEATS_PER_ROW }, (_, i) => i + 1).map(
                (n) => {
                  const id = `${row}${n}`;
                  return (
                    <View key={id} style={{ flexDirection: "row" }}>
                      <Seat
                        id={id}
                        status={statusOf(id)}
                        size={seat}
                        colors={C}
                        onPress={() => onToggleSeat(id)}
                      />
                      {n === AISLE_AFTER && <View style={{ width: seat }} />}
                    </View>
                  );
                },
              )}
              <RowLabel text={row} size={seat} color={C.label} />
            </View>
          ))}
        </Animated.View>
      </View>
    </>
  );
}

function ScreenIndicator({ seat, colors }: { seat: number; colors: Colors }) {
  return (
    <View style={{ alignItems: "center", marginBottom: 12 }}>
      <View
        style={{
          width: seat * 9,
          height: 6,
          borderTopWidth: 3,
          borderColor: colors.screen,
          borderTopLeftRadius: 999,
          borderTopRightRadius: 999,
          opacity: 0.6,
        }}
      />
      <Text
        style={{
          color: colors.label,
          fontSize: 10,
          letterSpacing: 4,
          marginTop: 4,
        }}
      >
        SCREEN
      </Text>
    </View>
  );
}

function Seat({
  id,
  status,
  size,
  colors,
  onPress,
}: {
  id: string;
  status: SeatStatus;
  size: number;
  colors: Colors;
  onPress: () => void;
}) {
  const bg =
    status === "selected"
      ? colors.selected
      : status === "occupied"
        ? colors.occupied
        : colors.available;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Seat ${id}, ${status}`}
      disabled={status === "occupied"}
      onPress={onPress}
      style={{
        width: size,
        height: size,
        marginHorizontal: GAP / 2,
        borderTopLeftRadius: Math.round(size * 0.32),
        borderTopRightRadius: Math.round(size * 0.32),
        borderBottomLeftRadius: Math.round(size * 0.18),
        borderBottomRightRadius: Math.round(size * 0.18),
        backgroundColor: bg,
        borderWidth: status === "available" ? 1 : 0,
        borderColor: colors.availableBorder,
        alignItems: "center",
        justifyContent: "center",
        opacity: status === "occupied" ? 0.7 : 1,
      }}
    >
      {status === "selected" && (
        <Text
          style={{
            color: colors.selectedText,
            fontSize: Math.max(8, size * 0.36),
            fontWeight: "700",
          }}
        >
          {id.slice(1)}
        </Text>
      )}
    </Pressable>
  );
}

function RowLabel({
  text,
  size,
  color,
}: {
  text: string;
  size: number;
  color: string;
}) {
  return (
    <Text
      style={{
        width: size,
        marginHorizontal: 2,
        textAlign: "center",
        color,
        fontSize: 10,
        fontWeight: "600",
      }}
    >
      {text}
    </Text>
  );
}

function LegendDot({
  color,
  border,
  label,
}: {
  color: string;
  border?: string;
  label: string;
}) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View
        style={{
          width: 14,
          height: 14,
          borderRadius: 4,
          backgroundColor: color,
          borderWidth: border ? 1 : 0,
          borderColor: border,
        }}
      />
      <Text className="text-muted-foreground text-xs">{label}</Text>
    </View>
  );
}

function ZoomButton({
  icon,
  small,
  onPress,
}: {
  icon: ComponentProps<typeof Ionicons>["name"];
  small?: boolean;
  onPress: () => void;
}) {
  const dark = useColorScheme() === "dark";
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      className="bg-muted h-7 w-7 items-center justify-center rounded-full"
    >
      <Ionicons
        name={icon}
        size={small ? 12 : 16}
        color={dark ? "#f5f3ee" : "#2b2118"}
      />
    </Pressable>
  );
}

function distance(touches: { pageX: number; pageY: number }[]) {
  const a = touches[0];
  const b = touches[1];
  if (!a || !b) return 0;
  return Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function createPinchController(boardWidth: number, boardHeight: number) {
  const scale = new Animated.Value(1);
  const translateX = new Animated.Value(0);
  const translateY = new Animated.Value(0);

  const g = {
    scale: 1,
    x: 0,
    y: 0,
    startScale: 1,
    startX: 0,
    startY: 0,
    startDist: 0,
    pinching: false,
  };

  const applyBounds = () => {
    const maxX = Math.max(0, (boardWidth * (g.scale - 1)) / 2) / g.scale;
    const maxY = Math.max(0, (boardHeight * (g.scale - 1)) / 2) / g.scale;
    g.x = clamp(g.x, -maxX, maxX);
    g.y = clamp(g.y, -maxY, maxY);
    translateX.setValue(g.x);
    translateY.setValue(g.y);
  };

  const setScale = (next: number, animate = false) => {
    g.scale = clamp(next, MIN_ZOOM, MAX_ZOOM);
    if (g.scale === 1) {
      g.x = 0;
      g.y = 0;
    }
    if (animate) {
      Animated.parallel([
        Animated.spring(scale, { toValue: g.scale, useNativeDriver: true }),
        Animated.spring(translateX, { toValue: g.x, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: g.y, useNativeDriver: true }),
      ]).start();
    } else {
      scale.setValue(g.scale);
    }
    applyBounds();
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (e, gesture) =>
      e.nativeEvent.touches.length >= 2 ||
      (g.scale > 1 && (Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4)),
    onPanResponderGrant: (e) => {
      g.startScale = g.scale;
      g.startX = g.x;
      g.startY = g.y;
      const touches = e.nativeEvent.touches;
      if (touches.length >= 2) {
        g.pinching = true;
        g.startDist = distance(touches);
      } else {
        g.pinching = false;
      }
    },
    onPanResponderMove: (e, gesture) => {
      const touches = e.nativeEvent.touches;
      if (touches.length >= 2) {
        if (!g.pinching) {
          g.pinching = true;
          g.startDist = distance(touches);
          g.startScale = g.scale;
        }
        const ratio = distance(touches) / (g.startDist || 1);
        g.scale = clamp(g.startScale * ratio, MIN_ZOOM, MAX_ZOOM);
        scale.setValue(g.scale);
        applyBounds();
      } else if (g.scale > 1) {
        g.x = g.startX + gesture.dx / g.scale;
        g.y = g.startY + gesture.dy / g.scale;
        applyBounds();
      }
    },
    onPanResponderRelease: () => {
      g.pinching = false;
      if (g.scale <= 1) setScale(1, true);
      else applyBounds();
    },
    onPanResponderTerminate: () => {
      g.pinching = false;
    },
  });

  return {
    panHandlers: panResponder.panHandlers,
    transform: [{ scale }, { translateX }, { translateY }] as const,
    zoomIn: () => setScale(g.scale + 0.5, true),
    zoomOut: () => setScale(g.scale - 0.5, true),
    reset: () => setScale(1, true),
  };
}

function usePinchZoom(boardWidth: number, boardHeight: number) {
  const [controller] = useState(() =>
    createPinchController(boardWidth, boardHeight),
  );
  return controller;
}
