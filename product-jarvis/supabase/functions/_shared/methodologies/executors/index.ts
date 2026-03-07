import type { MethodologyId } from '../types.ts';
import { scoreKano } from '../scoring/kano.ts';
import { scoreOkrAlignment } from '../scoring/okr.ts';
import { scoreRice } from '../scoring/rice.ts';
import { scoreWsjf } from '../scoring/wsjf.ts';

export function runMethodologyExecutor(methodId: MethodologyId, input: Record<string, unknown>) {
  if (methodId === 'rice') return scoreRice(input);
  if (methodId === 'wsjf') return scoreWsjf(input);
  if (methodId === 'kano') return scoreKano(input);
  if (methodId === 'okr_alignment') return scoreOkrAlignment(input);

  if (methodId === 'ice') {
    const impact = Number(input.impact || 5);
    const confidence = Number(input.confidence || 5);
    const ease = Number(input.ease || 5);
    return { score: Number(((impact * confidence * ease) / 10).toFixed(2)), components: { impact, confidence, ease } };
  }

  if (methodId === 'moscow') {
    return {
      must: ['Core acceptance criteria'],
      should: ['Secondary flow improvements'],
      could: ['UX polish'],
      wont: ['Out-of-scope extras'],
    };
  }

  if (methodId === 'scrum' || methodId === 'sprint_planning') {
    return {
      cadence: '2-week sprint',
      ceremonies: ['Planning', 'Daily standup', 'Review', 'Retro'],
      recommendation: 'Use committed scope with capacity guardrails',
    };
  }

  if (methodId === 'kanban' || methodId === 'scrumban') {
    return {
      wip_limit: 3,
      flow_states: ['Backlog', 'In Progress', 'Review', 'Done'],
      recommendation: 'Optimize flow efficiency and cycle time',
    };
  }

  if (methodId === 'waterfall') {
    return {
      phase_gates: ['Requirements', 'Design', 'Implementation', 'Verification', 'Release'],
      recommendation: 'Use explicit sign-off per phase',
    };
  }

  if (methodId === 'raid') {
    return {
      risks: ['Dependency slippage'],
      assumptions: ['Integration API stability'],
      issues: ['Token refresh failure'],
      dependencies: ['Jira/Linear OAuth readiness'],
    };
  }

  if (methodId === 'prfaq') {
    return {
      press_release_headline: 'ProductJarvis ships methodology-aware planning intelligence',
      faq_focus: ['Why now?', 'Who benefits?', 'How measured?'],
    };
  }

  if (methodId === 'aarrr' || methodId === 'heart' || methodId === 'north_star_metric') {
    return {
      metric_focus: methodId,
      recommendation: 'Tie delivery outputs to measurable movement',
    };
  }

  return {
    framework: methodId,
    recommendation: 'Methodology applied with baseline guidance',
  };
}
