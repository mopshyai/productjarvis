import {
  COMMAND_ACTIONS,
  DEFAULT_CITATION,
  INTEGRATION_PROVIDERS,
  TRACKERS,
  assertCitations,
  assertPRDDocument,
} from './contracts';
import * as ai from './aiClient';

const DB_KEY = 'productjarvis.db.v1';

const PRODUCT_CONTEXT_TEMPLATE = {
  product_name: 'ProductJarvis',
  product_description: 'AI product operating system for PM teams.',
  okrs: ['Reduce PRD creation time by 90%', 'Improve PM week-4 retention >50%'],
  features_summary: ['Command Bar', 'PRD Generator', 'Decision Memory', 'Daily Digest'],
  decisions: ['Defer mobile app to V2', 'Jira and Linear in V1'],
  sprint_status: 'Sprint 5 in progress',
  user_signals: ['High demand for faster ticketing', 'Need better decision traceability'],
  metrics: ['PRD time trending down', 'Digest engagement trending up'],
};

const BASE_PRD = {
  problem_statement: {
    what: 'PMs spend too much time manually turning ideas into executable plans and tickets.',
    who: 'Founder-PMs and small PM teams in seed to Series B startups.',
    impact_if_unsolved: 'Delivery slows, PMs become bottlenecks, and product context is repeatedly lost.',
  },
  success_metrics: [
    {
      name: 'Time spent on PRD creation',
      baseline: '3-4 hours per PRD',
      target: 'Under 15 minutes',
      timeline: 'Within first session',
    },
    {
      name: 'Ticket creation time',
      baseline: '45-90 minutes',
      target: 'Under 10 minutes',
      timeline: 'Within first sprint',
    },
    {
      name: 'Decision retrieval time',
      baseline: '30+ minutes',
      target: 'Under 30 seconds',
      timeline: 'Within 30 days',
    },
  ],
  user_stories: [
    {
      as_a: 'Solo founder-PM',
      i_want: 'to type a one-line feature idea and get a full PRD quickly',
      so_that: 'I can move from idea to execution without spending half a day writing docs',
    },
    {
      as_a: 'PM in a small team',
      i_want: 'to find why a decision was made months ago',
      so_that: 'I can avoid repeating mistakes and preserve strategic context',
    },
    {
      as_a: 'PM preparing the day',
      i_want: 'to receive a concise risk digest each morning',
      so_that: 'I can prioritize quickly without checking multiple tools',
    },
  ],
  acceptance_criteria: [
    'Command input returns structured response in under 30 seconds',
    'Generated PRD includes all required schema sections',
    'Ticket preview returns sprint-ready tasks before push',
    'Every response includes citations or explicit no-source markers',
    'No write action executes without explicit user confirmation',
  ],
  edge_cases: [
    'Vague command returns clarification options',
    'Expired integration token triggers refresh flow',
    'Decision query with no result returns explicit not-found state',
    'Conflicting PRDs block ticket push until resolved',
    'Digest can return no-risk summary when data is limited',
  ],
  assumptions: [
    {
      assumption: 'PMs will use AI outputs as a strong starting point',
      risk_level: 'high',
      validation_method: 'Track PRD edit percentage in beta cohort',
    },
  ],
  open_questions: [],
  dependencies: ['Anthropic API', 'Supabase', 'Jira API', 'Linear API', 'Notion API'],
  out_of_scope: ['Mobile app in v1', 'Slack real-time integration in v1'],
  conflicts_detected: [],
  missing_context: [],
};

const DEFAULT_DB = {
  auth: {
    authenticated: true,
    provider: 'google',
    magic_link_sent_to: null,
    last_error: null,
  },
  user: {
    id: 'user_1',
    name: 'Manvendra K.',
    role: 'Founder / PM',
    email: 'manvendra@example.com',
  },
  user_profile: {
    role: 'Founder / PM',
    company_stage: 'beta',
    team_size: '1-5',
    persona: 'founder_pm',
  },
  workspace: {
    id: 'ws_1',
    name: 'Core Product',
    onboarding_complete: true,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  },
  onboarding_answers: {},
  workspace_method_preferences: {
    primary_method: 'rice',
    supporting_methods: ['jtbd', 'scrum'],
    source: 'auto',
  },
  usage: {
    prd_limit_monthly: 3,
    prd_generated_this_month: 0,
    period_label: new Date().toISOString().slice(0, 7),
  },
  feature_flags: {
    landing_v2: true,
  },
  integrations: {
    [INTEGRATION_PROVIDERS.JIRA]: { connected: false, status: 'disconnected' },
    [INTEGRATION_PROVIDERS.LINEAR]: { connected: false, status: 'disconnected' },
    [INTEGRATION_PROVIDERS.NOTION]: { connected: false, status: 'disconnected' },
  },
  product_context: PRODUCT_CONTEXT_TEMPLATE,
  prds: [],
  decisions: [
    {
      id: 'dec_1',
      statement: 'Deferred mobile app to V2',
      rationale: 'Core PM workflows are desktop-first across interview cohort.',
      date: '2026-01-05',
      author: 'Product Team',
      sources: [
        {
          id: 'src_1',
          source_type: 'notion',
          source_id: 'notion_page_123',
          source_url: 'https://notion.so/example-mobile-v2',
          excerpt: 'User interviews show desktop preference for PRD workflows.',
          confidence: 0.94,
        },
      ],
    },
  ],
  digests: [],
  audit_events: [],
};

function loadDb() {
  const raw = localStorage.getItem(DB_KEY);
  if (!raw) {
    localStorage.setItem(DB_KEY, JSON.stringify(DEFAULT_DB));
    return structuredClone(DEFAULT_DB);
  }

  try {
    const parsed = JSON.parse(raw);
    // Reset if stale — not authenticated or onboarding incomplete
    if (!parsed.auth?.authenticated || !parsed.workspace?.onboarding_complete) {
      localStorage.setItem(DB_KEY, JSON.stringify(DEFAULT_DB));
      return structuredClone(DEFAULT_DB);
    }
    return parsed;
  } catch {
    localStorage.setItem(DB_KEY, JSON.stringify(DEFAULT_DB));
    return structuredClone(DEFAULT_DB);
  }
}

function saveDb(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function nowISO() {
  return new Date().toISOString();
}

function id(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function sleep(ms = 300) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requireOnboarding(db) {
  if (!db.workspace.onboarding_complete) {
    throw new Error('Onboarding must be completed first');
  }
}

function requireAuth(db) {
  if (!db.auth?.authenticated) {
    throw new Error('Authentication required');
  }
}

function addAudit(db, type, payload) {
  db.audit_events.push({ id: id('audit'), type, payload, created_at: nowISO() });
}

function generateCitations(context = {}) {
  const citations = [];

  if (context.prdId) {
    citations.push({
      id: id('cite'),
      source_type: 'prd',
      source_id: context.prdId,
      source_url: `prd://${context.prdId}`,
      excerpt: 'Derived from approved PRD content.',
      confidence: 0.93,
    });
  }

  if (context.metric) {
    citations.push({
      id: id('cite'),
      source_type: 'metric',
      source_id: context.metric,
      source_url: `metric://${context.metric}`,
      excerpt: `Referenced metric: ${context.metric}.`,
      confidence: 0.88,
    });
  }

  if (!citations.length) {
    citations.push(DEFAULT_CITATION);
  }

  return assertCitations(citations);
}

function createPRDFromInput(featureRequest, context) {
  const merged = structuredClone(BASE_PRD);
  const trimmed = featureRequest.trim();
  const missingContext = [];

  Object.entries(context).forEach(([key, value]) => {
    if (!value || (Array.isArray(value) && !value.length)) {
      missingContext.push(key);
    }
  });

  merged.problem_statement.what = `${trimmed} This capability removes repetitive PM documentation work and converts ideas into execution artifacts automatically.`;
  merged.problem_statement.who = 'Founder-PMs and 1-5 person PM teams in seed to Series B startups.';
  merged.problem_statement.impact_if_unsolved =
    'PM throughput remains constrained, project context fragments across tools, and execution predictability declines.';
  merged.missing_context = missingContext;
  merged.conflicts_detected = [];

  return merged;
}

export async function getSession() {
  await sleep(120);
  const db = loadDb();
  return {
    auth: db.auth,
    user: db.auth?.authenticated ? db.user : null,
    user_profile: db.user_profile,
    workspace: db.workspace,
    onboarding_answers: db.onboarding_answers,
    workspace_method_preferences: db.workspace_method_preferences,
    usage: db.usage,
    feature_flags: db.feature_flags,
    integrations: db.integrations,
    product_context: db.product_context,
  };
}

export async function signInWithGoogle() {
  await sleep(180);
  const db = loadDb();
  db.auth = {
    authenticated: true,
    provider: 'google',
    magic_link_sent_to: null,
    last_error: null,
  };
  addAudit(db, 'auth_login', { provider: 'google' });
  saveDb(db);
  return getSession();
}

export async function sendMagicLink({ email }) {
  await sleep(160);
  const db = loadDb();
  if (!email || !email.includes('@')) {
    throw new Error('Valid email is required');
  }
  db.auth.magic_link_sent_to = email;
  db.auth.last_error = null;
  addAudit(db, 'auth_magic_link_sent', { email });
  saveDb(db);
  return {
    sent: true,
    email,
    message: `Magic link sent to ${email}`,
  };
}

export async function authCallback({ provider = 'magic_link', token }) {
  await sleep(180);
  const db = loadDb();
  if (!token) {
    db.auth.last_error = 'expired_magic_link';
    saveDb(db);
    throw new Error('expired_magic_link');
  }
  db.auth = {
    authenticated: true,
    provider,
    magic_link_sent_to: db.auth.magic_link_sent_to,
    last_error: null,
  };
  if (provider === 'magic_link' && db.auth.magic_link_sent_to) {
    db.user.email = db.auth.magic_link_sent_to;
  }
  addAudit(db, 'auth_callback_success', { provider });
  saveDb(db);
  return getSession();
}

export async function logout() {
  await sleep(120);
  const db = loadDb();
  db.auth = {
    authenticated: false,
    provider: null,
    magic_link_sent_to: db.auth.magic_link_sent_to,
    last_error: null,
  };
  addAudit(db, 'auth_logout', {});
  saveDb(db);
  return getSession();
}

export async function getOnboardingSchema() {
  await sleep(100);
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

export async function saveOnboardingAnswer({ step_id, payload }) {
  await sleep(90);
  const db = loadDb();
  requireAuth(db);
  if (!step_id) {
    throw new Error('step_id is required');
  }
  db.onboarding_answers[step_id] = payload || {};
  addAudit(db, 'onboarding_step_saved', { step_id });
  saveDb(db);
  return { ok: true };
}

export async function recommendMethodologies({ role, stage, cadence }) {
  await sleep(120);
  const stageValue = String(stage || '').toLowerCase();
  const cadenceValue = String(cadence || '').toLowerCase();
  const roleValue = String(role || '').toLowerCase();

  if (stageValue.includes('pre')) {
    return {
      primary: 'jtbd',
      supporting: ['design_thinking', 'lean_experimentation', 'prfaq'],
      source: 'auto',
      reason: 'Pre-launch stage favors discovery-heavy frameworks.',
    };
  }

  if (stageValue.includes('growth') || stageValue.includes('scale')) {
    return {
      primary: 'rice',
      supporting: ['wsjf', 'okr_alignment', 'aarrr', 'heart'],
      source: 'auto',
      reason: 'Growth/scale stage favors prioritization and metric frameworks.',
    };
  }

  if (cadenceValue.includes('kanban')) {
    return {
      primary: 'kanban',
      supporting: ['scrumban', 'critical_path', 'raid'],
      source: 'auto',
      reason: 'Kanban workflow detected.',
    };
  }

  if (roleValue.includes('founder')) {
    return {
      primary: 'rice',
      supporting: ['prfaq', 'okr_alignment', 'scrum'],
      source: 'auto',
      reason: 'Founder profile prioritizes speed and narrative clarity.',
    };
  }

  return {
    primary: 'rice',
    supporting: ['jtbd', 'scrum', 'okr_alignment'],
    source: 'auto',
    reason: 'Default methodology recommendation.',
  };
}

export async function completeAdaptiveOnboarding(payload) {
  await sleep(220);
  const db = loadDb();
  requireAuth(db);
  const recommendation =
    payload?.methodology_preferences ||
    (await recommendMethodologies({
      role: payload.role,
      stage: payload.product_stage,
      cadence: payload.execution_cadence,
    }));

  db.user_profile = {
    role: payload.role || db.user_profile.role,
    company_stage: payload.product_stage || db.user_profile.company_stage,
    team_size: payload.team_size || db.user_profile.team_size,
    persona: payload.persona || db.user_profile.persona,
  };
  db.workspace.name = payload.workspace_name || db.workspace.name;
  db.workspace.onboarding_complete = true;
  db.workspace_method_preferences = {
    primary_method: recommendation.primary,
    supporting_methods: recommendation.supporting || [],
    source: recommendation.source || 'auto',
  };
  db.onboarding_answers = payload.answers || db.onboarding_answers;
  db.product_context = {
    product_name: payload.product_name || db.product_context.product_name,
    product_description: payload.product_description || db.product_context.product_description,
    okrs: payload.okrs || db.product_context.okrs,
    features_summary: payload.features_summary || db.product_context.features_summary,
    decisions: payload.decisions || db.product_context.decisions,
    sprint_status: payload.sprint_status || db.product_context.sprint_status,
    user_signals: payload.user_signals || db.product_context.user_signals,
    metrics: payload.metrics || db.product_context.metrics,
    target_segment: payload.target_segment || '',
    execution_cadence: payload.execution_cadence || '',
    bottleneck: payload.biggest_bottleneck || '',
    prd_time_baseline: payload.prd_time_baseline || '',
    planning_time_baseline: payload.planning_time_baseline || '',
  };
  addAudit(db, 'onboarding_complete', { workspace_id: db.workspace.id, adaptive: true });
  saveDb(db);
  return getSession();
}

export async function completeOnboarding(payload) {
  await sleep(200);
  return completeAdaptiveOnboarding({
    workspace_name: payload.workspace_name,
    product_name: payload.product_name,
    product_description: payload.product_description,
    okrs: payload.okrs,
    features_summary: payload.features_summary,
    decisions: payload.decisions,
    sprint_status: payload.sprint_status,
    user_signals: payload.user_signals,
    metrics: payload.metrics,
    role: 'Product Manager',
    product_stage: 'beta',
    team_size: '1-5',
    execution_cadence: 'scrum',
  });
}

export async function executeCommand({ workspace_id, user_input, mode = 'default' }) {
  await sleep(100);
  const db = loadDb();
  requireAuth(db);
  requireOnboarding(db);

  if (workspace_id !== db.workspace.id) {
    throw new Error('Workspace mismatch');
  }

  const query = user_input.trim();

  if (!query || query.length < 3) {
    return {
      action_type: COMMAND_ACTIONS.GENERATE_PRD,
      preview_payload: {
        clarify_options: ['Generate PRD', 'Search decision history', 'Create daily digest'],
      },
      required_confirmations: [],
      citations: [DEFAULT_CITATION],
    };
  }

  let action_type = COMMAND_ACTIONS.GENERATE_PRD;
  let summary = '';

  try {
    const result = await ai.aiRouteCommand(query, db.product_context);
    action_type = result.action_type || COMMAND_ACTIONS.GENERATE_PRD;
    summary = result.summary || '';
  } catch {
    // fallback keyword routing
    const q = query.toLowerCase();
    if (q.includes('decision') || q.includes('why')) action_type = COMMAND_ACTIONS.SEARCH_DECISIONS;
    else if (q.includes('digest') || q.includes('risk')) action_type = COMMAND_ACTIONS.VIEW_DIGEST;
    summary = `Detected action: ${action_type.replace('_', ' ')}.`;
  }

  return {
    action_type,
    preview_payload: { query, mode, summary },
    required_confirmations: action_type === COMMAND_ACTIONS.GENERATE_PRD ? ['save_prd'] : [],
    citations: generateCitations({ metric: 'command_latency' }),
  };
}

export async function generatePRD({ workspace_id, feature_request, product_context }) {
  const db = loadDb();
  requireAuth(db);
  requireOnboarding(db);

  if (workspace_id !== db.workspace.id) {
    throw new Error('Workspace mismatch');
  }

  if (db.usage.prd_generated_this_month >= db.usage.prd_limit_monthly) {
    throw new Error('Monthly PRD quota reached (3/month on free tier)');
  }

  let prdBody;
  try {
    prdBody = await ai.aiGeneratePRD(feature_request, product_context || db.product_context);
  } catch {
    prdBody = createPRDFromInput(feature_request, product_context || db.product_context);
  }

  assertPRDDocument(prdBody);

  const record = {
    id: id('prd'),
    feature_request,
    body: prdBody,
    status: 'draft',
    version: 1,
    created_at: nowISO(),
    updated_at: nowISO(),
    citations: generateCitations({ metric: 'prd_generation_time' }),
  };

  db.prds.unshift(record);
  db.usage.prd_generated_this_month += 1;
  addAudit(db, 'prd_generated', { prd_id: record.id });
  saveDb(db);

  return record;
}

export async function updatePRD({ prd_id, body, version, approval_token }) {
  await sleep(300);
  const db = loadDb();
  requireAuth(db);
  requireOnboarding(db);

  if (!approval_token) {
    throw new Error('Approval token is required');
  }

  const prd = db.prds.find((p) => p.id === prd_id);
  if (!prd) {
    throw new Error('PRD not found');
  }

  if (version !== prd.version) {
    throw new Error('Version conflict detected. Refresh and retry.');
  }

  assertPRDDocument(body);

  prd.body = body;
  prd.status = 'approved';
  prd.version += 1;
  prd.updated_at = nowISO();
  prd.citations = assertCitations(prd.citations);

  addAudit(db, 'prd_updated', { prd_id });
  saveDb(db);
  return prd;
}

export async function previewTickets({ prd_id, tracker, constraints }) {
  const db = loadDb();
  requireAuth(db);
  requireOnboarding(db);

  const prd = db.prds.find((p) => p.id === prd_id);
  if (!prd) {
    throw new Error('PRD not found');
  }

  if (![TRACKERS.JIRA, TRACKERS.LINEAR].includes(tracker)) {
    throw new Error('Unsupported tracker');
  }

  const count = Math.max(8, Math.min(12, Number(constraints?.count) || 10));

  if (Number(constraints?.count) > 50) {
    return {
      tickets: [],
      dependencies: [],
      estimate_summary: 'Requested ticket volume exceeds safe bound; split into phases.',
      warning: 'Scope too broad. Split this PRD into phased deliverables.',
    };
  }

  try {
    const result = await ai.aiGenerateTickets(prd.feature_request, prd.body, tracker, count);
    const tickets = (result.tickets || []).map((t, idx) => ({ id: id('ticket_draft'), ...t, id: `ticket_draft_${idx + 1}` }));
    return {
      tickets,
      dependencies: result.dependencies || [],
      estimate_summary: result.estimate_summary || `Prepared ${tickets.length} ${tracker.toUpperCase()}-ready tickets.`,
      citations: generateCitations({ prdId: prd.id }),
    };
  } catch {
    // fallback
    const tickets = Array.from({ length: count }).map((_, index) => ({
      id: `ticket_draft_${index + 1}`,
      title: `${prd.feature_request} - Work Item ${index + 1}`,
      description: `Implementation task ${index + 1} derived from ${prd.id}.`,
      acceptance_criteria: ['Unit tests added', 'QA pass/fail criteria documented'],
      story_points: [1, 2, 3, 5][index % 4],
      dependencies: index === 0 ? [] : [`Task ${index}`],
    }));
    return {
      tickets,
      dependencies: ['Design sign-off', 'API schema lock'],
      estimate_summary: `Prepared ${count} ${tracker.toUpperCase()}-ready tickets from ${prd.id}.`,
      citations: generateCitations({ prdId: prd.id }),
    };
  }
}

export async function pushTickets({ prd_id, tracker, project_id, mapping_profile_id, approval_token }) {
  await sleep(320);
  const db = loadDb();
  requireAuth(db);
  requireOnboarding(db);

  if (!approval_token) {
    throw new Error('Approval token is required');
  }

  if (!db.integrations[tracker]?.connected) {
    throw new Error(`${tracker.toUpperCase()} integration is not connected`);
  }

  if (!project_id || !mapping_profile_id) {
    throw new Error('project_id and mapping_profile_id are required');
  }

  const prd = db.prds.find((p) => p.id === prd_id);
  if (!prd) {
    throw new Error('PRD not found');
  }

  const created = Array.from({ length: 8 }).map((_, i) => `${tracker.toUpperCase()}-${i + 101}`);

  addAudit(db, 'tickets_pushed', { prd_id, tracker, created_count: created.length });
  saveDb(db);

  return {
    created_count: created.length,
    external_ids: created,
    failed: [],
  };
}

export async function searchDecisions({ workspace_id, query }) {
  const db = loadDb();
  requireAuth(db);
  requireOnboarding(db);

  if (workspace_id !== db.workspace.id) {
    throw new Error('Workspace mismatch');
  }

  try {
    const result = await ai.aiSearchDecisions(query, db.decisions);
    return {
      results: result.results || [],
      citations: assertCitations((result.results || []).flatMap((r) => r.sources || [DEFAULT_CITATION])),
      confidence: result.confidence || 0,
      message: result.summary || (result.results?.length ? `Found ${result.results.length} matching decisions.` : 'No decision record found for this query.'),
    };
  } catch {
    const cleanQuery = query.trim().toLowerCase();
    const results = db.decisions.filter((d) =>
      [d.statement, d.rationale, d.author].join(' ').toLowerCase().includes(cleanQuery)
    );
    if (!results.length) {
      return { results: [], citations: [DEFAULT_CITATION], confidence: 0, message: 'No decision record found for this query.' };
    }
    return { results, citations: assertCitations(results.flatMap((r) => r.sources || [DEFAULT_CITATION])), confidence: 0.9 };
  }
}

export async function getTodayDigest() {
  const db = loadDb();
  requireAuth(db);
  requireOnboarding(db);

  let digestData;
  try {
    digestData = await ai.aiGenerateDigest(db.product_context, db.integrations);
  } catch {
    const connectedIntegrations = Object.values(db.integrations).filter((e) => e.connected).length;
    digestData = {
      risks: [{ severity: connectedIntegrations > 0 ? 'high' : 'medium', summary: connectedIntegrations > 0 ? 'Notion Sync backend tickets are blocked in review.' : 'Integration data is limited; risk confidence is reduced until tools are connected.', action: connectedIntegrations > 0 ? 'Escalate blocked items in standup.' : 'Connect Jira or Linear for stronger risk signals.' }],
      actions: ['Review draft PRDs', 'Confirm sprint ticket ownership'],
      completions: ['Context snapshot updated'],
      confidence: connectedIntegrations > 0 ? 0.82 : 0.42,
    };
  }

  if (!digestData.risks?.length) {
    digestData.risks = [{ severity: 'low', summary: 'No risks detected.', action: 'No action required.' }];
  }

  const digest = {
    generated_at: nowISO(),
    ...digestData,
    citations: generateCitations({ metric: 'digest_confidence' }),
  };

  db.digests.unshift(digest);
  saveDb(db);
  return digest;
}

export async function getIntegrations() {
  await sleep(100);
  const db = loadDb();
  requireAuth(db);
  return db.integrations;
}

export async function connectIntegration(provider) {
  await sleep(150);
  const db = loadDb();
  if (!db.integrations[provider]) {
    throw new Error('Unsupported provider');
  }
  db.integrations[provider] = { connected: true, status: 'connected' };
  addAudit(db, 'integration_connected', { provider });
  saveDb(db);
  return db.integrations[provider];
}

export async function refreshIntegration(provider) {
  await sleep(120);
  const db = loadDb();
  if (!db.integrations[provider]) {
    throw new Error('Unsupported provider');
  }

  if (!db.integrations[provider].connected) {
    throw new Error('Integration is not connected');
  }

  db.integrations[provider].status = 'connected';
  saveDb(db);
  return db.integrations[provider];
}

export async function detectDecisions({ source_type, participants = [], datetime, thread_or_transcript, context }) {
  const db = loadDb();
  if (!thread_or_transcript) {
    return {
      analysis_metadata: { source_type, participants_identified: participants, conversation_summary: 'No transcript provided.', total_decisions_found: 0, total_candidates_found: 0 },
      decisions: [], decision_candidates: [], action_items_detected: [],
    };
  }

  try {
    return await ai.aiDetectDecisions(thread_or_transcript, participants, context || db.product_context);
  } catch {
    return {
      analysis_metadata: { source_type: source_type || 'meeting_notes', participants_identified: participants, conversation_summary: `Discussion at ${datetime || 'unknown time'}.`, total_decisions_found: 1, total_candidates_found: 0 },
      decisions: [{ title: 'Detected product direction', what_was_decided: 'Move forward with the discussed implementation path.', what_was_rejected: 'Alternative path was deferred.', rationale: 'Lower delivery risk.', made_by: participants[0] || 'Product Team', confidence: 'medium', confidence_reason: 'Fallback detection.', related_feature: 'ProductJarvis Core', decision_type: 'build', reversibility: 'moderate', requires_followup: false, followup_action: '', followup_owner: '', source_quote: 'No source found' }],
      decision_candidates: [], action_items_detected: [],
    };
  }
}

export async function scorePRDHealth({ prd_content }) {
  try {
    const db = loadDb();
    return await ai.aiScorePRDHealth(prd_content, db.product_context);
  } catch {
    const hasAc = Array.isArray(prd_content?.acceptance_criteria) && prd_content.acceptance_criteria.length > 0;
    const hasMetrics = Array.isArray(prd_content?.success_metrics) && prd_content.success_metrics.length > 0;
    const score = hasAc && hasMetrics ? 82 : 54;
    return {
      health_score: score,
      grade: score >= 75 ? 'B (75-89)' : 'D (45-59)',
      ready_for_engineering: hasAc && hasMetrics,
      blocking_issues: hasAc && hasMetrics ? [] : ['Missing testable acceptance criteria or success metrics'],
      breakdown: {}, top_3_fixes: [], conflicts_with_product: [],
      okr_alignment: { aligned: true, which_okr: 'Reduce PRD creation time by 90%', alignment_note: 'Aligned to core execution-speed OKR' },
    };
  }
}

export async function generateStakeholderUpdate({ audience = 'executive', feature_name = 'Feature', ...rest }) {
  try {
    return await ai.aiGenerateStakeholderUpdate({ audience, feature_name, ...rest });
  } catch {
    return {
      audience,
      subject_line: `${feature_name}: weekly product update`,
      body: `${feature_name} is progressing with visible delivery momentum and identified risk controls in place.`,
      word_count: 14,
      key_metrics_included: ['No source found'],
      asks_or_decisions_needed: [],
      tone_check: `Tone calibrated for ${audience} audience.`,
      alternative_subject_lines: [`${feature_name} status and next steps`, `${feature_name} progress snapshot`],
    };
  }
}

export async function getMethodologies() {
  await sleep(120);
  const methodologies = [
    { id: 'rice', name: 'RICE', category: 'prioritization' },
    { id: 'wsjf', name: 'WSJF', category: 'prioritization' },
    { id: 'kano', name: 'Kano', category: 'prioritization' },
    { id: 'jtbd', name: 'JTBD', category: 'discovery' },
    { id: 'scrum', name: 'Scrum', category: 'planning' },
    { id: 'prfaq', name: 'PRFAQ', category: 'documentation' },
    { id: 'okr_alignment', name: 'OKR Alignment', category: 'metrics' },
  ];
  return {
    version: 'v1',
    total: methodologies.length,
    categories: [...new Set(methodologies.map((item) => item.category))],
    methodologies,
  };
}

export async function validateMethodologies({ methodology_request }) {
  await sleep(120);
  return {
    valid: true,
    methodology_applied: {
      primary: methodology_request?.primary || 'rice',
      supporting: methodology_request?.supporting || ['jtbd', 'scrum'],
      selection_reason: 'Mock validation applied',
    },
    missing_inputs: [],
    warnings: [],
  };
}

export async function trackEvent({ event, payload = {}, timestamp, workspace_id, user_id, session_id, path, user_agent }) {
  await sleep(20);
  const db = loadDb();
  addAudit(db, 'analytics_event', {
    event,
    payload,
    timestamp: timestamp || nowISO(),
    workspace_id: workspace_id || db.workspace.id,
    user_id: user_id || db.user?.id || null,
    session_id: session_id || null,
    path: path || '/',
    user_agent: user_agent || 'mock-client',
  });
  saveDb(db);
  return { accepted: true, event_id: id('evt') };
}

export async function getCutoverHealth() {
  await sleep(40);
  return {
    generated_at: nowISO(),
    workspace_id: 'ws_1',
    summary: {
      prompt_runs: 12,
      failed_prompt_runs: 0,
      fallback_runs: 1,
      avg_latency_ms: 820,
      p95_latency_ms: 2100,
      avg_context_tokens: 3200,
      events_last_hour: 15,
      auth_failures_last_hour: 0,
      ticket_push_failure_rate: 0,
      connected_integrations: Object.values(loadDb().integrations).filter((entry) => entry.connected).length,
    },
    gate_checks: {
      prompt_5xx_rate_below_2pct: true,
      fallback_rate_below_15pct: true,
      p95_latency_below_30s: true,
      ticket_push_failure_rate_below_10pct: true,
      auth_callback_failures_last_hour_below_5: true,
    },
    rollback_recommended: false,
  };
}

export async function ingestEvidence({ workspace_id, source_type, title, content }) {
  await sleep(80);
  const db = loadDb();
  if (!db.evidenceChunks) db.evidenceChunks = [];
  const jobId = id('job');
  const chunkCount = Math.ceil((content || '').length / 1000) || 1;
  db.evidenceChunks.push({
    id: id('chunk'),
    job_id: jobId,
    workspace_id: workspace_id || db.workspace.id,
    source_type: source_type || 'document',
    title,
    content: (content || '').slice(0, 200),
    created_at: nowISO(),
  });
  saveDb(db);
  return {
    job_id: jobId,
    workspace_id: workspace_id || db.workspace.id,
    source_type,
    title,
    chunk_count: chunkCount,
    status: 'complete',
  };
}

export async function synthesizeOpportunities({ workspace_id, query, top_k = 5 }) {
  const db = loadDb();
  const evidenceChunks = db.evidenceChunks || [];

  try {
    const result = await ai.aiSynthesizeOpportunities(query, evidenceChunks, db.product_context);
    return {
      ...result,
      total_evidence_chunks: evidenceChunks.length || top_k,
      workspace_id: workspace_id || 'ws_1',
      query: query || 'top product opportunities',
      _meta: { provider_used: 'claude', retrieval_strategy: 'ai_synthesis' },
    };
  } catch {
    return {
      opportunities: [
        { title: 'Streamline onboarding drop-off', summary: 'Users abandon setup at the integration step. A guided wizard with inline previews could increase completion by 35%.', evidence_count: 3, source_types: ['user_interview', 'analytics'], confidence: 'high', suggested_next_step: 'Run a 5-session usability study on the current onboarding flow.', citations: [{ source_type: 'user_interview', excerpt: '40% drop off before completing setup' }] },
        { title: 'Native Jira sync (no copy-paste)', summary: '67% of surveyed PMs want direct Jira integration.', evidence_count: 2, source_types: ['survey'], confidence: 'high', suggested_next_step: 'Prioritize Jira two-way sync in the next sprint cycle.', citations: [{ source_type: 'survey', excerpt: '67% want direct Jira integration' }] },
      ],
      synthesis_summary: 'Evidence points to onboarding friction and missing integrations as the top retention blockers.',
      evidence_gaps: ['No data on mobile usage patterns'],
      total_evidence_chunks: top_k,
      workspace_id: workspace_id || 'ws_1',
      query: query || 'top product opportunities',
      _meta: { provider_used: 'claude_mock', retrieval_strategy: 'mock' },
    };
  }
}
