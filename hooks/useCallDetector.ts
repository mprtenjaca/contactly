import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { setupCallDetector } from '../services/CallDetector';

export function useCallDetector() {
  useEffect(() => {
    setupCallDetector();

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        // Refresh permissions when app becomes active
        setupCallDetector();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);
}