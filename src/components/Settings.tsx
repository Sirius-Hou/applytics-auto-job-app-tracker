import { useEffect, useState } from 'react';
import type { SessionUser } from './Auth';
import { request, type Runner } from './common';

const deleteConfirmation = 'DELETE';

export function Settings({
  user,
  run,
  signedOut,
}: {
  user: SessionUser;
  run: Runner;
  signedOut: () => void;
}) {
  const [showDelete, setShowDelete] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPasswordError, setCurrentPasswordError] = useState('');
  const [passwordModalError, setPasswordModalError] = useState('');
  const [passwordNotice, setPasswordNotice] = useState('');
  const [developmentResetUrl, setDevelopmentResetUrl] = useState('');
  const [passwordWorking, setPasswordWorking] = useState(false);

  const closeDelete = () => {
    setShowDelete(false);
    setConfirmation('');
  };

  const closeChangePassword = () => {
    setShowChangePassword(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setCurrentPasswordError('');
    setPasswordModalError('');
    setPasswordNotice('');
    setDevelopmentResetUrl('');
  };

  const openChangePassword = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setCurrentPasswordError('');
    setPasswordModalError('');
    setPasswordNotice('');
    setDevelopmentResetUrl('');
    setShowChangePassword(true);
  };

  useEffect(() => {
    if (!showDelete && !showChangePassword) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (showDelete) closeDelete();
      if (showChangePassword) closeChangePassword();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [showDelete, showChangePassword]);

  const newPasswordInvalid = newPassword.length > 0 && newPassword.length < 5;
  const passwordsDoNotMatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  return (
    <>
      <div className="title-row">
        <div>
          <h1>Settings</h1>
          <p>Manage your Applytics account.</p>
        </div>
      </div>
      <section className="panel settings-card">
        <h2>Account</h2>
        <dl>
          {user.displayName && (
            <>
              <dt>Name</dt>
              <dd>{user.displayName}</dd>
            </>
          )}
          <dt>Email</dt>
          <dd>{user.email}</dd>
        </dl>
        <div className="account-actions">
          <button onClick={openChangePassword}>Change password</button>
          <button
            className="sign-out-button"
            onClick={() =>
              run(async () => {
                await request('/auth/logout', 'POST');
                signedOut();
              })
            }
          >
            Sign Out
          </button>
        </div>
      </section>
      {showChangePassword && (
        <div className="modal-backdrop" onMouseDown={closeChangePassword}>
          <div
            className="settings-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="change-password-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className="modal-close-button" aria-label="Close" onClick={closeChangePassword}>
              ×
            </button>
            <h2 id="change-password-title">Change password</h2>
            <p>Enter your current password, then choose a new password.</p>
            {passwordNotice && <div className="password-modal-notice">{passwordNotice}</div>}
            {passwordModalError && (
              <div className="password-modal-error" role="alert">
                {passwordModalError}
              </div>
            )}
            {developmentResetUrl && (
              <a className="password-reset-development-link" href={developmentResetUrl}>
                Open local reset link
              </a>
            )}
            <div className="password-fields">
              <label className={currentPasswordError ? 'auth-field-invalid' : ''}>
                Current password
                <input
                  autoFocus
                  autoComplete="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(event) => {
                    setCurrentPassword(event.target.value);
                    setCurrentPasswordError('');
                    setPasswordModalError('');
                  }}
                  aria-invalid={Boolean(currentPasswordError)}
                  aria-describedby={currentPasswordError ? 'current-password-error' : undefined}
                />
                {currentPasswordError && (
                  <span id="current-password-error" className="auth-field-error" role="alert">
                    {currentPasswordError}
                  </span>
                )}
              </label>
              <button
                className="password-reset-link"
                disabled={passwordWorking}
                onClick={() => {
                  void run(async () => {
                    setPasswordWorking(true);
                    try {
                      const result = await request<{
                        message: string;
                        developmentResetUrl?: string;
                      }>('/auth/account/password-reset', 'POST');
                      setPasswordNotice(result.message);
                      setDevelopmentResetUrl(result.developmentResetUrl ?? '');
                    } finally {
                      setPasswordWorking(false);
                    }
                  });
                }}
              >
                Forgot your current password? Send a reset link
              </button>
              <label className={newPasswordInvalid ? 'auth-field-invalid' : ''}>
                New password
                <input
                  autoComplete="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  aria-invalid={newPasswordInvalid}
                />
                {newPasswordInvalid && (
                  <span className="auth-field-error" role="alert">
                    Password must contain at least 5 characters.
                  </span>
                )}
              </label>
              <label className={passwordsDoNotMatch ? 'auth-field-invalid' : ''}>
                Confirm new password
                <input
                  autoComplete="new-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  aria-invalid={passwordsDoNotMatch}
                />
                {passwordsDoNotMatch && (
                  <span className="auth-field-error" role="alert">
                    Passwords do not match.
                  </span>
                )}
              </label>
            </div>
            <div className="settings-modal-actions">
              <button onClick={closeChangePassword}>Cancel</button>
              <button
                className="primary"
                disabled={
                  passwordWorking ||
                  !currentPassword ||
                  newPassword.length < 5 ||
                  newPassword !== confirmPassword
                }
                onClick={() => {
                  void (async () => {
                    setPasswordWorking(true);
                    setCurrentPasswordError('');
                    setPasswordModalError('');
                    setPasswordNotice('');
                    try {
                      await request('/auth/change-password', 'POST', {
                        currentPassword,
                        newPassword,
                      });
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                      setPasswordNotice('Your password has been changed.');
                    } catch (error) {
                      const message =
                        error instanceof Error ? error.message : 'Unable to change password';
                      if (message === 'Current password is incorrect') {
                        setCurrentPasswordError(
                          'Current password does not match your existing password.',
                        );
                      } else {
                        setPasswordModalError(message);
                      }
                    } finally {
                      setPasswordWorking(false);
                    }
                  })();
                }}
              >
                {passwordWorking ? 'Please wait…' : 'Change password'}
              </button>
            </div>
          </div>
        </div>
      )}
      <section className="panel settings-card account-danger-zone">
        <div className="account-danger-heading">
          <div>
            <h2>Delete account</h2>
            <p>
              Permanently delete your account and all application data. This action cannot be
              undone.
            </p>
          </div>
          <button className="delete-account-outline" onClick={() => setShowDelete(true)}>
            Delete account
          </button>
        </div>
        {showDelete && (
          <div className="modal-backdrop" onMouseDown={closeDelete}>
            <div
              className="settings-modal danger-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-account-title"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <button className="modal-close-button" aria-label="Close" onClick={closeDelete}>
                ×
              </button>
              <h2 id="delete-account-title">Delete your account?</h2>
              <p>
                This will permanently delete your Applytics account and all application data. This
                action cannot be undone.
              </p>
              <label>
                Type <strong>{deleteConfirmation}</strong> to confirm
                <input
                  autoFocus
                  autoComplete="off"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  aria-label="Type DELETE to confirm"
                />
              </label>
              <div className="delete-account-actions">
                <button onClick={closeDelete}>Cancel</button>
                <button
                  className="delete-account-confirm-button"
                  disabled={confirmation !== deleteConfirmation}
                  onClick={() => {
                    if (confirmation !== deleteConfirmation) return;
                    void run(async () => {
                      await request('/auth/account', 'DELETE', { confirmation });
                      signedOut();
                    });
                  }}
                >
                  Delete account
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
