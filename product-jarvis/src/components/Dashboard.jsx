import React, { useEffect, useState } from 'react';
import { Target, Clock, Zap, AlertTriangle, ArrowUpRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import './Dashboard.css';

const Dashboard = () => {
  const { session, api } = useApp();
  const [digest, setDigest] = useState(null);

  useEffect(() => {
    let active = true;
    api.getTodayDigest().then((data) => {
      if (active) setDigest(data);
    });
    return () => {
      active = false;
    };
  }, [api]);

  const usage = session?.usage;
  const remaining = Math.max((usage?.prd_limit_monthly || 3) - (usage?.prd_generated_this_month || 0), 0);

  return (
    <div className="dashboard-container page-content animate-fade-in">
      <div className="dashboard-header-row">
        <div>
          <h1>Overview</h1>
          <p>Execution health and PM automation performance across your workspace.</p>
        </div>
        <div className="health-score glass-panel">
          <div className="score-value">{Math.round((digest?.confidence || 0.4) * 100)}</div>
          <div className="score-label">Product Health Score</div>
        </div>
      </div>

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
          <p className="metric-subtext">Current session objective</p>
        </div>

        <div className="metric-card glass-panel">
          <div className="metric-header">
            <Zap size={18} className="text-yellow" />
            <span>PRD Quota Remaining</span>
          </div>
          <div className="metric-content">
            <span className="value">{remaining}</span>
            <span className="trend neutral">of {usage?.prd_limit_monthly || 3} this month</span>
          </div>
          <p className="metric-subtext">Free plan monthly allowance</p>
        </div>

        <div className="metric-card glass-panel">
          <div className="metric-header">
            <Target size={18} className="text-green" />
            <span>Active OKRs</span>
          </div>
          <div className="metric-content">
            <span className="value">{session?.product_context?.okrs?.length || 0}</span>
            <span className="trend neutral">Tracking now</span>
          </div>
          <p className="metric-subtext">Context seeded in onboarding</p>
        </div>
      </div>

      <div className="dashboard-content-grid">
        <div className="recent-prds glass-panel">
          <div className="panel-header">
            <h3>Recent Signals</h3>
          </div>
          <div className="prd-list">
            {(session?.product_context?.user_signals || []).map((signal, i) => (
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

        <div className="daily-risks glass-panel border-warning">
          <div className="panel-header">
            <h3 className="flex items-center gap-2 text-warning">
              <AlertTriangle size={18} /> Daily Risks
            </h3>
          </div>
          <div className="risk-content">
            <p className="risk-summary">
              {digest?.risks?.[0]?.summary || 'No risks detected.'}
            </p>
            <div className="risk-actions">
              <button className="btn-primary">{digest?.risks?.[0]?.action || 'No action required'}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
