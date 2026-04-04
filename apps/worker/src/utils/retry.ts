// ============================================================================
// Omniflow Worker - Retry Utility
// ============================================================================

/**
 * Calculate exponential backoff delay in milliseconds.
 * Formula: baseDelay * 2^(attempt - 1), capped at maxDelay.
 */
export function calculateBackoff(
  attempt: number,
  baseDelayMs: number = 2000,
  maxDelayMs: number = 60000,
): number {
  const delay = baseDelayMs * Math.pow(2, attempt - 1);
  return Math.min(delay, maxDelayMs);
}

/**
 * Check whether a job has exceeded its maximum retry count.
 */
export function hasExceededMaxRetries(
  currentAttempt: number,
  maxRetries: number,
): boolean {
  return currentAttempt >= maxRetries;
}

/**
 * Default retry configuration for different queue types.
 */
export const RETRY_CONFIGS = {
  email: {
    maxRetries: 3,
    baseDelayMs: 2000,
    maxDelayMs: 30000,
  },
  sms: {
    maxRetries: 3,
    baseDelayMs: 2000,
    maxDelayMs: 30000,
  },
  webhook: {
    maxRetries: 5,
    baseDelayMs: 5000,
    maxDelayMs: 300000,
  },
  workflow: {
    maxRetries: 3,
    baseDelayMs: 3000,
    maxDelayMs: 60000,
  },
  social: {
    maxRetries: 3,
    baseDelayMs: 5000,
    maxDelayMs: 60000,
  },
  reminders: {
    maxRetries: 2,
    baseDelayMs: 5000,
    maxDelayMs: 30000,
  },
  reports: {
    maxRetries: 2,
    baseDelayMs: 10000,
    maxDelayMs: 60000,
  },
  imports: {
    maxRetries: 1,
    baseDelayMs: 10000,
    maxDelayMs: 30000,
  },
  billing: {
    maxRetries: 3,
    baseDelayMs: 5000,
    maxDelayMs: 60000,
  },
} as const;
