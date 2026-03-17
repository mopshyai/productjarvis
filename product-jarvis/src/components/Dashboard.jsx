import React, { useEffect, useState } from 'react';
import { Target, Clock, Zap, AlertTriangle, ArrowUpRight, BookOpen, Command, BrainCircuit, CheckCircle2, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { navigateToSurface, SURFACES } from '../lib/domainRoutes';
import './Dashboard.css';

const Dashboard = () => {
  const { session, api } = useApp();
  const navigate = useNavigate();
  const [digest, setDigest] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.getTodayDigest().then((data) => {
      if (active) {
        setDigest(data);
        setLoading(false);
      }
    }).catch(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [api]);

  const usage = session?.usage;
  const prdUsed = usage?.prd_generated_this_month || 0;
  const prdLimit = usage?.prd_limit_monthly || 3;
  const remaining = Math.max(prdLimit - prdUsed, 0);
  const quotaPct = Math.round((prdUsed / prdLimit) * 100);

  const healthScore = Math.round((digest?.confidence || 0.4) * 100);
  const scoreColor = healthScore >= 70 ? 'var(--color-success)' : healthScore >= 40 ? 'var(--color-warning)' : 'var(--color-danger)';

  const firstName = session?.user?.name?.split(' ')[0] || 'there';
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const quickActions = [
    { label: 'Generate PRD', icon: BookOpen, path: '/prds', color: 'var(--color-accent)' },
    { label: 'Run Command', icon: Command, path: '/command', color: '#8b5cf6' },
    { label: 'Search Decisions', icon: BrainCircuit, path: '/decisions', color: '#06b6d4' },
    { label: 'Daily Digest', icon: Clock, path: '/digest', color: 'var(--color-warning)' },
  ];

  const risks = digest?.risks || [];
  const actions = digest?.actions || [];
  const completions = digest?.completions || [];
  const okrs = session?.product_context?.okrs || [];
  const signals = session?.product_context?.user_signals || [];

  return (
    <div className="dashboard dashboard-container page-content animate-fade-in">
      {/* Greeting */}
      <div className="dashboard-header">
        <div className="dashboard-greeting">
          <h1>Good morning, {firstName}</h1>
          <p className="dashboard-date">{today}</p>
        </div>
        <div className="health-score glass-panel" style={{ borderColor: `${scoreColor}33` }}>
          <div className="score-value" style={{ color: scoreColor }}>{loading ? '—' : healthScore}</div>
          <div className="score-label">Health Score</div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="quick-action-grid">
        {quickActions.map((qa) => (
          <button
            key={qa.path}
            className="quick-action-card glass-panel"
            onClick={() => navigateToSurface(navigate, SURFACES.APP, qa.path)}
            style={{ '--qa-color': qa.color }}
          >
            <qa.icon size={20} style={{ color: qa.color }} />
            <span>{qa.label}</span>
            <ChevronRight size={14} className="qa-arrow" />
          </button>
        ))}
      </div>

      {/* Metrics */}
      <div className="metrics-grid">
        <div className="metric-card glass-panel">
          <div className="metric-header">
            <Clock size={18} className="text-blue" />
            <span>PRD Creation Time</span>
          </div>
          <div className="metric-content">
            <span className="value">&lt; 15m</span>
            <span className="trend positive">
              <ArrowUpRight size={14} /> Target locked
            </span>
          </div>
          <p className="metric-subtext">Automated generation per request</p>
        </div>

        <div className="metric-card glass-panel">
          <div className="metric-header">
            <Zap size={18} className="text-yellow" />
            <span>PRD Quota</span>
          </div>
          <div className="metric-content">
            <span className="value">{remaining}</span>
            <span className="trend neutral">of {prdLimit} remaining</span>
          </div>
          <div className="quota-bar">
            <div className="quota-fill" style={{ width: `${quotaPct}%`, background: quotaPct > 80 ? 'var(--color-warning)' : 'var(--color-accent)' }} />
          </div>
          {quotaPct >= 67 && (
            <div className={`quota-cta ${remaining === 0 ? 'quota-cta-urgent' : ''}`}>
              {remaining === 0 ? (
                <>You've hit your monthly limit. <a href="mailto:upgrade@productjarvis.ai">Upgrade for unlimited PRDs →</a></>
              ) : (
                <>Only {remaining} PRD{remaining === 1 ? '' : 's'} left this month. <a href="mailto:upgrade@productjarvis.ai">Upgrade →</a></>
              )}
            </div>
          )}
        </div>

        <div className="metric-card glass-panel">
          <div className="metric-header">
            <Target size={18} className="text-green" />
            <span>Active OKRs</span>
          </div>
          <div className="metric-content">
            <span className="value">{okrs.length}</span>
            <span className="trend neutral">Tracking now</span>
          </div>
          <p className="metric-subtext">Context seeded in onboarding</p>
        </div>
      </div>

      {/* Content grid */}
      <div className="dashboard-content-grid">
        {/* Risks panel */}
        <div className="daily-risks glass-panel border-warning">
          <div className="panel-header">
            <h3 className="flex items-center gap-2 text-warning">
              <AlertTriangle size={18} /> Daily Risks
            </h3>
            <button className="view-all" onClick={() => navigateToSurface(navigate, SURFACES.APP, '/digest')}>View digest</button>
          </div>
          <div className="risk-content">
            {loading ? (
              <div className="loading-pulse" />
            ) : risks.length === 0 ? (
              <div className="empty-state">No risks detected today</div>
            ) : (
              risks.map((risk, i) => (
                <div key={i} className="risk-item">
                  <span className={`risk-badge risk-${risk.severity}`}>{risk.severity}</span>
                  <div className="risk-text">
                    <p>{risk.summary}</p>
                    {risk.action && <span className="risk-action">{risk.action}</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="dashboard-right-col">
          {/* Pending actions */}
          <div className="glass-panel side-panel">
            <div className="panel-header">
              <h3>Pending Actions</h3>
            </div>
            <div className="side-panel-body">
              {loading ? (
                <div className="loading-pulse" />
              ) : actions.length === 0 ? (
                <div className="empty-state">No pending actions</div>
              ) : (
                actions.map((action, i) => (
                  <div key={i} className="action-row">
                    <AlertTriangle size={13} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
                    <span>{action}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Completions */}
          <div className="glass-panel side-panel">
            <div className="panel-header">
              <h3 className="text-success">Completed</h3>
            </div>
            <div className="side-panel-body">
              {loading ? (
                <div className="loading-pulse" />
              ) : completions.length === 0 ? (
                <div className="empty-state">No completions yet</div>
              ) : (
                completions.map((item, i) => (
                  <div key={i} className="action-row">
                    <CheckCircle2 size={13} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
                    <span>{item}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* OKRs + Signals */}
      <div className="dashboard-bottom-grid">
        {okrs.length > 0 && (
          <div className="glass-panel">
            <div className="panel-header">
              <h3>Active OKRs</h3>
            </div>
            <div className="side-panel-body">
              {okrs.map((okr, i) => (
                <div key={i} className="okr-row">
                  <Target size={13} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
                  <span>{okr}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {signals.length > 0 && (
          <div className="glass-panel">
            <div className="panel-header">
              <h3>Recent Signals</h3>
            </div>
            <div className="prd-list">
              {signals.map((signal, i) => (
                <div key={i} className="prd-list-item">
                  <div className="status-dot published" />
                  <div className="prd-info">
                    <h4>{signal}</h4>
                    <span>From onboarding context</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
