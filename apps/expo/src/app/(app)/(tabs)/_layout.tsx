import type { ComponentProps } from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";

function TabIcon({
  name,
  focused,
}: {
  name: ComponentProps<typeof Ionicons>["name"];
  focused: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Ionicons
      name={name}
      size={22}
      color={focused ? colors.primary : "#9ca3af"}
    />
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,

        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: "#9ca3af",
        tabBarStyle: { backgroundColor: colors.card },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Now Showing",
          tabBarLabel: "Movies",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name={focused ? "film" : "film-outline"}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="cinemas"
        options={{
          title: "Cinema Halls",
          tabBarLabel: "Cinema Hall",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name={focused ? "business" : "business-outline"}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: "Live Events",
          tabBarLabel: "Live Events",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name={focused ? "ticket" : "ticket-outline"}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarLabel: "Profile",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name={focused ? "person" : "person-outline"}
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
}
