CREATE TABLE users (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE,
  password_hash text,
  google_sub text UNIQUE,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK(password_hash IS NOT NULL OR google_sub IS NOT NULL)
);

CREATE TABLE auth_sessions (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX auth_sessions_user_idx ON auth_sessions(user_id);
CREATE INDEX auth_sessions_expiry_idx ON auth_sessions(expires_at);

ALTER TABLE applications ADD COLUMN user_id uuid REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX applications_user_idx ON applications(user_id, updated_at DESC);
