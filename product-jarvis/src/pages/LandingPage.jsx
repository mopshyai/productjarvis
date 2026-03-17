import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  DatabaseZap,
  FileJson2,
  Link2,
  NotebookPen,
  Radar,
  ShieldCheck,
  Sparkles,
  Workflow,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import DomainLink from '../components/DomainLink';
import { getDomainHref, navigateToSurface, SURFACES } from '../lib/domainRoutes';
import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();
  const { api, session } = useApp();
  const sampleRef = useRef(null);
  const [showStickyCta, setShowStickyCta] = useState(false);

  const trackLandingEvent = (event, payload = {}) => {
    api
      .trackEvent({
        event,
        payload,
        timestamp: new Date().toISOString(),
        workspace_id: session?.workspace?.id,
      })
      .catch(() => {});
  };

  const outcomes = useMemo(
    () => [
      {
        label: 'PRD drafting time',
        valueBefore: '3-4h',
        valueAfter: '<15m',
        note: 'From initial evidence synthesis to a review-ready PRD.',
      },
      {
        label: 'Sprint ticket planning',
        valueBefore: '45-90m',
        valueAfter: '<10m',
        note: 'Convert approved scope into sprint-ready delivery tickets.',
      },
      {
        label: 'Decision retrieval',
        valueBefore: '30m+',
        valueAfter: '<30s',
        note: 'Pull prior rationale with citations instead of searching manually.',
      },
    ],
    []
  );

  const capabilities = useMemo(
    () => [
      {
        title: 'Command Bar',
        icon: Workflow,
        input: 'One-line request with product context',
        output: 'Routed action with preview, citations, and confirmation requirements',
        impact: 'Eliminates context switching and shortens idea-to-action cycle.',
      },
      {
        title: 'PRD Generator + Ticket Factory',
        icon: FileJson2,
        input: 'Feature request + workspace context',
        output: 'Strict-schema PRD and Jira/Linear ticket drafts with dependencies',
        impact: 'Moves planning from hours to minutes with edit-before-push control.',
      },
      {
        title: 'Decision Memory',
        icon: NotebookPen,
        input: 'Natural-language question about prior decisions',
        output: 'Citation-backed answer or explicit not-found response',
        impact: 'Prevents repeated mistakes and preserves institutional context.',
      },
      {
        title: 'Daily Digest',
        icon: Radar,
        input: 'Signals from integrations and manual workspace context',
        output: 'Actionable daily risks with confidence score and source links',
        impact: 'Gives PMs a prioritized start without manual triage.',
      },
    ],
    []
  );

  useEffect(() => {
    trackLandingEvent('landing_view');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const firedDepths = new Set();
    const thresholds = [25, 50, 75, 100];
    const revealNodes = Array.from(document.querySelectorAll('[data-reveal]'));
    const sampleNode = sampleRef.current;
    let sampleViewed = false;

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2, rootMargin: '0px 0px -30px 0px' }
    );

    revealNodes.forEach((node) => revealObserver.observe(node));

    const sampleObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !sampleViewed) {
            sampleViewed = true;
            trackLandingEvent('landing_sample_view', { section: 'sample-output' });
          }
        });
      },
      { threshold: 0.4 }
    );

    if (sampleNode) {
      sampleObserver.observe(sampleNode);
    }

    const onScroll = () => {
      const scrollTop = window.scrollY;
      const height = document.documentElement.scrollHeight - window.innerHeight;
      const percent = height <= 0 ? 100 : Math.min(100, Math.round((scrollTop / height) * 100));

      thresholds.forEach((threshold) => {
        if (percent >= threshold && !firedDepths.has(threshold)) {
          firedDepths.add(threshold);
          trackLandingEvent('landing_scroll_depth', { percent: threshold });
        }
      });

      setShowStickyCta(window.innerWidth <= 900 && scrollTop > window.innerHeight * 0.75);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      revealObserver.disconnect();
      sampleObserver.disconnect();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStartFree = (section = 'unknown') => {
    trackLandingEvent('landing_cta_click', { cta_type: 'primary', section });
    navigateToSurface(navigate, SURFACES.AUTH, '/');
  };

  const handleSampleView = () => {
    trackLandingEvent('landing_cta_click', { cta_type: 'secondary', section: 'hero' });
    sampleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="lp-shell">
      <header className="lp-nav">
        <div className="lp-container lp-nav-inner">
          <div className="lp-brand">
            <Sparkles size={18} /> ProductJarvis
          </div>
          <div className="lp-nav-actions">
            <button className="lp-btn lp-btn-ghost" onClick={() => navigateToSurface(navigate, SURFACES.AUTH, '/')}>Sign in</button>
            <button className="lp-btn lp-btn-primary" onClick={() => handleStartFree('nav')}>Start free</button>
          </div>
        </div>
      </header>

      <section className="lp-hero-section" data-reveal>
        <div className="lp-container">
          <div className="lp-hero">
            <p className="lp-hero-chip">AI Product Operating System</p>
            <h1>Your AI Product Operating System</h1>
            <p className="lp-hero-copy">
              One command turns evidence into a PRD and sprint-ready Jira/Linear tickets with citations.
              From idea to PRD, tickets, decisions, and daily risk clarity in minutes.
            </p>
            <p className="lp-hero-copy lp-hero-sub">
              ProductJarvis is built for founder-PMs and lean product teams that need speed without losing rigor.
            </p>
            <div className="lp-hero-actions">
              <button className="lp-btn lp-btn-primary" onClick={() => handleStartFree('hero')}>
                Start free <ArrowRight size={16} />
              </button>
              <button className="lp-btn lp-btn-ghost" onClick={handleSampleView}>
                See sample output
              </button>
            </div>
            <div className="lp-trust-row">
              <span><CheckCircle2 size={14} /> No credit card required</span>
              <span><ShieldCheck size={14} /> Workspace-scoped data</span>
              <span><DatabaseZap size={14} /> Cited outputs</span>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-outcomes-section" data-reveal>
        <div className="lp-container">
          <div className="lp-section-heading lp-section-heading-compact">
            <p className="lp-eyebrow">Key outcomes</p>
            <h2>Ship faster with evidence-backed outputs</h2>
            <p className="lp-section-copy">
              Product work stays grounded in the same workspace context, with measurable gains across drafting,
              planning, and recall.
            </p>
          </div>
          <div className="lp-outcomes-shell">
            <div className="lp-outcomes">
              {outcomes.map((item) => (
                <article key={item.label} className="lp-outcome-card">
                  <p className="lp-outcome-label">{item.label}</p>
                  <div className="lp-outcome-value" aria-label={`${item.label}: ${item.valueBefore} to ${item.valueAfter}`}>
                    <span className="lp-outcome-before">{item.valueBefore}</span>
                    <span className="lp-outcome-arrow" aria-hidden="true">→</span>
                    <span className="lp-outcome-after">{item.valueAfter}</span>
                  </div>
                  <p className="lp-outcome-note">{item.note}</p>
                </article>
              ))}
            </div>
            <aside className="lp-support-stat" aria-label="Supporting performance metric">
              <p className="lp-support-stat-label">Command to output</p>
              <p className="lp-support-stat-value">Single run &lt;30s</p>
              <p className="lp-support-stat-note">Fast enough for real-time PM workflows without breaking review loops.</p>
            </aside>
          </div>
        </div>
      </section>

      <section className="lp-capability-section" id="sample" ref={sampleRef} data-reveal>
        <div className="lp-container">
          <div className="lp-section-heading">
            <p className="lp-eyebrow">Core capabilities</p>
            <h2>From request to execution with source-grounded outputs</h2>
          </div>
          <div className="lp-capability-grid">
            {capabilities.map((capability) => (
              <article key={capability.title} className="lp-capability-card">
                <h3>
                  <capability.icon size={16} /> {capability.title}
                </h3>
                <p><strong>Input:</strong> {capability.input}</p>
                <p><strong>Output:</strong> {capability.output}</p>
                <p><strong>Why it matters:</strong> {capability.impact}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-methodologies" data-reveal>
        <div className="lp-container">
          <div className="lp-section-heading">
            <p className="lp-eyebrow">Methodology coverage</p>
            <h2>Top-30 framework support with auto + override selection</h2>
          </div>
          <div className="lp-method-columns">
            <div>
              <h4>Prioritization</h4>
              <p>RICE, ICE, WSJF, MoSCoW, Kano, Value vs Effort</p>
            </div>
            <div>
              <h4>Discovery + Planning</h4>
              <p>JTBD, Design Thinking, Scrum, Kanban, Scrumban, Story Mapping</p>
            </div>
            <div>
              <h4>Strategy + Metrics</h4>
              <p>PRFAQ, RFC, OKR alignment, AARRR, HEART, North Star Metric</p>
            </div>
          </div>
          <p className="lp-method-footnote">
            Registry-backed methodology catalog is exposed through{' '}
            <a href={getDomainHref(SURFACES.API, '/api/methodologies')}>/api/methodologies</a>.
          </p>
        </div>
      </section>

      <section className="lp-integrations" data-reveal>
        <div className="lp-container">
          <div className="lp-section-heading">
            <p className="lp-eyebrow">Integrations + reliability</p>
            <h2>Built for real PM stacks with strict citation policy</h2>
          </div>
          <div className="lp-integration-grid">
            <article>
              <h4><Link2 size={16} /> Connected systems</h4>
              <p>Jarvis works with your stack: Google auth, Jira, Linear, and Notion are supported in V1. Open Jarvis from Jira or Linear with issue context pre-filled so you don’t start from a blank slate.</p>
            </article>
            <article>
              <h4><ShieldCheck size={16} /> Trust behavior</h4>
              <p>Unsupported claims are explicitly labeled <code>No source found</code> instead of hidden.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="lp-how" data-reveal>
        <div className="lp-container">
          <div className="lp-section-heading">
            <p className="lp-eyebrow">How it works</p>
            <h2>Three steps from workspace setup to shipped output</h2>
          </div>
          <div className="lp-step-row">
            <div className="lp-step">
              <span>1</span>
              <p>Connect your workspace and seed product context.</p>
            </div>
            <ChevronRight size={18} />
            <div className="lp-step">
              <span>2</span>
              <p>Ask in natural language through the command bar.</p>
            </div>
            <ChevronRight size={18} />
            <div className="lp-step">
              <span>3</span>
              <p>Review, confirm, and push outputs to your tools.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-faq" data-reveal>
        <div className="lp-container">
          <div className="lp-section-heading">
            <p className="lp-eyebrow">FAQ</p>
            <h2>Clear answers before you start</h2>
          </div>
          <div className="lp-faq-grid">
            <article>
              <h4>Who owns the data?</h4>
              <p>Your workspace data remains isolated to your tenant and access scope.</p>
            </article>
            <article>
              <h4>What if sources are missing?</h4>
              <p>Outputs stay explicit with <code>No source found</code> tags and confidence cues.</p>
            </article>
            <article>
              <h4>How is this different from Dovetail or Notion AI?</h4>
              <p>We produce PRDs and tickets with citations from your evidence, not just analysis. One flow from evidence to executable spec with traceability.</p>
            </article>
            <article>
              <h4>How long is setup?</h4>
              <p>Most teams complete onboarding and generate their first output in about 10 minutes.</p>
            </article>
            <article>
              <h4>Can we choose frameworks?</h4>
              <p>Yes. Auto-selection is default, and you can override primary/supporting methodologies.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="lp-final-cta-section" data-reveal>
        <div className="lp-container">
          <div className="lp-final-cta">
            <div>
              <p className="lp-eyebrow">Start now</p>
              <h2>Move from idea to execution without PM overhead loops</h2>
              <p>Generate PRDs, tickets, decision recall, and risk briefs from one command workflow.</p>
            </div>
            <button className="lp-btn lp-btn-primary" onClick={() => handleStartFree('final-band')}>Start free</button>
          </div>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-container">
          <div className="lp-footer__grid">
            <div className="lp-footer__col">
              <h4>Product</h4>
              <DomainLink surface={SURFACES.WWW} path="/pricing">Pricing</DomainLink>
              <DomainLink surface={SURFACES.DOCS} path="/">Documentation</DomainLink>
              <DomainLink surface={SURFACES.DOCS} path="/api-docs">API Reference</DomainLink>
              <DomainLink surface={SURFACES.DOCS} path="/changelog">Changelog</DomainLink>
              <DomainLink surface={SURFACES.WWW} path="/status">Status</DomainLink>
            </div>
            <div className="lp-footer__col">
              <h4>Company</h4>
              <DomainLink surface={SURFACES.WWW} path="/about">About</DomainLink>
              <DomainLink surface={SURFACES.BLOG} path="/">Blog</DomainLink>
              <DomainLink surface={SURFACES.WWW} path="/contact">Contact</DomainLink>
            </div>
            <div className="lp-footer__col">
              <h4>Legal</h4>
              <DomainLink surface={SURFACES.WWW} path="/privacy">Privacy Policy</DomainLink>
              <DomainLink surface={SURFACES.WWW} path="/terms">Terms of Service</DomainLink>
              <DomainLink surface={SURFACES.WWW} path="/security">Security</DomainLink>
            </div>
            <div className="lp-footer__col">
              <h4>Connect</h4>
              <a href="https://twitter.com/productjarvis" target="_blank" rel="noopener noreferrer">Twitter</a>
              <a href="https://linkedin.com/company/productjarvis" target="_blank" rel="noopener noreferrer">LinkedIn</a>
              <a href="mailto:hello@productjarvis.com">Email</a>
            </div>
          </div>
          <div className="lp-footer__bottom">
            <p>&copy; {new Date().getFullYear()} ProductJarvis. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <div className={`lp-mobile-sticky ${showStickyCta ? 'visible' : ''}`}>
        <button className="lp-btn lp-btn-primary" onClick={() => handleStartFree('mobile-sticky')}>
          Start free <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
};

export default LandingPage;
