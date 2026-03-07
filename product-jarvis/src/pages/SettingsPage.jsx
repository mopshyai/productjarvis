import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Settings, Link2, CheckCircle2, AlertCircle } from 'lucide-react';

const inputStyle = {
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '6px',
  padding: '0.4rem 0.75rem',
  color: 'inherit',
  width: '200px',
};

const selectStyle = { ...inputStyle, width: 'auto', cursor: 'pointer' };

const Section = ({ title, children }) => (
  <div className="settings-section glass-panel" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
    <h3 style={{ marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.6 }}>{title}</h3>
    {children}
  </div>
);

const SettingsRow = ({ label, description, children }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
    <div style={{ flex: 1 }}>
      <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{label}</div>
      {description && <div style={{ fontSize: '0.8rem', opacity: 0.5, marginTop: '0.2rem' }}>{description}</div>}
    </div>
    <div style={{ marginLeft: '1rem' }}>{children}</div>
  </div>
);

const INTEGRATIONS_META = {
  jira: { label: 'Jira', desc: 'Sync sprint tickets and issue tracking' },
  linear: { label: 'Linear', desc: 'Push generated tickets directly to Linear' },
  notion: { label: 'Notion', desc: 'Two-way sync PRDs and docs' },
};

const SettingsPage = () => {
  const { session, api, refreshSession } = useApp();
  const workspace = session?.workspace || {};
  const integrations = session?.integrations || {};
  const [saved, setSaved] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [connecting, setConnecting] = useState(null);
  const [connectMsg, setConnectMsg] = useState('');

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleConnect = async (provider) => {
    setConnecting(provider);
    setConnectMsg('');
    try {
      await api.connectIntegration(provider, workspace.id || 'ws_1');
      await refreshSession();
      setConnectMsg(`${INTEGRATIONS_META[provider]?.label || provider} connected!`);
    } catch (err) {
      setConnectMsg(err.message || 'Connection failed');
    } finally {
      setConnecting(null);
      setTimeout(() => setConnectMsg(''), 3000);
    }
  };

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
        <Settings size={24} />
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Settings</h1>
      </div>

      <Section title="Workspace">
        <SettingsRow label="Workspace Name" description="Shown in your sidebar and exports">
          <input className="settings-input" defaultValue={workspace.name || 'My Workspace'} style={inputStyle} />
        </SettingsRow>
        <SettingsRow label="Workspace ID" description="Your unique workspace identifier">
          <code style={{ fontSize: '0.8rem', opacity: 0.6 }}>{workspace.id || 'ws_1'}</code>
        </SettingsRow>
        <SettingsRow label="Plan" description="Current billing plan">
          <span className="badge" style={{ background: 'rgba(139,92,246,0.2)', color: '#a78bfa', padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.8rem' }}>
            {workspace.plan || 'Free'}
          </span>
        </SettingsRow>
      </Section>

      <Section title="Integrations">
        {connectMsg && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', fontSize: '0.85rem', color: connectMsg.includes('!') ? 'var(--success)' : '#f87171' }}>
            {connectMsg.includes('!') ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            {connectMsg}
          </div>
        )}
        {Object.entries(INTEGRATIONS_META).map(([key, meta]) => {
          const cfg = integrations[key] || {};
          return (
            <SettingsRow key={key} label={meta.label} description={meta.desc}>
              {cfg.connected ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success)', fontSize: '0.85rem' }}>
                  <CheckCircle2 size={14} /> Connected
                </div>
              ) : (
                <button
                  onClick={() => handleConnect(key)}
                  disabled={connecting === key}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', padding: '0.4rem 0.9rem', cursor: 'pointer', color: 'inherit', fontSize: '0.85rem', opacity: connecting === key ? 0.6 : 1 }}
                >
                  <Link2 size={13} /> {connecting === key ? 'Connecting...' : 'Connect'}
                </button>
              )}
            </SettingsRow>
          );
        })}
      </Section>

      <Section title="AI & API">
        <SettingsRow label="Claude Model" description="Model used for all AI generation">
          <select style={selectStyle}>
            <option value="claude-sonnet-4-6">claude-sonnet-4-6 (default)</option>
            <option value="claude-opus-4-6">claude-opus-4-6 (most capable)</option>
            <option value="claude-haiku-4-5">claude-haiku-4-5 (fastest)</option>
          </select>
        </SettingsRow>
        <SettingsRow label="Anthropic API Key" description="Override the workspace default key">
          <input
            type="password"
            placeholder="sk-ant-..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            style={inputStyle}
          />
        </SettingsRow>
        <SettingsRow label="Live API Mode" description="Toggle between mock and live Supabase backend">
          <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>
            {import.meta.env.VITE_USE_LIVE_API === 'true' ? '✓ Live' : '⚠ Mock — set VITE_USE_LIVE_API=true to enable'}
          </span>
        </SettingsRow>
      </Section>

      <Section title="Notifications">
        <SettingsRow label="Daily Digest Email" description="Receive your AI digest by email at 8am">
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input type="checkbox" defaultChecked style={{ accentColor: '#8b5cf6' }} />
            <span style={{ fontSize: '0.85rem' }}>Enabled</span>
          </label>
        </SettingsRow>
        <SettingsRow label="Stakeholder Update Alerts" description="Notify when updates are ready to send">
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input type="checkbox" style={{ accentColor: '#8b5cf6' }} />
            <span style={{ fontSize: '0.85rem' }}>Enabled</span>
          </label>
        </SettingsRow>
      </Section>

      <Section title="Privacy & Data">
        <SettingsRow label="Data Retention" description="How long session context is stored">
          <select style={selectStyle}>
            <option>90 days</option>
            <option>30 days</option>
            <option>Session only</option>
          </select>
        </SettingsRow>
        <SettingsRow label="Prompt Logging" description="Store prompt runs for governance reporting">
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input type="checkbox" defaultChecked style={{ accentColor: '#8b5cf6' }} />
            <span style={{ fontSize: '0.85rem' }}>Enabled</span>
          </label>
        </SettingsRow>
      </Section>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <button
          onClick={handleSave}
          style={{ background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.6rem 1.5rem', fontWeight: 600, cursor: 'pointer' }}
        >
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;
