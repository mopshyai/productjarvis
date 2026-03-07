import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App.jsx';
import { initSentry } from './lib/sentry';
import { initPostHog } from './lib/posthog';
import { reportWebVitals } from './lib/performance';
import env from './lib/env';
import './index.css';

// Initialize observability
initSentry();
initPostHog();

// Register service worker in production
if (env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('[SW] Registration failed:', error);
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <div className="error-fallback">
          <h1>Something went wrong</h1>
          <p>{error?.message || 'An unexpected error occurred.'}</p>
          <button onClick={resetError}>Try again</button>
          <button onClick={() => (window.location.href = '/')}>Go home</button>
        </div>
      )}
    >
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);

// Report Web Vitals to PostHog in production
reportWebVitals((metric) => {
  if (env.PROD && window.posthog) {
    window.posthog.capture('web_vital', {
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
    });
  }
  if (env.DEV) {
    console.log(`[Web Vital] ${metric.name}:`, metric.value, metric.rating);
  }
});
