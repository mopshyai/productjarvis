import { getSupabaseAdminClient } from './supabaseClient.ts';

type AuthState = {
  authenticated: boolean;
  provider: string | null;
  magic_link_sent_to: string | null;
  last_error: string | null;
};

export type SessionState = {
  auth: AuthState;
  user: { id: string; name: string; role: string; email: string } | null;
  user_profile: { role: string; company_stage: string; team_size: string; persona: string };
  workspace: { id: string; name: string; onboarding_complete: boolean; timezone: string };
  onboarding_answers: Record<string, unknown>;
  workspace_method_preferences: { primary_method: string; supporting_methods: string[]; source: string };
  integrations: Record<string, { connected: boolean; status: string }>;
  product_context: Record<string, unknown>;
  usage: { prd_limit_monthly: number; prd_generated_this_month: number; period_label: string };
  feature_flags: { landing_v2: boolean };
};

const SESSION_TTL_DAYS = 7;

function makeDefaultSession(workspaceId: string): SessionState {
  return {
    auth: {
      authenticated: false,
      provider: null,
      magic_link_sent_to: null,
      last_error: null,
    },
    user: null,
    user_profile: {
      role: '',
      company_stage: '',
      team_size: '',
      persona: '',
    },
    workspace: {
      id: workspaceId,
      name: 'Core Product',
      onboarding_complete: false,
      timezone: 'America/New_York',
    },
    onboarding_answers: {},
    workspace_method_preferences: {
      primary_method: 'rice',
      supporting_methods: ['jtbd', 'scrum'],
      source: 'auto',
    },
    integrations: {
      jira: { connected: false, status: 'disconnected' },
      linear: { connected: false, status: 'disconnected' },
      notion: { connected: false, status: 'disconnected' },
    },
    product_context: {
      product_name: 'ProductJarvis',
      product_description: 'AI product operating system for PM teams.',
      okrs: ['Reduce PRD creation time by 90%', 'Improve week-4 retention above 50%'],
      features_summary: ['Command Bar', 'PRD Generator', 'Decision Memory', 'Daily Digest'],
      decisions: ['Jira + Linear in v1', 'Mobile app deferred to v2'],
      sprint_status: 'Sprint planning in progress',
      user_signals: ['Need faster ticket creation', 'Need better decision traceability'],
      metrics: ['PRD time baseline not set'],
    },
    usage: {
      prd_limit_monthly: 3,
      prd_generated_this_month: 0,
      period_label: new Date().toISOString().slice(0, 7),
    },
    feature_flags: {
      landing_v2: true,
    },
  };
}

async function logAuthEvent(workspaceId: string, eventType: string, status: string, payload: Record<string, unknown>) {
  const client = getSupabaseAdminClient();
  if (!client) return;
  await client.from('auth_events').insert({
    workspace_id: workspaceId,
    event_type: eventType,
    status,
    payload,
  });
}

export async function persistSession(workspaceId: string, state: SessionState): Promise<void> {
  const client = getSupabaseAdminClient();
  if (!client) return;
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await client
    .from('user_sessions')
    .upsert(
      {
        workspace_id: workspaceId,
        payload: state as unknown as Record<string, unknown>,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'workspace_id' }
    );
}

/** Hydrate session with workspace, user_profile, method preferences, and usage from DB. */
async function hydrateWorkspaceAndProfile(workspaceId: string, session: SessionState): Promise<void> {
  const client = getSupabaseAdminClient();
  if (!client) return;
  const [ws, profile, prefs, usage] = await Promise.all([
    client.from('workspaces').select('name, onboarding_complete, timezone').eq('id', workspaceId).maybeSingle(),
    session.user?.id
      ? client.from('user_profiles').select('role, company_stage, team_size, persona').eq('workspace_id', workspaceId).eq('user_id', session.user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    client.from('workspace_method_preferences').select('primary_method, supporting_methods, source').eq('workspace_id', workspaceId).maybeSingle(),
    client.from('usage_counters').select('prd_limit, prd_generated, period_label').eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(1).then((r) => ({ data: r.data?.[0] ?? null })),
  ]);
  if (ws.data) {
    session.workspace.name = ws.data.name ?? session.workspace.name;
    session.workspace.onboarding_complete = ws.data.onboarding_complete ?? session.workspace.onboarding_complete;
    session.workspace.timezone = ws.data.timezone ?? session.workspace.timezone;
  }
  if (profile.data) {
    session.user_profile = {
      role: profile.data.role ?? '',
      company_stage: profile.data.company_stage ?? '',
      team_size: profile.data.team_size ?? '',
      persona: profile.data.persona ?? '',
    };
  }
  if (prefs.data) {
    session.workspace_method_preferences = {
      primary_method: prefs.data.primary_method ?? 'rice',
      supporting_methods: (prefs.data.supporting_methods as string[]) ?? ['jtbd', 'scrum'],
      source: prefs.data.source ?? 'auto',
    };
  }
  if (usage.data) {
    const u = usage.data as { prd_limit?: number; prd_generated?: number; period_label?: string };
    session.usage = {
      prd_limit_monthly: u.prd_limit ?? 3,
      prd_generated_this_month: u.prd_generated ?? 0,
      period_label: u.period_label ?? new Date().toISOString().slice(0, 7),
    };
  }
}

/** Load session from DB or return default and persist. Async for production (persistent store). */
export async function getSessionState(workspaceId: string): Promise<SessionState> {
  const client = getSupabaseAdminClient();
  if (!client || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(workspaceId)) {
    return makeDefaultSession(workspaceId);
  }
  const { data } = await client
    .from('user_sessions')
    .select('payload, expires_at')
    .eq('workspace_id', workspaceId)
    .maybeSingle();
  if (data && data.expires_at && new Date(data.expires_at) > new Date()) {
    const session = data.payload as unknown as SessionState;
    await hydrateWorkspaceAndProfile(workspaceId, session);
    return session;
  }
  const defaultState = makeDefaultSession(workspaceId);
  await hydrateWorkspaceAndProfile(workspaceId, defaultState);
  await persistSession(workspaceId, defaultState);
  return defaultState;
}

export async function hydrateFeatureFlags(workspaceId: string): Promise<SessionState> {
  const session = await getSessionState(workspaceId);
  const client = getSupabaseAdminClient();
  if (!client) return session;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(workspaceId)) {
    return session;
  }

  const { data } = await client
    .from('workspace_feature_flags')
    .select('landing_v2')
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (data && typeof data.landing_v2 === 'boolean') {
    session.feature_flags.landing_v2 = data.landing_v2;
  }

  return session;
}

export async function markGoogleLogin(workspaceId: string): Promise<SessionState> {
  const session = await getSessionState(workspaceId);
  session.auth = {
    authenticated: true,
    provider: 'google',
    magic_link_sent_to: null,
    last_error: null,
  };
  session.user = {
    id: 'user_1',
    name: 'Product User',
    role: 'Product Manager',
    email: session.user?.email || 'user@example.com',
  };
  await logAuthEvent(workspaceId, 'google_login', 'success', {});
  await persistSession(workspaceId, session);
  return session;
}

export async function sendMagicLink(workspaceId: string, email: string) {
  const session = await getSessionState(workspaceId);
  session.auth.magic_link_sent_to = email;
  session.auth.last_error = null;
  await logAuthEvent(workspaceId, 'magic_link_sent', 'success', { email });
  await persistSession(workspaceId, session);
  return { sent: true, email, message: `Magic link sent to ${email}` };
}

export async function completeMagicCallback(workspaceId: string, provider: string, token: string): Promise<SessionState> {
  const session = await getSessionState(workspaceId);
  if (!token) {
    session.auth.last_error = 'expired_magic_link';
    await logAuthEvent(workspaceId, 'auth_callback', 'failed', { provider, reason: 'missing_token' });
    throw new Error('expired_magic_link');
  }

  session.auth = {
    authenticated: true,
    provider,
    magic_link_sent_to: session.auth.magic_link_sent_to,
    last_error: null,
  };
  session.user = {
    id: 'user_1',
    name: 'Product User',
    role: 'Product Manager',
    email: session.auth.magic_link_sent_to || 'user@example.com',
  };
  await logAuthEvent(workspaceId, 'auth_callback', 'success', { provider });
  await persistSession(workspaceId, session);
  return session;
}

export async function performLogout(workspaceId: string): Promise<SessionState> {
  const session = await getSessionState(workspaceId);
  session.auth = {
    authenticated: false,
    provider: null,
    magic_link_sent_to: session.auth.magic_link_sent_to,
    last_error: null,
  };
  session.user = null;
  await logAuthEvent(workspaceId, 'logout', 'success', {});
  await persistSession(workspaceId, session);
  return session;
}

export function getOnboardingSchema() {
  return {
    version: 'v1',
    steps: [
      { id: 'role_context', title: 'Role and Team Context' },
      { id: 'product_basics', title: 'Product Basics' },
      { id: 'goals_execution', title: 'Goals and Execution Mode' },
      { id: 'tooling_data', title: 'Tooling and Data' },
      { id: 'method_defaults', title: 'Methodology Defaults' },
      { id: 'success_baselines', title: 'Success Baselines' },
    ],
  };
}

export function recommendMethodologies(input: { role?: string; stage?: string; cadence?: string }) {
  const stage = String(input.stage || '').toLowerCase();
  const cadence = String(input.cadence || '').toLowerCase();

  if (stage.includes('pre')) {
    return {
      primary: 'jtbd',
      supporting: ['design_thinking', 'lean_experimentation', 'prfaq'],
      source: 'auto',
      reason: 'Pre-launch stage favors discovery-heavy methods.',
    };
  }

  if (stage.includes('growth') || stage.includes('scale')) {
    return {
      primary: 'rice',
      supporting: ['wsjf', 'okr_alignment', 'aarrr', 'heart'],
      source: 'auto',
      reason: 'Growth/scale stage favors prioritization and metrics.',
    };
  }

  if (cadence.includes('kanban')) {
    return {
      primary: 'kanban',
      supporting: ['scrumban', 'critical_path', 'raid'],
      source: 'auto',
      reason: 'Kanban cadence selected.',
    };
  }

  return {
    primary: 'rice',
    supporting: ['jtbd', 'scrum', 'okr_alignment'],
    source: 'auto',
    reason: 'Default recommendation bundle.',
  };
}

export async function saveOnboardingAnswer(
  workspaceId: string,
  stepId: string,
  payload: Record<string, unknown>
) {
  const session = await getSessionState(workspaceId);
  session.onboarding_answers[stepId] = payload;

  const client = getSupabaseAdminClient();
  if (client) {
    await client.from('onboarding_answers').insert({
      workspace_id: workspaceId,
      user_id: session.user?.id,
      step_id: stepId,
      payload,
    });
  }
  await persistSession(workspaceId, session);
  return { ok: true };
}

export async function completeOnboarding(workspaceId: string, payload: Record<string, unknown>): Promise<SessionState> {
  const session = await getSessionState(workspaceId);
  const recommendation =
    (payload.methodology_preferences as { primary?: string; supporting?: string[]; source?: string } | undefined) ||
    recommendMethodologies({
      role: String(payload.role || ''),
      stage: String(payload.product_stage || ''),
      cadence: String(payload.execution_cadence || ''),
    });

  session.user_profile = {
    role: String(payload.role || ''),
    company_stage: String(payload.product_stage || ''),
    team_size: String(payload.team_size || ''),
    persona: String(payload.persona || ''),
  };
  session.workspace.name = String(payload.workspace_name || session.workspace.name);
  session.workspace.onboarding_complete = true;
  session.workspace_method_preferences = {
    primary_method: recommendation.primary || 'rice',
    supporting_methods: recommendation.supporting || ['jtbd', 'scrum'],
    source: recommendation.source || 'auto',
  };

  session.product_context = {
    product_name: payload.product_name || session.product_context.product_name,
    product_description: payload.product_description || session.product_context.product_description,
    okrs: payload.okrs || session.product_context.okrs,
    features_summary: payload.features_summary || session.product_context.features_summary,
    decisions: payload.decisions || session.product_context.decisions,
    sprint_status: payload.sprint_status || session.product_context.sprint_status,
    user_signals: payload.user_signals || session.product_context.user_signals,
    metrics: payload.metrics || session.product_context.metrics,
  };

  const client = getSupabaseAdminClient();
  if (client) {
    if (session.user?.id) {
      await client.from('user_profiles').upsert({
        user_id: session.user.id,
        workspace_id: workspaceId,
        role: session.user_profile.role,
        company_stage: session.user_profile.company_stage,
        team_size: session.user_profile.team_size,
        persona: session.user_profile.persona,
      });
    }
    await client.from('workspace_method_preferences').upsert({
      workspace_id: workspaceId,
      primary_method: session.workspace_method_preferences.primary_method,
      supporting_methods: session.workspace_method_preferences.supporting_methods,
      source: session.workspace_method_preferences.source,
    });
  }
  await persistSession(workspaceId, session);
  return session;
}
