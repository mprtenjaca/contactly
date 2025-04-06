import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Contactly',
  slug: 'contactly',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  splash: {
    resizeMode: 'contain',
    backgroundColor: '#ffffff'
  },
  assetBundlePatterns: [
    '**/*'
  ],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.mpcode.contactly',
    icon: './assets/ios-icon.png',
    infoPlist: {
      NSContactsUsageDescription: 'This app requires access to contacts to display and manage your contact list.',
      NSContactsWriteOnlyPermission: 'This app needs to write to your contacts.',
      NSContactsPermission: 'This app needs access to contacts.',
      NSMicrophoneUsageDescription: 'This app needs access to microphone to detect incoming calls',
      NSCallKitEnabled: true,
      UIBackgroundModes: ['remote-notification'],
      googleServicesFile: './GoogleService-Info.plist'
    }
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/icons/adaptive-icon.png',
      backgroundColor: '#ffffff'
    },
    package: 'com.mpcode.contactly',
    permissions: [
      'READ_CONTACTS',
      'WRITE_CONTACTS',
      'RECEIVE_BOOT_COMPLETED',
      'VIBRATE'
    ]
  },
  web: {},
  plugins: [
    [
      'expo-notifications',
      {
        icon: './assets/icons/Light.png',
        color: '#ffffff',
        mode: 'production'
      }
    ],
    [
      'expo-sqlite',
      {
        enableFTS: true,
        useSQLCipher: true,
        android: {
          enableFTS: false,
          useSQLCipher: false
        }
      }
    ],
    [
      'expo-splash-screen',
      {
        backgroundColor: '#ffffff',
        image: './assets/icons/splash-icon-dark.png',
        dark: {
          image: './assets/icons/splash-icon-light.png',
          backgroundColor: '#000000'
        },
        imageWidth: 200
      }
    ]
  ],
  extra: {
    eas: {
      projectId: '83e27bfc-cb91-4b26-b0af-955112c1b062'
    }
  },
  owner: 'mprtenja',
  scheme: 'contactly',
  updates: {
    enabled: true,
    fallbackToCacheTimeout: 0
  },
  runtimeVersion: {
    policy: 'appVersion'
  }
}); 