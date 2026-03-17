import React from 'react';
import { getDomainHref, SURFACES } from '../lib/domainRoutes';

const statusPayload = {
  service: 'productjarvis-api',
  status: 'ok',
  message: 'Use /api/* routes on this host. Browser traffic belongs on the web subdomains.',
  endpoints: {
    methodologies: '/api/methodologies',
    session: '/api/session',
    authCallback: '/api/auth/callback',
  },
  webHosts: {
    marketing: getDomainHref(SURFACES.WWW, '/'),
    app: getDomainHref(SURFACES.APP, '/'),
    auth: getDomainHref(SURFACES.AUTH, '/'),
    admin: getDomainHref(SURFACES.ADMIN, '/'),
    docs: getDomainHref(SURFACES.DOCS, '/'),
    blog: getDomainHref(SURFACES.BLOG, '/'),
  },
};

const ApiStatusPage = () => {
  const payload = {
    ...statusPayload,
    host: typeof window !== 'undefined' ? window.location.host : 'api.productjarvis.com',
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '24px',
        background: '#020617',
        color: '#e2e8f0',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      }}
    >
      <pre
        style={{
          margin: 0,
          maxWidth: '860px',
          width: '100%',
          padding: '24px',
          borderRadius: '16px',
          border: '1px solid rgba(148, 163, 184, 0.22)',
          background: 'rgba(15, 23, 42, 0.92)',
          overflow: 'auto',
          whiteSpace: 'pre-wrap',
          lineHeight: 1.6,
        }}
      >
        {JSON.stringify(payload, null, 2)}
      </pre>
    </main>
  );
};

export default ApiStatusPage;
