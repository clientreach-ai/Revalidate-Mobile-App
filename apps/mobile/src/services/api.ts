import { API_CONFIG, API_ENDPOINTS } from '@revalidation-tracker/constants';
import { queueOperation } from './offline-storage';
import { useSubscriptionStore } from '@/features/subscription/subscription.store';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
    this.timeout = API_CONFIG.TIMEOUT;

    // If developer explicitly set API_BASE_URL, respect it and skip auto-detection.
    const explicitApiBase = typeof process !== 'undefined' && (process as any).env && (process as any).env.API_BASE_URL;
    if (!explicitApiBase) {
      // Probe for a locally running backend and prefer it if reachable.
      // Fire-and-forget: if detection finishes after app start, subsequent requests will use localhost/emulator host.
      console.log('[ApiService] initial baseURL:', this.baseURL);
      this.detectLocalBackend().catch(() => {});
    }
  }

  private async detectLocalBackend(): Promise<void> {
    // Probe emulator hosts first so Android emulators prefer the host machine
    const candidates = [
      'http://10.0.2.2:3000', // Android emulator (AVD)
      'http://10.0.3.2:3000', // Genymotion
      'http://localhost:3000', // iOS simulator / expo web
      'http://127.0.0.1:3000',
    ];
    const probeTimeout = 1000; // 1s

    for (const base of candidates) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), probeTimeout);
        const res = await fetch(`${base}/health`, { method: 'GET', signal: controller.signal });
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
  private isOnlineOnly(endpoint: string): boolean {
    const onlineOnlyPrefixes = [
      '/api/v1/auth',
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

  // Cache Management
  private getCacheKey(endpoint: string): string {
    return `api_cache_${endpoint}`;
  }

  private async setCache(endpoint: string, data: any): Promise<void> {
    try {
      await AsyncStorage.setItem(this.getCacheKey(endpoint), JSON.stringify({
        timestamp: Date.now(),
        data,
      }));
    } catch (e) {
      console.warn('Failed to cache response', e);
    }
  }

  private async getCache<T>(endpoint: string): Promise<T | null> {
    try {
      const cached = await AsyncStorage.getItem(this.getCacheKey(endpoint));
      if (!cached) return null;
      const { data } = JSON.parse(cached);
      return data as T;
    } catch (e) {
      return null;
    }
  }

  /**
   * Fast Fetching Strategy:
   * - Online-Only/Free: Forced network, failure = prompt user.
   * - Premium: Cache-First (instant UI) + Background Revalidate.
   */
  async get<T>(endpoint: string, token?: string): Promise<T> {
    const isOnlineMandatory = this.isOnlineOnly(endpoint);
    const { canOffline, isFreeUser } = this.getOfflineCapability();

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
    const cachedData = await this.getCache<T>(endpoint);

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
        console.log('Background revalidation failed for', endpoint, e);
        throw e;
      }
    };

    if (cachedData) {
      // Return cache immediately, silent background update
      fetchNewData().catch(() => { });
      return cachedData;
    }

    // No cache available, wait for network
    return fetchNewData();
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

    if (canOffline && !isOnlineMandatory) {
      // PREMIUM: Queue the write if it's a general feature
      // BUT first check if we are actually offline
      const isConnected = await checkNetworkStatus();
      if (!isConnected) {
        await queueOperation(method, endpoint, data, token ? { Authorization: `Bearer ${token}` } : undefined);
        showToast.info('Action saved offline', 'Offline Mode');
        return { success: true, message: 'Action queued for sync', data: null } as unknown as T;
      }
    }

    // FREE or Online-Mandatory or Premium-but-online-failure: Enforce connection check
    if (isFreeUser || isOnlineMandatory || canOffline) {
      const isConnected = await checkNetworkStatus();
      if (!isConnected) {
        throw new Error('INTERNET_REQUIRED: This feature requires an internet connection.');
      }
    }

    throw originalError;
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

      // Verify connectivity
      const isConnected = await checkNetworkStatus();
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
