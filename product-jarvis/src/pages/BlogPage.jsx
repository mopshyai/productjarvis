import React from 'react';
import { useParams } from 'react-router-dom';
import DomainLink from '../components/DomainLink';
import { SURFACES } from '../lib/domainRoutes';
import './LegalPage.css';

const BlogPage = () => {
  const { slug } = useParams();

  const posts = [
    {
      slug: 'introducing-productjarvis',
      title: 'Introducing ProductJarvis: Your AI Product Operating System',
      date: 'March 7, 2026',
      excerpt: 'Today we\'re launching ProductJarvis, an AI-powered product operating system that helps PMs move from idea to execution in minutes.',
    },
  ];

  if (slug) {
    const post = posts.find((p) => p.slug === slug);
    if (!post) {
      return (
        <div className="legal-page">
          <nav className="legal-nav">
            <DomainLink surface={SURFACES.WWW} path="/" className="legal-nav__logo">
              <span className="legal-nav__logo-icon">J</span>
              <span>ProductJarvis</span>
            </DomainLink>
            <div className="legal-nav__links">
              <DomainLink surface={SURFACES.BLOG} path="/">Blog</DomainLink>
              <DomainLink surface={SURFACES.DOCS} path="/">Docs</DomainLink>
            </div>
          </nav>
          <main className="legal-content">
            <h1>Post not found</h1>
            <p><DomainLink surface={SURFACES.BLOG} path="/">Back to blog</DomainLink></p>
          </main>
        </div>
      );
    }

    return (
      <div className="legal-page">
        <nav className="legal-nav">
          <DomainLink surface={SURFACES.WWW} path="/" className="legal-nav__logo">
            <span className="legal-nav__logo-icon">J</span>
            <span>ProductJarvis</span>
          </DomainLink>
          <div className="legal-nav__links">
            <DomainLink surface={SURFACES.BLOG} path="/">Blog</DomainLink>
            <DomainLink surface={SURFACES.DOCS} path="/">Docs</DomainLink>
          </div>
        </nav>

        <main className="legal-content">
          <header className="legal-header">
            <DomainLink surface={SURFACES.BLOG} path="/" style={{ color: 'var(--color-accent)', textDecoration: 'none', fontSize: 'var(--font-size-sm)' }}>
              ← Back to blog
            </DomainLink>
            <h1 style={{ marginTop: 'var(--space-4)' }}>{post.title}</h1>
            <p className="legal-updated">{post.date}</p>
          </header>

          <article className="legal-body">
            <p>After years of working as product managers and watching teams struggle with the same problems, we built ProductJarvis to solve them.</p>

            <section>
              <h2>The Problem</h2>
              <p>Product management has become increasingly complex. PMs spend hours writing PRDs, searching for past decisions, and manually creating tickets. Critical context gets lost across tools and time.</p>
            </section>

            <section>
              <h2>Our Solution</h2>
              <p>ProductJarvis combines AI with proven product methodologies to create a system that generates PRDs, preserves decisions, and surfaces risks — all with citations back to source material.</p>
            </section>

            <section>
              <h2>What's Next</h2>
              <p>Access rolls out in waves. Sign in with Google first, then redeem an invite code or join the waitlist if your workspace is not enabled yet.</p>
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
  }

  return (
    <div className="legal-page">
      <nav className="legal-nav">
        <DomainLink surface={SURFACES.WWW} path="/" className="legal-nav__logo">
          <span className="legal-nav__logo-icon">J</span>
          <span>ProductJarvis</span>
        </DomainLink>
        <div className="legal-nav__links">
          <DomainLink surface={SURFACES.DOCS} path="/">Docs</DomainLink>
          <DomainLink surface={SURFACES.WWW} path="/about">About</DomainLink>
          <DomainLink surface={SURFACES.WWW} path="/contact">Contact</DomainLink>
        </div>
      </nav>

      <main className="legal-content">
        <header className="legal-header">
          <h1>Blog</h1>
          <p className="legal-subtitle">
            Product management insights, updates, and best practices
          </p>
        </header>

        <article className="legal-body">
          {posts.map((post) => (
            <section key={post.slug} style={{ marginBottom: 'var(--space-10)' }}>
              <h2>
                <DomainLink surface={SURFACES.BLOG} path={`/${post.slug}`} style={{ color: 'var(--color-text-primary)', textDecoration: 'none' }}>
                  {post.title}
                </DomainLink>
              </h2>
              <p style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-3)' }}>
                {post.date}
              </p>
              <p>{post.excerpt}</p>
              <DomainLink surface={SURFACES.BLOG} path={`/${post.slug}`} style={{ color: 'var(--color-accent)', textDecoration: 'none', fontSize: 'var(--font-size-sm)' }}>
                Read more →
              </DomainLink>
            </section>
          ))}

          <section>
            <p style={{ color: 'var(--color-text-tertiary)', textAlign: 'center' }}>
              More posts coming soon. Follow us on <a href="https://twitter.com/productjarvis" target="_blank" rel="noopener noreferrer">Twitter</a> for updates.
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

export default BlogPage;
