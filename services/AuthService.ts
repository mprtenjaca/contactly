import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

const SESSION_KEY = 'supabase.session';
const USER_KEY = 'user.data';

export const signUp = async (
  email: string, 
  password: string, 
  firstName?: string, 
  lastName?: string
) => {
  try {
    // Validate password length
    if (password.length < 6) {
      return {
        error: 'Password must be at least 6 characters long',
        user: null
      };
    }

    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName
        }
      }
    });
    
    if (authError) {
      return {
        error: authError.message,
        user: null
      };
    }

    if (!authData.user) {
      return {
        error: 'Registration failed',
        user: null
      };
    }
    
    return {
      error: null,
      user: {
        id: authData.user?.id,
        email,
        firstName,
        lastName,
      }
    };
  } catch (error) {
    console.error('Error in signUp:', error);
    return {
      error: 'An unexpected error occurred',
      user: null
    };
  }
};

export const signIn = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    
    if (data.session) {
      // Store session securely
      await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(data.session));
      
      // Fetch profile data
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.session.user.id)
        .single();

      // Store user data locally
      const userData = {
        id: data.session.user.id,
        email: data.session.user.email,
        firstName: profileData?.first_name,
        lastName: profileData?.last_name,
      };
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(userData));
    }
    
    return { data: { session: data.session } };
  } catch (error) {
    console.error('Error signing in:', error);
    throw error;
  }
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    await SecureStore.deleteItemAsync(SESSION_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    // First try to get from local storage
    const userData = await SecureStore.getItemAsync(USER_KEY);
    if (userData) {
      return JSON.parse(userData);
    }

    // If not in local storage, fetch from Supabase
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;

    if (user) {
      // Fetch profile data
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      const userInfo = {
        id: user.id,
        email: user.email,
        firstName: profileData?.first_name,
        lastName: profileData?.last_name,
      };

      // Store for offline access
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(userInfo));
      return userInfo;
    }
    return null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

export const restoreSession = async () => {
  try {
    const sessionStr = await SecureStore.getItemAsync(SESSION_KEY);
    if (sessionStr) {
      const session = JSON.parse(sessionStr);
      const { data: { session: newSession }, error } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
      
      if (error) throw error;
      return newSession;
    }
  } catch (error) {
    console.error('Error restoring session:', error);
  }
  return null;
};

export { supabase }; 