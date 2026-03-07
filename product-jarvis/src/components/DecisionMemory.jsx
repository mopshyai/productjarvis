import React, { useCallback, useEffect, useState } from 'react';
import { Search, BrainCircuit, Calendar, Plus, Filter } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import SourceCitation from './shared/SourceCitation';
import './DecisionMemory.css';

const DecisionMemory = () => {
  const { session, api } = useApp();
  const location = useLocation();
  const [search, setSearch] = useState(location.state?.seedQuery || '');
  const [results, setResults] = useState([]);
  const [citations, setCitations] = useState([]);
  const [message, setMessage] = useState('Search your decision history');
  const [transcript, setTranscript] = useState('');
  const [detection, setDetection] = useState(null);

  const runSearch = useCallback(async (query) => {
    if (!query.trim()) return;

    const response = await api.searchDecisions({ workspace_id: session.workspace.id, query });
    setResults(response.results || []);
    setCitations(response.citations || []);
    setMessage(response.message || `Found ${response.results.length} matching decisions.`);
  }, [api, session.workspace.id]);

  useEffect(() => {
    if (search.trim()) {
      Promise.resolve().then(() => runSearch(search));
    }
  }, [runSearch, search]);

  return (
    <div className="decision-container page-content animate-fade-in">
      <div className="decision-header">
        <div className="title-area">
          <BrainCircuit size={32} className="text-accent" />
          <div>
            <h1>Decision Memory</h1>
            <p>Search why past product decisions were made with source-backed citations.</p>
          </div>
        </div>
        <button className="add-decision-btn glass-panel">
          <Plus size={16} /> Log Decision
        </button>
      </div>

      <div className="search-bar-wrapper glass-panel">
        <Search className="search-icon" size={20} />
        <input
          type="text"
          placeholder="Ask a question about a past decision..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') runSearch(search);
          }}
        />
        <button className="filter-btn" onClick={() => runSearch(search)}>
          <Filter size={16} />
        </button>
      </div>

      <p style={{ margin: '12px 2px', color: 'var(--text-secondary)' }}>{message}</p>

      <div className="decisions-list">
        {results.map((decision) => (
          <div key={decision.id} className="decision-card glass-panel">
            <div className="card-top">
              <div className="match-confidence">
                <div className="confidence-dot"></div>
                Source-backed
              </div>
              <div className="meta-info">
                <span className="source-badge">Decision</span>
                <span className="date">
                  <Calendar size={12} /> {decision.date}
                </span>
              </div>
            </div>

            <h3>{decision.statement}</h3>

            <div className="context-box">
              <p>{decision.rationale}</p>
            </div>

            <div className="card-footer">
              <div className="author">Logged by {decision.author}</div>
            </div>

            <SourceCitation citations={decision.sources || []} />
          </div>
        ))}
      </div>

      {!results.length ? <SourceCitation citations={citations} /> : null}

      <div className="decision-card glass-panel" style={{ marginTop: '24px' }}>
        <h3>Detect Decisions from Conversation</h3>
        <p style={{ marginBottom: '8px', color: 'var(--text-secondary)' }}>
          Paste meeting notes, transcript, or Slack thread to detect confirmed decisions.
        </p>
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Paste transcript or thread..."
          style={{
            width: '100%',
            minHeight: '120px',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            padding: '10px',
          }}
        />
        <button
          className="add-decision-btn glass-panel"
          style={{ marginTop: '10px' }}
          onClick={async () => {
            const response = await api.detectDecisions({
              workspace_id: session.workspace.id,
              source_type: 'meeting_notes',
              participants: [session.user.name],
              datetime: new Date().toISOString(),
              thread_or_transcript: transcript,
              context: session.product_context,
            });
            setDetection(response);
          }}
        >
          <Plus size={16} /> Detect Decisions
        </button>
        {detection ? (
          <div style={{ marginTop: '12px' }}>
            <p style={{ color: 'var(--text-secondary)' }}>
              Found {detection.analysis_metadata?.total_decisions_found || 0} decision(s)
            </p>
            <ul className="styled-list">
              {(detection.decisions || []).map((decision) => (
                <li key={decision.title}>
                  <strong>{decision.title}</strong>: {decision.what_was_decided}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default DecisionMemory;
