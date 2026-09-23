# Confirmed parser corrections

Only add a rule here after the user confirms that it should apply to future job descriptions. Rules must be general, testable, and must not contain API keys or private application data.

## Active rules

- New-grad roles use category `NEW_GRAD`; their default full-time interpretation does not replace the more specific category.
- Explicit intern, internship, or co-op language takes precedence over new-grad language.
- A recruiting season paired with a year, such as `2027 Fall` or `Summer 2027`, defaults to `INTERNSHIP` unless the posting explicitly says it is a permanent non-intern role.
- Explicit `REMOTE` or `HYBRID` wording determines the work arrangement even when a location is listed. Otherwise, any specific work location or street address implies `ONSITE`. Return `UNKNOWN` only when neither a specific location/address nor an explicit work arrangement is present.
- When compensation uses an ambiguous `$`, infer `USD` from an unambiguous US job location or `CAD` from an unambiguous Canadian job location. Explicit currency text overrides location; mixed or unknown countries remain `null`.
- Requirement-section `content` must be copied verbatim. Filtered key requirements may omit generic boilerplate but every retained item must remain verbatim.
- Extract a deduplicated canonical set of explicitly named technical skills using the project's narrow twelve-type taxonomy. Keep tools narrow, use maintained technical-domain names, and exclude generic soft-skill boilerplate. Record whether each is minimum, preferred, or otherwise mentioned.
- Assign one primary and at most one secondary `roleSummary` tag for the work's dominant software-engineering direction; use `GENERAL_SWE` only when no specific direction is supported.
- Classify searchable skills from an ATS perspective: explicit required skills are `MINIMUM`; “a plus”, good-to-have, and relevant background/domain keywords are `PREFERRED`. Sort minimum skills first, then use the project's skill-type priority.
- Extract explicit numeric years-of-experience requirements and ranges. If none are stated, return `null` rather than assuming zero.
- NVIDIA-style `What we need to see` sections are minimum requirements, and `Ways to stand out from the crowd` sections are preferred requirements. Concrete items from these sections must populate the corresponding filtered key requirements.
