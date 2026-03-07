import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const AuthCallbackPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { authCallback } = useApp();
  const [status, setStatus] = useState('Completing sign-in...');

  useEffect(() => {
    let active = true;
    const run = async () => {
      const provider = params.get('provider') || 'magic_link';
      const token = params.get('token') || '';
      try {
        const session = await authCallback({ provider, token });
        if (!active) return;
        setStatus('Sign-in complete. Redirecting...');
        navigate(session?.workspace?.onboarding_complete ? '/workspace' : '/welcome', { replace: true });
      } catch (err) {
        if (!active) return;
        setStatus(`Sign-in failed: ${err.message || 'Unknown error'}`);
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [authCallback, navigate, params]);

  return (
    <div className="loading-screen">
      {status}
    </div>
  );
};

export default AuthCallbackPage;
