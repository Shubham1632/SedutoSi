import { Text } from "react-native";
import { Tabs } from "expo-router";

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{icon}</Text>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#c03484" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "700" },
        tabBarActiveTintColor: "#c03484",
        tabBarInactiveTintColor: "#9ca3af",
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
