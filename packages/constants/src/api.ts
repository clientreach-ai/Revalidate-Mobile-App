/**
 * API Configuration
 * Base URL for the Revalidation Tracker API
 */
// Default to deployed backend. Allow override with `API_BASE_URL` env var
// const DEFAULT_BASE_URL = 'https://revalidate-api.fly.dev';

// Allow overriding the backend via `API_BASE_URL` env var (useful for local
// dev or pointing to a deployed instance). Default to the Fly app URL.
const resolvedBase =
  typeof process !== 'undefined' && (process as any).env && (process as any).env.API_BASE_URL
    ? (process as any).env.API_BASE_URL
    : 'https://revalidate-api.fly.dev';

export const API_CONFIG = {
  BASE_URL: resolvedBase,
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
    CHANGE_PASSWORD: '/api/v1/auth/change-password',
  },
  USERS: {
    // Search users (query param `q` expected)
    SEARCH: '/api/v1/users/search',
    PROFILE: '/api/v1/users/profile',
    UPDATE_PROFILE: '/api/v1/users/profile',
    ME: '/api/v1/auth/me',
    DISCOVERY_SOURCE: '/api/v1/users/discovery-source',
    RESET_SECTION: '/api/v1/users/reset-section',
    ONBOARDING: {
      STEP_1: '/api/v1/users/onboarding/step-1',
      STEP_2: '/api/v1/users/onboarding/step-2',
      STEP_3: '/api/v1/users/onboarding/step-3',
      STEP_4: '/api/v1/users/onboarding/step-4',
      ROLES: '/api/v1/users/onboarding/roles',
      PROGRESS: '/api/v1/users/onboarding/progress',
      DATA: '/api/v1/users/onboarding/data',
    },
  },
  CALENDAR: {
    EVENTS: '/api/v1/calendar/events',
    CREATE_EVENT: '/api/v1/calendar/events',
    GET_BY_ID: '/api/v1/calendar/events',
    UPDATE_EVENT: '/api/v1/calendar/events',
    DELETE_EVENT: '/api/v1/calendar/events',
    INVITE: '/api/v1/calendar/events',
    COPY: '/api/v1/calendar/events',
  },
  DOCUMENTS: {
    UPLOAD: '/api/v1/documents/upload',
    LIST: '/api/v1/documents',
    GET_BY_ID: '/api/v1/documents',
    UPDATE: '/api/v1/documents',
    DELETE: '/api/v1/documents',
  },
  PAYMENT: {
    CREATE_INTENT: '/api/v1/payment/create-intent',
    CONFIRM: '/api/v1/payment/confirm',
    CREATE_SESSION: '/api/v1/payment/create-session',
    STATUS: '/api/v1/payment/status',
    METHODS: '/api/v1/payment/methods',
  },
  WORK_HOURS: {
    LIST: '/api/v1/work-hours',
    CREATE: '/api/v1/work-hours',
    ACTIVE: '/api/v1/work-hours/active',
    PAUSE: '/api/v1/work-hours/active/pause',
    RESUME: '/api/v1/work-hours/active/resume',
    RESTART: '/api/v1/work-hours/active/restart',
    GET_BY_ID: '/api/v1/work-hours',
    UPDATE: '/api/v1/work-hours',
    DELETE: '/api/v1/work-hours',
    STATS_TOTAL: '/api/v1/work-hours/stats/total',
  },
  REFLECTIONS: {
    LIST: '/api/v1/reflections',
    CREATE: '/api/v1/reflections',
    GET_BY_ID: '/api/v1/reflections',
    UPDATE: '/api/v1/reflections',
    DELETE: '/api/v1/reflections',
  },
  FEEDBACK: {
    LIST: '/api/v1/feedback',
    CREATE: '/api/v1/feedback',
    GET_BY_ID: '/api/v1/feedback',
    UPDATE: '/api/v1/feedback',
    DELETE: '/api/v1/feedback',
  },
  NOTIFICATIONS: {
    LIST: '/api/v1/notifications',
    MARK_READ: '/api/v1/notifications',
    UNREAD_COUNT: '/api/v1/notifications/unread-count',
  },
  APPRAISALS: {
    LIST: '/api/v1/appraisals',
    CREATE: '/api/v1/appraisals',
    GET_BY_ID: '/api/v1/appraisals',
    UPDATE: '/api/v1/appraisals',
    DELETE: '/api/v1/appraisals',
  },
  HOSPITALS: {
    LIST: '/api/v1/hospitals',
  },
  HEALTH: '/health',
  PROFILE: {
    ROLES: '/api/v1/profile/roles',
  },
  EXPORT: {
    PREVIEW: '/api/v1/export/preview',
    PORTFOLIO: '/api/v1/export/portfolio',
  },
} as const;
