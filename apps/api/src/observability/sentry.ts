import * as Sentry from '@sentry/node';

let initialized = false;

/**
 * Initializes Sentry error reporting when a DSN is configured. A no-op otherwise,
 * so local/test environments run without a DSN.
 */
export const initSentry = (dsn: string | undefined): boolean => {
  if (!dsn) {
    return false;
  }
  Sentry.init({ dsn, tracesSampleRate: 0.1 });
  initialized = true;
  return true;
};

export const captureException = (error: unknown): void => {
  if (initialized) {
    Sentry.captureException(error);
  }
};
