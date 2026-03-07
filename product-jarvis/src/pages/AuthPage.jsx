import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import './AuthPage.css';

const AuthPage = () => {
  const navigate = useNavigate();
  const { signInWithGoogle, sendMagicLink, loading } = useApp();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleGoogle = async () => {
    setError('');
    try {
      const session = await signInWithGoogle();
      navigate(session?.workspace?.onboarding_complete ? '/workspace' : '/welcome');
    } catch (err) {
      setError(err.message || 'Google sign-in failed');
    }
  };

  const handleMagicLink = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      const result = await sendMagicLink({ email });
      setMessage(result.message || 'Magic link sent.');
      navigate('/auth/callback?provider=magic_link&token=demo');
    } catch (err) {
      setError(err.message || 'Magic link failed');
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-panel glass-panel">
        <h1>Sign in to ProductJarvis</h1>
        <p>Continue with Google or magic link. No password required.</p>

        <button className="auth-google" onClick={handleGoogle} disabled={loading}>
          Continue with Google
        </button>

        <div className="auth-divider">or</div>

        <form className="auth-form" onSubmit={handleMagicLink}>
          <label>
            Work email
            <input
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <button type="submit" className="auth-magic" disabled={loading || !email.trim()}>
            <Mail size={14} /> Send magic link
          </button>
        </form>

        {message ? <p className="auth-message success">{message}</p> : null}
        {error ? <p className="auth-message error">{error}</p> : null}

        <div className="auth-trust">
          <ShieldCheck size={14} />
          <span>No credit card required · Your data stays in your workspace</span>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
