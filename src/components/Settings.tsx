import type { SessionUser } from './Auth';
import { request, type Runner } from './common';

export function Settings({
  user,
  run,
  signedOut,
}: {
  user: SessionUser;
  run: Runner;
  signedOut: () => void;
}) {
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
      </section>
    </>
  );
}
