import posthog from 'posthog-js';

export function initPostHog() {
  if (import.meta.env.VITE_POSTHOG_KEY) {
    posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
      api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com',
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: true,
      loaded: (ph) => {
        if (import.meta.env.DEV) ph.opt_out_capturing();
      },
    });
  }
}

export function identifyUser(user) {
  if (user && import.meta.env.VITE_POSTHOG_KEY) {
    posthog.identify(user.id, { email: user.email, name: user.name });
  }
}

export function setWorkspace(workspace) {
  if (workspace && import.meta.env.VITE_POSTHOG_KEY) {
    posthog.group('workspace', workspace.id, { name: workspace.name });
  }
}

export function trackEvent(event, properties = {}) {
  if (import.meta.env.VITE_POSTHOG_KEY) {
    posthog.capture(event, properties);
  }
}

export function resetUser() {
  if (import.meta.env.VITE_POSTHOG_KEY) {
    posthog.reset();
  }
}
