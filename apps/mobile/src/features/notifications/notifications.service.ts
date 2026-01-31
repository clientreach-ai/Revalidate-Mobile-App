import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService, API_ENDPOINTS } from '@/services/api';
import Constants from 'expo-constants';

/**
 * Dynamic helper to get expo-notifications
 * This prevents the package from being initialized at the top level,
 * which causes errors in Expo Go SDK 53+.
 */
const getNotifications = () => {
  try {
    // Skip entirely in Expo Go to avoid removal errors
    if (Constants.appOwnership === 'expo') {
      return null;
    }
    return require('expo-notifications');
  } catch (e) {
    return null;
  }
};

// Configure notification handler
const Notifications = getNotifications();

if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  // Register notification categories for interactive actions
  Notifications.setNotificationCategoryAsync('calendar_invite', [
    {
      identifier: 'accept',
      buttonTitle: 'Accept',
      options: { opensAppToForeground: false },
    },
    {
      identifier: 'decline',
      buttonTitle: 'Decline',
      options: { opensAppToForeground: false },
    },
  ]);
}

/**
 * Check if running on a physical device or a standalone build
 */
function isPhysicalDevice(): boolean {
  // SDK 53+ removed remote notifications from Expo Go
  if (Constants.appOwnership === 'expo') {
    return false;
  }

  // In standalone builds (APKs), we always want to try setting up notifications
  // even in debug mode if it's a dev build.
  if (Platform.OS === 'web') return false;

  // Return true for real devices or standalone builds
  return !__DEV__ || Platform.OS === 'android' || Platform.OS === 'ios';
}

/**
 * Request permission and get Expo push token
 */
export async function registerForPushNotificationsAsync(): Promise<
  string | null
> {
  const Notifications = getNotifications();
  if (!Notifications) {
    console.log(
      'Push notifications are not available in this environment (Expo Go)'
    );
    return null;
  }

  let token: string | null = null;

  // Only on physical devices/standalone builds
  if (!isPhysicalDevice()) {
    console.log('Push notifications require a physical device');
    return null;
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request permission if not already granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission denied');
    return null;
  }

  // Get Expo push token
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: projectId || undefined,
    });
    token = tokenData.data;
  } catch (error) {
    console.error('Failed to get Expo push token.', error);
    return null;
  }

  // Set notification channel for Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2B5F9E',
    });
  }

  return token;
}

/**
 * Save push token to the backend
 */
export async function savePushTokenToBackend(
  pushToken: string
): Promise<boolean> {
  try {
    const authToken = await AsyncStorage.getItem('authToken');
    if (!authToken) {
      console.warn('No auth token, cannot save push token');
      return false;
    }

    await apiService.put(
      API_ENDPOINTS.USERS.UPDATE_PROFILE,
      { device_token: pushToken },
      authToken
    );

    // Cache the token locally
    await AsyncStorage.setItem('expoPushToken', pushToken);
    return true;
  } catch (error) {
    console.error('Failed to save push token to backend:', error);
    return false;
  }
}

/**
 * Register for push notifications and save token
 */
export async function setupPushNotifications(): Promise<string | null> {
  const token = await registerForPushNotificationsAsync();

  if (token) {
    await savePushTokenToBackend(token);
  }

  return token;
}

/**
 * Get cached push token
 */
export async function getCachedPushToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem('expoPushToken');
  } catch {
    return null;
  }
}

/**
 * Add notification listener
 */
export function addNotificationReceivedListener(
  callback: (notification: any) => void
): any {
  const Notifications = getNotifications();
  if (!Notifications) return { remove: () => {} };
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Add notification response listener (when user taps notification)
 */
export function addNotificationResponseReceivedListener(
  callback: (response: any) => void
): any {
  const Notifications = getNotifications();
  if (!Notifications) return { remove: () => {} };
  return Notifications.addNotificationResponseReceivedListener(callback);
}
