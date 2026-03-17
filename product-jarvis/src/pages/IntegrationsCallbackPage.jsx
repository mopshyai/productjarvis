import React, { useEffect, useReducer } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDomainHref, SURFACES } from '../lib/domainRoutes';

function reducer(state, action) {
  return { ...state, ...action };
}

const IntegrationsCallbackPage = () => {
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(reducer, { status: 'processing', message: 'Completing integration...' });
  const { status, message } = state;

  useEffect(() => {
    const url = new URL(window.location.href);
    const provider = url.searchParams.get('provider') || localStorage.getItem('oauth_provider') || '';
    const code = url.searchParams.get('code') || '';
    const state = url.searchParams.get('state') || '';
    const error = url.searchParams.get('error') || '';
    const workspaceId = url.searchParams.get('workspace_id') || localStorage.getItem('oauth_workspace_id') || 'ws_1';

    if (error) {
      dispatch({ status: 'error', message: `OAuth denied: ${error}` });
      return;
    }

    if (!code || !state || !provider) {
      dispatch({ status: 'error', message: 'Missing OAuth parameters.' });
      return;
    }

    const callbackUrl = `/api/integrations/auth/callback?provider=${encodeURIComponent(provider)}&workspace_id=${encodeURIComponent(workspaceId)}&code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;

    fetch(`${import.meta.env.VITE_API_BASE_URL || ''}${callbackUrl}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-oauth-state': state,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.status === 'connected') {
          dispatch({ status: 'success', message: `${provider.charAt(0).toUpperCase() + provider.slice(1)} connected successfully!` });
          setTimeout(() => {
            window.location.href = getDomainHref(SURFACES.ADMIN, '/');
          }, 1500);
        } else {
          dispatch({ status: 'error', message: data?.error?.message || 'Connection failed.' });
        }
      })
      .catch((err) => {
        dispatch({ status: 'error', message: err.message || 'Connection failed.' });
      });
  }, [navigate]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      flexDirection: 'column',
      gap: '1rem',
      background: 'var(--bg)',
      color: 'var(--text)',
    }}>
      {status === 'processing' && (
        <>
          <div style={{ fontSize: '2rem' }}>⏳</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 500 }}>{message}</div>
        </>
      )}
      {status === 'success' && (
        <>
          <div style={{ fontSize: '2rem' }}>✅</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 500, color: 'var(--success)' }}>{message}</div>
          <div style={{ fontSize: '0.85rem', opacity: 0.6 }}>Redirecting to settings...</div>
        </>
      )}
      {status === 'error' && (
        <>
          <div style={{ fontSize: '2rem' }}>❌</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 500, color: '#f87171' }}>{message}</div>
          <a href={getDomainHref(SURFACES.ADMIN, '/')} style={{ marginTop: '0.5rem', color: 'var(--accent)', textDecoration: 'underline', fontSize: '0.9rem' }}>
            Back to Settings
          </a>
        </>
      )}
    </div>
  );
};

export default IntegrationsCallbackPage;
