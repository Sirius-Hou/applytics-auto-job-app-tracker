# Applytics V2 Regression Checklist

Use this checklist against the current implementation before replacing a screen and again after each V2 migration slice. Test with at least two accounts to prove owner isolation.

## 1. Startup, routing, and shell

- [ ] Signed-out startup checks `/api/auth/session` and shows a loading state before auth UI.
- [ ] Signed-in startup restores the session after refresh.
- [ ] `/reset-password?token=...` renders the reset flow without requiring a session.
- [ ] Unknown non-API GET paths still serve the SPA without breaking reset routing.
- [ ] My Applications, Add Application, and Settings navigation remains available after sign-in.
- [ ] Returning from detail to list preserves a coherent list state.
- [ ] API errors are visible and do not leave the UI permanently busy.

## 2. Registration and email/password login

- [ ] Create account accepts optional display name.
- [ ] Email is trimmed, lowercased, and validated.
- [ ] Registration password shorter than 5 characters is rejected and shown inline.
- [ ] Duplicate email returns a clear conflict error.
- [ ] Successful registration signs the user in and creates a session cookie.
- [ ] A login password becomes submittable when non-empty, even below 5 characters.
- [ ] Correct email/password signs in.
- [ ] Incorrect email or password returns the generic authentication error.
- [ ] Passwords are never returned to the browser or logged.
- [ ] Session survives a normal page refresh.
- [ ] Expired/missing session returns to auth.
- [ ] Sign out deletes the session, clears the cookie, and returns to auth.

## 3. Google authentication

- [ ] Google button renders only when a client ID is configured.
- [ ] Missing Google configuration shows the setup-required state without breaking email login.
- [ ] Valid Google credential signs in or creates an account.
- [ ] Google email must be verified.
- [ ] Existing email account is linked instead of duplicated.
- [ ] Invalid credential/audience is rejected.
- [ ] Google-only account can establish a password through email reset.

## 4. Forgot/reset password

- [ ] Forgot-password accepts a valid email.
- [ ] Existing and nonexistent emails receive the same generic response.
- [ ] Production sends through Resend and never exposes the raw reset URL.
- [ ] Development without mail configuration exposes only the local test link.
- [ ] Requesting a new link invalidates older unused links.
- [ ] Reset URL token is validated before showing password inputs.
- [ ] Missing, malformed, expired, used, or unknown token shows invalid-link UI.
- [ ] New password requires at least 5 characters.
- [ ] Confirm password must match in the UI.
- [ ] Successful reset consumes the token.
- [ ] Reusing the token fails.
- [ ] Successful reset invalidates all prior sessions.
- [ ] New password signs in; old password no longer does.
- [ ] Production reset rate limits remain enforced per IP and email.

## 5. Settings and account management

- [ ] Settings shows current display name when present and account email.
- [ ] Change-password modal opens and closes by Cancel, close control, backdrop, and Escape.
- [ ] New password length and confirmation are validated inline.
- [ ] Wrong current password keeps the modal open, marks the current field red, and renders its error above the backdrop.
- [ ] Correct current password changes the password.
- [ ] Successful change closes the modal and shows a top toast for about 3.5 seconds.
- [ ] Old password fails and new password succeeds after change.
- [ ] Google-only/no-password account receives the email-reset guidance.
- [ ] Protected reset-email action always targets the session user's email.
- [ ] Delete-account modal opens/closes safely without deletion.
- [ ] Final delete action stays disabled until exact `DELETE` is entered.
- [ ] Lowercase or surrounding text does not satisfy confirmation.
- [ ] Successful account deletion signs the user out and invalidates the old session.
- [ ] Deleted user's applications/events/reset tokens are gone.
- [ ] Jobs/companies/skills still used by another user remain intact.

## 6. Application list, search, filters, and pagination

- [ ] List request is authenticated and owner-scoped.
- [ ] Default page size is 25.
- [ ] Page sizes 10, 25, 50, and 100 work.
- [ ] Total count matches records for the same filters.
- [ ] Previous/next enablement and page count are correct.
- [ ] Changing a filter resets to page 1.
- [ ] List updates after the 200 ms input debounce.
- [ ] Clear all removes active filters and resets page.
- [ ] Job title substring filter works case-insensitively.
- [ ] Company substring filter works case-insensitively.
- [ ] Country multi-select uses any selected country without duplicate applications.
- [ ] Employment type multi-select works.
- [ ] Application status multi-select works.
- [ ] Work setting multi-select works.
- [ ] Recruiting term multi-select works.
- [ ] Applied-within values 1d, 1w, 1m, 2m, 3m, 6m, 1y, and 2y work.
- [ ] From/to dates include the complete selected end date.
- [ ] Reversed date range is rejected.
- [ ] Application year works.
- [ ] Location/state/province text works across location fields.
- [ ] Backend general query searches title/raw JD, company, skills, and key requirements.
- [ ] Backend exact skill, role, and interview-only filters remain functional.
- [ ] Recently Updated is the default sort.
- [ ] Newest Applied, Oldest Applied, Company A–Z, and Status sorts work deterministically.
- [ ] Loading, API-error, zero-data, and no-match states are distinguishable.
- [ ] Another user's records never appear in rows or totals.

## 7. Dashboard statistics and backend analytics

- [ ] Total statistic matches unfiltered application total.
- [ ] Past-month statistic matches `appliedWithin=1m`.
- [ ] Past-year statistic matches `appliedWithin=1y`.
- [ ] Carousel previous/next wraps correctly.
- [ ] Direct statistic dots select the expected card.
- [ ] Carousel remains usable with reduced-motion preference.
- [ ] `/api/skills` remains owner-scoped and returns correct minimum/preferred/other counts.
- [ ] `/api/roles` remains owner-scoped.
- [ ] `/api/analytics/overview` excludes `SAVED` and returns correct country/company/month/role breakdowns.
- [ ] Analytics period, custom date range, and company filter retain their current semantics.

## 8. AI parsing

- [ ] Job URL accepts only HTTP(S).
- [ ] Raw JD is required and supports the current maximum size.
- [ ] Editing URL or raw JD after a parse clears stale parsed state.
- [ ] Parse requires authentication.
- [ ] Parse button prevents duplicate submission while busy.
- [ ] Configured model, reasoning effort, token cap, and timeout are used.
- [ ] OpenAI request uses strict JSON Schema and `store:false`.
- [ ] JD is explicitly treated as untrusted source data.
- [ ] API HTTP failures, timeouts, non-completed status, refusal, empty output, invalid JSON, and schema errors surface safely.
- [ ] Company/title/category/term/year/work arrangement are returned in contract shape.
- [ ] Role summary has one or two unique allowed tags.
- [ ] Locations, compensation, requirement sections, key requirements, skills, and experience satisfy schemas.
- [ ] Requirement section display order is zero-based and consecutive.
- [ ] Skills are normalized, deduplicated, and sorted consistently.
- [ ] Verbatim requirement and compensation/experience source fields are source-backed.
- [ ] Compensation range restoration still works when the model leaves numeric bounds empty.
- [ ] Exact original JD and original URL are attached after parse.
- [ ] Parser model/version metadata is retained.
- [ ] No database write occurs during parse.

## 9. Review and save application

- [ ] Every returned `Job` field is represented in review state, even if the V2 layout changes.
- [ ] Company and title can be corrected.
- [ ] Employment type, term, recruiting year, and work setting can be corrected.
- [ ] Canonical URL can be added/removed.
- [ ] Primary and optional secondary role tags can be corrected.
- [ ] Locations can be edited, added, and removed.
- [ ] Compensation can be edited, added, and removed.
- [ ] Requirement sections can be edited, added, and removed without corrupting order.
- [ ] Skills can be edited, typed, leveled, added, and removed.
- [ ] Explicit experience range can be edited, added, and removed.
- [ ] Initial status, application date, and notes can be set.
- [ ] Save validates the complete reviewed object server-side.
- [ ] Save transaction rolls back entirely on any relational insert failure.
- [ ] Original raw JD remains byte-for-byte equivalent to the submitted value.
- [ ] Company normalization avoids case/whitespace duplicates.
- [ ] Skill normalization avoids duplicates within a job and across the dictionary.
- [ ] Initial timeline event matches initial status/date and has empty notes.
- [ ] Successful save opens detail, refreshes later list/stat data, and shows success toast.

## 10. Application detail

- [ ] Detail fetch is owner-scoped; another user's UUID returns 404.
- [ ] Company, title, status, and non-unknown metadata display correctly.
- [ ] Original and canonical links are safe external links.
- [ ] Role tags remain ordered.
- [ ] All locations remain ordered and visible.
- [ ] Compensation preserves currency, bounds, pay period, and source text.
- [ ] Experience handles range, minimum-only, maximum-only, and null.
- [ ] Core and preferred/other skills retain expected priority ordering.
- [ ] Requirement headings/content remain in source order and render as readable bullets.
- [ ] Full raw JD is complete and can be collapsed/expanded.
- [ ] Application date and notes can be changed and persisted.
- [ ] Changing application date leaves timeline event dates unchanged.
- [ ] Structured job fields are not presented as persistently editable unless a new backend feature is approved.

## 11. Timeline and status lifecycle

- [ ] Events render newest first by date and sequence.
- [ ] Event notes display, except legacy `Initial application record` copy is suppressed.
- [ ] New status event accepts allowed status, date, and notes.
- [ ] Adding an event updates current status from the latest event.
- [ ] Older backdated event does not incorrectly replace a newer status.
- [ ] Editing event type/date/notes persists and recomputes current status.
- [ ] Deleting an event requires confirmation and recomputes current status.
- [ ] Deleting the last event sets status to `SAVED`.
- [ ] Event mutations reject another user's application/event.
- [ ] Concurrent event mutations retain the owner lock/transaction behavior.

## 12. Application deletion

- [ ] Delete requires explicit confirmation.
- [ ] Deleting another user's application returns not found.
- [ ] Successful deletion removes application and cascades events.
- [ ] Orphan job and company are removed.
- [ ] Shared job/company still referenced elsewhere remains.
- [ ] UI returns to list, refreshes totals, and shows deletion toast.

## 13. Platform, security, and operational behavior

- [ ] Cross-origin protection rejects untrusted origins and permits configured same-host/local development use.
- [ ] JSON body limit remains 2 MB.
- [ ] Zod failures return 400 JSON without leaking secrets.
- [ ] Unexpected errors return the generic 500 response.
- [ ] Every database value remains parameterized.
- [ ] Multi-write operations remain transactional.
- [ ] Migrations stay ordered, idempotent, and advisory-locked.
- [ ] `/api/health` verifies database connectivity.
- [ ] Production serves the built SPA and API from one service.
- [ ] Vite development proxy still reaches Express.
- [ ] Secrets remain server-side and ignored by Git.
- [ ] `npm run db:backup` produces a consistent JSON snapshot and SHA-256 checksum without modifying data.
- [ ] `npm run build`, `npm test`, and `npm run test:db` pass before merging V2 work.

## 14. Presentation/accessibility checks for V2

- [ ] All functionality is reachable by keyboard.
- [ ] Form controls retain programmatic labels.
- [ ] Icon-only actions retain accessible names and tooltips where useful.
- [ ] Modals expose dialog semantics, trap/manage focus, close safely, and restore focus.
- [ ] Status is communicated with text as well as color.
- [ ] Focus indicators remain visible.
- [ ] Destructive actions use restrained but unmistakable danger semantics.
- [ ] Tables remain readable on desktop and adapt without data loss on mobile.
- [ ] Long company names, titles, locations, requirement text, notes, and raw JDs do not overflow.
- [ ] Loading UI prevents accidental duplicate mutations.
- [ ] Reduced-motion users can use every interaction.
- [ ] Empty, loading, success, validation, authentication, and server-error states are all represented.
