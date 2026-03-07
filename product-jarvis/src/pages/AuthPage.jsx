import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ShieldCheck, Key, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import './AuthPage.css';

const ALPHA_MODE = import.meta.env.VITE_ALPHA_INVITE_ONLY === 'true';

// Hardcoded alpha invite codes for mock mode (real validation via Supabase edge function in prod)
const MOCK_INVITE_CODES = ['JARVIS-ALPHA', 'JARVIS-LAUNCH', 'JARVIS-PM2026'];

const AuthPage = () => {
  const navigate = useNavigate();
  const { signInWithGoogle, sendMagicLink, loading } = useApp();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Invite / waitlist state
  const [mode, setMode] = useState(ALPHA_MODE ? 'gate' : 'login'); // 'gate' | 'waitlist' | 'invite' | 'login'
  const [inviteCode, setInviteCode] = useState('');
  const [inviteValid, setInviteValid] = useState(null);
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistDone, setWaitlistDone] = useState(false);

  const validateInviteCode = () => {
    const code = inviteCode.trim().toUpperCase();
    const valid = MOCK_INVITE_CODES.includes(code);
    setInviteValid(valid);
    if (valid) setTimeout(() => setMode('login'), 600);
  };

  const submitWaitlist = async (e) => {
    e.preventDefault();
    // In prod: POST to /api/waitlist
    console.info('[Waitlist]', waitlistEmail);
    setWaitlistDone(true);
  };

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
      setMessage(result.message || 'Magic link sent — check your inbox.');
      navigate('/auth/callback?provider=magic_link&token=demo');
    } catch (err) {
      setError(err.message || 'Magic link failed');
    }
  };

  // ── Gate screen (Alpha mode) ──────────────────────────────────────────────
  if (mode === 'gate') {
    return (
      <div className="auth-shell">
        <div className="auth-panel glass-panel">
          <div className="auth-alpha-badge">Private Alpha</div>
          <h1>ProductJarvis is invite-only</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            We're in private alpha. Join the waitlist or enter your invite code to access.
          </p>
          <button className="auth-google" onClick={() => setMode('waitlist')}>
            Join the Waitlist
          </button>
          <div className="auth-divider">have an invite code?</div>
          <button className="auth-magic" onClick={() => setMode('invite')}>
            <Key size={14} /> Enter Invite Code
          </button>
        </div>
      </div>
    );
  }

  // ── Waitlist screen ───────────────────────────────────────────────────────
  if (mode === 'waitlist') {
    return (
      <div className="auth-shell">
        <div className="auth-panel glass-panel">
          <button className="auth-back" onClick={() => setMode('gate')}>
            <ArrowLeft size={15} /> Back
          </button>
          {waitlistDone ? (
            <div className="auth-waitlist-done">
              <CheckCircle2 size={36} style={{ color: 'var(--success)' }} />
              <h2>You're on the list!</h2>
              <p>We'll send your invite code when a spot opens up.</p>
            </div>
          ) : (
            <>
              <h2>Join the Waitlist</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Early access for PMs who move fast.
              </p>
              <form className="auth-form" onSubmit={submitWaitlist}>
                <label>
                  Work email
                  <input
                    type="email"
                    placeholder="you@company.com"
                    value={waitlistEmail}
                    onChange={(e) => setWaitlistEmail(e.target.value)}
                    required
                  />
                </label>
                <button type="submit" className="auth-magic" disabled={!waitlistEmail.trim()}>
                  <Mail size={14} /> Join Waitlist
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Invite code screen ────────────────────────────────────────────────────
  if (mode === 'invite') {
    return (
      <div className="auth-shell">
        <div className="auth-panel glass-panel">
          <button className="auth-back" onClick={() => setMode('gate')}>
            <ArrowLeft size={15} /> Back
          </button>
          <h2>Enter Invite Code</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Format: JARVIS-XXXXXX
          </p>
          <div className="auth-invite-row">
            <input
              type="text"
              placeholder="JARVIS-ALPHA"
              value={inviteCode}
              onChange={(e) => {
                setInviteCode(e.target.value.toUpperCase());
                setInviteValid(null);
              }}
              className={`auth-invite-input ${inviteValid === false ? 'invalid' : inviteValid === true ? 'valid' : ''}`}
            />
            <button className="auth-magic" onClick={validateInviteCode} disabled={!inviteCode.trim()}>
              Verify
            </button>
          </div>
          {inviteValid === false && (
            <p className="auth-message error">Invalid or expired invite code.</p>
          )}
          {inviteValid === true && (
            <p className="auth-message success">
              <CheckCircle2 size={14} /> Code accepted — redirecting...
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Login screen (default / after valid invite) ───────────────────────────
  return (
    <div className="auth-shell">
      <div className="auth-panel glass-panel">
        {ALPHA_MODE && (
          <div className="auth-invite-accepted">
            <CheckCircle2 size={14} /> Invite accepted: {inviteCode}
          </div>
        )}
        <h1>Sign in to ProductJarvis</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Continue with Google or magic link. No password required.
        </p>

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
