ALTER TABLE jobs
  ADD COLUMN experience_min_years numeric,
  ADD COLUMN experience_max_years numeric,
  ADD COLUMN experience_text text,
  ADD COLUMN parser_model text,
  ADD COLUMN parser_version text,
  ADD CONSTRAINT jobs_experience_min_nonnegative CHECK(experience_min_years IS NULL OR experience_min_years >= 0),
  ADD CONSTRAINT jobs_experience_max_nonnegative CHECK(experience_max_years IS NULL OR experience_max_years >= 0),
  ADD CONSTRAINT jobs_experience_range_valid CHECK(experience_min_years IS NULL OR experience_max_years IS NULL OR experience_min_years <= experience_max_years);

CREATE TABLE key_requirements (
  id uuid PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  requirement_type text NOT NULL CHECK(requirement_type IN ('MINIMUM','PREFERRED')),
  content text NOT NULL,
  display_order integer NOT NULL
);

CREATE TABLE skills (
  id uuid PRIMARY KEY,
  canonical_name text NOT NULL,
  normalized_name text NOT NULL UNIQUE,
  skill_type text NOT NULL CHECK(skill_type IN ('LANGUAGE','FRAMEWORK_LIBRARY','TOOL_PLATFORM','DATABASE','DOMAIN','PRACTICE','SOFT_SKILL','OTHER')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE job_skills (
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES skills(id),
  requirement_type text NOT NULL CHECK(requirement_type IN ('MINIMUM','PREFERRED','OTHER')),
  display_order integer NOT NULL,
  PRIMARY KEY(job_id, skill_id)
);

CREATE INDEX key_requirements_job_idx ON key_requirements(job_id, requirement_type, display_order);
CREATE INDEX job_skills_skill_idx ON job_skills(skill_id, job_id);
CREATE INDEX job_skills_job_idx ON job_skills(job_id, display_order);
