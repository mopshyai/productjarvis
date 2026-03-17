import React from 'react';
import { Shield, Lock, Server, Eye, FileCheck, AlertTriangle } from 'lucide-react';
import DomainLink from '../components/DomainLink';
import { SURFACES } from '../lib/domainRoutes';
import './LegalPage.css';

const SecurityPage = () => {
  return (
    <div className="legal-page">
      <nav className="legal-nav">
        <DomainLink surface={SURFACES.WWW} path="/" className="legal-nav__logo">
          <span className="legal-nav__logo-icon">J</span>
          <span>ProductJarvis</span>
        </DomainLink>
        <div className="legal-nav__links">
          <DomainLink surface={SURFACES.WWW} path="/privacy">Privacy</DomainLink>
          <DomainLink surface={SURFACES.WWW} path="/terms">Terms</DomainLink>
          <DomainLink surface={SURFACES.WWW} path="/contact">Contact</DomainLink>
        </div>
      </nav>

      <main className="legal-content">
        <header className="legal-header">
          <h1>Security</h1>
          <p className="legal-subtitle">
            How we protect your data and keep ProductJarvis secure
          </p>
        </header>

        <article className="legal-body security-body">

          <section className="security-overview">
            <p>
              Security is foundational to ProductJarvis. We understand you're trusting us with
              sensitive product data, and we take that responsibility seriously. This page
              outlines our security practices, certifications, and how we protect your information.
            </p>
          </section>

          <section className="security-section">
            <div className="security-section__icon">
              <Lock size={32} />
            </div>
            <div className="security-section__content">
              <h2>Data Encryption</h2>
              <ul>
                <li><strong>In Transit:</strong> All data is encrypted using TLS 1.3 (HTTPS)</li>
                <li><strong>At Rest:</strong> Data encrypted using AES-256 encryption</li>
                <li><strong>Database:</strong> Supabase provides encrypted storage with automatic key rotation</li>
                <li><strong>Backups:</strong> All backups are encrypted and stored in geographically distributed locations</li>
              </ul>
            </div>
          </section>

          <section className="security-section">
            <div className="security-section__icon">
              <Server size={32} />
            </div>
            <div className="security-section__content">
              <h2>Infrastructure Security</h2>
              <ul>
                <li><strong>Hosting:</strong> Vercel (frontend) and Supabase (backend) — both SOC 2 Type II certified</li>
                <li><strong>CDN:</strong> Global edge network with DDoS protection</li>
                <li><strong>Isolation:</strong> Each customer's data is logically isolated</li>
                <li><strong>Monitoring:</strong> 24/7 infrastructure monitoring with automated alerts</li>
                <li><strong>Uptime:</strong> 99.9% SLA for paid plans</li>
              </ul>
            </div>
          </section>

          <section className="security-section">
            <div className="security-section__icon">
              <Shield size={32} />
            </div>
            <div className="security-section__content">
              <h2>Authentication & Access</h2>
              <ul>
                <li><strong>OAuth 2.0:</strong> Secure authentication via Google</li>
                <li><strong>Session Management:</strong> Secure, encrypted session tokens with automatic expiration</li>
                <li><strong>Access Control:</strong> Workspace access is enforced after sign-in via invite entitlement or waitlist approval</li>
                <li><strong>MFA:</strong> Multi-factor authentication available (coming soon)</li>
                <li><strong>SSO:</strong> SAML SSO available for Enterprise plans</li>
              </ul>
            </div>
          </section>

          <section className="security-section">
            <div className="security-section__icon">
              <Eye size={32} />
            </div>
            <div className="security-section__content">
              <h2>AI & Data Privacy</h2>
              <ul>
                <li><strong>No Training:</strong> Your data is never used to train AI models</li>
                <li><strong>API-Based:</strong> We use Claude API (Anthropic) which does not retain customer data</li>
                <li><strong>Session Isolation:</strong> Each AI request is processed in isolation</li>
                <li><strong>Data Minimization:</strong> We only send necessary context to AI providers</li>
                <li><strong>Audit Logging:</strong> All AI interactions are logged for security auditing</li>
              </ul>
            </div>
          </section>

          <section className="security-section">
            <div className="security-section__icon">
              <FileCheck size={32} />
            </div>
            <div className="security-section__content">
              <h2>Compliance & Certifications</h2>
              <ul>
                <li><strong>SOC 2 Type II:</strong> Our infrastructure providers (Supabase, Vercel) are SOC 2 certified</li>
                <li><strong>GDPR:</strong> We comply with GDPR requirements for EU users</li>
                <li><strong>CCPA:</strong> We comply with CCPA requirements for California residents</li>
                <li><strong>Data Residency:</strong> Data stored in US; EU residency available for Enterprise</li>
              </ul>
            </div>
          </section>

          <section className="security-section">
            <div className="security-section__icon">
              <AlertTriangle size={32} />
            </div>
            <div className="security-section__content">
              <h2>Security Practices</h2>
              <ul>
                <li><strong>Vulnerability Scanning:</strong> Regular automated security scans</li>
                <li><strong>Penetration Testing:</strong> Annual third-party penetration tests</li>
                <li><strong>Dependency Monitoring:</strong> Automated alerts for vulnerable dependencies</li>
                <li><strong>Code Review:</strong> All code changes require security review</li>
                <li><strong>Incident Response:</strong> Documented incident response procedures</li>
              </ul>
            </div>
          </section>

          <section className="security-contact">
            <h2>Report a Vulnerability</h2>
            <p>
              We value the security community's efforts in helping keep ProductJarvis secure.
              If you discover a security vulnerability, please report it responsibly:
            </p>
            <ul>
              <li><strong>Email:</strong> <a href="mailto:security@productjarvis.com">security@productjarvis.com</a></li>
              <li><strong>PGP Key:</strong> Available on request</li>
              <li><strong>Response Time:</strong> We acknowledge reports within 24 hours</li>
            </ul>
            <p>
              Please do not publicly disclose vulnerabilities until we've had a chance to address them.
            </p>
          </section>

          <section className="security-contact">
            <h2>Questions?</h2>
            <p>
              For security-related questions or to request our security documentation,
              contact <a href="mailto:security@productjarvis.com">security@productjarvis.com</a>.
            </p>
            <p>
              Enterprise customers can request access to our full security documentation,
              including SOC 2 reports and penetration test summaries.
            </p>
          </section>
        </article>
      </main>

      <footer className="legal-footer">
        <div className="legal-footer__links">
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

export default SecurityPage;
