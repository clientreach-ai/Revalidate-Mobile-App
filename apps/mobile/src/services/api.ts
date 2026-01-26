import { API_CONFIG, API_ENDPOINTS } from '@revalidation-tracker/constants';
import { checkNetworkStatus } from './network-monitor';
import { queueOperation } from './sync-service';
import { getSubscriptionInfo, canUseOfflineMode } from '@/utils/subscription';
import AsyncStorage from '@react-native-async-storage/async-storage';

class ApiService {
  private baseURL: string;
  private timeout: number;

  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.timeout = API_CONFIG.TIMEOUT;
  }

  private async shouldQueueOffline(endpoint: string): Promise<{ shouldQueue: boolean; isFreeUser: boolean }> {
    const isConnected = await checkNetworkStatus();
    if (isConnected) return { shouldQueue: false, isFreeUser: false };

    const subscriptionInfo = await getSubscriptionInfo();
    if (!subscriptionInfo) {
      try {
        const token = await AsyncStorage.getItem('authToken');
        if (token) {
          const response = await this.getRaw<{
            success: boolean;
            data: { subscriptionTier: string };
          }>(API_ENDPOINTS.USERS.ME, token);
          
          if (response?.data?.subscriptionTier) {
            const tier = response.data.subscriptionTier;
            const canOffline = canUseOfflineMode(tier);
            await this.updateSubscriptionCache(tier);
            return { shouldQueue: canOffline, isFreeUser: tier === 'free' };
          }
        }
      } catch (error) {
        console.error('Error checking subscription for offline mode:', error);
      }
      return { shouldQueue: false, isFreeUser: true };
    }

    return { shouldQueue: subscriptionInfo.canUseOffline, isFreeUser: !subscriptionInfo.isPremium };
  }

  private async updateSubscriptionCache(subscriptionTier: string): Promise<void> {
    const { setSubscriptionInfo } = await import('@/utils/subscription');
    await setSubscriptionInfo({
      subscriptionTier: subscriptionTier as 'free' | 'premium',
      subscriptionStatus: 'active',
      isPremium: subscriptionTier === 'premium',
      canUseOffline: subscriptionTier === 'premium',
    });
  }

  private async getRaw<T>(endpoint: string, token?: string): Promise<T> {
    const response = await fetch(this.getUrl(endpoint), {
      method: 'GET',
      headers: this.getHeaders(token),
      signal: this.createTimeoutSignal(this.timeout),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      const errorMessage = error.error || error.message || `API Error: ${response.status} ${response.statusText}`;
      throw new Error(errorMessage);
    }

    return response.json();
  }

  /**
   * Get the full URL for an endpoint
   */
  private getUrl(endpoint: string): string {
    // Remove leading slash if present to avoid double slashes
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    return `${this.baseURL}/${cleanEndpoint}`;
  }

  /**
   * Get default headers
   */
  private getHeaders(token?: string): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Create an AbortController with timeout
   */
  private createTimeoutSignal(timeoutMs: number): AbortSignal {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), timeoutMs);
    return controller.signal;
  }

  async get<T>(endpoint: string, token?: string): Promise<T> {
    const { shouldQueue, isFreeUser } = await this.shouldQueueOffline(endpoint);
    
    if (shouldQueue) {
      await queueOperation('GET', endpoint, undefined, token ? { Authorization: `Bearer ${token}` } : undefined);
      throw new Error('OFFLINE_MODE: Operation queued for sync when connection is restored');
    }
    
    if (isFreeUser) {
      throw new Error('INTERNET_REQUIRED: This feature requires an internet connection. Please connect to the internet and try again.');
    }

    return this.getRaw<T>(endpoint, token);
  }

  async post<T>(endpoint: string, data: unknown, token?: string): Promise<T> {
    const { shouldQueue, isFreeUser } = await this.shouldQueueOffline(endpoint);
    
    if (shouldQueue) {
      await queueOperation('POST', endpoint, data, token ? { Authorization: `Bearer ${token}` } : undefined);
      throw new Error('OFFLINE_MODE: Operation queued for sync when connection is restored');
    }
    
    if (isFreeUser) {
      throw new Error('INTERNET_REQUIRED: This feature requires an internet connection. Please connect to the internet and try again.');
    }

    const response = await fetch(this.getUrl(endpoint), {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify(data),
      signal: this.createTimeoutSignal(this.timeout),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      const errorMessage = error.error || error.message || `API Error: ${response.status} ${response.statusText}`;
      throw new Error(errorMessage);
    }

    return response.json();
  }

  async put<T>(endpoint: string, data: unknown, token?: string): Promise<T> {
    const { shouldQueue, isFreeUser } = await this.shouldQueueOffline(endpoint);
    
    if (shouldQueue) {
      await queueOperation('PUT', endpoint, data, token ? { Authorization: `Bearer ${token}` } : undefined);
      throw new Error('OFFLINE_MODE: Operation queued for sync when connection is restored');
    }
    
    if (isFreeUser) {
      throw new Error('INTERNET_REQUIRED: This feature requires an internet connection. Please connect to the internet and try again.');
    }

    const response = await fetch(this.getUrl(endpoint), {
      method: 'PUT',
      headers: this.getHeaders(token),
      body: JSON.stringify(data),
      signal: this.createTimeoutSignal(this.timeout),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      const errorMessage = error.error || error.message || `API Error: ${response.status} ${response.statusText}`;
      throw new Error(errorMessage);
    }

    return response.json();
  }

  async patch<T>(endpoint: string, data: unknown, token?: string): Promise<T> {
    const { shouldQueue, isFreeUser } = await this.shouldQueueOffline(endpoint);
    
    if (shouldQueue) {
      await queueOperation('PATCH', endpoint, data, token ? { Authorization: `Bearer ${token}` } : undefined);
      throw new Error('OFFLINE_MODE: Operation queued for sync when connection is restored');
    }
    
    if (isFreeUser) {
      throw new Error('INTERNET_REQUIRED: This feature requires an internet connection. Please connect to the internet and try again.');
    }

    const response = await fetch(this.getUrl(endpoint), {
      method: 'PATCH',
      headers: this.getHeaders(token),
      body: JSON.stringify(data),
      signal: this.createTimeoutSignal(this.timeout),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      const errorMessage = error.error || error.message || `API Error: ${response.status} ${response.statusText}`;
      throw new Error(errorMessage);
    }

    return response.json();
  }

  async delete<T>(endpoint: string, token?: string): Promise<T> {
    const { shouldQueue, isFreeUser } = await this.shouldQueueOffline(endpoint);
    
    if (shouldQueue) {
      await queueOperation('DELETE', endpoint, undefined, token ? { Authorization: `Bearer ${token}` } : undefined);
      throw new Error('OFFLINE_MODE: Operation queued for sync when connection is restored');
    }
    
    if (isFreeUser) {
      throw new Error('INTERNET_REQUIRED: This feature requires an internet connection. Please connect to the internet and try again.');
    }

    const response = await fetch(this.getUrl(endpoint), {
      method: 'DELETE',
      headers: this.getHeaders(token),
      signal: this.createTimeoutSignal(this.timeout),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      const errorMessage = error.error || error.message || `API Error: ${response.status} ${response.statusText}`;
      throw new Error(errorMessage);
    }

    return response.json();
  }

  /**
   * Upload a file
   */
  async uploadFile(
    endpoint: string,
    file: { uri: string; type: string; name: string },
    token?: string,
    additionalData?: Record<string, string>
  ): Promise<unknown> {
    const formData = new FormData();
    
    // For React Native, we need to handle file uploads differently
    // @ts-expect-error - React Native FormData accepts file objects
    formData.append('file', {
      uri: file.uri,
      type: file.type,
      name: file.name,
    });

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    const headers: HeadersInit = {
      Accept: 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(this.getUrl(endpoint), {
      method: 'POST',
      headers,
      body: formData,
      signal: this.createTimeoutSignal(this.timeout * 2), // Longer timeout for file uploads
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      // API returns { success: false, error: "message" } or { message: "..." }
      const errorMessage = error.error || error.message || `API Error: ${response.status} ${response.statusText}`;
      throw new Error(errorMessage);
    }

    return response.json();
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; message: string }> {
    return this.get<{ status: string; message: string }>(API_ENDPOINTS.HEALTH);
  }
}

// Export singleton instance
export const apiService = new ApiService();

// Export endpoints for convenience
export { API_ENDPOINTS };
