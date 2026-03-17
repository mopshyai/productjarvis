import React from 'react';
import DomainLink from '../components/DomainLink';
import { SURFACES } from '../lib/domainRoutes';
import './LegalPage.css';

const PrivacyPage = () => {
  const lastUpdated = 'March 7, 2026';

  return (
    <div className="legal-page">
      <nav className="legal-nav">
        <DomainLink surface={SURFACES.WWW} path="/" className="legal-nav__logo">
          <span className="legal-nav__logo-icon">J</span>
          <span>ProductJarvis</span>
        </DomainLink>
        <div className="legal-nav__links">
          <DomainLink surface={SURFACES.WWW} path="/terms">Terms</DomainLink>
          <DomainLink surface={SURFACES.WWW} path="/security">Security</DomainLink>
          <DomainLink surface={SURFACES.WWW} path="/contact">Contact</DomainLink>
        </div>
      </nav>

      <main className="legal-content">
        <header className="legal-header">
          <h1>Privacy Policy</h1>
          <p className="legal-updated">Last updated: {lastUpdated}</p>
        </header>

        <article className="legal-body">
          <section>
            <h2>1. Introduction</h2>
            <p>
              ProductJarvis ("we," "our," or "us") is committed to protecting your privacy.
              This Privacy Policy explains how we collect, use, disclose, and safeguard your
              information when you use our AI-powered product management platform.
            </p>
          </section>

          <section>
            <h2>2. Information We Collect</h2>

            <h3>2.1 Information You Provide</h3>
            <ul>
              <li><strong>Account Information:</strong> Name, email address, company name, job title when you create an account</li>
              <li><strong>Product Data:</strong> PRDs, feature requests, user research, OKRs, and other product management content you create</li>
              <li><strong>Integration Data:</strong> Data from connected services (Jira, Linear, Notion) that you authorize</li>
              <li><strong>Communications:</strong> Messages you send to our support team</li>
            </ul>

            <h3>2.2 Information Collected Automatically</h3>
            <ul>
              <li><strong>Usage Data:</strong> Features used, actions taken, time spent</li>
              <li><strong>Device Information:</strong> Browser type, operating system, device type</li>
              <li><strong>Log Data:</strong> IP address, access times, pages viewed</li>
              <li><strong>Cookies:</strong> Session cookies for authentication, analytics cookies (see Section 7)</li>
            </ul>

            <h3>2.3 Information from Third Parties</h3>
            <ul>
              <li><strong>OAuth Providers:</strong> Profile information from Google when you sign in</li>
              <li><strong>Integrations:</strong> Project and issue data from Jira, Linear, Notion when connected</li>
            </ul>
          </section>

          <section>
            <h2>3. How We Use Your Information</h2>
            <p>We use collected information to:</p>
            <ul>
              <li>Provide, maintain, and improve ProductJarvis</li>
              <li>Generate AI-powered PRDs, recommendations, and insights</li>
              <li>Process and sync data with your connected integrations</li>
              <li>Send transactional emails (account confirmations, security alerts)</li>
              <li>Provide customer support</li>
              <li>Analyze usage patterns to improve our service</li>
              <li>Detect and prevent fraud or abuse</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2>4. AI Processing & Data Usage</h2>
            <p>
              ProductJarvis uses AI (Claude by Anthropic) to generate PRDs, analyze product data,
              and provide recommendations. Important information about AI processing:
            </p>
            <ul>
              <li><strong>Your data is not used to train AI models.</strong> We use API-based AI services that do not retain or learn from your data.</li>
              <li><strong>Context is session-based.</strong> AI processing occurs in isolated sessions and is not stored by AI providers.</li>
              <li><strong>You control what's processed.</strong> Only content you explicitly submit is processed by AI.</li>
              <li><strong>Human review is optional.</strong> AI outputs are provided directly to you without human review unless you request support.</li>
            </ul>
          </section>

          <section>
            <h2>5. Data Sharing & Disclosure</h2>
            <p>We do not sell your personal information. We may share data with:</p>

            <h3>5.1 Service Providers</h3>
            <ul>
              <li><strong>Supabase:</strong> Database and authentication infrastructure</li>
              <li><strong>Vercel:</strong> Hosting and deployment</li>
              <li><strong>Anthropic:</strong> AI processing (Claude API)</li>
              <li><strong>Sentry:</strong> Error tracking and monitoring</li>
              <li><strong>PostHog:</strong> Product analytics</li>
              <li><strong>Resend:</strong> Transactional email delivery</li>
            </ul>

            <h3>5.2 Your Integrations</h3>
            <p>When you connect Jira, Linear, or Notion, data flows between ProductJarvis and those services as you direct.</p>

            <h3>5.3 Legal Requirements</h3>
            <p>We may disclose information if required by law, court order, or government request.</p>

            <h3>5.4 Business Transfers</h3>
            <p>In the event of a merger, acquisition, or sale, your data may be transferred to the acquiring entity.</p>
          </section>

          <section>
            <h2>6. Data Retention</h2>
            <ul>
              <li><strong>Account Data:</strong> Retained while your account is active, deleted within 30 days of account deletion</li>
              <li><strong>Product Data:</strong> Retained while your account is active, deleted within 30 days of account deletion</li>
              <li><strong>Usage Logs:</strong> Retained for 90 days</li>
              <li><strong>Backups:</strong> Retained for 30 days after deletion</li>
            </ul>
          </section>

          <section>
            <h2>7. Cookies & Tracking</h2>
            <p>We use the following types of cookies:</p>
            <ul>
              <li><strong>Essential Cookies:</strong> Required for authentication and security (cannot be disabled)</li>
              <li><strong>Analytics Cookies:</strong> Help us understand how you use ProductJarvis (PostHog)</li>
              <li><strong>Session Recording:</strong> Records interactions to improve UX (can be disabled in settings)</li>
            </ul>
            <p>You can manage cookie preferences in your browser settings or account preferences.</p>
          </section>

          <section>
            <h2>8. Your Rights</h2>
            <p>Depending on your location, you may have the right to:</p>
            <ul>
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Request correction of inaccurate data</li>
              <li><strong>Deletion:</strong> Request deletion of your data</li>
              <li><strong>Portability:</strong> Receive your data in a portable format</li>
              <li><strong>Objection:</strong> Object to certain processing activities</li>
              <li><strong>Restriction:</strong> Request restriction of processing</li>
            </ul>
            <p>To exercise these rights, contact us at <a href="mailto:privacy@productjarvis.com">privacy@productjarvis.com</a>.</p>
          </section>

          <section>
            <h2>9. Data Security</h2>
            <p>We implement industry-standard security measures:</p>
            <ul>
              <li>All data encrypted in transit (TLS 1.3) and at rest (AES-256)</li>
              <li>SOC 2 Type II compliant infrastructure (Supabase, Vercel)</li>
              <li>Regular security audits and penetration testing</li>
              <li>Role-based access controls</li>
              <li>Multi-factor authentication available</li>
            </ul>
            <p>For more details, see our <DomainLink surface={SURFACES.WWW} path="/security">Security Page</DomainLink>.</p>
          </section>

          <section>
            <h2>10. International Data Transfers</h2>
            <p>
              ProductJarvis is based in the United States. If you access our service from outside the US,
              your data will be transferred to and processed in the US. We ensure appropriate safeguards
              are in place for international transfers in compliance with applicable data protection laws.
            </p>
          </section>

          <section>
            <h2>11. Children's Privacy</h2>
            <p>
              ProductJarvis is not intended for users under 16 years of age. We do not knowingly
              collect personal information from children. If we learn we have collected data from
              a child, we will delete it promptly.
            </p>
          </section>

          <section>
            <h2>12. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of significant
              changes by email or by posting a notice in the app. Your continued use of ProductJarvis
              after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2>13. Contact Us</h2>
            <p>If you have questions about this Privacy Policy, contact us at:</p>
            <ul>
              <li><strong>Email:</strong> <a href="mailto:privacy@productjarvis.com">privacy@productjarvis.com</a></li>
            </ul>
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

export default PrivacyPage;
