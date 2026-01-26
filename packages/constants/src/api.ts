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
    VERIFY_OTP: '/api/v1/auth/verify-email',
    RESEND_OTP: '/api/v1/auth/resend-otp',
  },
  USERS: {
    PROFILE: '/api/v1/users/profile',
    UPDATE_PROFILE: '/api/v1/users/profile',
    ME: '/api/v1/auth/me',
    ONBOARDING: {
      STEP_1: '/api/v1/users/onboarding/step-1',
      STEP_2: '/api/v1/users/onboarding/step-2',
      STEP_3: '/api/v1/users/onboarding/step-3',
      STEP_4: '/api/v1/users/onboarding/step-4',
      PROGRESS: '/api/v1/users/onboarding/progress',
    },
  },
  CALENDAR: {
    EVENTS: '/api/v1/calendar/events',
    CREATE_EVENT: '/api/v1/calendar/events',
  },
  DOCUMENTS: {
    UPLOAD: '/api/v1/documents/upload',
    LIST: '/api/v1/documents',
  },
  PAYMENT: {
    CREATE_INTENT: '/api/v1/payment/create-intent',
    CONFIRM: '/api/v1/payment/confirm',
    CREATE_SESSION: '/api/v1/payment/create-session',
    STATUS: '/api/v1/payment/status',
  },
  HEALTH: '/health',
} as const;
