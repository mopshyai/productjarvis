import React, { useEffect, useState } from 'react';
import { Mail, Clock, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import SourceCitation from './shared/SourceCitation';
import './DailyDigest.css';

const DailyDigest = () => {
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

  const date = digest?.generated_at ? new Date(digest.generated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '08:30 AM';

  return (
    <div className="digest-container page-content animate-fade-in">
      <div className="digest-header">
        <h1>Morning Briefing</h1>
        <p>Generated for {session?.user?.name || 'PM'} at 8:30 AM local time</p>
      </div>

      <div className="digest-email-frame glass-panel">
        <div className="email-header">
          <div className="subject-line">
            <span className="pill">Daily Digest</span>
            <span>{digest?.risks?.[0]?.summary || 'No risks detected.'}</span>
          </div>
          <div className="email-meta">
            <div className="sender">
              <div className="avatar small">
                <Mail size={12} />
              </div>
              <strong>ProductJarvis</strong>
            </div>
            <div className="time text-tertiary">{date} Today</div>
          </div>
        </div>

        <div className="email-body">
          <p className="greeting">Good morning {session?.user?.name?.split(' ')[0] || 'there'},</p>
          <p className="summary-text">
            Here is what is at risk today based on connected integrations and workspace context. Confidence:{' '}
            <strong>{Math.round((digest?.confidence || 0) * 100)}%</strong>
          </p>

          <div className="digest-section alert-section">
            <h3 className="section-title text-warning">
              <AlertTriangle size={16} /> High Priority Risks
            </h3>
            <div className="digest-card">
              <h4>{digest?.risks?.[0]?.summary || 'No risks detected.'}</h4>
              <p>{digest?.risks?.[0]?.action || 'No action required.'}</p>
              <button className="inline-action">
                Open Command Bar <ArrowRight size={14} />
              </button>
            </div>
          </div>

          <div className="digest-section">
            <h3 className="section-title">
              <Clock size={16} /> Pending Actions
            </h3>
            <div className="digest-card">
              <ul className="action-list">
                {(digest?.actions || []).map((action) => (
                  <li key={action}>
                    <div className="flex-between">
                      <span>{action}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="digest-section success-section">
            <h3 className="section-title text-success">
              <CheckCircle2 size={16} /> Completed Yesterday
            </h3>
            <div className="digest-card plain">
              <ul className="success-list">
                {(digest?.completions || []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          <SourceCitation citations={digest?.citations || []} />

          <div className="email-footer">
            <p className="text-tertiary">
              If integrations are disconnected, this digest uses manually entered product context and marks reduced confidence.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyDigest;
