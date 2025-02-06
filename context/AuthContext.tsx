import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/AuthService';
import { Session } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { saveUserToLocal, getLocalUser } from '../services/DatabaseService';
import LoadingScreen from '../components/LoadingScreen';
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
    // Try to restore session from SecureStore
    const restoreSessionFromStorage = async () => {
      try {
        const sessionStr = await SecureStore.getItemAsync('supabase.session');
        if (sessionStr) {
          const savedSession = JSON.parse(sessionStr);
          setSession(savedSession);
        }
      } catch (error) {
        console.error('Error restoring session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        if (currentSession) {
          // Save session to SecureStore
          await SecureStore.setItemAsync(
            'supabase.session',
            JSON.stringify(currentSession)
          );
          
          // Save user data to local SQLite
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentSession.user.id)
            .single();
            
          if (profileData) {
            await saveUserToLocal({
              id: currentSession.user.id,
              email: currentSession.user.email || '',
              firstName: profileData.first_name,
              lastName: profileData.last_name,
            });
          }
        }
      }
    );

    restoreSessionFromStorage();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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