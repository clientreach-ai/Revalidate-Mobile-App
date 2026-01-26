/**
 * API Configuration
 * Base URL for the Revalidation Tracker API
 */
export const API_CONFIG = {
  BASE_URL: 'https://revalidate-api.fly.dev',
  TIMEOUT: 30000, // 30 seconds
} as const;

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/v1/auth/login',
    REGISTER: '/api/v1/auth/register',
    LOGOUT: '/api/v1/auth/logout',
    REFRESH: '/api/v1/auth/refresh',
    FORGOT_PASSWORD: '/api/v1/auth/forgot-password',
    RESET_PASSWORD: '/api/v1/auth/reset-password',
  },
  USERS: {
    PROFILE: '/api/v1/users/profile',
    UPDATE_PROFILE: '/api/v1/users/profile',
  },
  CALENDAR: {
    EVENTS: '/api/v1/calendar/events',
    CREATE_EVENT: '/api/v1/calendar/events',
  },
  DOCUMENTS: {
    UPLOAD: '/api/v1/documents/upload',
    LIST: '/api/v1/documents',
  },
  HEALTH: '/health',
} as const;
