CREATE TABLE companies (id uuid PRIMARY KEY, name text NOT NULL, normalized_name text NOT NULL UNIQUE);
CREATE TABLE jobs (
 id uuid PRIMARY KEY, company_id uuid REFERENCES companies(id), title text,
 category text NOT NULL CHECK(category IN ('INTERNSHIP','FULL_TIME','NEW_GRAD','COOP','PART_TIME','CONTRACT','TEMPORARY','UNKNOWN')),
 term text NOT NULL CHECK(term IN ('SUMMER','FALL','WINTER','SPRING','UNKNOWN')),
 work_arrangement text NOT NULL CHECK(work_arrangement IN ('ONSITE','HYBRID','REMOTE','UNKNOWN')),
 original_url text NOT NULL, canonical_url text, raw_jd text NOT NULL,
 compensation_currency text, compensation_minimum numeric, compensation_maximum numeric,
 compensation_period text CHECK(compensation_period IN ('HOUR','DAY','WEEK','MONTH','YEAR','UNKNOWN')), compensation_text text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(compensation_minimum IS NULL OR compensation_minimum>=0), CHECK(compensation_maximum IS NULL OR compensation_maximum>=0),
 CHECK(compensation_minimum IS NULL OR compensation_maximum IS NULL OR compensation_minimum<=compensation_maximum)
);
CREATE TABLE job_locations(id uuid PRIMARY KEY,job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,raw_text text NOT NULL,city text,region text,country_code varchar(2),display_order integer NOT NULL);
CREATE TABLE requirement_sections(id uuid PRIMARY KEY,job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,raw_heading text NOT NULL,type text NOT NULL CHECK(type IN ('MINIMUM','PREFERRED','OTHER','UNKNOWN')),content text NOT NULL,display_order integer NOT NULL);
CREATE TABLE applications(id uuid PRIMARY KEY,job_id uuid NOT NULL REFERENCES jobs(id),current_status text NOT NULL CHECK(current_status IN ('SAVED','APPLIED','OA','RECRUITER_SCREEN','PHONE_SCREEN','TECHNICAL_INTERVIEW','ONSITE_INTERVIEW','FINAL_INTERVIEW','OFFER','REJECTED','WITHDRAWN','GHOSTED')),applied_at timestamptz NOT NULL DEFAULT now(),notes text NOT NULL DEFAULT '',created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE application_events(id uuid PRIMARY KEY,application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,event_type text NOT NULL CHECK(event_type IN ('SAVED','APPLIED','OA','RECRUITER_SCREEN','PHONE_SCREEN','TECHNICAL_INTERVIEW','ONSITE_INTERVIEW','FINAL_INTERVIEW','OFFER','REJECTED','WITHDRAWN','GHOSTED')),occurred_at timestamptz NOT NULL,notes text NOT NULL DEFAULT '',created_at timestamptz NOT NULL DEFAULT now(),sequence bigint GENERATED ALWAYS AS IDENTITY UNIQUE);
CREATE INDEX jobs_company_idx ON jobs(company_id);
CREATE INDEX jobs_filters_idx ON jobs(category,term,work_arrangement);
CREATE INDEX jobs_search_idx ON jobs USING gin(to_tsvector('english',coalesce(title,'') || ' ' || raw_jd));
CREATE INDEX locations_job_idx ON job_locations(job_id);
CREATE INDEX locations_country_idx ON job_locations(country_code,job_id);
CREATE INDEX sections_job_idx ON requirement_sections(job_id,display_order);
CREATE INDEX applications_date_idx ON applications(applied_at DESC);
CREATE INDEX applications_status_idx ON applications(current_status);
CREATE INDEX applications_job_idx ON applications(job_id);
CREATE INDEX events_application_idx ON application_events(application_id,occurred_at DESC,sequence DESC);
