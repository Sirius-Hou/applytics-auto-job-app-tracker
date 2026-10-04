# Applytics V2 Preparation

## Purpose

This phase separates frontend workflows from the current presentation without changing the product, API contracts, backend, URL behavior, or visual language. The existing screens now consume explicit controller hooks that can support a later presentation replacement.

The functionality freeze in `functionality-audit.md` remains authoritative.

## Behavior extracted

- Startup session restoration and the `undefined` / `null` / signed-in user states.
- Shared async execution with the existing global busy and error semantics.
- Application list filters, comma-compatible query serialization, pagination, the 200 ms debounce, list result state, and the three existing dashboard statistic requests.
- Toast state and the existing 3.5-second display duration.
- Add Application state for raw JD, URL, complete mutable `Job`, initial status/date/notes, parse, parsed-result invalidation, and save.
- Application Detail state and requests for notes/date changes, event creation/editing/deletion, and application deletion.
- Settings state and workflows for password changes, protected reset email, sign out, exact `DELETE` confirmation, modal reset, and Escape handling.
- Authentication mode state, email/password registration and login, Google configuration/script/callback behavior, forgot password, reset URL detection, reset-token validation, and password reset.

## New controllers and types

| File                                      | Responsibility                                               |
| ----------------------------------------- | ------------------------------------------------------------ |
| `src/controllers/types.ts`                | Frontend session, list-row, and in-memory view types         |
| `src/controllers/useAsyncStatus.ts`       | Existing `run(fn)`, global busy, and global error behavior   |
| `src/controllers/useSession.ts`           | Startup `GET /api/auth/session` restoration                  |
| `src/controllers/useNotifications.ts`     | Existing toast state and 3500 ms timer                       |
| `src/controllers/useApplicationList.ts`   | List/query/filter/page/statistics behavior                   |
| `src/controllers/useAddApplication.ts`    | Parse, review state, invalidation, and save workflow         |
| `src/controllers/useApplicationDetail.ts` | Application and timeline mutation behavior                   |
| `src/controllers/useAccountSettings.ts`   | Password, reset-email, logout, and account-deletion behavior |
| `src/controllers/useAuth.ts`              | Authentication, Google, and password-reset behavior          |

## Remaining mixed responsibilities

- `src/main.tsx` still owns in-memory navigation, selected detail, revision increments, and the mapping from completed mutations to view transitions/toasts. These operations connect otherwise separate feature controllers and were left together to preserve current navigation semantics without introducing a router or global store.
- `src/main.tsx` still renders the complete application list/dashboard. A separate list view can replace this markup later while consuming `useApplicationList`.
- `Auth.tsx`, `Add.tsx`, `Detail.tsx`, and `Settings.tsx` retain small presentation decisions such as destructive confirmation prompts, field-level formatting, and button eligibility. The network workflows and durable feature state are in controllers.
- `common.tsx` remains intentionally unchanged because its request errors, date conversions, label normalization, and comma-separated multi-select format are functional contracts as well as UI utilities.
- Requirement bullet formatting and skill priority sorting remain in `Detail.tsx` because they directly determine current rendering semantics.

## Protected boundaries

No files under these protected backend/shared boundaries changed:

- `server/ai/job-parser/**`
- `server/auth.ts`
- `server/routes.ts`
- `server/repositories/applications.ts`
- `server/db/**`
- `server/app.ts`
- `shared/contracts.ts`

There is still no router dependency. `/reset-password?token=...` continues to use the direct path and query-string checks. Hidden backend APIs remain unexposed.

## Preserved workflow contracts

- Editing raw JD or URL after parsing clears the current parsed object.
- Parsing returns an unsaved complete `Job`; it does not persist an application.
- Save sends the same reviewed `Job`, status, local-noon ISO application date, and notes contract.
- List changes still wait 200 ms; filter changes and clear-all reset the page to one.
- Dashboard totals still use three application-list requests rather than analytics.
- Detail and timeline mutations still consume refreshed `Application` responses, leaving status recomputation to the backend.
- Settings and authentication retain the same security, validation, reset-link, Google-script, error, and notification behavior.

## Regression and testing concerns

- Automated frontend interaction coverage is limited. The regression checklist remains necessary for browser-level verification during the future visual migration.
- The shared global busy flag is preserved by design, so concurrent feature operations still affect the same busy state.
- Google Identity Services requires a configured client ID and an allowed browser origin for full runtime validation.
- Email reset delivery and database integration depend on local environment credentials and connectivity.
- Notification timers preserve the existing behavior, including independent timers when notifications occur close together.

## Files changed

- `src/main.tsx`
- `src/components/Auth.tsx`
- `src/components/Add.tsx`
- `src/components/Detail.tsx`
- `src/components/Settings.tsx`
- `src/controllers/types.ts`
- `src/controllers/useAsyncStatus.ts`
- `src/controllers/useSession.ts`
- `src/controllers/useNotifications.ts`
- `src/controllers/useApplicationList.ts`
- `src/controllers/useAddApplication.ts`
- `src/controllers/useApplicationDetail.ts`
- `src/controllers/useAccountSettings.ts`
- `src/controllers/useAuth.ts`
- `docs/v2-redesign/architecture-map.md`
- `docs/v2-redesign/v2-preparation.md`
