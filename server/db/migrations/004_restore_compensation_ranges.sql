WITH parsed AS (
  SELECT id, regexp_match(
    compensation_text,
    '(?:CA|US|C)?\$?\s*([0-9][0-9,]*(?:\.[0-9]+)?)\s*(?:-|–|to)\s*(?:CA|US|C)?\$?\s*([0-9][0-9,]*(?:\.[0-9]+)?)',
    'i'
  ) AS amounts
  FROM jobs
  WHERE compensation_text IS NOT NULL
    AND (compensation_minimum IS NULL OR compensation_maximum IS NULL)
)
UPDATE jobs j
SET compensation_minimum = replace(parsed.amounts[1], ',', '')::numeric,
    compensation_maximum = replace(parsed.amounts[2], ',', '')::numeric,
    updated_at = now()
FROM parsed
WHERE j.id = parsed.id
  AND parsed.amounts IS NOT NULL
  AND replace(parsed.amounts[1], ',', '')::numeric <= replace(parsed.amounts[2], ',', '')::numeric;
