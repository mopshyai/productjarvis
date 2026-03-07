import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App.jsx';
import { initSentry } from './lib/sentry';
import { initPostHog } from './lib/posthog';
import './index.css';

initSentry();
initPostHog();

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
