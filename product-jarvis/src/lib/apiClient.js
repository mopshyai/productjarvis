import { getApiBaseUrl } from './domainRoutes';

const API_BASE = getApiBaseUrl();

function normalizeCommandResponse(payload) {
  if (payload?.action_type) return payload;

  const intent = payload?.intent_classified || 'generate_prd';
  const actionMap = {
    generate_prd: 'generate_prd',
    generate_tickets: 'generate_prd',
    search_decisions: 'search_decisions',
    get_status: 'view_digest',
  };

  return {
    action_type: actionMap[intent] || 'generate_prd',
    preview_payload: {
      summary: payload?.action_taken || 'Command routed.',
      query: payload?.content?.query || '',
    },
    required_confirmations: [],
    citations: payload?.citations || [{ source_type: 'system', excerpt: 'No source found' }],
    _meta: payload?._meta,
  };
}

function normalizePrdResponse(payload, original) {
  if (payload?.body && payload?.id) return payload;
  return {
    id: `prd_${Date.now()}`,
    feature_request: original.feature_request,
    status: 'draft',
    version: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    body: payload,
    citations: payload?.citations || [{ source_type: 'system', excerpt: 'No source found' }],
    _meta: payload?._meta,
  };
}

function normalizeTicketPreview(payload) {
  if (Array.isArray(payload?.tickets)) {
    return {
      ...payload,
      tickets: payload.tickets.map((ticket, idx) => ({ id: ticket.id || `ticket_${idx + 1}`, ...ticket })),
    };
  }
  return {
    tickets: [],
    dependencies: [],
    estimate_summary: 'No ticket data returned.',
    citations: [{ source_type: 'system', excerpt: 'No source found' }],
  };
}

function normalizeDigest(payload) {
  if (payload?.risks && payload?.actions && payload?.completions) return payload;
  return {
    generated_at: new Date().toISOString(),
    risks: [
      {
        severity: 'low',
        summary: payload?.summary || 'No risks detected.',
        action: 'No action required.',
      },
    ],
    actions: (payload?.priorities || []).map((p) => p.action).filter(Boolean),
    completions: [],
    confidence: (payload?.health_score?.score || 50) / 100,
    citations: payload?.citations || [{ source_type: 'system', excerpt: 'No source found' }],
    _meta: payload?._meta,
  };
}

async function call(path, options = {}) {
  const url = `${API_BASE}${path}`;
  let response;
  try {
    response = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
    });
  } catch (networkError) {
    console.warn(`API network error: ${url}`, networkError.message);
    throw new Error('Network unavailable');
  }

  if (!response.ok) {
    console.warn(`API ${response.status}: ${url}`);
    // Try to parse error body, but don't crash if it's HTML
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody?.error?.message || errBody?.message || `API error ${response.status}`);
    }
    throw new Error(`API error ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    console.warn(`Non-JSON response from: ${url}`);
    return null;
  }

  return response.json();
}

const live = {
  async getSession() {
    return call('/api/session', { method: 'GET' });
  },
  async signInWithGoogle() {
    return call('/api/auth/callback?provider=google&token=demo', { method: 'GET' });
  },
  async sendMagicLink(payload) {
    return call('/api/auth/magic-link', { method: 'POST', body: JSON.stringify(payload) });
  },
  async authCallback(payload) {
    const provider = encodeURIComponent(payload?.provider || 'magic_link');
    const token = encodeURIComponent(payload?.token || '');
    return call(`/api/auth/callback?provider=${provider}&token=${token}`, { method: 'GET' });
  },
  async logout() {
    return call('/api/logout', { method: 'POST' });
  },
  async completeOnboarding(payload) {
    return call('/api/onboarding/complete', { method: 'POST', body: JSON.stringify(payload) });
  },
  async getOnboardingSchema() {
    return call('/api/onboarding/schema', { method: 'GET' });
  },
  async saveOnboardingAnswer(payload) {
    return call('/api/onboarding/answers', { method: 'POST', body: JSON.stringify(payload) });
  },
  async completeAdaptiveOnboarding(payload) {
    return call('/api/onboarding/complete', { method: 'POST', body: JSON.stringify(payload) });
  },
  async recommendMethodologies(payload) {
    return call('/api/methodologies/recommend', { method: 'POST', body: JSON.stringify(payload) });
  },
  async executeCommand(payload) {
    const response = await call('/api/command/execute', { method: 'POST', body: JSON.stringify(payload) });
    return normalizeCommandResponse(response);
  },
  async generatePRD(payload) {
    const response = await call('/api/prd/generate', { method: 'POST', body: JSON.stringify(payload) });
    return normalizePrdResponse(response, payload);
  },
  async updatePRD(payload) {
    return call('/api/prd/update', { method: 'POST', body: JSON.stringify(payload) });
  },
  async previewTickets(payload) {
    const prdId = payload?.prd_id || payload?.prdId || 'unknown';
    const response = await call(`/api/prd/${encodeURIComponent(prdId)}/tickets/preview`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return normalizeTicketPreview(response);
  },
  async pushTickets(payload) {
    const prdId = payload?.prd_id || payload?.prdId || 'unknown';
    return call(`/api/prd/${encodeURIComponent(prdId)}/tickets/push`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  async searchDecisions(payload) {
    return call('/api/decisions/search', { method: 'POST', body: JSON.stringify(payload) });
  },
  async detectDecisions(payload) {
    return call('/api/decisions/detect', { method: 'POST', body: JSON.stringify(payload) });
  },
  async getTodayDigest(workspaceId) {
    const response = await call('/api/digest/today', {
      method: 'GET',
      headers: workspaceId ? { 'x-workspace-id': workspaceId } : {},
    });
    return normalizeDigest(response);
  },
  async scorePRDHealth(payload) {
    return call('/api/prd/health-score', { method: 'POST', body: JSON.stringify(payload) });
  },
  async generateStakeholderUpdate(payload) {
    return call('/api/stakeholder/update', { method: 'POST', body: JSON.stringify(payload) });
  },
  async getMethodologies() {
    return call('/api/methodologies', { method: 'GET' });
  },
  async validateMethodologies(payload) {
    return call('/api/methodologies/validate', { method: 'POST', body: JSON.stringify(payload) });
  },
  async getIntegrations(workspaceId = 'ws_1') {
    return call('/api/integrations/status', {
      method: 'GET',
      headers: { 'x-workspace-id': workspaceId },
    }).then((payload) => {
      const mapped = {};
      (payload.integrations || []).forEach((integration) => {
        mapped[integration.provider] = {
          connected: integration.connected,
          status: integration.status,
          refresh_at: integration.refresh_at || null,
        };
      });
      return mapped;
    });
  },
  async connectIntegration(provider, workspaceId = 'ws_1') {
    const start = await call(
      `/api/integrations/auth/start?provider=${encodeURIComponent(provider)}&workspace_id=${encodeURIComponent(workspaceId)}`,
      { method: 'GET' }
    );
    // Redirect browser to OAuth provider
    if (start.auth_url) {
      window.location.href = start.auth_url;
      return { redirecting: true };
    }
    throw new Error('No auth URL returned');
  },
  async refreshIntegration(provider, workspaceId = 'ws_1') {
    return call('/api/integrations/refresh', {
      method: 'POST',
      body: JSON.stringify({ workspace_id: workspaceId, provider }),
    });
  },
  async trackEvent(payload) {
    return call('/api/events', { method: 'POST', body: JSON.stringify(payload) });
  },
  async getCutoverHealth(workspaceId = 'ws_1') {
    return call(`/api/cutover-health?workspace_id=${encodeURIComponent(workspaceId)}`, { method: 'GET' });
  },
  async ingestEvidence(payload) {
    return call('/api/evidence/ingest', { method: 'POST', body: JSON.stringify(payload) });
  },
  async synthesizeOpportunities(payload) {
    return call('/api/opportunities/synthesize', { method: 'POST', body: JSON.stringify(payload) });
  },
};

export default live;
