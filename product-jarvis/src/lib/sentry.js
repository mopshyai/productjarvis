import * as Sentry from '@sentry/react';

export function initSentry() {
  if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: false,
          blockAllMedia: false,
        }),
      ],
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      ignoreErrors: [
        'ResizeObserver loop limit exceeded',
        'Network request failed',
        'Load failed',
      ],
      beforeSend(event) {
        if (import.meta.env.DEV) return null;
        return event;
      },
    });
  }
}

export function setSentryUser(user) {
  if (user) {
    Sentry.setUser({ id: user.id, email: user.email, username: user.name });
  } else {
    Sentry.setUser(null);
  }
}

export function setSentryWorkspace(workspace) {
  if (workspace) {
    Sentry.setTag('workspace_id', workspace.id);
    Sentry.setTag('workspace_name', workspace.name);
  }
}

export function captureError(error, context = {}) {
  Sentry.captureException(error, { extra: context });
}

export function trackSentryEvent(name, data = {}) {
  Sentry.captureMessage(name, { level: 'info', extra: data });
}
