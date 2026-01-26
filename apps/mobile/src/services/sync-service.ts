import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  saveOfflineOperation,
  getPendingOperations,
  updateOperationStatus,
  deleteOperation,
  type OfflineOperation,
} from './offline-storage';
import { apiService } from './api';
import { checkNetworkStatus, subscribeToNetworkChanges } from './network-monitor';
import { showToast } from '@/utils/toast';

let isSyncing = false;
let networkUnsubscribe: (() => void) | null = null;

export async function initializeSyncService() {
  const isConnected = await checkNetworkStatus();
  
  if (isConnected) {
    await syncPendingOperations();
  }

  networkUnsubscribe = subscribeToNetworkChanges(async (isConnected) => {
    if (isConnected && !isSyncing) {
      await syncPendingOperations();
    }
  });
}

export function cleanupSyncService() {
  if (networkUnsubscribe) {
    networkUnsubscribe();
    networkUnsubscribe = null;
  }
}

export async function syncPendingOperations(): Promise<void> {
  if (isSyncing) return;

  const isConnected = await checkNetworkStatus();
  if (!isConnected) return;

  isSyncing = true;

  try {
    const operations = await getPendingOperations();
    
    if (operations.length === 0) {
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

        let response: any;

        const operationToken = operation.headers?.Authorization?.replace('Bearer ', '') || token;
        
        switch (operation.method) {
          case 'GET':
            response = await apiService.get(operation.endpoint, operationToken);
            break;
          case 'POST':
            response = await apiService.post(operation.endpoint, operation.data, operationToken);
            break;
          case 'PUT':
            response = await apiService.put(operation.endpoint, operation.data, operationToken);
            break;
          case 'PATCH':
            response = await apiService.patch(operation.endpoint, operation.data, operationToken);
            break;
          case 'DELETE':
            response = await apiService.delete(operation.endpoint, operationToken);
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
  } catch (error) {
    console.error('Error during sync:', error);
  } finally {
    isSyncing = false;
  }
}

export async function queueOperation(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  endpoint: string,
  data?: any,
  headers?: Record<string, string>
): Promise<void> {
  await saveOfflineOperation({
    method,
    endpoint,
    data,
    headers,
    timestamp: Date.now(),
    retryCount: 0,
  });
}

export async function getPendingOperationCount(): Promise<number> {
  const operations = await getPendingOperations();
  return operations.length;
}
