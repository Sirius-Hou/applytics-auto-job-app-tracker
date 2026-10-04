import { useEffect, useRef, useState } from 'react';
import { Field, request, type Runner } from './common';

export type SessionUser = { id: string; email: string; displayName: string | null };

export function Auth({
  run,
  busy,
  signedIn,
}: {
  run: Runner;
  busy: boolean;
  signedIn: (user: SessionUser) => void;
}) {
  const resetToken = new URLSearchParams(window.location.search).get('token') ?? '';
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset'>(() =>
    window.location.pathname === '/reset-password' ? 'reset' : 'login',
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [notice, setNotice] = useState('');
  const [developmentResetUrl, setDevelopmentResetUrl] = useState('');
  const [googleEnabled, setGoogleEnabled] = useState<boolean | null>(null);
  const googleButton = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    request<{ googleClientId: string | null }>('/auth/config').then(({ googleClientId }) => {
      if (cancelled) return;
      setGoogleEnabled(Boolean(googleClientId));
      if (!googleClientId) return;
      const start = () => {
        const google = (window as typeof window & { google?: any }).google;
        if (!google || !googleButton.current) return;
        google.accounts.id.initialize({
          client_id: googleClientId,
          callback: ({ credential }: { credential: string }) =>
            run(async () => signedIn(await request('/auth/google', 'POST', { credential }))),
        });
        google.accounts.id.renderButton(googleButton.current, {
          theme: 'outline',
          size: 'large',
          width: 360,
          text: 'continue_with',
        });
      };
      if ((window as typeof window & { google?: any }).google) return start();
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = start;
      document.head.appendChild(script);
    });
    return () => {
      cancelled = true;
    };
  }, [run, signedIn]);

  const submit = () =>
    run(async () => {
      const user = await request<SessionUser>(`/auth/${mode}`, 'POST', {
        email,
        password,
        ...(mode === 'register' && displayName ? { displayName } : {}),
      });
      signedIn(user);
    });

  const requestReset = () =>
    run(async () => {
      const result = await request<{ message: string; developmentResetUrl?: string }>(
        '/auth/forgot-password',
        'POST',
        { email },
      );
      setNotice(result.message);
      setDevelopmentResetUrl(result.developmentResetUrl ?? '');
    });

  const saveNewPassword = () =>
    run(async () => {
      if (!resetToken) throw new Error('This password reset link is missing its token.');
      if (password !== confirmPassword) throw new Error('The passwords do not match.');
      const result = await request<{ message: string }>('/auth/reset-password', 'POST', {
        token: resetToken,
        password,
      });
      window.history.replaceState({}, '', '/');
      setNotice(result.message);
      setPassword('');
      setConfirmPassword('');
      setMode('login');
    });

  const returnToSignIn = () => {
    window.history.replaceState({}, '', '/');
    setNotice('');
    setDevelopmentResetUrl('');
    setPassword('');
    setConfirmPassword('');
    setMode('login');
  };

  const title =
    mode === 'login'
      ? 'Welcome back'
      : mode === 'register'
        ? 'Create your account'
        : mode === 'forgot'
          ? 'Reset your password'
          : 'Choose a new password';
  const description =
    mode === 'forgot'
      ? 'Enter your account email and we will send you a secure reset link.'
      : mode === 'reset'
        ? 'Use at least 10 characters. This reset link can only be used once.'
        : 'Keep your applications and job data in your private workspace.';

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <span className="logo">a.</span>
          <strong>applytics</strong>
        </div>
        <h1>{title}</h1>
        <p>{description}</p>
        {(mode === 'login' || mode === 'register') && (
          <div className="auth-tabs">
            <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>
              Sign In
            </button>
            <button
              className={mode === 'register' ? 'active' : ''}
              onClick={() => setMode('register')}
            >
              Create Account
            </button>
          </div>
        )}
        {notice && <div className="auth-notice">{notice}</div>}
        {developmentResetUrl && (
          <a className="development-reset-link" href={developmentResetUrl}>
            Open local reset link
          </a>
        )}
        {mode === 'register' && (
          <Field name="Name (optional)" value={displayName} onChange={setDisplayName} />
        )}
        {mode === 'forgot' ? (
          <>
            <Field name="Email" type="email" value={email} onChange={setEmail} />
            <button
              className="primary auth-submit"
              disabled={busy || !email}
              onClick={requestReset}
            >
              {busy ? 'Sending…' : 'Send Reset Link'}
            </button>
            <button className="auth-text-button" onClick={returnToSignIn}>
              Back to Sign In
            </button>
          </>
        ) : mode === 'reset' ? (
          <>
            <Field name="New Password" type="password" value={password} onChange={setPassword} />
            <Field
              name="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
            />
            <button
              className="primary auth-submit"
              disabled={busy || !resetToken || password.length < 10 || password !== confirmPassword}
              onClick={saveNewPassword}
            >
              {busy ? 'Saving…' : 'Reset Password'}
            </button>
            <button className="auth-text-button" onClick={returnToSignIn}>
              Back to Sign In
            </button>
          </>
        ) : (
          <>
            <Field name="Email" type="email" value={email} onChange={setEmail} />
            <Field name="Password" type="password" value={password} onChange={setPassword} />
            {mode === 'login' && (
              <button className="forgot-password-link" onClick={() => setMode('forgot')}>
                Forgot password?
              </button>
            )}
            <button
              className="primary auth-submit"
              disabled={busy || !email || password.length < 10}
              onClick={submit}
            >
              {busy ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
            <div className="auth-divider">
              <span>or</span>
            </div>
            {googleEnabled === false ? (
              <button className="google-placeholder" disabled>
                Continue with Google · Setup required
              </button>
            ) : (
              <div ref={googleButton} className="google-button" />
            )}
            <small>Password must contain at least 10 characters.</small>
          </>
        )}
      </section>
    </main>
  );
}
