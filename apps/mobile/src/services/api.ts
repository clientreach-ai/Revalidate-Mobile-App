import { API_CONFIG, API_ENDPOINTS } from '@revalidation-tracker/constants';

/**
 * API Service
 * Centralized API client for making HTTP requests to the backend
 */

class ApiService {
  private baseURL: string;
  private timeout: number;

  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.timeout = API_CONFIG.TIMEOUT;
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

  /**
   * Make a GET request
   */
  async get<T>(endpoint: string, token?: string): Promise<T> {
    const response = await fetch(this.getUrl(endpoint), {
      method: 'GET',
      headers: this.getHeaders(token),
      signal: this.createTimeoutSignal(this.timeout),
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
   * Make a POST request
   */
  async post<T>(endpoint: string, data: unknown, token?: string): Promise<T> {
    const response = await fetch(this.getUrl(endpoint), {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify(data),
      signal: this.createTimeoutSignal(this.timeout),
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
   * Make a PUT request
   */
  async put<T>(endpoint: string, data: unknown, token?: string): Promise<T> {
    const response = await fetch(this.getUrl(endpoint), {
      method: 'PUT',
      headers: this.getHeaders(token),
      body: JSON.stringify(data),
      signal: this.createTimeoutSignal(this.timeout),
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
   * Make a PATCH request
   */
  async patch<T>(endpoint: string, data: unknown, token?: string): Promise<T> {
    const response = await fetch(this.getUrl(endpoint), {
      method: 'PATCH',
      headers: this.getHeaders(token),
      body: JSON.stringify(data),
      signal: this.createTimeoutSignal(this.timeout),
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
   * Make a DELETE request
   */
  async delete<T>(endpoint: string, token?: string): Promise<T> {
    const response = await fetch(this.getUrl(endpoint), {
      method: 'DELETE',
      headers: this.getHeaders(token),
      signal: this.createTimeoutSignal(this.timeout),
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
