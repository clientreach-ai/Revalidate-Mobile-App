import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SubscriptionInfo {
  subscriptionTier: 'free' | 'premium';
  subscriptionStatus: 'active' | 'trial' | 'expired' | 'cancelled';
  isPremium: boolean;
  canUseOffline: boolean;
}

const SUBSCRIPTION_CACHE_KEY = 'user_subscription_info';
const CACHE_DURATION = 5 * 60 * 1000;

let cachedSubscription: SubscriptionInfo | null = null;
let cacheTimestamp: number = 0;

export async function getSubscriptionInfo(): Promise<SubscriptionInfo | null> {
  try {
    const now = Date.now();
    
    if (cachedSubscription && (now - cacheTimestamp) < CACHE_DURATION) {
      return cachedSubscription;
    }

    const cached = await AsyncStorage.getItem(SUBSCRIPTION_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.data && (now - parsed.timestamp) < CACHE_DURATION) {
        cachedSubscription = parsed.data;
        cacheTimestamp = parsed.timestamp;
        return cachedSubscription;
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting subscription info:', error);
    return null;
  }
}

export async function setSubscriptionInfo(info: SubscriptionInfo): Promise<void> {
  try {
    cachedSubscription = info;
    cacheTimestamp = Date.now();
    await AsyncStorage.setItem(SUBSCRIPTION_CACHE_KEY, JSON.stringify({
      data: info,
      timestamp: cacheTimestamp,
    }));
  } catch (error) {
    console.error('Error setting subscription info:', error);
  }
}

export async function clearSubscriptionCache(): Promise<void> {
  try {
    cachedSubscription = null;
    cacheTimestamp = 0;
    await AsyncStorage.removeItem(SUBSCRIPTION_CACHE_KEY);
  } catch (error) {
    console.error('Error clearing subscription cache:', error);
  }
}

export function canUseOfflineMode(subscriptionTier: string | null | undefined): boolean {
  return subscriptionTier === 'premium';
}
