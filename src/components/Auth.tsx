import { Field, type Runner } from './common';
import type { SessionUser } from '../controllers/types';
import { useAuth } from '../controllers/useAuth';
export type { SessionUser } from '../controllers/types';

export function Auth({
  run,
  busy,
  signedIn,
}: {
  run: Runner;
  busy: boolean;
  signedIn: (user: SessionUser) => void;
}) {
  const {
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
    registrationPasswordInvalid,
    submit,
    requestReset,
    saveNewPassword,
    returnToSignIn,
    requestAnotherReset,
  } = useAuth({ run, signedIn });

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
