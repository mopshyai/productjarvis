import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import './OnboardingWizard.css';

const starter = {
  workspace_name: 'Core Product',
  product_name: 'ProductJarvis',
  product_description: 'AI product operating system for PM teams.',
  okrs: 'Reduce PRD creation time by 90%\nWeek-4 retention >50%',
  features_summary: 'Command Bar\nPRD Generator\nDecision Memory\nDaily Digest',
  decisions: 'Jira + Linear in v1\nMobile app deferred to v2',
  sprint_status: 'Sprint 5 in progress',
  user_signals: 'Need faster ticket generation\nNeed trusted citations',
  metrics: 'PRD time down 32%\nDigest opens up 18%',
};

function splitLines(value) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

const OnboardingWizard = () => {
  const { completeOnboarding, loading } = useApp();
  const [form, setForm] = useState(starter);

  const handleSubmit = async (event) => {
    event.preventDefault();
    await completeOnboarding({
      workspace_name: form.workspace_name,
      product_name: form.product_name,
      product_description: form.product_description,
      okrs: splitLines(form.okrs),
      features_summary: splitLines(form.features_summary),
      decisions: splitLines(form.decisions),
      sprint_status: form.sprint_status,
      user_signals: splitLines(form.user_signals),
      metrics: splitLines(form.metrics),
    });
  };

  return (
    <div className="onboarding-shell">
      <div className="onboarding-card glass-panel">
        <h1>Seed Your Product Context</h1>
        <p>Complete this once to unlock PRD generation, decision memory, and daily digests.</p>

        <form className="onboarding-form" onSubmit={handleSubmit}>
          <label>
            Workspace name
            <input value={form.workspace_name} onChange={(e) => setForm({ ...form, workspace_name: e.target.value })} required />
          </label>
          <label>
            Product name
            <input value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} required />
          </label>
          <label>
            Product description
            <textarea value={form.product_description} onChange={(e) => setForm({ ...form, product_description: e.target.value })} required />
          </label>
          <label>
            OKRs (one per line)
            <textarea value={form.okrs} onChange={(e) => setForm({ ...form, okrs: e.target.value })} required />
          </label>
          <label>
            Active features (one per line)
            <textarea value={form.features_summary} onChange={(e) => setForm({ ...form, features_summary: e.target.value })} required />
          </label>
          <label>
            Recent decisions (one per line)
            <textarea value={form.decisions} onChange={(e) => setForm({ ...form, decisions: e.target.value })} required />
          </label>
          <label>
            Current sprint
            <input value={form.sprint_status} onChange={(e) => setForm({ ...form, sprint_status: e.target.value })} required />
          </label>
          <label>
            User signals (one per line)
            <textarea value={form.user_signals} onChange={(e) => setForm({ ...form, user_signals: e.target.value })} required />
          </label>
          <label>
            Metrics (one per line)
            <textarea value={form.metrics} onChange={(e) => setForm({ ...form, metrics: e.target.value })} required />
          </label>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Saving...' : 'Complete Onboarding'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default OnboardingWizard;
