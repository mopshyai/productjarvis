import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Book, Rocket, Zap, Settings, Plug,
  FileText, Search, BarChart,
  ChevronRight, ExternalLink
} from 'lucide-react';
import DomainLink from '../components/DomainLink';
import { SURFACES } from '../lib/domainRoutes';
import './DocsPage.css';

const DocsPage = () => {
  const { section } = useParams();
  const [searchQuery, setSearchQuery] = useState('');

  const navigation = [
    {
      title: 'Getting Started',
      icon: Rocket,
      items: [
        { slug: 'introduction', title: 'Introduction' },
        { slug: 'quickstart', title: 'Quick Start Guide' },
        { slug: 'concepts', title: 'Core Concepts' },
        { slug: 'onboarding', title: 'Onboarding Walkthrough' },
      ]
    },
    {
      title: 'Features',
      icon: Zap,
      items: [
        { slug: 'command-bar', title: 'Command Bar' },
        { slug: 'prd-generator', title: 'PRD Generator' },
        { slug: 'decision-memory', title: 'Decision Memory' },
        { slug: 'daily-digest', title: 'Daily Digest' },
        { slug: 'evidence-opportunities', title: 'Evidence & Opportunities' },
      ]
    },
    {
      title: 'Integrations',
      icon: Plug,
      items: [
        { slug: 'jira', title: 'Jira Integration' },
        { slug: 'linear', title: 'Linear Integration' },
        { slug: 'notion', title: 'Notion Integration' },
        { slug: 'webhooks', title: 'Webhooks' },
      ]
    },
    {
      title: 'Methodologies',
      icon: BarChart,
      items: [
        { slug: 'rice', title: 'RICE Framework' },
        { slug: 'wsjf', title: 'WSJF' },
        { slug: 'moscow', title: 'MoSCoW' },
        { slug: 'kano', title: 'Kano Model' },
        { slug: 'custom', title: 'Custom Methodologies' },
      ]
    },
    {
      title: 'Account & Settings',
      icon: Settings,
      items: [
        { slug: 'workspace', title: 'Workspace Settings' },
        { slug: 'team', title: 'Team Management' },
        { slug: 'billing', title: 'Billing & Plans' },
        { slug: 'api-keys', title: 'API Keys' },
      ]
    },
  ];

  const currentSection = section || 'introduction';

  return (
    <div className="docs-page">
      <header className="docs-header">
        <nav className="docs-nav">
          <DomainLink surface={SURFACES.WWW} path="/" className="docs-logo">
            <span className="docs-logo__icon">J</span>
            <span>ProductJarvis</span>
          </DomainLink>
          <div className="docs-search">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search documentation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <span className="docs-search__shortcut">⌘K</span>
          </div>
          <div className="docs-nav__links">
            <DomainLink surface={SURFACES.DOCS} path="/" className="active">Docs</DomainLink>
            <DomainLink surface={SURFACES.DOCS} path="/api-docs">API</DomainLink>
            <DomainLink surface={SURFACES.DOCS} path="/changelog">Changelog</DomainLink>
          </div>
        </nav>
      </header>

      <div className="docs-layout">
        <aside className="docs-sidebar">
          {navigation.map((group) => (
            <div key={group.title} className="docs-sidebar__group">
              <h3 className="docs-sidebar__title">
                <group.icon size={16} />
                {group.title}
              </h3>
              <ul className="docs-sidebar__list">
                {group.items.map((item) => (
                  <li key={item.slug}>
                    <DomainLink
                      surface={SURFACES.DOCS}
                      path={`/${item.slug}`}
                      className={`docs-sidebar__link ${currentSection === item.slug ? 'active' : ''}`}
                    >
                      {item.title}
                    </DomainLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </aside>

        <main className="docs-content">
          {currentSection === 'introduction' && (
            <article className="docs-article">
              <h1>Welcome to ProductJarvis</h1>
              <p className="docs-lead">
                ProductJarvis is an AI-powered Product Operating System designed for founder-PMs
                and lean product teams. Turn evidence into PRDs and sprint-ready tickets in minutes.
              </p>

              <h2>What is ProductJarvis?</h2>
              <p>
                ProductJarvis combines AI with proven product management methodologies to help you:
              </p>
              <ul>
                <li><strong>Generate PRDs in minutes</strong> — AI creates comprehensive PRDs from simple feature requests</li>
                <li><strong>Never lose a decision</strong> — Decision Memory indexes all your product decisions with citations</li>
                <li><strong>Stay ahead of risks</strong> — Daily Digest surfaces risks before they become problems</li>
                <li><strong>Close the loop</strong> — Push tickets directly to Jira or Linear</li>
              </ul>

              <div className="docs-callout">
                <h4>Quick Start</h4>
                <p>
                  New to ProductJarvis? Start with our <DomainLink surface={SURFACES.DOCS} path="/quickstart">Quick Start Guide</DomainLink> to
                  set up your workspace and generate your first PRD in under 5 minutes.
                </p>
              </div>

              <h2>Core Capabilities</h2>

              <div className="docs-card-grid">
                <DomainLink surface={SURFACES.DOCS} path="/command-bar" className="docs-card">
                  <h3>Command Bar</h3>
                  <p>Natural language interface to control everything</p>
                </DomainLink>
                <DomainLink surface={SURFACES.DOCS} path="/prd-generator" className="docs-card">
                  <h3>PRD Generator</h3>
                  <p>AI-powered PRD creation with tickets</p>
                </DomainLink>
                <DomainLink surface={SURFACES.DOCS} path="/decision-memory" className="docs-card">
                  <h3>Decision Memory</h3>
                  <p>Search past decisions with citations</p>
                </DomainLink>
                <DomainLink surface={SURFACES.DOCS} path="/daily-digest" className="docs-card">
                  <h3>Daily Digest</h3>
                  <p>Risk alerts and progress tracking</p>
                </DomainLink>
              </div>

              <h2>Supported Methodologies</h2>
              <p>ProductJarvis supports 30+ prioritization and planning methodologies:</p>
              <ul>
                <li><strong>Prioritization:</strong> RICE, WSJF, MoSCoW, Kano, ICE, Value vs Effort</li>
                <li><strong>Discovery:</strong> Jobs-to-be-Done, Design Thinking, Lean Startup</li>
                <li><strong>Planning:</strong> OKRs, North Star, Opportunity Solution Trees</li>
                <li><strong>Execution:</strong> Shape Up, Scrum, Kanban, Dual Track</li>
              </ul>

              <h2>Get Help</h2>
              <ul>
                <li><DomainLink surface={SURFACES.DOCS} path="/quickstart">Quick Start Guide</DomainLink></li>
                <li><DomainLink surface={SURFACES.DOCS} path="/api-docs">API Documentation</DomainLink></li>
                <li><a href="mailto:support@productjarvis.com">Contact Support</a></li>
                <li><DomainLink surface={SURFACES.WWW} path="/status">System Status</DomainLink></li>
              </ul>
            </article>
          )}

          {currentSection === 'quickstart' && (
            <article className="docs-article">
              <h1>Quick Start Guide</h1>
              <p className="docs-lead">
                Get up and running with ProductJarvis in under 5 minutes.
              </p>

              <h2>Step 1: Create Your Account</h2>
              <ol>
                <li>Go to the ProductJarvis app</li>
                <li>Sign in with Google on the auth host</li>
                <li>If your email is already enabled, you go straight into the app</li>
                <li>If not, redeem an invite code or join the waitlist after sign-in</li>
              </ol>

              <h2>Step 2: Set Up Your Workspace</h2>
              <p>Choose Quick Start for smart defaults or Full Setup for complete customization:</p>
              <ul>
                <li><strong>Quick Start (~2 min):</strong> Uses intelligent defaults, jump right in</li>
                <li><strong>Full Setup (~10 min):</strong> Customize role, OKRs, methodologies, integrations</li>
              </ul>

              <h2>Step 3: Connect Integrations</h2>
              <p>Connect your tools to enable ticket pushing and data sync:</p>
              <ul>
                <li><strong>Jira:</strong> Push tickets, sync status, import backlog</li>
                <li><strong>Linear:</strong> Push tickets, sync progress</li>
                <li><strong>Notion:</strong> Import documentation, sync decisions</li>
              </ul>

              <h2>Step 4: Generate Your First PRD</h2>
              <ol>
                <li>Click <strong>"Generate PRD"</strong> on the dashboard</li>
                <li>Describe your feature in natural language</li>
                <li>Watch Jarvis generate a complete PRD with tickets</li>
                <li>Review, edit, and push to your tracker</li>
              </ol>

              <div className="docs-callout docs-callout--success">
                <h4>You're Ready!</h4>
                <p>
                  Explore the <DomainLink surface={SURFACES.DOCS} path="/command-bar">Command Bar</DomainLink> to discover
                  all the ways you can interact with ProductJarvis.
                </p>
              </div>
            </article>
          )}

          {!['introduction', 'quickstart'].includes(currentSection) && (
            <article className="docs-article">
              <h1>{navigation.flatMap(g => g.items).find(i => i.slug === currentSection)?.title || 'Documentation'}</h1>
              <p className="docs-lead">This section is coming soon.</p>
              <p>
                In the meantime, <a href="mailto:support@productjarvis.com">contact our support team</a> for help.
              </p>
            </article>
          )}

          <div className="docs-pagination">
            <DomainLink surface={SURFACES.DOCS} path="/introduction" className="docs-pagination__prev">
              <ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} />
              <span>Introduction</span>
            </DomainLink>
            <DomainLink surface={SURFACES.DOCS} path="/quickstart" className="docs-pagination__next">
              <span>Quick Start</span>
              <ChevronRight size={16} />
            </DomainLink>
          </div>
        </main>

        <aside className="docs-toc">
          <h4>On this page</h4>
          <ul>
            <li><a href="#what-is-productjarvis">What is ProductJarvis?</a></li>
            <li><a href="#core-capabilities">Core Capabilities</a></li>
            <li><a href="#supported-methodologies">Supported Methodologies</a></li>
            <li><a href="#get-help">Get Help</a></li>
          </ul>
        </aside>
      </div>

      <footer className="docs-footer">
        <div className="docs-footer__links">
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

export default DocsPage;
