import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';
import { makeRedirectUri } from 'expo-auth-session';
import { saveUserToLocal } from './DatabaseService';


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
  email?: string;
  firstName?: string;
  lastName?: string;
}

const SESSION_KEY = 'supabase.session';
const USER_KEY = 'user.data';
const SENSITIVE_SESSION_KEY = 'supabase.sensitive.session';
const SENSITIVE_USER_KEY = 'user.sensitive.data';

// Helper function to split session data
export const splitSessionData = (session: any) => {
  const sensitive = {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at
  };
  
  const nonSensitive = {
    user: {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role
    },
    created_at: session.created_at
  };
  
  return { sensitive, nonSensitive };
};

// Helper function to split user data
const splitUserData = (userData: any) => {
  const sensitive = {
    id: userData.id,
    email: userData.email
  };
  
  const nonSensitive = {
    firstName: userData.firstName,
    lastName: userData.lastName
  };
  
  return { sensitive, nonSensitive };
};

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
      // Split session data
      const { sensitive, nonSensitive } = splitSessionData(data.session);
      
      // Store sensitive data in SecureStore
      await SecureStore.setItemAsync(SENSITIVE_SESSION_KEY, JSON.stringify(sensitive));
      
      // Store non-sensitive data in AsyncStorage
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(nonSensitive));
      
      // Fetch profile data
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.session.user.id)
        .single();

      // Split user data
      const userData = {
        id: data.session.user.id,
        email: data.session.user.email,
        firstName: profileData?.first_name,
        lastName: profileData?.last_name,
      };

      // Save to local DB (not a new user for regular sign-in)
      await saveUserToLocal(userData, false);
      
      const { sensitive: sensitiveUser, nonSensitive: nonSensitiveUser } = splitUserData(userData);
      
      // Store sensitive user data in SecureStore
      await SecureStore.setItemAsync(SENSITIVE_USER_KEY, JSON.stringify(sensitiveUser));
      
      // Store non-sensitive user data in AsyncStorage
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(nonSensitiveUser));
    }
    
    return { data: { session: data.session } };
  } catch (error) {
    throw error;
  }
};

export const signOut = async () => {
  try {
    // Clear all storage
    await SecureStore.deleteItemAsync(SENSITIVE_SESSION_KEY);
    await SecureStore.deleteItemAsync(SENSITIVE_USER_KEY);
    await AsyncStorage.removeItem(SESSION_KEY);
    await AsyncStorage.removeItem(USER_KEY);
    await AsyncStorage.removeItem('supabase.auth.token');
    
    // Then sign out from Supabase
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    console.log('Successfully signed out');
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    // Try to get from storage
    const [sensitiveUserStr, nonSensitiveUserStr] = await Promise.all([
      SecureStore.getItemAsync(SENSITIVE_USER_KEY),
      AsyncStorage.getItem(USER_KEY)
    ]);

    if (sensitiveUserStr && nonSensitiveUserStr) {
      const sensitiveUser = JSON.parse(sensitiveUserStr);
      const nonSensitiveUser = JSON.parse(nonSensitiveUserStr);
      return { ...sensitiveUser, ...nonSensitiveUser };
    }

    // If not in storage, fetch from Supabase
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

      // Split and store user data
      const { sensitive, nonSensitive } = splitUserData(userInfo);
      await SecureStore.setItemAsync(SENSITIVE_USER_KEY, JSON.stringify(sensitive));
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(nonSensitive));
      
      return userInfo as User;
    }
    return null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

export const restoreSession = async () => {
  try {
    // Get both sensitive and non-sensitive session data
    const [sensitiveSessionStr, nonSensitiveSessionStr] = await Promise.all([
      SecureStore.getItemAsync(SENSITIVE_SESSION_KEY),
      AsyncStorage.getItem(SESSION_KEY)
    ]);

    if (sensitiveSessionStr && nonSensitiveSessionStr) {
      const sensitiveSession = JSON.parse(sensitiveSessionStr);
      const nonSensitiveSession = JSON.parse(nonSensitiveSessionStr);
      
      // Combine session data
      const session = {
        ...sensitiveSession,
        ...nonSensitiveSession
      };

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

export const signInWithGoogle = async () => {
  try {
    // First, sign out to clear any existing sessions
    await supabase.auth.signOut();
    
    // Clear session storage to start fresh
    await SecureStore.deleteItemAsync(SENSITIVE_SESSION_KEY);
    await AsyncStorage.removeItem(SESSION_KEY);
    
    // Create new OAuth sign-in attempt
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'contactly://auth/callback',
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account', // Force account selection
        },
      }
    });

    if (error) throw error;

    if (!data?.url) {
      throw new Error('Failed to create authentication URL');
    }

    console.log("Opening auth URL...");
    
    // Open browser with auth URL
    const result = await WebBrowser.openAuthSessionAsync(
      data.url,
      'contactly://auth/callback',
      {
        showInRecents: true,
        createTask: true
      }
    );

    console.log("Auth browser result:", result.type);

    if (result.type === 'success') {
      let session = null;
      
      if (!session) {
        // Try one more approach - parse the URL for session data
        if (result.url && result.url.includes('access_token')) {
          console.log("Trying to extract session from redirect URL...");
          const url = new URL(result.url);
          const params = new URLSearchParams(url.hash.substring(1));
          
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');
          
          if (access_token && refresh_token) {
            console.log("Setting session from URL parameters...");
            const { data: setSessionData, error: setSessionError } = 
              await supabase.auth.setSession({
                access_token,
                refresh_token
              });
              
            if (setSessionError) {
              console.error("Error setting session:", setSessionError);
            } else if (setSessionData.session) {
              session = setSessionData.session;
              console.log("Session set from URL parameters!");
            }
          }
        }
      }
      
      if (!session) {
        throw new Error('Failed to obtain authentication session after multiple attempts. Please try again.');
      }

      console.log('Session successfully obtained:', session.user.id);
      
      // Get user metadata from Google authentication
      const googleFirstName = session.user?.user_metadata?.full_name?.split(' ')[0] || '';
      const googleLastName = session.user?.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '';
      const googleEmail = session.user.email || '';
      
      console.log('Google user info:', {
        full_name: session.user?.user_metadata?.full_name,
        firstName: googleFirstName,
        lastName: googleLastName,
        email: googleEmail
      });
      
      // Split session data
      const { sensitive, nonSensitive } = splitSessionData(session);
      
      // Store sensitive data in SecureStore
      await SecureStore.setItemAsync(SENSITIVE_SESSION_KEY, JSON.stringify(sensitive));
      
      // Store non-sensitive data in AsyncStorage
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(nonSensitive));
      
      // Check if profile exists
      const { data: existingProfile, error: profileFetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
        
      console.log("Existing profile:", existingProfile);
      
      if (profileFetchError && profileFetchError.code !== 'PGRST116') {
        console.warn('Error fetching profile:', profileFetchError);
      }
      
      // If profile doesn't exist or has empty name fields, create/update it
      if (!existingProfile || !existingProfile.first_name) {
        console.log("Creating/updating profile with Google data");
        
        const { data: updatedProfile, error: updateError } = await supabase
          .from('profiles')
          .upsert({
            id: session.user.id,
            first_name: googleFirstName,
            last_name: googleLastName,
            email: googleEmail,
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
          
        if (updateError) {
          console.error('Error updating profile:', updateError);
        } else {
          console.log("Profile updated successfully:", updatedProfile);
        }
        
        // Use the updated profile data
        const userData = {
          id: session.user.id,
          email: googleEmail,
          firstName: googleFirstName,
          lastName: googleLastName,
        };

        // Create user in local storage and add default categories since this is a new user
        console.log("Is user existing?", existingProfile);
        await saveUserToLocal(userData, existingProfile ? false : true); // true flag indicates this is a new user
        
        const { sensitive: sensitiveUser, nonSensitive: nonSensitiveUser } = splitUserData(userData);
        
        // Store sensitive user data in SecureStore
        await SecureStore.setItemAsync(SENSITIVE_USER_KEY, JSON.stringify(sensitiveUser));
        
        // Store non-sensitive user data in AsyncStorage
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(nonSensitiveUser));
      } else {
        // Use existing profile data
        const userData = {
          id: session.user.id,
          email: session.user.email,
          firstName: existingProfile.first_name || '',
          lastName: existingProfile.last_name || '',
        };
        
        // Save to local storage (not a new user)
        console.log("Is user existing 1?", existingProfile);
        await saveUserToLocal(userData, existingProfile ? false : true);
        
        const { sensitive: sensitiveUser, nonSensitive: nonSensitiveUser } = splitUserData(userData);
        
        // Store sensitive user data in SecureStore
        await SecureStore.setItemAsync(SENSITIVE_USER_KEY, JSON.stringify(sensitiveUser));
        
        // Store non-sensitive user data in AsyncStorage
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(nonSensitiveUser));
      }
      
      return { data: { session } };
    } else if (result.type === 'cancel') {
      throw new Error('Authentication was cancelled');
    } else {
      throw new Error(`Authentication failed with result: ${result.type}`);
    }
    
    throw new Error('Could not initiate Google sign in');
  } catch (error) {
    console.error('Error in signInWithGoogle:', error);
    throw error;
  }
};

export { supabase }; 