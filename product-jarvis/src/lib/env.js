/**
 * Centralized environment configuration
 * Validates all required env vars at startup
 */

import { getApiBaseUrl } from './domainRoutes';

const env = {
  // Supabase (required in production)
  SUPABASE_URL:
    import.meta.env.VITE_SUPABASE_URL ||
    import.meta.env.VITE_PRODUCTJARVIS_SUPABASE_URL ||
    import.meta.env.NEXT_PUBLIC_PRODUCTJARVIS_SUPABASE_URL,

  SUPABASE_ANON_KEY:
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.VITE_PRODUCTJARVIS_SUPABASE_ANON_KEY ||
    import.meta.env.NEXT_PUBLIC_PRODUCTJARVIS_SUPABASE_ANON_KEY,

  // API Gateway
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || getApiBaseUrl(),
  AI_GATEWAY_KEY: import.meta.env.VITE_AI_GATEWAY_KEY,

  // Observability
  SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN,
  POSTHOG_KEY: import.meta.env.VITE_POSTHOG_KEY,
  POSTHOG_HOST: import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com',

  // Feature flags
  USE_LIVE_API: true,
  ENABLE_MOCK_AUTH: false,

  // Build info
  MODE: import.meta.env.MODE,
  DEV: import.meta.env.DEV,
  PROD: import.meta.env.PROD,
  BASE_URL: import.meta.env.BASE_URL,
};

// Validation
const requiredInProd = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];

if (env.PROD) {
  const missing = requiredInProd.filter((key) => !env[key]);
  if (missing.length > 0) {
    console.error(`[env] Missing required env vars: ${missing.join(', ')}`);
  }
}

if (env.DEV) {
  console.log('[env] Config:', {
    SUPABASE_URL: env.SUPABASE_URL ? '✅ Set' : '❌ Missing',
    SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing',
    API_BASE_URL: env.API_BASE_URL,
    USE_LIVE_API: env.USE_LIVE_API,
    MODE: env.MODE,
  });
}

export default env;
