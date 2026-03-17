import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Code, Terminal, Key, Zap, FileJson, Shield } from 'lucide-react';
import DomainLink from '../components/DomainLink';
import { navigateToSurface, SURFACES } from '../lib/domainRoutes';
import './APIDocsPage.css';

const APIDocsPage = () => {
  const navigate = useNavigate();
  const { section } = useParams();
  const activeSection = section || 'overview';

  const sections = [
    { id: 'overview', title: 'Overview', icon: Zap },
    { id: 'authentication', title: 'Authentication', icon: Key },
    { id: 'endpoints', title: 'Endpoints', icon: Terminal },
    { id: 'prd', title: 'PRD Generation', icon: FileJson },
    { id: 'decisions', title: 'Decision Memory', icon: Code },
    { id: 'errors', title: 'Error Handling', icon: Shield },
    { id: 'rate-limits', title: 'Rate Limits', icon: Shield },
  ];

  const handleSectionChange = (sectionId) => {
    navigateToSurface(navigate, SURFACES.DOCS, sectionId === 'overview' ? '/api-docs' : `/api-docs/${sectionId}`);
  };

  return (
    <div className="api-docs">
      <header className="api-docs__header">
        <nav className="api-docs__nav">
          <DomainLink surface={SURFACES.WWW} path="/" className="api-docs__logo">
            <span className="api-docs__logo-icon">J</span>
            <span>ProductJarvis</span>
          </DomainLink>
          <div className="api-docs__nav-links">
            <DomainLink surface={SURFACES.DOCS} path="/">Docs</DomainLink>
            <DomainLink surface={SURFACES.DOCS} path="/api-docs" className="active">API</DomainLink>
            <DomainLink surface={SURFACES.DOCS} path="/changelog">Changelog</DomainLink>
            <DomainLink surface={SURFACES.WWW} path="/status">Status</DomainLink>
          </div>
        </nav>
      </header>

      <div className="api-docs__layout">
        <aside className="api-docs__sidebar">
          <div className="api-docs__sidebar-section">
            <h3>API Reference</h3>
            <nav className="api-docs__sidebar-nav">
              {sections.map((section) => (
                <button
                  key={section.id}
                  className={`api-docs__sidebar-item ${activeSection === section.id ? 'active' : ''}`}
                  onClick={() => handleSectionChange(section.id)}
                >
                  <section.icon size={16} />
                  <span>{section.title}</span>
                </button>
              ))}
            </nav>
          </div>
        </aside>

        <main className="api-docs__content">

          {activeSection === 'overview' && (
            <section className="api-docs__section">
              <h1>ProductJarvis API</h1>
              <p className="api-docs__intro">
                The ProductJarvis API allows you to programmatically generate PRDs,
                search decisions, and integrate with your existing workflows.
              </p>

              <div className="api-docs__info-box">
                <h4>Base URL</h4>
                <code>https://api.productjarvis.com/api</code>
              </div>

              <div className="api-docs__info-box">
                <h4>Current Version</h4>
                <code>v1 (2026-03-07)</code>
              </div>

              <h2>Quick Start</h2>
              <div className="api-docs__code-block">
                <div className="api-docs__code-header">
                  <span>cURL</span>
                </div>
                <pre>{`curl -X POST https://api.productjarvis.com/api/prd/generate \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "feature_request": "Add user authentication with OAuth",
    "workspace_id": "ws_abc123"
  }'`}</pre>
              </div>

              <h2>SDKs & Libraries</h2>
              <div className="api-docs__sdk-grid">
                <div className="api-docs__sdk-card">
                  <h4>JavaScript/TypeScript</h4>
                  <code>npm install @productjarvis/sdk</code>
                  <span className="badge">Coming Soon</span>
                </div>
                <div className="api-docs__sdk-card">
                  <h4>Python</h4>
                  <code>pip install productjarvis</code>
                  <span className="badge">Coming Soon</span>
                </div>
              </div>
            </section>
          )}

          {activeSection === 'authentication' && (
            <section className="api-docs__section">
              <h1>Authentication</h1>
              <p>
                The ProductJarvis API uses API keys for authentication. Include your
                API key in the <code>Authorization</code> header of all requests.
              </p>

              <h2>Getting an API Key</h2>
              <ol>
                <li>Log in to your ProductJarvis workspace</li>
                <li>Go to <strong>Settings → API Keys</strong></li>
                <li>Click <strong>"Create API Key"</strong></li>
                <li>Copy and securely store your key</li>
              </ol>

              <div className="api-docs__warning">
                <strong>Security:</strong> Never share your API key or commit it to version control.
                Use environment variables to store keys securely.
              </div>

              <h2>Using Your API Key</h2>
              <div className="api-docs__code-block">
                <div className="api-docs__code-header">
                  <span>Header Format</span>
                </div>
                <pre>{`Authorization: Bearer YOUR_API_KEY`}</pre>
              </div>

              <h2>Example Request</h2>
              <div className="api-docs__code-block">
                <div className="api-docs__code-header">
                  <span>JavaScript</span>
                </div>
                <pre>{`const response = await fetch('https://api.productjarvis.com/api/session', {
  headers: {
    'Authorization': 'Bearer ' + process.env.PRODUCTJARVIS_API_KEY
  }
});`}</pre>
              </div>

              <h2>API Key Types</h2>
              <table className="api-docs__table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Prefix</th>
                    <th>Usage</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Live</td>
                    <td><code>pj_live_</code></td>
                    <td>Production requests</td>
                  </tr>
                  <tr>
                    <td>Test</td>
                    <td><code>pj_test_</code></td>
                    <td>Development &amp; testing</td>
                  </tr>
                </tbody>
              </table>
            </section>
          )}

          {activeSection === 'endpoints' && (
            <section className="api-docs__section">
              <h1>Endpoints</h1>
              <p>All endpoints are relative to <code>https://api.productjarvis.com/api</code></p>

              <h2>Core Resources</h2>
              <table className="api-docs__table">
                <thead>
                  <tr>
                    <th>Method</th>
                    <th>Endpoint</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><span className="method get">GET</span></td>
                    <td><code>/workspace</code></td>
                    <td>Get current workspace</td>
                  </tr>
                  <tr>
                    <td><span className="method post">POST</span></td>
                    <td><code>/prd/generate</code></td>
                    <td>Generate a new PRD</td>
                  </tr>
                  <tr>
                    <td><span className="method get">GET</span></td>
                    <td><code>/prd/:id</code></td>
                    <td>Get PRD by ID</td>
                  </tr>
                  <tr>
                    <td><span className="method put">PUT</span></td>
                    <td><code>/prd/:id</code></td>
                    <td>Update a PRD</td>
                  </tr>
                  <tr>
                    <td><span className="method post">POST</span></td>
                    <td><code>/decisions/search</code></td>
                    <td>Search decision memory</td>
                  </tr>
                  <tr>
                    <td><span className="method get">GET</span></td>
                    <td><code>/digest/today</code></td>
                    <td>Get today's digest</td>
                  </tr>
                  <tr>
                    <td><span className="method post">POST</span></td>
                    <td><code>/evidence/ingest</code></td>
                    <td>Ingest evidence</td>
                  </tr>
                  <tr>
                    <td><span className="method post">POST</span></td>
                    <td><code>/opportunities/synthesize</code></td>
                    <td>Synthesize opportunities</td>
                  </tr>
                  <tr>
                    <td><span className="method post">POST</span></td>
                    <td><code>/tickets/push</code></td>
                    <td>Push tickets to Jira/Linear</td>
                  </tr>
                </tbody>
              </table>
            </section>
          )}

          {activeSection === 'prd' && (
            <section className="api-docs__section">
              <h1>PRD Generation</h1>
              <p>Generate AI-powered Product Requirements Documents.</p>

              <h2>Generate PRD</h2>
              <div className="api-docs__endpoint">
                <span className="method post">POST</span>
                <code>/prd/generate</code>
              </div>

              <h3>Request Body</h3>
              <div className="api-docs__code-block">
                <pre>{`{
  "feature_request": "string",     // Required: Feature description
  "workspace_id": "string",        // Required: Your workspace ID
  "context": {                     // Optional: Additional context
    "okrs": ["string"],
    "user_research": "string",
    "constraints": "string"
  },
  "methodology": "string",         // Optional: "RICE", "WSJF", "MoSCoW", etc.
  "tracker": "jira" | "linear"     // Optional: Target tracker for tickets
}`}</pre>
              </div>

              <h3>Response</h3>
              <div className="api-docs__code-block">
                <pre>{`{
  "id": "prd_abc123",
  "status": "complete",
  "prd": {
    "title": "User Authentication with OAuth",
    "problem_statement": "...",
    "user_stories": [...],
    "acceptance_criteria": [...],
    "technical_requirements": [...],
    "dependencies": [...],
    "risks": [...],
    "success_metrics": [...]
  },
  "tickets": [...],
  "health_score": 87,
  "citations": [...],
  "created_at": "2026-03-07T12:00:00Z"
}`}</pre>
              </div>
            </section>
          )}

          {activeSection === 'decisions' && (
            <section className="api-docs__section">
              <h1>Decision Memory</h1>
              <p>Search and retrieve past decisions with citations.</p>

              <h2>Search Decisions</h2>
              <div className="api-docs__endpoint">
                <span className="method post">POST</span>
                <code>/decisions/search</code>
              </div>

              <h3>Request Body</h3>
              <div className="api-docs__code-block">
                <pre>{`{
  "query": "string",           // Required: Search query
  "workspace_id": "string",    // Required: Workspace ID
  "limit": 10,                 // Optional: Max results (default 10)
  "filters": {                 // Optional: Filters
    "date_from": "2026-01-01",
    "date_to": "2026-03-07",
    "tags": ["auth", "security"]
  }
}`}</pre>
              </div>

              <h3>Response</h3>
              <div className="api-docs__code-block">
                <pre>{`{
  "query": "authentication decision",
  "results": [
    {
      "id": "dec_abc123",
      "answer": "We decided to use OAuth 2.0 with Google...",
      "confidence": 0.92,
      "citations": [...],
      "decided_at": "2026-02-15T10:00:00Z"
    }
  ],
  "total": 1
}`}</pre>
              </div>
            </section>
          )}

          {activeSection === 'errors' && (
            <section className="api-docs__section">
              <h1>Error Handling</h1>
              <p>The API uses standard HTTP status codes and returns detailed error messages.</p>

              <h2>Error Response Format</h2>
              <div className="api-docs__code-block">
                <pre>{`{
  "error": {
    "code": "invalid_request",
    "message": "The feature_request field is required.",
    "param": "feature_request"
  }
}`}</pre>
              </div>

              <h2>HTTP Status Codes</h2>
              <table className="api-docs__table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Meaning</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td><code>200</code></td><td>Success</td></tr>
                  <tr><td><code>400</code></td><td>Bad Request — Invalid parameters</td></tr>
                  <tr><td><code>401</code></td><td>Unauthorized — Invalid or missing API key</td></tr>
                  <tr><td><code>403</code></td><td>Forbidden — Insufficient permissions</td></tr>
                  <tr><td><code>404</code></td><td>Not Found — Resource doesn't exist</td></tr>
                  <tr><td><code>429</code></td><td>Too Many Requests — Rate limit exceeded</td></tr>
                  <tr><td><code>500</code></td><td>Internal Server Error</td></tr>
                </tbody>
              </table>
            </section>
          )}

          {activeSection === 'rate-limits' && (
            <section className="api-docs__section">
              <h1>Rate Limits</h1>
              <p>API requests are rate limited to ensure fair usage and service stability.</p>

              <h2>Limits by Plan</h2>
              <table className="api-docs__table">
                <thead>
                  <tr>
                    <th>Plan</th>
                    <th>Requests/min</th>
                    <th>PRDs/month</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>Free</td><td>20</td><td>3</td></tr>
                  <tr><td>Pro</td><td>60</td><td>Unlimited</td></tr>
                  <tr><td>Team</td><td>120</td><td>Unlimited</td></tr>
                  <tr><td>Enterprise</td><td>Custom</td><td>Unlimited</td></tr>
                </tbody>
              </table>

              <h2>Rate Limit Headers</h2>
              <div className="api-docs__code-block">
                <pre>{`X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1709820000`}</pre>
              </div>
            </section>
          )}

        </main>
      </div>

      <footer className="api-docs__footer">
        <div className="api-docs__footer-links">
          <DomainLink surface={SURFACES.WWW} path="/privacy">Privacy</DomainLink>
          <DomainLink surface={SURFACES.WWW} path="/terms">Terms</DomainLink>
          <DomainLink surface={SURFACES.WWW} path="/security">Security</DomainLink>
          <DomainLink surface={SURFACES.WWW} path="/status">Status</DomainLink>
        </div>
        <p>&copy; {new Date().getFullYear()} ProductJarvis. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default APIDocsPage;
