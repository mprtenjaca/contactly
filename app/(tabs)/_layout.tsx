import { Tabs, Redirect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

export default function TabsLayout() {
  const { colors, theme } = useTheme();
  const { session } = useAuth();

  // Guard the whole tab group rather than relying on the entry redirect in
  // app/index.tsx: a deep link into contactly://(tabs)/... or a stale back
  // stack after sign-out would otherwise render real contact data.
  if (!session) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: "#007AFF",
          tabBarInactiveTintColor: "#8E8E93",
          tabBarStyle: {
            backgroundColor: colors.background,
            borderTopColor: colors.separator,
            borderTopWidth: 0.5,
            height: 60,
            paddingBottom: 8,
            paddingTop: 8,
          },
          headerShown: false,
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Contacts",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons 
                name={focused ? "people" : "people-outline"} 
                size={24} 
                color={color} 
              />
            ),
          }}
        />
        <Tabs.Screen
          name="recents"
          options={{
            title: "Recents",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons 
                name={focused ? "time" : "time-outline"} 
                size={24} 
                color={color} 
              />
            ),
          }}
        />
        <Tabs.Screen
          name="reminders"
          options={{
            title: "Call Later",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons 
                name={focused ? "alarm" : "alarm-outline"} 
                size={24} 
                color={color} 
              />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </SafeAreaView>
  );
} 