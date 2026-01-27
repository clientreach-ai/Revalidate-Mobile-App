import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  sdkVersion: '54.0.0',
  name: 'Revalidation Tracker',
  slug: 'revalidation-tracker',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.revalidationtracker.app',
    buildNumber: '1',
    infoPlist: {
      NSCameraUsageDescription: 'This app needs access to your camera to upload document evidence.',
      NSPhotoLibraryUsageDescription: 'This app needs access to your photo library to upload document evidence.',
      NSPhotoLibraryAddUsageDescription: 'This app needs access to save documents to your photo library.',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    package: 'com.revalidationtracker.app',
    versionCode: 1,
    permissions: [
      'android.permission.CAMERA',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.INTERNET',
      'android.permission.ACCESS_NETWORK_STATE',
    ],
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-image-picker',
      {
        photosPermission: 'The app accesses your photos to upload document evidence.',
        cameraPermission: 'The app accesses your camera to upload document evidence.',
      },
    ],
    [
      'expo-document-picker',
      {
        iCloudContainerEnvironment: 'Production',
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: '#ffffff',
        // sounds: ['./assets/notification-sound.wav'], // Optional - uncomment when you have a sound file
      },
    ],
    [
      'expo-sqlite',
      {
        enableForExpoGo: true,
      },
    ],
    [
      '@stripe/stripe-react-native',
      {
        merchantIdentifier: 'merchant.com.revalidationtracker.app',
        enableGooglePay: true,
      },
    ],
  ],
  extra: {
    eas: {
      // EAS requires a static projectId for linking during builds. Fill with the
      // project id reported by the EAS CLI so `eas build` can run non-interactively.
      projectId: (process.env as { EAS_PROJECT_ID?: string }).EAS_PROJECT_ID || '356a49db-0d9f-4cd6-b573-ec3f9e318ce2',
    },
  },
  scheme: 'revalidation-tracker',
  experiments: {
    typedRoutes: true,
  },
});
