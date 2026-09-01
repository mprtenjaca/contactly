import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

// Kept in SecureStore, not AsyncStorage: AsyncStorage is plain text on disk,
// so anyone with filesystem access could flip this flag off and skip the lock.
const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';

export async function isBiometricAvailable(): Promise<boolean> {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  if (!compatible) return false;

  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return enrolled;
}

export async function authenticateBiometric(): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to access Contactly',
      disableDeviceFallback: true,
      cancelLabel: 'Cancel',
    });
    return result.success;
  } catch (error) {
    console.error('Biometric authentication error:', error);
    return false;
  }
}

export async function isBiometricEnabled(): Promise<boolean> {
  try {
    const value = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    return value === 'true';
  } catch (error) {
    console.error('Error reading biometric setting:', error);
    return false;
  }
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  try {
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, enabled.toString());
  } catch (error) {
    console.error('Error saving biometric setting:', error);
  }
} 