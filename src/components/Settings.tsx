import type { SessionUser } from './Auth';
import type { Runner } from './common';
import { deleteConfirmation, useAccountSettings } from '../controllers/useAccountSettings';

export function Settings({
  user,
  run,
  signedOut,
  passwordChanged,
}: {
  user: SessionUser;
  run: Runner;
  signedOut: () => void;
  passwordChanged: () => void;
}) {
  const settings = useAccountSettings({ run, signedOut, passwordChanged });
  const {
    showDelete,
    openDelete,
    closeDelete,
    showChangePassword,
    openChangePassword,
    closeChangePassword,
    confirmation,
    setConfirmation,
    currentPassword,
    updateCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    currentPasswordError,
    passwordModalError,
    passwordNotice,
    developmentResetUrl,
    passwordWorking,
    newPasswordInvalid,
    passwordsDoNotMatch,
    signOut,
    sendPasswordReset,
    changePassword,
    deleteAccount,
  } = settings;

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
          <button className="sign-out-button" onClick={signOut}>
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
                    updateCurrentPassword(event.target.value);
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
                onClick={sendPasswordReset}
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
                onClick={() => void changePassword()}
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
          <button className="delete-account-outline" onClick={openDelete}>
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
                  onClick={deleteAccount}
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
