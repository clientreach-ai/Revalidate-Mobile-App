/**
 * Expo Push Notification Service
 * 
 * Sends push notifications via Expo's Push API.
 * https://docs.expo.dev/push-notifications/sending-notifications/
 */

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

export interface PushNotificationData {
    [key: string]: any;
}

export interface PushNotificationMessage {
    to: string;
    title: string;
    body: string;
    data?: PushNotificationData;
    sound?: 'default' | null;
    badge?: number;
    priority?: 'default' | 'normal' | 'high';
}

interface ExpoPushTicket {
    status: 'ok' | 'error';
    id?: string;
    message?: string;
    details?: {
        error?: string;
    };
}

interface ExpoPushResponse {
    data: ExpoPushTicket[];
}

/**
 * Check if an Expo push token is valid format
 */
export function isValidExpoPushToken(token: string): boolean {
    return typeof token === 'string' &&
        (token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken['));
}

/**
 * Send a push notification to a single device
 * 
 * @param expoPushToken - The Expo push token for the device
 * @param title - Notification title
 * @param body - Notification body message
 * @param data - Optional data payload
 * @returns Push ticket or null on error
 */
export async function sendPushNotification(
    expoPushToken: string,
    title: string,
    body: string,
    data?: PushNotificationData
): Promise<ExpoPushTicket | null> {
    if (!isValidExpoPushToken(expoPushToken)) {
        console.warn(`Invalid Expo push token format: ${expoPushToken}`);
        return null;
    }

    const message: PushNotificationMessage = {
        to: expoPushToken,
        title,
        body,
        sound: 'default',
        priority: 'high',
    };

    if (data) {
        message.data = data;
    }

    try {
        const response = await fetch(EXPO_PUSH_ENDPOINT, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(message),
        });

        if (!response.ok) {
            console.error(`Push notification failed with status: ${response.status}`);
            return null;
        }

        const result = await response.json() as ExpoPushResponse;
        const ticket = result.data?.[0];

        if (ticket?.status === 'error') {
            console.error('Push notification error:', ticket.message, ticket.details);
        }

        return ticket ?? null;
    } catch (error) {
        console.error('Error sending push notification:', error);
        return null;
    }
}

/**
 * Send push notifications to multiple devices
 * 
 * @param notifications - Array of notification messages
 * @returns Array of push tickets
 */
export async function sendBatchPushNotifications(
    notifications: PushNotificationMessage[]
): Promise<ExpoPushTicket[]> {
    // Filter out invalid tokens
    const validNotifications = notifications.filter(n => isValidExpoPushToken(n.to));

    if (validNotifications.length === 0) {
        return [];
    }

    try {
        const response = await fetch(EXPO_PUSH_ENDPOINT, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(validNotifications),
        });

        if (!response.ok) {
            console.error(`Batch push notification failed with status: ${response.status}`);
            return [];
        }

        const result = await response.json() as ExpoPushResponse;
        return result.data || [];
    } catch (error) {
        console.error('Error sending batch push notifications:', error);
        return [];
    }
}
