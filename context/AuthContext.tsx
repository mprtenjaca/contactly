import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/AuthService';
import { Session } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { saveUserToLocal } from '../services/DatabaseService';
import LoadingScreen from '../components/LoadingScreen';
import { offlineManager } from '../services/OfflineManager';
import { splitSessionData } from '../services/AuthService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AuthContext = createContext<{
  session: Session | null;
  isLoading: boolean;
}>({
  session: null,
  isLoading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...');
        
        // Get current session from Supabase
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        console.log("Current Supabase session:", currentSession);

        if (error) {
          console.error('Error getting Supabase session:', error);
          throw error;
        }

        if (currentSession) {
          console.log('Got current session from Supabase');
          if (isMounted) {
            setSession(currentSession);
            // Split and store session data
            const { sensitive, nonSensitive } = splitSessionData(currentSession);
            await SecureStore.setItemAsync('supabase.sensitive.session', JSON.stringify(sensitive));
            await AsyncStorage.setItem('supabase.session', JSON.stringify(nonSensitive));
          }
        } else {
          console.log('No current session');
          if (isMounted) {
            setSession(null);
          }
        }
      } catch (error) {
        console.error('Error in auth initialization:', error);
        // Clear any invalid session
        await SecureStore.deleteItemAsync('supabase.sensitive.session');
        await AsyncStorage.removeItem('supabase.session');
        if (isMounted) {
          setSession(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('Auth state changed:', event);
        
        if (currentSession) {
          console.log('New session available');
          setSession(currentSession);
          // Split and store session data
          const { sensitive, nonSensitive } = splitSessionData(currentSession);
          await SecureStore.setItemAsync('supabase.sensitive.session', JSON.stringify(sensitive));
          await AsyncStorage.setItem('supabase.session', JSON.stringify(nonSensitive));
        } else {
          console.log('Session cleared');
          setSession(null);
          await SecureStore.deleteItemAsync('supabase.sensitive.session');
          await AsyncStorage.removeItem('supabase.session');
        }
      }
    );

    // Initialize auth
    initializeAuth();

    // Cleanup
    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Add debug logging
  useEffect(() => {
    console.log('Auth state updated:', { session, isLoading });
  }, [session, isLoading]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <AuthContext.Provider value={{ session, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  return useContext(AuthContext);
}; 