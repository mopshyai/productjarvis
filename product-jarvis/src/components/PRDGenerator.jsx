import React, { useEffect, useMemo, useState } from 'react';
import { FileText, Ticket, Edit3, Check, Users, ShieldAlert, GitPullRequest } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import SourceCitation from './shared/SourceCitation';
import './PRDGenerator.css';

const defaultTracker = 'jira';

const PRDGenerator = () => {
  const { session, api } = useApp();
  const location = useLocation();
  const seedFeatureRequest = location.state?.seedFeatureRequest || '';

  const [featureRequest, setFeatureRequest] = useState(seedFeatureRequest);
  const [currentPrd, setCurrentPrd] = useState(null);
  const [editablePrdText, setEditablePrdText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('prd');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [ticketPreview, setTicketPreview] = useState(null);
  const [tracker, setTracker] = useState(defaultTracker);
  const [healthReport, setHealthReport] = useState(null);
  const [stakeholderAudience, setStakeholderAudience] = useState('executive');
  const [stakeholderUpdate, setStakeholderUpdate] = useState(null);

  useEffect(() => {
    if (seedFeatureRequest && !featureRequest) {
      setFeatureRequest(seedFeatureRequest);
    }
  }, [seedFeatureRequest, featureRequest]);

  const parsedEditable = useMemo(() => {
    try {
      return JSON.parse(editablePrdText);
    } catch {
      return null;
    }
  }, [editablePrdText]);

  const handleGeneratePRD = async () => {
    if (!featureRequest.trim()) return;
    setLoading(true);
    setError('');

    try {
      const prd = await api.generatePRD({
        workspace_id: session.workspace.id,
        feature_request: featureRequest,
        product_context: session.product_context,
      });
      setCurrentPrd(prd);
      setEditablePrdText(JSON.stringify(prd.body, null, 2));
      setActiveTab('prd');
    } catch (err) {
      setError(err.message || 'Failed to generate PRD');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentPrd || !parsedEditable) {
      setError('Fix JSON formatting before saving');
      return;
    }

    const approved = window.confirm('Approve and save PRD changes?');
    if (!approved) return;

    setLoading(true);
    setError('');
    try {
      const updated = await api.updatePRD({
        workspace_id: session.workspace.id,
        prd_id: currentPrd.id,
        body: parsedEditable,
        version: currentPrd.version,
        approval_token: 'confirm_save_prd',
      });
      setCurrentPrd(updated);
      setEditablePrdText(JSON.stringify(updated.body, null, 2));
      setIsEditing(false);
    } catch (err) {
      setError(err.message || 'Failed to save PRD');
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewTickets = async () => {
    if (!currentPrd) return;
    setLoading(true);
    setError('');

    try {
      const preview = await api.previewTickets({
        workspace_id: session.workspace.id,
        prd_id: currentPrd.id,
        prd_content: currentPrd.body,
        tracker,
        constraints: { count: 10 },
      });
      setTicketPreview(preview);
      setActiveTab('tickets');
    } catch (err) {
      setError(err.message || 'Failed to preview tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleHealthScore = async () => {
    if (!currentPrd) return;
    setLoading(true);
    setError('');
    try {
      const result = await api.scorePRDHealth({
        workspace_id: session.workspace.id,
        prd_content: currentPrd.body,
        context: session.product_context,
      });
      setHealthReport(result);
    } catch (err) {
      setError(err.message || 'Failed to score PRD health');
    } finally {
      setLoading(false);
    }
  };

  const handleStakeholderUpdate = async () => {
    if (!currentPrd) return;
    setLoading(true);
    setError('');
    try {
      const result = await api.generateStakeholderUpdate({
        workspace_id: session.workspace.id,
        feature_name: currentPrd.feature_request,
        status: currentPrd.status || 'draft',
        total_tickets: (ticketPreview?.tickets || []).length,
        closed_tickets: 0,
        open_tickets: (ticketPreview?.tickets || []).length,
        blocked_tickets: 0,
        eta: 'TBD',
        metrics: session.product_context?.metrics || [],
        decisions: session.product_context?.decisions || [],
        risks: healthReport?.blocking_issues || [],
        audience: stakeholderAudience,
        context: session.product_context,
      });
      setStakeholderUpdate(result);
    } catch (err) {
      setError(err.message || 'Failed to generate stakeholder update');
    } finally {
      setLoading(false);
    }
  };

  const handlePushTickets = async () => {
    if (!currentPrd) return;
    const confirmed = window.confirm(`Push generated tickets to ${tracker.toUpperCase()} now?`);
    if (!confirmed) return;

    setLoading(true);
    setError('');
    try {
      const result = await api.pushTickets({
        prd_id: currentPrd.id,
        tracker,
        project_id: 'CORE',
        mapping_profile_id: 'default-map',
        approval_token: 'confirm_push_tickets',
      });
      setTicketPreview((prev) => ({ ...prev, pushResult: result }));
    } catch (err) {
      setError(err.message || 'Failed to push tickets');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="prd-container page-content animate-fade-in">
      <div className="prd-header glass-panel">
        <div className="prd-title-row">
          <div className="flex items-center gap-16">
            <div className="doc-icon">
              <FileText size={28} />
            </div>
            <div>
              <h1>{currentPrd?.feature_request || 'Generate a PRD from a single feature request'}</h1>
              <div className="prd-meta">
                <span className={`badge ${currentPrd?.status === 'approved' ? 'status-published' : 'status-draft'}`}>
                  {currentPrd?.status || 'Draft'}
                </span>
                <span>{currentPrd ? `Version ${currentPrd.version}` : 'No PRD yet'}</span>
                <span>•</span>
                <span>{session?.usage?.prd_generated_this_month || 0}/3 monthly PRDs used</span>
              </div>
            </div>
          </div>
          <div className="prd-actions">
            <button className="btn-outline" onClick={() => setIsEditing((v) => !v)} disabled={!currentPrd}>
              {isEditing ? (
                <>
                  <Check size={16} /> Editing JSON
                </>
              ) : (
                <>
                  <Edit3 size={16} /> Edit Mode
                </>
              )}
            </button>
            <button className="btn-outline" onClick={handlePreviewTickets} disabled={!currentPrd || loading}>
              <Ticket size={16} /> Preview Tickets
            </button>
            <button className="btn-primary" onClick={handlePushTickets} disabled={!ticketPreview || loading}>
              <Ticket size={16} /> Push Tickets
            </button>
            <button className="btn-outline" onClick={handleHealthScore} disabled={!currentPrd || loading}>
              PRD Health
            </button>
          </div>
        </div>

        <div className="prd-input-row">
          <input
            type="text"
            value={featureRequest}
            onChange={(e) => setFeatureRequest(e.target.value)}
            placeholder="Describe a feature request in one line"
          />
          <button className="btn-primary" onClick={handleGeneratePRD} disabled={loading || !featureRequest.trim()}>
            Generate PRD
          </button>
          <select value={tracker} onChange={(e) => setTracker(e.target.value)}>
            <option value="jira">Jira</option>
            <option value="linear">Linear</option>
          </select>
        </div>

        <div className="prd-tabs">
          <button className={`tab ${activeTab === 'prd' ? 'active' : ''}`} onClick={() => setActiveTab('prd')}>
            PRD Document
          </button>
          <button className={`tab ${activeTab === 'tickets' ? 'active' : ''}`} onClick={() => setActiveTab('tickets')}>
            Proposed Tickets
          </button>
          <button className={`tab ${activeTab === 'context' ? 'active' : ''}`} onClick={() => setActiveTab('context')}>
            Context Graph
          </button>
        </div>
      </div>

      {error ? <p className="command-error">{error}</p> : null}

      <div className="prd-body glass-panel">
        {activeTab === 'prd' && (
          <div className={`doc-content ${isEditing ? 'editing' : ''}`}>
            {!currentPrd ? (
              <div className="state-empty">
                <FileText size={48} className="empty-icon text-tertiary" />
                <p>Generate your first PRD from a one-line request.</p>
              </div>
            ) : (
              <>
                <section className="doc-section">
                  <h2 className="flex items-center gap-8">
                    <Check className="section-icon text-accent" /> Problem Statement
                  </h2>
                  <div className="content-block">
                    <strong>What:</strong> {currentPrd.body.problem_statement.what}
                    <br />
                    <br />
                    <strong>Who:</strong> {currentPrd.body.problem_statement.who}
                    <br />
                    <br />
                    <strong>Impact:</strong> {currentPrd.body.problem_statement.impact_if_unsolved}
                  </div>
                </section>

                <section className="doc-section">
                  <h2 className="flex items-center gap-8">
                    <Users className="section-icon text-blue" /> User Stories
                  </h2>
                  <div className="content-block">
                    <ul className="styled-list">
                      {currentPrd.body.user_stories.map((story, idx) => (
                        <li key={idx}>
                          <strong>As a {story.as_a}</strong>, I want {story.i_want} so that {story.so_that}
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>

                <section className="doc-section">
                  <h2 className="flex items-center gap-8">
                    <ShieldAlert className="section-icon text-warning" /> Acceptance Criteria
                  </h2>
                  <div className="content-block">
                    <ul className="styled-list">
                      {currentPrd.body.acceptance_criteria.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </section>

                <section className="doc-section border-none">
                  <h2 className="flex items-center gap-8">
                    <GitPullRequest className="section-icon text-purple" /> Dependencies
                  </h2>
                  <div className="content-block tag-list">
                    {currentPrd.body.dependencies.map((dep, idx) => (
                      <span key={idx} className="tag">
                        {dep}
                      </span>
                    ))}
                  </div>
                </section>

                <SourceCitation citations={currentPrd.citations} />

                {isEditing ? (
                  <div className="json-editor-wrap">
                    <h3>Edit PRD JSON</h3>
                    <textarea value={editablePrdText} onChange={(e) => setEditablePrdText(e.target.value)} />
                    <button className="btn-primary" onClick={handleSave} disabled={loading || !parsedEditable}>
                      Save with Approval
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </div>
        )}

        {activeTab === 'tickets' && (
          <div className="doc-content">
            {!ticketPreview ? (
              <div className="state-empty">
                <Ticket size={48} className="empty-icon text-tertiary" />
                <p>Preview tickets from an approved PRD.</p>
              </div>
            ) : (
              <>
                {ticketPreview.warning ? <p className="command-error">{ticketPreview.warning}</p> : null}
                <p>{ticketPreview.estimate_summary}</p>
                <ul className="styled-list">
                  {(ticketPreview.tickets || []).map((ticket) => (
                    <li key={ticket.id}>
                      <strong>{ticket.title}</strong> ({ticket.story_points} pts)
                    </li>
                  ))}
                </ul>
                {ticketPreview.pushResult ? (
                  <p>
                    Pushed {ticketPreview.pushResult.created_count} tickets: {ticketPreview.pushResult.external_ids.join(', ')}
                  </p>
                ) : null}
                <SourceCitation citations={ticketPreview.citations || []} />
              </>
            )}
          </div>
        )}

        {activeTab === 'context' && (
          <div className="doc-content">
            <p>
              Product Context: {session?.product_context?.product_name} · {session?.product_context?.sprint_status}
            </p>
            <ul className="styled-list">
              {(session?.product_context?.okrs || []).map((okr, idx) => (
                <li key={idx}>{okr}</li>
              ))}
            </ul>
            {healthReport ? (
              <div className="context-card">
                <h3>PRD Health Score</h3>
                <p>
                  Score: <strong>{healthReport.health_score}</strong> · Ready:{' '}
                  <strong>{String(healthReport.ready_for_engineering)}</strong>
                </p>
                {(healthReport.blocking_issues || []).length ? (
                  <ul className="styled-list">
                    {healthReport.blocking_issues.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
            <div className="context-card">
              <h3>Stakeholder Update</h3>
              <div className="stakeholder-row">
                <select value={stakeholderAudience} onChange={(e) => setStakeholderAudience(e.target.value)}>
                  <option value="executive">Executive</option>
                  <option value="engineering">Engineering</option>
                  <option value="design">Design</option>
                  <option value="sales">Sales</option>
                  <option value="investor">Investor</option>
                </select>
                <button className="btn-outline" onClick={handleStakeholderUpdate} disabled={!currentPrd || loading}>
                  Generate Update
                </button>
              </div>
              {stakeholderUpdate ? (
                <div className="update-box">
                  <strong>{stakeholderUpdate.subject_line}</strong>
                  <p>{stakeholderUpdate.body}</p>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PRDGenerator;
