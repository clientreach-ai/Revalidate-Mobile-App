import { API_CONFIG, API_ENDPOINTS } from '@revalidation-tracker/constants';
import { queueOperation, saveOfflineData, getOfflineData } from './offline-storage';
import { useSubscriptionStore } from '@/features/subscription/subscription.store';
import { showToast } from '@/utils/toast';
import { checkNetworkStatus } from './network-monitor';

// Custom error to distinguish server responses from network failures
class ServerError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ServerError';
    this.status = status;
  }
}

class ApiService {
  private baseURL: string;
  private timeout: number;

  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    // Faster timeout for better UX (10 seconds instead of 30)
    this.timeout = 10000;

    // Skip local backend detection if already pointing to production
    const isProductionUrl = this.baseURL.includes('fly.dev') ||
      this.baseURL.includes('herokuapp.com') ||
      this.baseURL.includes('.app') ||
      this.baseURL.includes('.io');

    if (!isProductionUrl) {
      // Only probe for local backend during development
      console.log('[ApiService] initial baseURL:', this.baseURL);
      this.detectLocalBackend().catch(() => { });
    } else {
      console.log('[ApiService] using production baseURL:', this.baseURL);
    }
  }

  get baseUrl(): string {
    return this.baseURL;
  }

  private async detectLocalBackend(): Promise<void> {
    // Skip if not in development mode
    if (__DEV__ !== true) return;

    // Probe emulator hosts first so Android emulators prefer the host machine
    const candidates = [
      'http://10.0.2.2:3000', // Android emulator (AVD)
      'http://10.0.3.2:3000', // Genymotion
      'http://localhost:3000', // iOS simulator / expo web
      'http://127.0.0.1:3000',
    ];
    const probeTimeout = 500; // 500ms - quick probe

    for (const base of candidates) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), probeTimeout);
        const res = await fetch(`${base}/health`, { method: 'GET', signal: controller.signal as any });
        clearTimeout(timer);
        if (res && res.ok) {
          this.baseURL = base;
          console.log(`[ApiService] switched baseURL to ${base}`);
          return;
        }
      } catch (e) {
        // ignore and try next candidate
      }
    }
  }
  private getOfflineCapability(): { canOffline: boolean; isFreeUser: boolean } {
    const { isPremium, canUseOffline } = useSubscriptionStore.getState();
    return {
      canOffline: canUseOffline,
      isFreeUser: !isPremium,
    };
  }

  /**
   * Identifies endpoints that REQUIRE internet for all users.
   */
  /**
   * Identifies endpoints that REQUIRE internet for all users.
   * Authentication and onboarding should typically be online-only.
   */
  private isOnlineOnly(endpoint: string): boolean {
    const onlineOnlyPrefixes = [
      '/api/v1/auth/login',
      '/api/v1/auth/register',
      '/api/v1/auth/forgot-password',
      '/api/v1/auth/reset-password',
      '/api/v1/auth/verify-email',
      '/api/v1/users/onboarding'
    ];
    return onlineOnlyPrefixes.some(prefix => endpoint.startsWith(prefix));
  }

  private updateSubscriptionCache(subscriptionTier: string): void {
    try {
      useSubscriptionStore.getState().setTier(subscriptionTier as 'free' | 'premium');
    } catch (e) {
      console.warn('Failed to update subscription cache', e);
    }
  }

  private async getRaw<T>(endpoint: string, token?: string): Promise<T> {
    const response = await fetch(this.getUrl(endpoint), {
      method: 'GET',
      headers: this.getHeaders(token),
      signal: this.createTimeoutSignal(this.timeout) as any,
    });

    if (!response.ok) {
      const errorMessage = await this.parseErrorResponse(response);
      throw new ServerError(errorMessage, response.status);
    }

    return response.json() as Promise<T>;
  }

  private async parseErrorResponse(response: Response): Promise<string> {
    try {
      const json = await response.json() as any;
      if (json && (json.error || json.message || json.errors)) {
        return json.error || json.message || JSON.stringify(json.errors);
      }
      return JSON.stringify(json);
    } catch (e) {
      try {
        const text = await response.text();
        return text || `API Error: ${response.status} ${response.statusText}`;
      } catch {
        return `API Error: ${response.status} ${response.statusText}`;
      }
    }
  }

  private getUrl(endpoint: string): string {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    return `${this.baseURL}/${cleanEndpoint}`;
  }

  private getHeaders(token?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private createTimeoutSignal(timeoutMs: number): AbortSignal {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), timeoutMs);
    return controller.signal;
  }

  // SQLite-based Cache Management for Premium Offline Mode
  private getCacheKey(endpoint: string): string {
    return `api_cache_${endpoint.replace(/\//g, '_')}`;
  }

  private async setCache(endpoint: string, data: any): Promise<void> {
    try {
      await saveOfflineData(this.getCacheKey(endpoint), {
        timestamp: Date.now(),
        data,
      });
    } catch (e) {
      console.warn('Failed to cache response to SQLite', e);
    }
  }

  private async getCache<T>(endpoint: string): Promise<T | null> {
    try {
      const cached = await getOfflineData<{ timestamp: number; data: T }>(this.getCacheKey(endpoint));
      if (!cached) return null;
      return cached.data;
    } catch (e) {
      return null;
    }
  }


  /**
   * Fast Fetching Strategy:
   * - Online-Only/Free: Forced network, failure = prompt user.
   * - Premium: Cache-First (instant UI) + Background Revalidate.
   */
  async get<T>(endpoint: string, token?: string, forceRefresh = false): Promise<T> {
    const isOnlineMandatory = this.isOnlineOnly(endpoint);
    const { isFreeUser, canOffline } = this.getOfflineCapability();

    if (isOnlineMandatory || isFreeUser) {
      // Force network for security/auth or Free plan
      try {
        const data = await this.getRaw<T>(endpoint, token);

        // Cache successful non-mandatory GETs for faster future load (e.g. if profile becomes premium)
        if (!isOnlineMandatory) {
          this.setCache(endpoint, data).catch(() => { });
        }

        // Auto-sync subscription status if we hit the "me" endpoint
        if (endpoint === API_ENDPOINTS.USERS.ME && (data as any)?.data?.subscriptionTier) {
          this.updateSubscriptionCache((data as any).data.subscriptionTier);
        }

        return data;
      } catch (error: any) {
        if (error instanceof ServerError) throw error;

        // Verify if it's REALLY a network issue before blaming internet
        const isConnected = await checkNetworkStatus();
        if (!isConnected) {
          throw new Error('INTERNET_REQUIRED: This feature requires an internet connection.');
        }

        throw error; // Likely a server-timeout or unreachable host while user is online
      }
    }

    // PREMIUM USER: Cache-First strategy for speed
    const cachedData = forceRefresh ? null : await this.getCache<T>(endpoint);

    // Always trigger background update if we have a token
    const fetchNewData = async () => {
      try {
        const data = await this.getRaw<T>(endpoint, token);
        await this.setCache(endpoint, data);

        if (endpoint === API_ENDPOINTS.USERS.ME && (data as any)?.data?.subscriptionTier) {
          this.updateSubscriptionCache((data as any).data.subscriptionTier);
        }
        return data;
      } catch (e) {
        // Silently log - premium users get cached data, no need to surface error
        console.log('Background revalidation failed for', endpoint);
        throw e;
      }
    };

    if (cachedData) {
      // Return cache immediately, silent background update
      fetchNewData().catch(() => { });
      return cachedData;
    }

    // No cache available - try network, but gracefully fallback for premium offline
    try {
      return await fetchNewData();
    } catch (error: any) {
      if (error instanceof ServerError) throw error;

      // Premium user offline with no cache - return empty/fallback response
      const isConnected = await checkNetworkStatus();
      if (!isConnected && canOffline) {
        console.log('Premium user offline, no cache for:', endpoint);

        // Special handling for auth/me to avoid breaking UI that expects a user object
        if (endpoint === API_ENDPOINTS.USERS.ME) {
          return {
            success: true,
            data: { id: 'offline', email: '', subscriptionTier: 'premium', subscriptionStatus: 'active' },
            message: 'Offline mode - no profile data'
          } as unknown as T;
        }

        // Special handling for users/profile to avoid breaking UI that expects a user profile object
        if (endpoint === API_ENDPOINTS.USERS.PROFILE || endpoint.includes('/users/profile')) {
          // Try to use the secondary manual cache if available
          try {
            const manualCache = await getOfflineData<any>('user_profile');
            if (manualCache) {
              return {
                success: true,
                data: {
                  id: manualCache.id,
                  name: manualCache.firstName ? `${manualCache.firstName} ${manualCache.lastName || ''}`.trim() : 'User',
                  email: manualCache.email,
                  subscriptionTier: manualCache.subscriptionTier || 'premium',
                  subscriptionStatus: manualCache.subscriptionStatus || 'active',
                  professionalRole: manualCache.professionalRole,
                  revalidationDate: null, // Minimal fallback
                },
                message: 'Offline mode - recovered from backup cache'
              } as unknown as T;
            }
          } catch (e) {
            // ignore manual cache error
          }

          // Return a minimal valid empty profile object instead of []
          return {
            success: true,
            data: { id: 'offline', name: 'User', email: '', subscriptionTier: 'premium' },
            message: 'Offline mode - no cached data'
          } as unknown as T;
        }

        return { success: true, data: [], message: 'Offline mode - no cached data available' } as unknown as T;
      }

      throw error;
    }
  }

  /**
   * Write Strategy with Queue Fallback:
   * - Online-Only/Free: Forced network.
   * - Premium: If network fails, queue for background sync.
   */
  private async handleOfflineWrite<T>(method: 'POST' | 'PUT' | 'PATCH' | 'DELETE', endpoint: string, data: any, token?: string, originalError?: any): Promise<T> {
    if (originalError instanceof ServerError) {
      // Server successfully reached but rejected data (e.g. 400 Bad Request)
      // DO NOT queue invalid data.
      throw originalError;
    }

    const { canOffline, isFreeUser } = this.getOfflineCapability();
    const isOnlineMandatory = this.isOnlineOnly(endpoint);

    // PREMIUM: Queue writes when offline
    if (canOffline && !isOnlineMandatory) {
      const isConnected = await checkNetworkStatus();
      if (!isConnected) {
        await queueOperation(method, endpoint, data, token ? { Authorization: `Bearer ${token}` } : undefined);

        // Optimistically update the UI cache so user sees changes immediately
        await this.performOptimisticUpdate(method, endpoint, data);

        showToast.info('Action saved offline', 'Offline Mode');
        return { success: true, message: 'Action queued for sync', data: null } as unknown as T;
      }
    }

    // FREE or Online-Mandatory: Require connection
    if (isFreeUser || isOnlineMandatory) {
      const isConnected = await checkNetworkStatus();
      if (!isConnected) {
        throw new Error('INTERNET_REQUIRED: This feature requires an internet connection.');
      }
    }

    throw originalError;
  }

  /**
   * Updates local cache optimistically for offline actions
   * "Fakes" the successful API response in the local cache
   */
  private async performOptimisticUpdate(method: string, endpoint: string, data: any): Promise<void> {
    try {
      // Determine the collection endpoint (e.g. /api/v1/cpd-hours)
      // If endpoint has an ID (PUT/DELETE), strip it to get the list endpoint
      const parts = endpoint.split('/');
      const isItemEndpoint = parts.length > 0 && !isNaN(Number(parts[parts.length - 1]));
      const listEndpoint = isItemEndpoint ? parts.slice(0, -1).join('/') : endpoint;

      // Only support optimistic updates for known list endpoints
      const supportedEndpoints = [
        '/api/v1/cpd-hours',
        '/api/v1/work-hours',
        '/api/v1/reflections',
        '/api/v1/feedback',
        '/api/v1/appraisals',
        '/api/v1/documents'
      ];

      const matchingSupported = supportedEndpoints.find(e => listEndpoint.includes(e));
      if (!matchingSupported) return;

      const cacheKey = this.getCacheKey(matchingSupported as string);
      const cached = await getOfflineData<{ timestamp: number; data: any }>(cacheKey);

      if (!cached || !cached.data) return; // Can't update if no cache exists

      let list = cached.data.data || cached.data; // Handle {data: []} or []
      if (!Array.isArray(list)) return; // Cache format not as expected

      const now = new Date().toISOString();

      if (method === 'POST') {
        let newItem: any = {
          ...data,
          id: -Math.floor(Math.random() * 1000000), // Negative temp ID
          tempId: true,
          created_at: now,
          updated_at: now,
          createdAt: now,
          updatedAt: now,
        };

        // Feature-specific mappings to match API retrieval format (camelCase usually)
        if (matchingSupported.includes('cpd-hours')) {
          newItem = {
            ...newItem,
            activityDate: data.activity_date || data.activityDate,
            durationMinutes: data.duration_minutes || data.durationMinutes,
            trainingName: data.training_name || data.trainingName,
            activityType: data.activity_type || data.activityType,
            documentIds: data.document_ids || data.documentIds || [],
          };
        } else if (matchingSupported.includes('reflections')) {
          newItem = {
            ...newItem,
            reflectionDate: data.reflection_date || data.reflectionDate,
            reflectionText: data.reflection_text || data.reflectionText,
            documentIds: data.document_ids || data.documentIds || [],
          };
        } else if (matchingSupported.includes('work-hours')) {
          const start = data.start_time || data.startTime;
          const end = data.end_time || data.endTime;
          let duration = 0;
          if (start && end) {
            duration = Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 60000);
          }

          newItem = {
            ...newItem,
            startTime: start,
            endTime: end,
            workDescription: data.work_description || data.workDescription,
            durationMinutes: duration,
            isActive: !end,
            isManualEntry: true,
          };
        } else if (matchingSupported.includes('feedback')) {
          newItem = {
            ...newItem,
            feedbackDate: data.feedback_date || data.feedbackDate,
            feedbackText: data.feedback_text || data.feedbackText,
            senderName: data.sender_name || data.senderName,
          };
        }

        // Add to beginning of list
        list.unshift(newItem);

      } else if (method === 'PUT' || method === 'PATCH') {
        const id = parseInt(parts[parts.length - 1] || '0', 10);
        const index = list.findIndex((item: any) => item.id == id);
        if (index !== -1) {
          list[index] = { ...list[index], ...data, updated_at: now };
        }

      } else if (method === 'DELETE') {
        const id = parseInt(parts[parts.length - 1] || '0', 10);
        list = list.filter((item: any) => item.id != id);
      }

      // Save updated list back to cache
      if (cached.data.data) {
        cached.data.data = list;
      } else {
        cached.data = list;
      }

      await saveOfflineData(cacheKey, cached);

      // If it's a calendar event related item, try to update calendar cache too
      if (matchingSupported === '/api/v1/cpd-hours' || matchingSupported === '/api/v1/work-hours') {
        // This is harder since calendar structure is different, but for now lists are main priority
      }

    } catch (e) {
      console.warn('Optimistic update failed', e);
    }
  }

  async post<T>(endpoint: string, data: unknown, token?: string): Promise<T> {
    try {
      const response = await fetch(this.getUrl(endpoint), {
        method: 'POST',
        headers: this.getHeaders(token),
        body: JSON.stringify(data),
        signal: this.createTimeoutSignal(this.timeout) as any,
      });

      if (!response.ok) {
        const errorMessage = await this.parseErrorResponse(response);
        throw new ServerError(errorMessage, response.status);
      }
      return response.json() as Promise<T>;
    } catch (error: any) {
      return this.handleOfflineWrite('POST', endpoint, data, token, error);
    }
  }

  async put<T>(endpoint: string, data: unknown, token?: string): Promise<T> {
    try {
      const response = await fetch(this.getUrl(endpoint), {
        method: 'PUT',
        headers: this.getHeaders(token),
        body: JSON.stringify(data),
        signal: this.createTimeoutSignal(this.timeout) as any,
      });

      if (!response.ok) {
        const errorMessage = await this.parseErrorResponse(response);
        throw new ServerError(errorMessage, response.status);
      }
      return response.json() as Promise<T>;
    } catch (error: any) {
      return this.handleOfflineWrite('PUT', endpoint, data, token, error);
    }
  }

  async patch<T>(endpoint: string, data: unknown, token?: string): Promise<T> {
    try {
      const response = await fetch(this.getUrl(endpoint), {
        method: 'PATCH',
        headers: this.getHeaders(token),
        body: JSON.stringify(data),
        signal: this.createTimeoutSignal(this.timeout) as any,
      });

      if (!response.ok) {
        const errorMessage = await this.parseErrorResponse(response);
        throw new ServerError(errorMessage, response.status);
      }
      return response.json() as Promise<T>;
    } catch (error: any) {
      return this.handleOfflineWrite('PATCH', endpoint, data, token, error);
    }
  }

  async delete<T>(endpoint: string, token?: string): Promise<T> {
    try {
      const response = await fetch(this.getUrl(endpoint), {
        method: 'DELETE',
        headers: this.getHeaders(token),
        signal: this.createTimeoutSignal(this.timeout) as any,
      });

      if (!response.ok) {
        const errorMessage = await this.parseErrorResponse(response);
        throw new ServerError(errorMessage, response.status);
      }
      return response.json() as Promise<T>;
    } catch (error: any) {
      return this.handleOfflineWrite('DELETE', endpoint, undefined, token, error);
    }
  }

  async postBlob(endpoint: string, data: unknown, token?: string): Promise<Blob> {
    try {
      const response = await fetch(this.getUrl(endpoint), {
        method: 'POST',
        headers: this.getHeaders(token),
        body: JSON.stringify(data),
        signal: this.createTimeoutSignal(this.timeout) as any,
      });

      if (!response.ok) {
        const errorMessage = await this.parseErrorResponse(response);
        throw new ServerError(errorMessage, response.status);
      }
      return await response.blob();
    } catch (error: any) {
      if (error instanceof ServerError) throw error;
      const isConnected = await checkNetworkStatus();
      if (!isConnected) {
        throw new Error('INTERNET_REQUIRED: This feature requires an internet connection.');
      }
      throw error;
    }
  }

  async uploadFile(
    endpoint: string,
    file: { uri: string; type: string; name: string },
    token?: string,
    additionalData?: Record<string, string>
  ): Promise<unknown> {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      type: file.type,
      name: file.name,
    } as any);

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(this.getUrl(endpoint), {
        method: 'POST',
        headers,
        body: formData as any,
        signal: this.createTimeoutSignal(this.timeout * 2) as any,
      });

      if (!response.ok) {
        const errorMessage = await this.parseErrorResponse(response);
        throw new ServerError(errorMessage, response.status);
      }

      return response.json();
    } catch (error: any) {
      if (error instanceof ServerError) throw error;

      // For premium users offline, queue the upload
      const { canOffline } = this.getOfflineCapability();
      const isConnected = await checkNetworkStatus();

      if (!isConnected && canOffline) {
        // Queue file upload for later (store file info for sync)
        await queueOperation('POST', endpoint, {
          file: { uri: file.uri, type: file.type, name: file.name },
          ...additionalData
        }, token ? { Authorization: `Bearer ${token}` } : undefined);
        showToast.info('File upload queued for when online', 'Offline Mode');
        return { success: true, message: 'Upload queued for sync', data: null };
      }

      if (!isConnected) {
        throw new Error('INTERNET_REQUIRED: This feature requires an internet connection.');
      }

      throw error; // Re-throw original error if user is online
    }
  }

  async healthCheck(): Promise<{ status: string; message: string }> {
    return this.get<{ status: string; message: string }>(API_ENDPOINTS.HEALTH);
  }
}

export const apiService = new ApiService();
export { API_ENDPOINTS };
