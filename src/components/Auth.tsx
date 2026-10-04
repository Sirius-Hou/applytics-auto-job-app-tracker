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
  const [resetTokenStatus, setResetTokenStatus] = useState<'checking' | 'valid' | 'invalid'>(
    mode === 'reset' ? 'checking' : 'valid',
  );
  const [googleEnabled, setGoogleEnabled] = useState<boolean | null>(null);
  const googleButton = useRef<HTMLDivElement>(null);
  const registrationPasswordInvalid =
    mode === 'register' && password.length > 0 && password.length < 5;

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
          text: 'signin_with',
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

  useEffect(() => {
    if (mode !== 'reset') return;
    if (!resetToken) {
      setResetTokenStatus('invalid');
      return;
    }
    let cancelled = false;
    request<{ valid: boolean }>('/auth/validate-reset-token', 'POST', { token: resetToken })
      .then(({ valid }) => {
        if (!cancelled) setResetTokenStatus(valid ? 'valid' : 'invalid');
      })
      .catch(() => {
        if (!cancelled) setResetTokenStatus('invalid');
      });
    return () => {
      cancelled = true;
    };
  }, [mode, resetToken]);

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

  const requestAnotherReset = () => {
    window.history.replaceState({}, '', '/');
    setNotice('');
    setDevelopmentResetUrl('');
    setPassword('');
    setConfirmPassword('');
    setMode('forgot');
  };

  const title =
    mode === 'login'
      ? 'Sign in to your account'
      : mode === 'register'
        ? 'Create your account'
        : mode === 'forgot'
          ? 'Reset your password'
          : 'Choose a new password';
  const description =
    mode === 'forgot'
      ? 'Enter your account email and we will send you a secure reset link.'
      : mode === 'reset'
        ? 'Use at least 5 characters. This reset link can only be used once.'
        : 'Keep your applications and job data in your private workspace.';

  if (mode === 'reset' && resetTokenStatus !== 'valid') {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <div className="auth-brand">
            <span className="logo">a.</span>
            <strong>applytics</strong>
          </div>
          {resetTokenStatus === 'checking' ? (
            <>
              <h1>Checking reset link…</h1>
              <p>Please wait while we verify this password reset link.</p>
            </>
          ) : (
            <>
              <div role="alert" className="invalid-reset-alert">
                This password reset link is invalid or has expired.
              </div>
              <h1>Request a new link</h1>
              <p>Password reset links expire after 30 minutes and can only be used once.</p>
              <button className="primary auth-submit" onClick={requestAnotherReset}>
                Send a New Reset Link
              </button>
              <button className="auth-text-button" onClick={returnToSignIn}>
                Back to Sign In
              </button>
            </>
          )}
        </section>
      </main>
    );
  }

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
              disabled={busy || !resetToken || password.length < 5 || password !== confirmPassword}
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
            {mode === 'register' ? (
              <label className={registrationPasswordInvalid ? 'auth-field-invalid' : ''}>
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  aria-invalid={registrationPasswordInvalid}
                  aria-describedby={
                    registrationPasswordInvalid ? 'registration-password-error' : undefined
                  }
                />
                {registrationPasswordInvalid && (
                  <span id="registration-password-error" className="auth-field-error" role="alert">
                    Password must contain at least 5 characters.
                  </span>
                )}
              </label>
            ) : (
              <Field name="Password" type="password" value={password} onChange={setPassword} />
            )}
            {mode === 'login' && (
              <button className="forgot-password-link" onClick={() => setMode('forgot')}>
                Forgot password?
              </button>
            )}
            <button
              className="primary auth-submit"
              disabled={busy || !email || !password || (mode === 'register' && password.length < 5)}
              onClick={submit}
            >
              {busy ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
            <div className="auth-divider">
              <span>or</span>
            </div>
            {googleEnabled === false ? (
              <button className="google-placeholder" disabled>
                Sign in with Google · Setup required
              </button>
            ) : (
              <div ref={googleButton} className="google-button" />
            )}
          </>
        )}
      </section>
    </main>
  );
}
