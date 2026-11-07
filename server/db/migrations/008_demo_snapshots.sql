CREATE TABLE IF NOT EXISTS demo_snapshots (
  email text PRIMARY KEY,
  applications jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
