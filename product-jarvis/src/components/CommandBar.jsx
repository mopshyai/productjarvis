import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, CornerDownLeft } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { navigateToSurface, SURFACES } from '../lib/domainRoutes';
import SourceCitation from './shared/SourceCitation';
import './CommandBar.css';

const CommandBar = () => {
  const { session, api } = useApp();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [input, setInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [openSource, setOpenSource] = useState(null); // 'jira' | 'linear' when opened via deep link

  // Deep link: pre-fill from ?source=jira|linear&title=...&body=...
  useEffect(() => {
    const title = searchParams.get('title');
    const body = searchParams.get('body');
    const source = searchParams.get('source');
    if (title || body) {
      const parts = [title, body].filter(Boolean);
      setInput(parts.join('\n\n'));
      if (source === 'jira' || source === 'linear') {
        setOpenSource(source);
      }
      // Clear query params from URL after pre-fill
      setSearchParams({}, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- run once on mount

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    setIsGenerating(true);
    setError('');

    try {
      const response = await api.executeCommand({
        workspace_id: session.workspace.id,
        user_input: input,
        mode: 'interactive',
      });

      setResult(response);

      if (response.action_type === 'generate_prd') {
        navigateToSurface(navigate, SURFACES.APP, '/prds', { state: { seedFeatureRequest: input } });
      }
      if (response.action_type === 'search_decisions') {
        navigateToSurface(navigate, SURFACES.APP, '/decisions', { state: { seedQuery: input } });
      }
      if (response.action_type === 'view_digest') {
        navigateToSurface(navigate, SURFACES.APP, '/digest');
      }

      setInput('');
    } catch (err) {
      setError(err.message || 'Unable to execute command');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="command-bar-container page-content animate-fade-in">
      <div className="command-header">
        <h1>What do you want to build today?</h1>
        <p>Type a one-line feature idea to generate a full PRD and Jira or Linear tickets in seconds.</p>
        {openSource ? (
          <p className="command-opened-from" style={{ marginTop: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
            Opened from {openSource === 'jira' ? 'Jira' : 'Linear'} — edit and run when ready.
          </p>
        ) : null}
      </div>

      <form className={`command-input-wrapper glass-panel ${isFocused ? 'focused' : ''}`} onSubmit={handleSubmit}>
        <Sparkles className={`command-icon ${isGenerating ? 'spinning' : ''}`} size={24} />
        <input
          type="text"
          placeholder="e.g., Decision Memory search interface for historical product choices"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={isGenerating}
          autoFocus
        />
        <button type="submit" className="submit-button" disabled={!input.trim() || isGenerating}>
          {isGenerating ? 'Running...' : <CornerDownLeft size={20} />}
        </button>
      </form>

      {error ? <p className="command-error">{error}</p> : null}

      {result ? (
        <div className="glass-panel" style={{ padding: '16px', marginTop: '16px' }}>
          <h3 style={{ marginBottom: '8px' }}>Detected Action: {result.action_type}</h3>
          <p>{result.preview_payload?.summary || 'Command processed.'}</p>
          {result.preview_payload?.clarify_options ? (
            <ul style={{ marginTop: '8px', paddingLeft: '16px', color: 'var(--text-secondary)' }}>
              {result.preview_payload.clarify_options.map((option) => (
                <li key={option}>{option}</li>
              ))}
            </ul>
          ) : null}
          <SourceCitation citations={result.citations} />
        </div>
      ) : null}

      <div className="suggestions-container">
        <h3>Start with a template</h3>
        <div className="suggestion-cards">
          <div className="suggestion-card glass-panel" onClick={() => setInput('Generate today risk digest with actionable items')}>
            <h4>Daily Digest</h4>
            <p>Aggregates risk and delivers an 8:30 AM summary</p>
            <ArrowRight size={16} className="arrow" />
          </div>
          <div className="suggestion-card glass-panel" onClick={() => setInput('Create PRD and sprint-ready Jira and Linear tickets for two-way Notion sync')}>
            <h4>Notion PRD Sync</h4>
            <p>Two-way sync between PRDs and execution tickets</p>
            <ArrowRight size={16} className="arrow" />
          </div>
          <div className="suggestion-card glass-panel" onClick={() => setInput('Why did we defer mobile app?') }>
            <h4>Decision Search</h4>
            <p>Look up why key product decisions were made</p>
            <ArrowRight size={16} className="arrow" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommandBar;
