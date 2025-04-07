import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { maybeCompleteAuthSession } from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Ensure auth session is completed
maybeCompleteAuthSession();

export const configureGoogleSignIn = () => {
  // No configuration needed here anymore
};

export const useGoogleAuth = () => {
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: "20544217964-1atda09e8qjjvkb12lb75vulf9gkrgro.apps.googleusercontent.com",
    iosClientId: "20544217964-va0a6094fs32tosrk06lphv03up1mptm.apps.googleusercontent.com",
    webClientId: "20544217964-d28e895g59vg4fl0epoi2gqa0mmsr4id.apps.googleusercontent.com",
    // redirectUri: 'https://auth.expo.io/@mprtenja/contactly'
  });

  return { request, response, promptAsync };
};

export const signInWithGoogle = async (promptAsync: () => Promise<any>) => {
  try {
    const response = await promptAsync();
    if (response?.type === 'success') {
      const { authentication } = response;
      // Get user info using the access token
      const userInfoResponse = await fetch(
        'https://www.googleapis.com/userinfo/v2/me',
        {
          headers: { Authorization: `Bearer ${authentication.accessToken}` },
        }
      );
      console.log("User info response:", userInfoResponse);
      const userInfo = await userInfoResponse.json();
      return userInfo;
    }
    return null;
  } catch (error) {
    console.error('Google Sign-In Error:', error);
    throw error;
  }
};

export const signOutFromGoogle = async () => {
  try {
    await GoogleSignin.signOut();
  } catch (error) {
    console.error('Google Sign-Out Error:', error);
    throw error;
  }
}; 