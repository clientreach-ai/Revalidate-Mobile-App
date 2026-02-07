/**
 * Utility to sanitize error messages for user-friendly display in production.
 * In development mode, original detailed messages are preserved for easier debugging.
 */

const ERROR_MAP: Record<number, string> = {
  400: 'Check the information provided and try again.',
  401: 'Session expired. Please log in again.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested resource was not found.',
  408: 'Request timed out. Please check your connection.',
  413: 'The file you are trying to upload is too large.',
  422: 'Invalid data provided. Please check your input.',
  429: 'Too many requests. Please wait a moment and try again.',
  500: 'Something went wrong on our end. Our team has been notified.',
  502: 'The server is temporarily unavailable. Please try again later.',
  503: 'Service is undergoing maintenance. Please check back soon.',
  504: 'The server took too long to respond. Please try again.',
};

/**
 * Sanitizes an error message for end-users.
 * 
 * @param message The original error message from the server or catch block
 * @param status The HTTP status code, if available
 * @returns A user-friendly error message
 */
export function sanitizeError(message: string, status?: number): string {
  // Always return original in DEV for easier debugging
  if (__DEV__) {
    return message;
  }

  // 1. Heuristic check for technical keywords - priority 1
  if (isTechnicalError(message)) {
    return status && status >= 500 
      ? (ERROR_MAP[500] || 'Something went wrong.') 
      : 'A temporary error occurred. Please try again later.';
  }

  // 2. Check status code mapping - priority 2
  if (status && ERROR_MAP[status]) {
    // If it's a 400 with a specific validation message, we might want to keep it
    // if it doesn't look like a technical trace or DB error.
    if (status === 400 && message) {
      return message;
    }
    return ERROR_MAP[status];
  }

  // 2. Fallback for network/timeout issues that might not have a status
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes('network request failed') || lowerMessage.includes('internet_required')) {
    return 'Connection lost. Please check your internet settings.';
  }

  if (lowerMessage.includes('timeout') || lowerMessage.includes('aborted')) {
    return 'The request took too long. Please try again.';
  }

  // 3. Heuristic check for technical keywords
  if (isTechnicalError(message)) {
    return 'A temporary error occurred. Please try again later.';
  }

  // 4. Default fallback for production
  return message || 'An unexpected error occurred.';
}

/**
 * Heuristic to detect technical error messages (Stack traces, DB errors, Prisma/Node internals)
 */
function isTechnicalError(message: string): boolean {
  if (!message) return false;
  
  const technicalKeywords = [
    'stack',
    'trace',
    'prisma',
    'database',
    'sql',
    'query',
    'column',
    'undefined',
    'null',
    'pointer',
    'exception',
    'at ', // usually part of stack trace
    'internal server error',
    'failed to fetch',
    'json',
    'syntax error',
    'parse error'
  ];

  const lower = message.toLowerCase();
  return technicalKeywords.some(keyword => lower.includes(keyword));
}
