import React, { useState, useEffect } from 'react';
import { Lightbulb, Upload, RefreshCw, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';

const CONFIDENCE_COLORS = {
  high: { bg: 'rgba(34,197,94,0.15)', text: '#4ade80' },
  medium: { bg: 'rgba(234,179,8,0.15)', text: '#fbbf24' },
  low: { bg: 'rgba(239,68,68,0.12)', text: '#f87171' },
};

const OpportunityCard = ({ opp, index }) => {
  const [expanded, setExpanded] = useState(index === 0);
  const colors = CONFIDENCE_COLORS[opp.confidence] || CONFIDENCE_COLORS.medium;

  return (
    <div className="glass-panel" style={{ marginBottom: '1rem', borderRadius: '12px', overflow: 'hidden' }}>
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '1rem 1.25rem', background: 'none', border: 'none', cursor: 'pointer',
          color: 'inherit', textAlign: 'left',
        }}
      >
        <span style={{ background: colors.bg, color: colors.text, padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600, flexShrink: 0 }}>
          {opp.confidence}
        </span>
        <span style={{ fontWeight: 600, flex: 1 }}>{opp.title}</span>
        <span style={{ opacity: 0.4, flexShrink: 0 }}>
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
      </button>

      {expanded && (
        <div style={{ padding: '0 1.25rem 1.25rem' }}>
          <p style={{ marginBottom: '0.75rem', lineHeight: 1.6, opacity: 0.85 }}>{opp.summary}</p>

          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '0.75rem', fontSize: '0.8rem', opacity: 0.6 }}>
            <span>{opp.evidence_count} evidence signals</span>
            <span>{(opp.source_types || []).join(', ')}</span>
          </div>

          {opp.suggested_next_step && (
            <div style={{ background: 'rgba(139,92,246,0.12)', borderRadius: '8px', padding: '0.6rem 0.9rem', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
              <strong style={{ opacity: 0.7 }}>Next step: </strong>{opp.suggested_next_step}
            </div>
          )}

          {opp.citations?.length > 0 && (
            <div style={{ fontSize: '0.78rem', opacity: 0.5 }}>
              {opp.citations.map((c, i) => (
                <div key={i} style={{ marginTop: '0.3rem' }}>
                  [{i + 1}] {c.source_type} — "{c.excerpt}"
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const IngestModal = ({ onClose, onDone }) => {
  const { api, session } = useApp();
  const [form, setForm] = useState({ source_type: 'user_interview', title: '', content: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await api.ingestEvidence({ ...form, workspace_id: session?.workspace?.id || 'ws_1' });
      onDone();
    } catch (err) {
      setError(err.message || 'Ingest failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div className="glass-panel" style={{ width: '560px', maxWidth: '95vw', borderRadius: '16px', padding: '1.75rem' }}>
        <h2 style={{ marginBottom: '1.25rem', fontSize: '1.1rem', fontWeight: 700 }}>Ingest Evidence</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', opacity: 0.6, marginBottom: '0.4rem' }}>Source Type</label>
            <select
              value={form.source_type}
              onChange={(e) => setForm((f) => ({ ...f, source_type: e.target.value }))}
              style={{ width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '0.5rem 0.75rem', color: 'inherit' }}
            >
              {['user_interview', 'survey', 'support_ticket', 'analytics', 'competitor', 'document'].map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', opacity: 0.6, marginBottom: '0.4rem' }}>Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. User interview — Sarah, PM at Acme"
              style={{ width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '0.5rem 0.75rem', color: 'inherit', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', opacity: 0.6, marginBottom: '0.4rem' }}>Content</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              placeholder="Paste user interview transcript, survey response, support ticket, analytics insight..."
              rows={6}
              style={{ width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '0.5rem 0.75rem', color: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>
          {error && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: '#f87171', fontSize: '0.85rem', marginBottom: '1rem' }}>
              <AlertCircle size={14} /> {error}
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '8px', padding: '0.55rem 1.2rem', cursor: 'pointer', color: 'inherit' }}>
              Cancel
            </button>
            <button type="submit" disabled={loading || !form.title.trim() || !form.content.trim()}
              style={{ background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.55rem 1.2rem', fontWeight: 600, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Ingesting...' : 'Ingest Evidence'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const EvidenceOpportunities = () => {
  const { api, session } = useApp();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [showIngest, setShowIngest] = useState(false);

  const load = async (q = '') => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.synthesizeOpportunities({
        workspace_id: session?.workspace?.id || 'ws_1',
        query: q || undefined,
        top_k: 20,
      });
      setData(result);
    } catch (err) {
      setError(err.message || 'Failed to synthesize opportunities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e) => {
    e.preventDefault();
    load(query);
  };

  return (
    <div className="page-content animate-fade-in" style={{ maxWidth: '800px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
            <Lightbulb size={22} />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Opportunities</h1>
          </div>
          <p style={{ opacity: 0.55, fontSize: '0.9rem' }}>AI-synthesized product opportunities from your evidence base.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => setShowIngest(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '0.5rem 1rem', cursor: 'pointer', color: 'inherit', fontSize: '0.875rem' }}
          >
            <Upload size={14} /> Ingest Evidence
          </button>
          <button
            onClick={() => load(query)}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#8b5cf6', border: 'none', borderRadius: '8px', padding: '0.5rem 1rem', cursor: 'pointer', color: '#fff', fontSize: '0.875rem', opacity: loading ? 0.6 : 1 }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> Synthesize
          </button>
        </div>
      </div>

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Focus synthesis on a specific theme (e.g. 'onboarding friction')..."
          style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '0.55rem 0.9rem', color: 'inherit' }}
        />
        <button type="submit" style={{ background: 'rgba(139,92,246,0.3)', border: '1px solid rgba(139,92,246,0.4)', borderRadius: '8px', padding: '0.55rem 1rem', color: '#c4b5fd', cursor: 'pointer', fontSize: '0.875rem' }}>
          Search
        </button>
      </form>

      {error && (
        <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1rem', color: '#f87171', display: 'flex', gap: '0.5rem', alignItems: 'center', borderRadius: '10px' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>Synthesizing opportunities from evidence...</div>
      )}

      {!loading && data && (
        <>
          {data.synthesis_summary && (
            <div className="glass-panel" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem', borderRadius: '12px', borderLeft: '3px solid rgba(139,92,246,0.5)' }}>
              <p style={{ margin: 0, lineHeight: 1.6, fontSize: '0.9rem' }}>{data.synthesis_summary}</p>
            </div>
          )}

          <div style={{ marginBottom: '0.5rem', fontSize: '0.8rem', opacity: 0.5 }}>
            {data.opportunities?.length || 0} opportunities · {data.total_evidence_chunks} evidence chunks · {data._meta?.retrieval_strategy}
          </div>

          {(data.opportunities || []).map((opp, i) => (
            <OpportunityCard key={i} opp={opp} index={i} />
          ))}

          {data.evidence_gaps?.length > 0 && (
            <div className="glass-panel" style={{ padding: '1rem 1.25rem', borderRadius: '12px', marginTop: '1rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, opacity: 0.5, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Evidence Gaps</div>
              {data.evidence_gaps.map((gap, i) => (
                <div key={i} style={{ fontSize: '0.85rem', opacity: 0.65, marginTop: '0.3rem' }}>• {gap}</div>
              ))}
            </div>
          )}
        </>
      )}

      {showIngest && (
        <IngestModal
          onClose={() => setShowIngest(false)}
          onDone={() => { setShowIngest(false); load(query); }}
        />
      )}
    </div>
  );
};

export default EvidenceOpportunities;
