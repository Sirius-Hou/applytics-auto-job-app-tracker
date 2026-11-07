ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_current_status_check;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS current_status_name text;
ALTER TABLE applications ADD CONSTRAINT applications_current_status_check
  CHECK(current_status IN ('SAVED','APPLIED','OA','RECRUITER_SCREEN','PHONE_SCREEN','TECHNICAL_INTERVIEW','ONSITE_INTERVIEW','FINAL_INTERVIEW','OFFER','REJECTED','WITHDRAWN','GHOSTED','OTHER'));
ALTER TABLE applications ADD CONSTRAINT applications_custom_status_check
  CHECK((current_status='OTHER') = (current_status_name IS NOT NULL));

ALTER TABLE application_events DROP CONSTRAINT IF EXISTS application_events_event_type_check;
ALTER TABLE application_events ADD COLUMN IF NOT EXISTS custom_status_name text;
ALTER TABLE application_events ADD CONSTRAINT application_events_event_type_check
  CHECK(event_type IN ('SAVED','APPLIED','OA','RECRUITER_SCREEN','PHONE_SCREEN','TECHNICAL_INTERVIEW','ONSITE_INTERVIEW','FINAL_INTERVIEW','OFFER','REJECTED','WITHDRAWN','GHOSTED','OTHER'));
ALTER TABLE application_events ADD CONSTRAINT application_events_custom_status_check
  CHECK((event_type='OTHER') = (custom_status_name IS NOT NULL));
