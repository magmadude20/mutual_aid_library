import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import './Login.css';

function Login() {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setMessage('');
    setLoading(true);
    try {
      if (mode === 'login') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        // Session listener in App will pick up the change.
      } else {
        const trimmedName = displayName.trim();
        if (!trimmedName) {
          setError('Display name is required.');
          setLoading(false);
          return;
        }
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: trimmedName } },
        });
        if (signUpError) throw signUpError;
        if (data?.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            full_name: trimmedName,
          });
        }
        setMessage('Check your email to confirm your account (if confirmations are enabled).');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Sign in</h1>
        <div className="auth-toggle">
          <button
            type="button"
            className={`auth-toggle-button ${mode === 'login' ? 'auth-toggle-active' : ''}`}
            onClick={() => { setMode('login'); setDisplayName(''); }}
          >
            Log in
          </button>
          <button
            type="button"
            className={`auth-toggle-button ${mode === 'signup' ? 'auth-toggle-active' : ''}`}
            onClick={() => setMode('signup')}
          >
            Sign up
          </button>
        </div>
        <form onSubmit={handleSubmit} className="auth-form" aria-label={mode === 'login' ? 'Log in' : 'Sign up'}>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {message && <p className="auth-message">{message}</p>}
          <label className="form-label" htmlFor="auth-email">
            Email
          </label>
          <input
            id="auth-email"
            type="email"
            className="form-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.org"
            required
            disabled={loading}
            autoComplete="email"
          />
          {mode === 'signup' && (
            <>
              <label className="form-label" htmlFor="auth-display-name">
                Display name
              </label>
              <input
                id="auth-display-name"
                type="text"
                className="form-input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                disabled={loading}
                autoComplete="name"
              />
            </>
          )}
          <label className="form-label" htmlFor="auth-password">
            Password
          </label>
          <input
            id="auth-password"
            type="password"
            className="form-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            disabled={loading}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
          <button type="submit" className="submit-button auth-submit" disabled={loading}>
            {loading ? (mode === 'login' ? 'Logging in…' : 'Signing up…') : mode === 'login' ? 'Log in' : 'Sign up'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;

