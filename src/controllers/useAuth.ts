import { useEffect, useRef, useState } from 'react';
import { request, type Runner } from '../components/common';
import type { SessionUser } from './types';

export type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

type Options = {
  run: Runner;
  signedIn: (user: SessionUser) => void;
};

export function useAuth({ run, signedIn }: Options) {
  const resetToken = new URLSearchParams(window.location.search).get('token') ?? '';
  const [mode, setMode] = useState<AuthMode>(() =>
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

  return {
    resetToken,
    mode,
    setMode,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    displayName,
    setDisplayName,
    notice,
    developmentResetUrl,
    resetTokenStatus,
    googleEnabled,
    googleButton,
    registrationPasswordInvalid: mode === 'register' && password.length > 0 && password.length < 5,
    submit,
    requestReset,
    saveNewPassword,
    returnToSignIn,
    requestAnotherReset,
  };
}
