import React from 'react';
import DomainLink from '../components/DomainLink';
import { SURFACES } from '../lib/domainRoutes';
import './LegalPage.css';

const TermsPage = () => {
  const lastUpdated = 'March 7, 2026';
  const effectiveDate = 'March 7, 2026';

  return (
    <div className="legal-page">
      <nav className="legal-nav">
        <DomainLink surface={SURFACES.WWW} path="/" className="legal-nav__logo">
          <span className="legal-nav__logo-icon">J</span>
          <span>ProductJarvis</span>
        </DomainLink>
        <div className="legal-nav__links">
          <DomainLink surface={SURFACES.WWW} path="/privacy">Privacy</DomainLink>
          <DomainLink surface={SURFACES.WWW} path="/security">Security</DomainLink>
          <DomainLink surface={SURFACES.WWW} path="/contact">Contact</DomainLink>
        </div>
      </nav>

      <main className="legal-content">
        <header className="legal-header">
          <h1>Terms of Service</h1>
          <p className="legal-updated">Last updated: {lastUpdated}</p>
          <p className="legal-effective">Effective: {effectiveDate}</p>
        </header>

        <article className="legal-body">
          <section>
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing or using ProductJarvis ("Service"), you agree to be bound by these
              Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Service.
            </p>
            <p>
              These Terms constitute a legally binding agreement between you and ProductJarvis
              ("we," "us," or "our"). If you are using the Service on behalf of an organization,
              you represent that you have authority to bind that organization to these Terms.
            </p>
          </section>

          <section>
            <h2>2. Description of Service</h2>
            <p>
              ProductJarvis is an AI-powered Product Operating System that helps product managers
              and teams create PRDs, manage decisions, track risks, and integrate with project
              management tools. The Service includes:
            </p>
            <ul>
              <li>AI-powered PRD generation and editing</li>
              <li>Decision memory and search</li>
              <li>Daily digest and risk tracking</li>
              <li>Integration with Jira, Linear, and Notion</li>
              <li>Evidence ingestion and opportunity synthesis</li>
            </ul>
          </section>

          <section>
            <h2>3. Account Registration</h2>

            <h3>3.1 Eligibility</h3>
            <p>You must be at least 16 years old and capable of forming a binding contract to use the Service.</p>

            <h3>3.2 Account Creation</h3>
            <p>
              To access the Service, you must authenticate using Google OAuth. Some workspaces or early-access environments
              may additionally require an invite entitlement or waitlist approval after sign-in. You agree to provide accurate,
              current, and complete information during registration.
            </p>

            <h3>3.3 Account Security</h3>
            <p>
              You are responsible for maintaining the security of your account credentials and for
              all activities that occur under your account. Notify us immediately of any unauthorized access.
            </p>
          </section>

          <section>
            <h2>4. Acceptable Use</h2>
            <p>You agree NOT to:</p>
            <ul>
              <li>Use the Service for any illegal purpose or in violation of any laws</li>
              <li>Upload malicious code, viruses, or harmful content</li>
              <li>Attempt to gain unauthorized access to the Service or its systems</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Scrape, crawl, or use automated means to access the Service without permission</li>
              <li>Reverse engineer, decompile, or disassemble any part of the Service</li>
              <li>Use the Service to generate content that is illegal, harmful, or violates third-party rights</li>
              <li>Impersonate any person or entity</li>
              <li>Share your account with unauthorized users</li>
              <li>Exceed rate limits or abuse API access</li>
            </ul>
          </section>

          <section>
            <h2>5. Your Content</h2>

            <h3>5.1 Ownership</h3>
            <p>
              You retain ownership of all content you create or upload to ProductJarvis ("Your Content"),
              including PRDs, feature requests, research data, and other materials.
            </p>

            <h3>5.2 License to Us</h3>
            <p>
              You grant us a limited, non-exclusive license to process, store, and display Your Content
              solely to provide the Service to you. This license terminates when you delete Your Content
              or close your account.
            </p>

            <h3>5.3 AI Processing</h3>
            <p>
              By using AI features, you authorize us to process Your Content through our AI providers
              (Anthropic Claude) to generate outputs. Your Content is not used to train AI models.
            </p>

            <h3>5.4 Responsibility</h3>
            <p>
              You are solely responsible for Your Content and ensuring you have the right to use it.
              We do not endorse or verify any content and are not liable for content accuracy.
            </p>
          </section>

          <section>
            <h2>6. AI-Generated Content</h2>
            <p>
              ProductJarvis uses AI to generate PRDs, recommendations, and other outputs
              ("AI Content"). You acknowledge that:
            </p>
            <ul>
              <li>AI Content is provided "as-is" and may contain errors or inaccuracies</li>
              <li>You are responsible for reviewing and validating AI Content before use</li>
              <li>AI Content should not be relied upon as legal, financial, or professional advice</li>
              <li>We do not guarantee AI Content will meet your specific requirements</li>
              <li>You own the AI Content generated from Your Content inputs</li>
            </ul>
          </section>

          <section>
            <h2>7. Integrations</h2>
            <p>
              When you connect third-party services (Jira, Linear, Notion), you authorize us to
              access and sync data from those services. You represent that you have authorization
              to connect those accounts and share that data with ProductJarvis.
            </p>
            <p>
              We are not responsible for third-party service availability, data accuracy, or
              changes to their APIs that may affect integration functionality.
            </p>
          </section>

          <section>
            <h2>8. Pricing & Payment</h2>

            <h3>8.1 Plans</h3>
            <ul>
              <li><strong>Free:</strong> 3 PRDs per month, basic features</li>
              <li><strong>Pro:</strong> Unlimited PRDs, advanced features, priority support</li>
              <li><strong>Team:</strong> Collaboration features, admin controls, SSO</li>
              <li><strong>Enterprise:</strong> Custom limits, dedicated support, SLA</li>
            </ul>

            <h3>8.2 Billing</h3>
            <p>
              Paid plans are billed monthly or annually in advance. Prices are in USD and
              exclude applicable taxes. We may change pricing with 30 days' notice.
            </p>

            <h3>8.3 Refunds</h3>
            <p>
              We offer a 14-day money-back guarantee for new paid subscriptions. After 14 days,
              payments are non-refundable. You may cancel at any time; access continues until
              the end of the billing period.
            </p>
          </section>

          <section>
            <h2>9. Intellectual Property</h2>

            <h3>9.1 Our IP</h3>
            <p>
              ProductJarvis and its features, functionality, content, and trademarks are owned
              by us and protected by intellectual property laws. You may not use our trademarks
              without written permission.
            </p>

            <h3>9.2 Feedback</h3>
            <p>
              If you provide feedback or suggestions, you grant us a perpetual, royalty-free
              license to use and incorporate that feedback into the Service.
            </p>
          </section>

          <section>
            <h2>10. Privacy</h2>
            <p>
              Your use of the Service is subject to our <DomainLink surface={SURFACES.WWW} path="/privacy">Privacy Policy</DomainLink>,
              which explains how we collect, use, and protect your information.
            </p>
          </section>

          <section>
            <h2>11. Disclaimers</h2>
            <p>
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND,
              EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY,
              FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
            </p>
            <p>
              WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE.
              WE DO NOT GUARANTEE THE ACCURACY, COMPLETENESS, OR USEFULNESS OF ANY AI-GENERATED CONTENT.
            </p>
          </section>

          <section>
            <h2>12. Limitation of Liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, PRODUCTJARVIS SHALL NOT BE LIABLE FOR ANY
              INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS
              OF PROFITS, DATA, OR BUSINESS OPPORTUNITIES, ARISING FROM YOUR USE OF THE SERVICE.
            </p>
            <p>
              OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE 12 MONTHS
              PRECEDING THE CLAIM, OR $100, WHICHEVER IS GREATER.
            </p>
          </section>

          <section>
            <h2>13. Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless ProductJarvis from any claims, damages,
              or expenses arising from your use of the Service, Your Content, or violation of
              these Terms.
            </p>
          </section>

          <section>
            <h2>14. Termination</h2>
            <p>
              We may suspend or terminate your access to the Service at any time for violation
              of these Terms or for any other reason with reasonable notice. You may terminate
              your account at any time through account settings.
            </p>
            <p>
              Upon termination, your right to use the Service ceases immediately. We will delete
              Your Content within 30 days of account closure, except as required by law.
            </p>
          </section>

          <section>
            <h2>15. Dispute Resolution</h2>
            <p>
              Any disputes arising from these Terms or the Service shall be resolved through
              binding arbitration in accordance with the rules of the American Arbitration
              Association. You agree to waive the right to participate in class actions.
            </p>
            <p>
              These Terms are governed by the laws of the State of Delaware, USA, without
              regard to conflict of law principles.
            </p>
          </section>

          <section>
            <h2>16. Changes to Terms</h2>
            <p>
              We may update these Terms from time to time. We will notify you of material
              changes by email or by posting a notice in the Service. Your continued use
              after changes constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2>17. Contact</h2>
            <p>For questions about these Terms, contact us at:</p>
            <ul>
              <li><strong>Email:</strong> <a href="mailto:legal@productjarvis.com">legal@productjarvis.com</a></li>
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

export default TermsPage;
