import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService, API_ENDPOINTS } from '@/services/api';
import Constants from 'expo-constants';

/**
 * Push Notification Registration Service
 *
 * Handles Expo push token registration and device token storage.
 */

// Configure notification handler
// Only configure if NOT in Expo Go (or if strictly native)
if (Constants.appOwnership !== 'expo') {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
        }),
    });
}

/**
 * Check if running on a physical device
 */
function isPhysicalDevice(): boolean {
    // Check if running in Expo Go or on a physical device
    // SDK 53+ removed remote notifications from Expo Go, so we must return false here to skip setup
    if (Constants.appOwnership === 'expo') {
        return false;
    }
    return !__DEV__ || Platform.OS !== 'web';
}

/**
 * Request permission and get Expo push token
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
    let token: string | null = null;

    // Only on physical devices
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
        console.error('Failed to get Expo push token:', error);
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
export async function savePushTokenToBackend(pushToken: string): Promise<boolean> {
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
    callback: (notification: Notifications.Notification) => void
): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Add notification response listener (when user taps notification)
 */
export function addNotificationResponseReceivedListener(
    callback: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(callback);
}
