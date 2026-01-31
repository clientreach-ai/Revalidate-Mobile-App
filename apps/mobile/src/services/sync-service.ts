import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS } from '@revalidation-tracker/constants';
import {
  getPendingOperations,
  updateOperationStatus,
  deleteOperation,
  cacheUserProfile,
} from './offline-storage';
import { apiService } from './api';
import { checkNetworkStatus, subscribeToNetworkChanges } from './network-monitor';
import { showToast } from '@/utils/toast';
import { useSubscriptionStore } from '@/features/subscription/subscription.store';
import { useAuthStore } from '@/features/auth/auth.store';

let isSyncing = false;
let isPreCaching = false;
let lastPreCacheTime = 0;
let isInitialized = false;
const PRE_CACHE_THROTTLE = 300000; // Increased to 5 minutes
let networkUnsubscribe: (() => void) | null = null;

export async function initializeSyncService() {
  if (isInitialized) return;

  const isConnected = await checkNetworkStatus();

  if (isConnected) {
    await syncPendingOperations();
  }

  networkUnsubscribe = subscribeToNetworkChanges(async (isConnected) => {
    if (isConnected && !isSyncing) {
      await syncPendingOperations();
    }
  });

  isInitialized = true;
}

export function cleanupSyncService() {
  if (networkUnsubscribe) {
    networkUnsubscribe();
    networkUnsubscribe = null;
  }
  isInitialized = false;
}

export async function syncPendingOperations(): Promise<void> {
  if (isSyncing) return;

  const isConnected = await checkNetworkStatus();
  if (!isConnected) return;

  isSyncing = true;

  try {
    const operations = await getPendingOperations();

    if (operations.length === 0) {
      // No operations to sync, but still refresh user cache if premium
      await refreshUserCacheIfPremium();
      isSyncing = false;
      return;
    }

    const token = await AsyncStorage.getItem('authToken');
    if (!token) {
      isSyncing = false;
      return;
    }

    let syncedCount = 0;
    let failedCount = 0;

    for (const operation of operations) {
      try {
        if (operation.status === 'syncing') {
          await updateOperationStatus(operation.id!, 'pending', operation.retryCount);
        }

        await updateOperationStatus(operation.id!, 'syncing');

        const operationToken = operation.headers?.Authorization?.replace('Bearer ', '') || token;

        switch (operation.method) {
          case 'GET':
            await apiService.get(operation.endpoint, operationToken);
            break;
          case 'POST':
            // Check if this is a file upload (has file property in data)
            if (operation.data?.file?.uri) {
              const fileData = operation.data.file;
              const additionalData = { ...operation.data };
              delete additionalData.file;
              try {
                await apiService.uploadFile(
                  operation.endpoint,
                  { uri: fileData.uri, type: fileData.type, name: fileData.name },
                  operationToken,
                  Object.keys(additionalData).length > 0 ? additionalData : undefined
                );
              } catch (fileError: any) {
                // File uploads queued offline may fail if file URI expired
                console.warn('File upload failed - file may no longer exist:', fileError.message);
                throw fileError;
              }
            } else {
              await apiService.post(operation.endpoint, operation.data, operationToken);
            }
            break;
          case 'PUT':
            await apiService.put(operation.endpoint, operation.data, operationToken);
            break;
          case 'PATCH':
            await apiService.patch(operation.endpoint, operation.data, operationToken);
            break;
          case 'DELETE':
            await apiService.delete(operation.endpoint, operationToken);
            break;
        }

        await deleteOperation(operation.id!);
        syncedCount++;
      } catch (error: any) {
        console.error(`Failed to sync operation ${operation.id}:`, error);

        const newRetryCount = (operation.retryCount || 0) + 1;

        if (newRetryCount >= 3) {
          await deleteOperation(operation.id!);
          failedCount++;
        } else {
          await updateOperationStatus(operation.id!, 'failed', newRetryCount);
        }
      }
    }

    if (syncedCount > 0) {
      showToast.success(`${syncedCount} operation(s) synced`, 'Sync Complete');
    }

    if (failedCount > 0) {
      showToast.error(`${failedCount} operation(s) failed after retries`, 'Sync Error');
    }

    // Refresh user cache after syncing for premium users
    await refreshUserCacheIfPremium();
  } catch (error) {
    console.error('Error during sync:', error);
  } finally {
    isSyncing = false;
  }
}
/**
 * Refresh user profile cache when back online (for premium offline mode)
 * Also pre-fetches important data to cache for offline use
 */
async function refreshUserCacheIfPremium(): Promise<void> {
  if (isPreCaching) return;

  const now = Date.now();
  if (now - lastPreCacheTime < PRE_CACHE_THROTTLE) {
    return;
  }

  try {
    isPreCaching = true;
    lastPreCacheTime = now;
    const { isPremium, canUseOffline } = useSubscriptionStore.getState();
    if (!isPremium && !canUseOffline) return;

    const token = await AsyncStorage.getItem('authToken');
    if (!token) return;

    // Fetch and cache user profile (FORCE fetch for sync)
    try {
      const profile = await apiService.get<any>(API_ENDPOINTS.USERS.ME, token, true);
      if (profile?.data) {
        const userData = profile.data;

        // Cache the user profile for offline access
        await cacheUserProfile({
          id: userData.id,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          professionalRole: userData.professionalRole,
          subscriptionTier: userData.subscriptionTier,
          subscriptionStatus: userData.subscriptionStatus,
          onboardingCompleted: userData.onboardingCompleted,
        });

        // Update auth store with fresh data
        if (userData.onboardingCompleted) {
          useAuthStore.getState().setOnboardingCompleted(true);
        }

        // Update subscription store
        if (userData.subscriptionTier) {
          useSubscriptionStore.getState().setTier(userData.subscriptionTier);
        }
      }
    } catch (e) {
      // Quietly fail profile sync
    }

    // Pre-fetch only critical data to reduce noise/load
    const endpointsToCache = [
      '/api/v1/users/profile',
      '/api/v1/work-hours',
      '/api/v1/cpd-hours',
    ];

    for (const endpoint of endpointsToCache) {
      try {
        await apiService.get(endpoint, token, true);
      } catch (e) {
        // Non-critical, continue
      }
    }

    // Only log on successful completion, and keep it one-liner
    console.log('[SyncService] Offine data synchronized.');
  } catch (error) {
    // Non-critical - silently fail
  } finally {
    isPreCaching = false;
  }
}

export async function getPendingOperationCount(): Promise<number> {
  const operations = await getPendingOperations();
  return operations.length;
}

/**
 * Manually trigger pre-caching of offline data
 * Call this when user opens the app while online
 */
export async function preCacheOfflineData(): Promise<void> {
  const isConnected = await checkNetworkStatus();
  if (isConnected) {
    await refreshUserCacheIfPremium();
  }
}
