import { useEffect } from 'react';
import { Stack } from "expo-router";
import { ThemeProvider } from '../context/ThemeContext';
import { AuthProvider } from '../context/AuthContext';
import * as Notifications from 'expo-notifications';
import { initializeNotifications } from '../services/NotificationService';
import { initDatabase } from '../services/DatabaseService';
import { SQLiteProvider } from 'expo-sqlite';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ProfileScreen from '../components/screens/ProfileScreen';
import { configureGoogleSignIn } from '../services/GoogleAuthService';
import { restoreSession } from '../services/AuthService';
import { offlineManager } from '../services/OfflineManager';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    initializeNotifications();
    // initDatabase().catch(error => {
    //   console.error('Failed to initialize database:', error);
    // });

    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const phoneNumber = response.notification.request.content.data?.phoneNumber;
      if (phoneNumber) {
        // You could add functionality to directly call the number here
        console.log('Notification tapped, phone number:', phoneNumber);
      }
    });

    // Set up notification response handling
    const responseListener = Notifications.addNotificationResponseReceivedListener(
      response => {
        const data = response.notification.request.content.data;
        if (data.contactId) {
          // Navigate to contact details
          router.push({
            pathname: `/contact/${data.contactId}`,
            params: { 
              contact: JSON.stringify({
                id: data.contactId,
                // Add other required contact data
              })
            }
          });
        }
      }
    );

    configureGoogleSignIn();

    // Initialize offline support
    restoreSession().catch(console.error);

    return () => {
      subscription.remove();
      responseListener.remove();
    };
  }, [router]);

  return (
    <AuthProvider>
      <ThemeProvider>
        <SQLiteProvider databaseName="contactly.db" onInit={async () => {
          try {
            await initDatabase();
          } catch (error) {
            console.error('Failed to initialize database:', error);
          }
        }}>
          <Stack screenOptions={{
            animation: 'slide_from_right',
            headerShown: false,
          }}>
            <Stack.Screen name="index" />
            <Stack.Screen 
              name="(auth)" 
              options={{ 
                animation: 'slide_from_right',
              }} 
            />
            <Stack.Screen 
              name="(tabs)" 
              options={{ 
                animation: 'slide_from_right',
              }} 
            />
          </Stack>
        </SQLiteProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
