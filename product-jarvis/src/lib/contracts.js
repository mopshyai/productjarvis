export const TRACKERS = {
  JIRA: 'jira',
  LINEAR: 'linear',
};

export const INTEGRATION_PROVIDERS = {
  JIRA: 'jira',
  LINEAR: 'linear',
  NOTION: 'notion',
};

export const COMMAND_ACTIONS = {
  GENERATE_PRD: 'generate_prd',
  SEARCH_DECISIONS: 'search_decisions',
  VIEW_DIGEST: 'view_digest',
};

export const DEFAULT_CITATION = {
  id: 'no-source',
  source_type: 'system',
  source_id: 'unknown',
  source_url: '',
  excerpt: 'No source found',
  confidence: 0,
};

const requiredStrings = ['what', 'who', 'impact_if_unsolved'];

export function assertPRDDocument(doc) {
  if (!doc || typeof doc !== 'object') {
    throw new Error('PRD must be an object');
  }

  if (!doc.problem_statement || typeof doc.problem_statement !== 'object') {
    throw new Error('problem_statement is required');
  }

  requiredStrings.forEach((key) => {
    if (typeof doc.problem_statement[key] !== 'string' || !doc.problem_statement[key].trim()) {
      throw new Error(`problem_statement.${key} is required`);
    }
  });

  if (!Array.isArray(doc.success_metrics) || doc.success_metrics.length < 3 || doc.success_metrics.length > 5) {
    throw new Error('success_metrics must contain 3-5 metrics');
  }

  if (!Array.isArray(doc.user_stories) || doc.user_stories.length < 3 || doc.user_stories.length > 6) {
    throw new Error('user_stories must contain 3-6 stories');
  }

  if (!Array.isArray(doc.acceptance_criteria) || doc.acceptance_criteria.length < 5) {
    throw new Error('acceptance_criteria must contain at least 5 items');
  }

  if (!Array.isArray(doc.edge_cases) || doc.edge_cases.length < 5) {
    throw new Error('edge_cases must contain at least 5 items');
  }

  if (!Array.isArray(doc.assumptions) || doc.assumptions.length === 0) {
    throw new Error('assumptions must not be empty');
  }

  if (!Array.isArray(doc.open_questions)) {
    throw new Error('open_questions must be an array');
  }

  if (!Array.isArray(doc.dependencies)) {
    throw new Error('dependencies must be an array');
  }

  if (!Array.isArray(doc.out_of_scope)) {
    throw new Error('out_of_scope must be an array');
  }

  if (!Array.isArray(doc.conflicts_detected)) {
    throw new Error('conflicts_detected must be an array');
  }

  if (!Array.isArray(doc.missing_context)) {
    throw new Error('missing_context must be an array');
  }

  return true;
}

export function assertCitations(citations) {
  if (!Array.isArray(citations)) {
    throw new Error('citations must be an array');
  }

  return citations.map((citation) => {
    if (!citation || typeof citation !== 'object') {
      return DEFAULT_CITATION;
    }

    const fallback = {
      ...DEFAULT_CITATION,
      ...citation,
    };

    if (!fallback.excerpt || !fallback.excerpt.trim()) {
      fallback.excerpt = 'No source found';
      fallback.confidence = 0;
    }

    return fallback;
  });
}
