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
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
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

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <span className="logo">a.</span>
          <strong>applytics</strong>
        </div>
        <h1>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
        <p>Keep your applications and job data in your private workspace.</p>
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
        {mode === 'register' && (
          <Field name="Name (optional)" value={displayName} onChange={setDisplayName} />
        )}
        <Field name="Email" type="email" value={email} onChange={setEmail} />
        <Field name="Password" type="password" value={password} onChange={setPassword} />
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
      </section>
    </main>
  );
}
