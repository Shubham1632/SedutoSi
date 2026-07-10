import { Text } from "react-native";
import { Tabs } from "expo-router";
import { useTheme } from "@react-navigation/native";

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{icon}</Text>
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
          tabBarIcon: ({ focused }) => <TabIcon icon="🎬" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="cinemas"
        options={{
          title: "Cinema Halls",
          tabBarLabel: "Cinema Hall",
          tabBarIcon: ({ focused }) => <TabIcon icon="🏛️" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: "Live Events",
          tabBarLabel: "Live Events",
          tabBarIcon: ({ focused }) => <TabIcon icon="🎟️" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarLabel: "Profile",
          tabBarIcon: ({ focused }) => <TabIcon icon="👤" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
