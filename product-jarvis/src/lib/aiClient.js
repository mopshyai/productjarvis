// AI client — calls Quatarly gateway directly from the browser.
// Anthropic format: https://api.quatarly.cloud/
// OpenAI format:   https://api.quatarly.cloud/v1  (GPT, Gemini models)

const API_KEY = import.meta.env.VITE_QUATARLY_API_KEY || 'qua_trail_bqmryfxka931zkc9ckpwt991xub8ot22';

const ANTHROPIC_BASE = 'https://api.quatarly.cloud';
const OPENAI_BASE = 'https://api.quatarly.cloud/v1';

// Default models
const CLAUDE_MODEL = import.meta.env.VITE_CLAUDE_MODEL || 'claude-sonnet-4-6-20250929';
const GPT_MODEL = import.meta.env.VITE_GPT_MODEL || 'gpt-5.1';

// ── Anthropic ──────────────────────────────────────────────────────────────────

async function claudeComplete(systemPrompt, userPrompt, { maxTokens = 1500 } = {}) {
  const res = await fetch(`${ANTHROPIC_BASE}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Anthropic API error ${res.status}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text || '';
}

// ── OpenAI-compatible (GPT / Gemini) ──────────────────────────────────────────

async function openaiComplete(systemPrompt, userPrompt, { model = GPT_MODEL, maxTokens = 1500 } = {}) {
  const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `OpenAI API error ${res.status}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// ── JSON helper ───────────────────────────────────────────────────────────────

function parseJSON(text) {
  // Strip markdown code fences if present
  const cleaned = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
  return JSON.parse(cleaned);
}

// ── Product AI calls ──────────────────────────────────────────────────────────

export async function aiRouteCommand(userInput, productContext) {
  const system = `You are ProductJarvis, an AI product assistant. Given a user command, classify the intent and return JSON only.
Return exactly: {"action_type": "<generate_prd|search_decisions|view_digest>", "summary": "<one sentence>"}`;

  const user = `Command: "${userInput}"\nProduct context: ${JSON.stringify(productContext)}`;
  const text = await claudeComplete(system, user, { maxTokens: 200 });
  return parseJSON(text);
}

export async function aiGeneratePRD(featureRequest, productContext) {
  const system = `You are a senior product manager. Generate a detailed PRD as JSON only — no prose outside the JSON.
Return this exact shape:
{
  "problem_statement": { "what": "", "who": "", "impact_if_unsolved": "" },
  "success_metrics": [{ "name": "", "baseline": "", "target": "", "timeline": "" }],
  "user_stories": [{ "as_a": "", "i_want": "", "so_that": "" }],
  "acceptance_criteria": [""],
  "edge_cases": [""],
  "assumptions": [{ "assumption": "", "risk_level": "low|medium|high", "validation_method": "" }],
  "open_questions": [],
  "dependencies": [""],
  "out_of_scope": [],
  "conflicts_detected": [],
  "missing_context": []
}`;

  const user = `Feature request: ${featureRequest}\nProduct context: ${JSON.stringify(productContext)}`;
  const text = await claudeComplete(system, user, { maxTokens: 2000 });
  return parseJSON(text);
}

export async function aiGenerateTickets(featureRequest, prdBody, tracker, count = 10) {
  const system = `You are a technical PM. Generate sprint-ready ${tracker.toUpperCase()} tickets as JSON only.
Return: { "tickets": [{ "title": "", "description": "", "acceptance_criteria": [""], "story_points": 1|2|3|5, "dependencies": [] }], "dependencies": [], "estimate_summary": "" }`;

  const user = `Feature: ${featureRequest}\nPRD summary: ${JSON.stringify(prdBody?.problem_statement)}\nGenerate ${count} tickets.`;
  const text = await claudeComplete(system, user, { maxTokens: 2000 });
  return parseJSON(text);
}

export async function aiSearchDecisions(query, decisions) {
  const system = `You are a product memory assistant. Given a list of past decisions and a search query, return the most relevant ones with a confidence score. Return JSON only:
{ "results": [...matched decisions from the list], "confidence": 0.0-1.0, "summary": "" }`;

  const user = `Query: "${query}"\nDecisions: ${JSON.stringify(decisions)}`;
  const text = await claudeComplete(system, user, { maxTokens: 1000 });
  return parseJSON(text);
}

export async function aiDetectDecisions(transcript, participants, productContext) {
  const system = `You are a product intelligence assistant. Analyse this transcript and detect confirmed product decisions. Return JSON only:
{
  "analysis_metadata": { "source_type": "meeting_notes", "participants_identified": [], "conversation_summary": "", "total_decisions_found": 0, "total_candidates_found": 0 },
  "decisions": [{ "title": "", "what_was_decided": "", "what_was_rejected": "", "rationale": "", "made_by": "", "confidence": "low|medium|high", "confidence_reason": "", "related_feature": "", "decision_type": "build|buy|defer|kill", "reversibility": "low|moderate|high", "requires_followup": false, "followup_action": "", "followup_owner": "", "source_quote": "" }],
  "decision_candidates": [],
  "action_items_detected": []
}`;

  const user = `Participants: ${participants.join(', ')}\nProduct context: ${JSON.stringify(productContext)}\nTranscript:\n${transcript}`;
  const text = await claudeComplete(system, user, { maxTokens: 2000 });
  return parseJSON(text);
}

export async function aiGenerateDigest(productContext, integrations) {
  const connectedCount = Object.values(integrations || {}).filter((i) => i.connected).length;
  const system = `You are a PM risk intelligence system. Generate a morning digest. Return JSON only:
{
  "risks": [{ "severity": "low|medium|high", "summary": "", "action": "" }],
  "actions": [""],
  "completions": [""],
  "confidence": 0.0-1.0
}`;

  const user = `Product context: ${JSON.stringify(productContext)}\nConnected integrations: ${connectedCount}`;
  const text = await claudeComplete(system, user, { maxTokens: 800 });
  return parseJSON(text);
}

export async function aiScorePRDHealth(prdContent, productContext) {
  const system = `You are a PRD quality reviewer. Score the PRD and return JSON only:
{
  "health_score": 0-100,
  "grade": "",
  "ready_for_engineering": true|false,
  "blocking_issues": [],
  "breakdown": {},
  "top_3_fixes": [],
  "conflicts_with_product": [],
  "okr_alignment": { "aligned": true|false, "which_okr": "", "alignment_note": "" }
}`;

  const user = `PRD: ${JSON.stringify(prdContent)}\nProduct OKRs: ${JSON.stringify(productContext?.okrs)}`;
  const text = await claudeComplete(system, user, { maxTokens: 800 });
  return parseJSON(text);
}

export async function aiGenerateStakeholderUpdate(payload) {
  const system = `You are a product communicator. Write a stakeholder update email. Return JSON only:
{
  "subject_line": "",
  "body": "",
  "word_count": 0,
  "key_metrics_included": [],
  "asks_or_decisions_needed": [],
  "tone_check": "",
  "alternative_subject_lines": ["", ""]
}`;

  const user = `Feature: ${payload.feature_name}\nAudience: ${payload.audience}\nStatus: ${payload.status}\nRisks: ${JSON.stringify(payload.risks)}\nContext: ${JSON.stringify(payload.context)}`;
  const text = await claudeComplete(system, user, { maxTokens: 800 });
  return parseJSON(text);
}

export async function aiSynthesizeOpportunities(query, evidenceChunks, productContext) {
  const system = `You are a product strategist. Synthesize product opportunities from evidence. Return JSON only:
{
  "opportunities": [{ "title": "", "summary": "", "evidence_count": 0, "source_types": [], "confidence": "low|medium|high", "suggested_next_step": "", "citations": [{ "source_type": "", "excerpt": "" }] }],
  "synthesis_summary": "",
  "evidence_gaps": []
}`;

  const user = `Query: "${query || 'top product opportunities'}"\nEvidence: ${JSON.stringify(evidenceChunks?.slice(0, 10))}\nProduct context: ${JSON.stringify(productContext)}`;
  const text = await claudeComplete(system, user, { maxTokens: 2000 });
  return parseJSON(text);
}
