import { useEffect, useState } from 'react';
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
import { isBiometricEnabled, authenticateBiometric } from '../services/BiometricService';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  const router = useRouter();
  const [biometricChecked, setBiometricChecked] = useState(false);

  useEffect(() => {
    initializeNotifications();
    let cancelled = false;
    const checkBiometric = async () => {
      try {
        const enabled = await isBiometricEnabled();
        if (!enabled) return;

        const authenticated = await authenticateBiometric();
        if (cancelled) return;
        if (!authenticated) {
          router.replace('/sign-in');
        }
      } finally {
        // Reveal the app only once the biometric prompt has resolved, so the
        // contact list is never on screen behind an unanswered prompt.
        if (!cancelled) setBiometricChecked(true);
      }
    };

    checkBiometric();

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
      cancelled = true;
      responseListener.remove();
    };
  }, [router]);

  if (!biometricChecked) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

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
