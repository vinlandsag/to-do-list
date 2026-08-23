import React, { Suspense, useState } from 'react';
import ThemeToggle from './ThemeToggle.jsx';
const Ballpit = React.lazy(() => import('./Ballpit.jsx'));

import { repository, supabase } from './data/repository.js';

/* Simple hash for demo purposes — not cryptographically secure */
function hashPassword(password) {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    hash = ((hash << 5) - hash + password.charCodeAt(i)) | 0;
  }
  return hash.toString(36);
}

export default function LoginPage({ onLogin, onShowPrivacyPolicy }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [success, setSuccess] = useState('');

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleGuestLogin = async () => {
    const guestSession = await repository.createGuestSession();
    onLogin(guestSession);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    if (!trimmedEmail || !password) {
      setError('Please fill in all required fields.');
      triggerShake();
      return;
    }

    if (!supabase) {
      setError('Supabase is not configured. Please check your .env file.');
      triggerShake();
      return;
    }

    if (isSignUp) {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: { name: trimmedName || trimmedEmail.split('@')[0] }
        }
      });

      if (signUpError) {
        setError(signUpError.message);
        triggerShake();
        return;
      }

      setSuccess('Account created! Signing you in…');
      setTimeout(async () => {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session) {
          const s = { email: trimmedEmail, name: sessionData.session.user.user_metadata?.name || trimmedEmail.split('@')[0] };
          onLogin(s);
        } else {
          setError('Please check your email to verify your account.');
          triggerShake();
        }
      }, 800);
    } else {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password
      });

      if (signInError) {
        setError('Invalid email or password.');
        triggerShake();
        return;
      }
      
      const s = { email: trimmedEmail, name: data.user.user_metadata?.name || trimmedEmail.split('@')[0] };
      onLogin(s);
    }
  };

  const switchMode = () => {
    setIsSignUp((prev) => !prev);
    setError('');
    setSuccess('');
  };

  return (
    <div className="login-page">
      {/* Ballpit background for visual consistency */}
      <Suspense fallback={null}>
        <div className="ballpit-container" aria-hidden="true">
          <Ballpit
            count={typeof window !== 'undefined' && window.innerWidth < 768 ? 15 : 60}
            colors={[0x6254e7, 0x9e90ff, 0x8ac6ff, 0xf5b267, 0xffb7a4]}
            radiusCm={1}
            gravity={0}
            friction={0.94}
            wallBounce={0.95}
            maxVelocity={0.5}
            cursorForce={6}
            followCursor={typeof window !== 'undefined' && window.innerWidth >= 768}
          />
        </div>
      </Suspense>

      {/* Floating decorative orbs */}
      <div className="login-orbs" aria-hidden="true">
        <div className="login-orb login-orb-1" />
        <div className="login-orb login-orb-2" />
        <div className="login-orb login-orb-3" />
      </div>

      <ThemeToggle />

      <aside className="login-marketing" aria-label="Why use Flowlist">
        <p className="login-marketing-kicker"><span /> A calmer way to plan</p>
        <h2>Make room for<br /><em>what matters.</em></h2>
        <p className="login-marketing-copy">Flowlist helps you capture what needs doing, remember it at the right time, and move through your day with a little more ease.</p>
        <ul className="login-benefits">
          <li><span>✓</span><div><strong>Keep today clear</strong><small>Simple lists, without the clutter.</small></div></li>
          <li><span>◷</span><div><strong>Remember with less effort</strong><small>Gentle reminders when they matter.</small></div></li>
          <li><span>↻</span><div><strong>Let routines take care of themselves</strong><small>Repeat the things you do often.</small></div></li>
        </ul>
      </aside>

      {/* Login card */}
      <div className={`login-card${shake ? ' login-card-shake' : ''}`}>
        {/* Logo / Brand */}
        <div className="login-brand">
          <div className="login-logo-circle">
            <span>✓</span>
          </div>
          <h1 className="login-title">Flowlist</h1>
          <p className="login-subtitle">
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </p>
          <div className="login-mobile-promise">
            <p className="login-promise-kicker">Your day, organized</p>
            <h2>Make space for<br /><em>what matters.</em></h2>
            <p>Choose a simple to-do list or plan the things you need to remember.</p>
          </div>
        </div>

        {/* Error / Success messages */}
        {error && (
          <div className="login-alert login-alert-error" role="alert">
            <span className="login-alert-icon">!</span>
            {error}
          </div>
        )}
        {success && (
          <div className="login-alert login-alert-success" role="alert">
            <span className="login-alert-icon">✓</span>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form" noValidate>
          {/* Name field (sign up only) */}
          {isSignUp && (
            <div className="login-input-group">
              <input
                id="login-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder=" "
                autoComplete="name"
                maxLength={50}
              />
              <label htmlFor="login-name">Full name</label>
              <div className="login-input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
            </div>
          )}

          {/* Email */}
          <div className="login-input-group">
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder=" "
              autoComplete="email"
              required
            />
            <label htmlFor="login-email">Email address</label>
            <div className="login-input-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M22 7l-10 7L2 7" />
              </svg>
            </div>
          </div>

          {/* Password */}
          <div className="login-input-group">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder=" "
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              required
              minLength={4}
            />
            <label htmlFor="login-password">Password</label>
            <div className="login-input-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <button
              type="button"
              className="login-password-toggle"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            >
              {showPassword ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>

          {/* Remember me */}
          <div className="login-options">
            <label className="login-remember">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <span className="login-checkbox-custom" />
              <span>Remember me</span>
            </label>
          </div>

          {/* Submit */}
          <button type="submit" className="login-submit" disabled={!!success}>
            <span className="login-submit-text">
              {success ? 'Redirecting…' : isSignUp ? 'Create account' : 'Sign in'}
            </span>
            <span className="login-submit-arrow">→</span>
          </button>
        </form>

        {/* Toggle mode */}
        <div className="login-footer">
          <p>
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button type="button" className="login-switch" onClick={switchMode}>
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>
          <div style={{ margin: '16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
            <span style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Or</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          </div>
          <button 
            type="button" 
            className="login-submit" 
            onClick={handleGuestLogin}
            style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--fg)', marginBottom: '12px' }}
          >
            <span className="login-submit-text">Continue as Guest</span>
          </button>
          <p style={{ fontSize: '11px', color: 'var(--muted)', lineHeight: '1.4' }}>
            Guest mode keeps all your data locally on this device. It will not sync to the cloud.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '16px' }}>
            <button 
              type="button"
              onClick={onShowPrivacyPolicy}
              style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '11px', textDecoration: 'underline', cursor: 'pointer' }}
            >
              Privacy Policy
            </button>
            <a 
              href="/flowlist.apk" 
              download="flowlist.apk"
              style={{ color: 'var(--purple)', fontSize: '11px', textDecoration: 'underline', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download App
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
