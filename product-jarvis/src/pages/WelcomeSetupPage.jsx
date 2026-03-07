import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Settings } from 'lucide-react';
import { useApp } from '../context/AppContext';
import './WelcomeSetupPage.css';

const methodOptions = [
  'rice',
  'wsjf',
  'kano',
  'jtbd',
  'scrum',
  'kanban',
  'prfaq',
  'okr_alignment',
  'aarrr',
  'heart',
];

const defaultAnswers = {
  role_context: {
    role: 'Founder-PM',
    team_size: '1-5',
    persona: 'hands-on-builder',
  },
  product_basics: {
    workspace_name: 'Core Product',
    product_name: 'ProductJarvis',
    product_description: 'AI product operating system for PM teams',
    product_stage: 'beta',
    target_segment: 'Seed to Series B product teams',
  },
  goals_execution: {
    okrs_text: 'Reduce PRD creation time by 90%\nImprove week-4 retention above 50%\nIncrease DAU/MAU above 40%',
    execution_cadence: 'scrum',
    sprint_length: '2 weeks',
  },
  tooling_data: {
    connect_jira: false,
    connect_linear: false,
    connect_notion: false,
  },
  method_defaults: {
    primary_method: 'rice',
    supporting_methods: ['jtbd', 'scrum', 'okr_alignment'],
    source: 'auto',
  },
  success_baselines: {
    prd_time_baseline: '3-4 hours',
    planning_time_baseline: '45-90 minutes',
    biggest_bottleneck: 'Context gathering across tools',
  },
};

const WelcomeSetupPage = () => {
  const navigate = useNavigate();
  const {
    session,
    loading,
    getOnboardingSchema,
    saveOnboardingAnswer,
    completeAdaptiveOnboarding,
    recommendMethodologies,
    api,
    refreshSession,
  } = useApp();

  const [setupMode, setSetupMode] = useState(null); // null | 'quick' | 'full'
  const [schema, setSchema] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState(defaultAnswers);
  const [error, setError] = useState('');
  const [recommendationReason, setRecommendationReason] = useState('');

  useEffect(() => {
    if (!session?.auth?.authenticated) {
      navigate('/auth', { replace: true });
      return;
    }
    if (session?.workspace?.onboarding_complete) {
      navigate('/workspace', { replace: true });
      return;
    }

    getOnboardingSchema().then((data) => setSchema(data));
  }, [session, navigate, getOnboardingSchema]);

  useEffect(() => {
    const run = async () => {
      const result = await recommendMethodologies({
        role: answers.role_context.role,
        stage: answers.product_basics.product_stage,
        cadence: answers.goals_execution.execution_cadence,
      });
      setAnswers((prev) => ({
        ...prev,
        method_defaults: {
          primary_method: result.primary,
          supporting_methods: result.supporting,
          source: result.source || 'auto',
        },
      }));
      setRecommendationReason(result.reason || 'Auto-selected by ProductJarvis');
    };
    run();
  }, [answers.role_context.role, answers.product_basics.product_stage, answers.goals_execution.execution_cadence, recommendMethodologies]);

  const steps = schema?.steps || [];
  const current = steps[stepIndex]?.id || 'role_context';

  const connectedCount = useMemo(() => {
    const integrations = session?.integrations || {};
    return Object.values(integrations).filter((item) => item.connected).length;
  }, [session]);

  const readinessScore = useMemo(() => {
    let score = 50;
    if (answers.role_context.role) score += 8;
    if (answers.product_basics.product_name) score += 10;
    if (answers.goals_execution.okrs_text) score += 10;
    if (answers.success_baselines.prd_time_baseline) score += 8;
    score += connectedCount * 4;
    return Math.min(score, 100);
  }, [answers, connectedCount]);

  const setStepData = (stepId, patch) => {
    setAnswers((prev) => ({
      ...prev,
      [stepId]: {
        ...prev[stepId],
        ...patch,
      },
    }));
  };

  const handleIntegrationConnect = async (provider) => {
    await api.connectIntegration(provider);
    await refreshSession();
  };

  const handleQuickStart = async () => {
    setError('');
    try {
      await completeAdaptiveOnboarding({
        workspace_name: defaultAnswers.product_basics.workspace_name,
        product_name: defaultAnswers.product_basics.product_name,
        product_description: defaultAnswers.product_basics.product_description,
        product_stage: defaultAnswers.product_basics.product_stage,
        target_segment: defaultAnswers.product_basics.target_segment,
        role: defaultAnswers.role_context.role,
        team_size: defaultAnswers.role_context.team_size,
        persona: defaultAnswers.role_context.persona,
        execution_cadence: defaultAnswers.goals_execution.execution_cadence,
        okrs: defaultAnswers.goals_execution.okrs_text.split('\n').map((s) => s.trim()).filter(Boolean),
        features_summary: ['Command Bar', 'PRD Generator', 'Decision Memory', 'Daily Digest'],
        decisions: ['Methodology-aware planning enabled'],
        sprint_status: 'Sprint cadence: 2 weeks',
        user_signals: [defaultAnswers.success_baselines.biggest_bottleneck],
        metrics: [
          `PRD baseline: ${defaultAnswers.success_baselines.prd_time_baseline}`,
          `Planning baseline: ${defaultAnswers.success_baselines.planning_time_baseline}`,
        ],
        prd_time_baseline: defaultAnswers.success_baselines.prd_time_baseline,
        planning_time_baseline: defaultAnswers.success_baselines.planning_time_baseline,
        biggest_bottleneck: defaultAnswers.success_baselines.biggest_bottleneck,
        methodology_preferences: {
          primary: defaultAnswers.method_defaults.primary_method,
          supporting: defaultAnswers.method_defaults.supporting_methods,
          source: 'auto',
        },
        answers: defaultAnswers,
      });
      navigate('/workspace', { replace: true });
    } catch (err) {
      setError(err.message || 'Quick start failed');
    }
  };

  const handleNext = async () => {
    setError('');
    try {
      await saveOnboardingAnswer({ step_id: current, payload: answers[current] });
      if (stepIndex < steps.length - 1) {
        setStepIndex((idx) => idx + 1);
      }
    } catch (err) {
      setError(err.message || 'Failed to save this step');
    }
  };

  const handleBack = () => {
    if (stepIndex > 0) setStepIndex((idx) => idx - 1);
  };

  const handleComplete = async () => {
    setError('');
    try {
      await completeAdaptiveOnboarding({
        workspace_name: answers.product_basics.workspace_name,
        product_name: answers.product_basics.product_name,
        product_description: answers.product_basics.product_description,
        product_stage: answers.product_basics.product_stage,
        target_segment: answers.product_basics.target_segment,
        role: answers.role_context.role,
        team_size: answers.role_context.team_size,
        persona: answers.role_context.persona,
        execution_cadence: answers.goals_execution.execution_cadence,
        okrs: answers.goals_execution.okrs_text.split('\n').map((item) => item.trim()).filter(Boolean),
        features_summary: ['Command Bar', 'PRD Generator', 'Decision Memory', 'Daily Digest'],
        decisions: ['Methodology-aware planning enabled'],
        sprint_status:
          answers.goals_execution.execution_cadence === 'kanban'
            ? 'Flow-based planning active'
            : `Sprint cadence: ${answers.goals_execution.sprint_length}`,
        user_signals: [answers.success_baselines.biggest_bottleneck],
        metrics: [
          `PRD baseline: ${answers.success_baselines.prd_time_baseline}`,
          `Planning baseline: ${answers.success_baselines.planning_time_baseline}`,
        ],
        prd_time_baseline: answers.success_baselines.prd_time_baseline,
        planning_time_baseline: answers.success_baselines.planning_time_baseline,
        biggest_bottleneck: answers.success_baselines.biggest_bottleneck,
        methodology_preferences: {
          primary: answers.method_defaults.primary_method,
          supporting: answers.method_defaults.supporting_methods,
          source: answers.method_defaults.source,
        },
        answers,
      });
      navigate('/workspace', { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to complete setup');
    }
  };

  return (
    <div className="welcome-shell">
      <div className="welcome-panel glass-panel">

        {/* Mode selection — shown first */}
        {!setupMode ? (
          <div className="setup-mode-select">
            <h1>Welcome to ProductJarvis</h1>
            <p className="setup-mode-subtitle">How do you want to get started?</p>
            <div className="setup-mode-grid">
              <button className="setup-mode-card glass-panel" onClick={handleQuickStart} disabled={loading}>
                <Zap size={28} style={{ color: 'var(--warning)' }} />
                <div>
                  <strong>Quick Start</strong>
                  <p>Jump in now. We'll apply smart defaults and you can customize later.</p>
                  <span className="setup-mode-time">~2 minutes</span>
                </div>
              </button>
              <button className="setup-mode-card glass-panel" onClick={() => setSetupMode('full')}>
                <Settings size={28} style={{ color: 'var(--accent-primary)' }} />
                <div>
                  <strong>Full Setup</strong>
                  <p>Personalize your workspace: role, OKRs, methodology, integrations.</p>
                  <span className="setup-mode-time">~10 minutes</span>
                </div>
              </button>
            </div>
            {error ? <p className="error-text">{error}</p> : null}
          </div>
        ) : (
          <>
          <div className="welcome-head">
            <div>
              <h1>Set up your workspace</h1>
              <p>About 10 minutes. We’ll personalize ProductJarvis to your team and workflow.</p>
            </div>
            <div className="welcome-progress">Step {Math.min(stepIndex + 1, steps.length)} / {steps.length || 6}</div>
          </div>

        {current === 'role_context' ? (
          <section className="step-grid">
            <label>
              What best describes you?
              <select value={answers.role_context.role} onChange={(e) => setStepData('role_context', { role: e.target.value })}>
                <option>Founder-PM</option>
                <option>Product Manager</option>
                <option>Head of Product</option>
                <option>CPO</option>
              </select>
            </label>
            <label>
              How many PMs are on your team?
              <select value={answers.role_context.team_size} onChange={(e) => setStepData('role_context', { team_size: e.target.value })}>
                <option>1-5</option>
                <option>6-15</option>
                <option>16-40</option>
                <option>40+</option>
              </select>
            </label>
          </section>
        ) : null}

        {current === 'product_basics' ? (
          <section className="step-grid">
            <label>
              Workspace name
              <input value={answers.product_basics.workspace_name} onChange={(e) => setStepData('product_basics', { workspace_name: e.target.value })} />
            </label>
            <label>
              Product name
              <input value={answers.product_basics.product_name} onChange={(e) => setStepData('product_basics', { product_name: e.target.value })} />
            </label>
            <label className="span-2">
              One-line product description
              <input value={answers.product_basics.product_description} onChange={(e) => setStepData('product_basics', { product_description: e.target.value })} />
            </label>
            <label>
              Product stage
              <select value={answers.product_basics.product_stage} onChange={(e) => setStepData('product_basics', { product_stage: e.target.value })}>
                <option value="pre-launch">Pre-launch</option>
                <option value="beta">Beta</option>
                <option value="growth">Growth</option>
                <option value="scale">Scale</option>
              </select>
            </label>
            <label>
              Target user segment
              <input value={answers.product_basics.target_segment} onChange={(e) => setStepData('product_basics', { target_segment: e.target.value })} />
            </label>
          </section>
        ) : null}

        {current === 'goals_execution' ? (
          <section className="step-grid">
            <label className="span-2">
              Top 3 goals / OKRs this quarter (one per line)
              <textarea value={answers.goals_execution.okrs_text} onChange={(e) => setStepData('goals_execution', { okrs_text: e.target.value })} />
            </label>
            <label>
              Execution cadence
              <select value={answers.goals_execution.execution_cadence} onChange={(e) => setStepData('goals_execution', { execution_cadence: e.target.value })}>
                <option value="scrum">Scrum</option>
                <option value="kanban">Kanban</option>
                <option value="scrumban">Scrumban</option>
                <option value="waterfall">Waterfall</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </label>
            {answers.goals_execution.execution_cadence !== 'kanban' ? (
              <label>
                Sprint length
                <select value={answers.goals_execution.sprint_length} onChange={(e) => setStepData('goals_execution', { sprint_length: e.target.value })}>
                  <option>1 week</option>
                  <option>2 weeks</option>
                  <option>3 weeks</option>
                  <option>4 weeks</option>
                </select>
              </label>
            ) : null}
          </section>
        ) : null}

        {current === 'tooling_data' ? (
          <section className="step-grid">
            <p className="span-2 hint">Optional but recommended: connect tools now for better output confidence.</p>
            <button type="button" className="tool-btn" onClick={() => handleIntegrationConnect('jira')}>Connect Jira</button>
            <button type="button" className="tool-btn" onClick={() => handleIntegrationConnect('linear')}>Connect Linear</button>
            <button type="button" className="tool-btn" onClick={() => handleIntegrationConnect('notion')}>Connect Notion</button>
            <p className="span-2 subtle">
              Connected integrations: <strong>{connectedCount}</strong>. You can skip now and connect later.
            </p>
          </section>
        ) : null}

        {current === 'method_defaults' ? (
          <section className="step-grid">
            <label>
              Primary methodology
              <select
                value={answers.method_defaults.primary_method}
                onChange={(e) => setStepData('method_defaults', { primary_method: e.target.value, source: 'manual' })}
              >
                {methodOptions.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="span-2">
              Supporting methodologies
              <div className="method-list">
                {methodOptions
                  .filter((item) => item !== answers.method_defaults.primary_method)
                  .map((item) => {
                    const checked = answers.method_defaults.supporting_methods.includes(item);
                    return (
                      <label key={item} className="method-item">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...answers.method_defaults.supporting_methods, item]
                              : answers.method_defaults.supporting_methods.filter((method) => method !== item);
                            setStepData('method_defaults', { supporting_methods: next.slice(0, 4), source: 'manual' });
                          }}
                        />
                        <span>{item}</span>
                      </label>
                    );
                  })}
              </div>
            </label>
            <p className="span-2 subtle">Auto recommendation: {recommendationReason}</p>
          </section>
        ) : null}

        {current === 'success_baselines' ? (
          <section className="step-grid">
            <label>
              Current PRD creation time
              <input value={answers.success_baselines.prd_time_baseline} onChange={(e) => setStepData('success_baselines', { prd_time_baseline: e.target.value })} />
            </label>
            <label>
              Current ticket planning time
              <input value={answers.success_baselines.planning_time_baseline} onChange={(e) => setStepData('success_baselines', { planning_time_baseline: e.target.value })} />
            </label>
            <label className="span-2">
              Biggest workflow bottleneck
              <textarea value={answers.success_baselines.biggest_bottleneck} onChange={(e) => setStepData('success_baselines', { biggest_bottleneck: e.target.value })} />
            </label>
            <div className="completion-box span-2">
              <p>Workspace readiness score</p>
              <h3>{readinessScore}</h3>
              <p>First suggested action: “Generate a PRD for your highest-priority feature from this quarter’s OKRs.”</p>
            </div>
          </section>
        ) : null}

        {error ? <p className="error-text">{error}</p> : null}

        <div className="step-actions">
          <button className="ghost-btn" onClick={handleBack} disabled={stepIndex === 0 || loading}>Back</button>
          {stepIndex < steps.length - 1 ? (
            <button className="primary-btn" onClick={handleNext} disabled={loading}>Continue</button>
          ) : (
            <button className="primary-btn" onClick={handleComplete} disabled={loading}>Complete setup</button>
          )}
        </div>
        </>
        )}
      </div>
    </div>
  );
};

export default WelcomeSetupPage;
