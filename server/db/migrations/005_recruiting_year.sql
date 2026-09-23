ALTER TABLE jobs
  ADD COLUMN recruiting_year integer,
  ADD CONSTRAINT jobs_recruiting_year_valid
    CHECK(recruiting_year IS NULL OR recruiting_year BETWEEN 2000 AND 2100);

WITH source AS (
  SELECT id, concat_ws(' ', title, raw_jd) AS text
  FROM jobs
), parsed AS (
  SELECT id, coalesce(
    (regexp_match(text, '(?:summer|fall|winter|spring)[^0-9]{0,12}(20[0-9]{2})', 'i'))[1],
    (regexp_match(text, '(20[0-9]{2})[^0-9]{0,12}(?:summer|fall|winter|spring)', 'i'))[1]
  ) AS year
  FROM source
)
UPDATE jobs j
SET recruiting_year = parsed.year::integer
FROM parsed
WHERE j.id = parsed.id AND parsed.year IS NOT NULL;
