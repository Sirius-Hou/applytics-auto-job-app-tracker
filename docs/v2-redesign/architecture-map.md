# Applytics V2 Architecture Map

## 1. Runtime topology

Applytics deploys as one Node/Express service serving both `/api` and the built Vite SPA. Render hosts the service, Supabase supplies PostgreSQL, OpenAI Responses performs JD extraction, Google Identity Services supplies Google credentials, Resend sends reset email, and Cloudflare manages DNS for `applytics.siriushou.com` while Render manages the application origin/certificate.

Local development runs Vite on port 5173 and Express on port 3001; Vite proxies `/api` to Express. Production starts by applying ordered SQL migrations and then serving the app.

## 2. Frontend architecture

### Entry point and navigation

- `src/main.tsx` is the entry point, authenticated shell, in-memory view coordinator, and list presentation.
- There is no router library. `view: 'list' | 'add' | 'detail' | 'settings'` selects authenticated pages.
- `window.location.pathname === '/reset-password'` is the sole explicit route check.
- `detail` stores the selected full application object; it is fetched before switching view.
- Sidebar, list dashboard, carousel, filters, table, pagination, and global error/toast rendering remain in `main.tsx`; their behavioral state is supplied by controllers.

### State management

- React hooks only; no context or external store.
- `user` has three meanings: `undefined` checking session, `null` signed out, object signed in.
- `useAsyncStatus` centralizes the existing single global `busy` flag, error message, and `run(fn)` behavior.
- `useApplicationList` owns filters, pagination, list fetching, the 200 ms debounce, and the three existing statistic requests. Mutations still increment `revision` in `App` to refresh list/statistics later.
- `useNotifications` owns the existing string toast and 3.5-second timing.
- Workflow form state is owned by feature controllers and consumed by the current presentation components.

### Components

| File/component                            | Current responsibility                                                                                  | Layer           | Risk                                         |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------- | --------------- | -------------------------------------------- |
| `src/main.tsx` / `App`                    | Auth gate, view transitions, selected detail/revision coordination, current shell and list presentation | Mixed           | Medium                                       |
| `src/components/Auth.tsx`                 | Authentication form presentation consuming `useAuth`                                                    | Presentation    | Medium                                       |
| `src/components/Add.tsx`                  | Complete Job review form consuming `useAddApplication`                                                  | Presentation    | Medium                                       |
| `src/components/Detail.tsx`               | Application/detail/timeline presentation consuming `useApplicationDetail`                               | Presentation    | Medium                                       |
| `src/components/Settings.tsx`             | Account/security presentation consuming `useAccountSettings`                                            | Presentation    | Medium                                       |
| `src/controllers/useSession.ts`           | Startup session restoration and three-state user model                                                  | Controller      | High                                         |
| `src/controllers/useApplicationList.ts`   | List query serialization, debounce, pagination, filters, and dashboard totals                           | Controller      | High                                         |
| `src/controllers/useAddApplication.ts`    | Parse, invalidate, mutable review model, and save boundary                                              | Controller      | High                                         |
| `src/controllers/useApplicationDetail.ts` | Notes/date mutations, timeline CRUD, and application deletion requests                                  | Controller      | High                                         |
| `src/controllers/useAccountSettings.ts`   | Password, reset-email, logout, account deletion, and modal workflow state                               | Controller      | High                                         |
| `src/controllers/useAuth.ts`              | Auth modes, Google initialization, reset-token validation, and auth requests                            | Controller      | High                                         |
| `src/controllers/useAsyncStatus.ts`       | Shared busy/error runner semantics                                                                      | Controller      | Medium                                       |
| `src/controllers/useNotifications.ts`     | Existing toast state and duration                                                                       | Controller      | Low                                          |
| `src/controllers/types.ts`                | Frontend session, row, and view types                                                                   | Shared frontend | Low                                          |
| `src/components/common.tsx`               | Label formatting, date conversion, fetch wrapper, basic field/select/multiselect                        | Shared          | Medium                                       |
| `src/style.css`                           | Entire visual system, responsive layout, statuses, forms, modals, animation presentation                | Presentation    | Low, except selectors encode DOM assumptions |

### API client and validation

- `request<T>` in `common.tsx` prefixes `/api`, sends JSON, parses JSON, and throws `data.error` for non-2xx responses.
- Frontend validation is enable/disable and inline state only. Server Zod schemas are authoritative.
- `localDay`, `localDate`, and `dayToIso` intentionally convert date-only user input to local noon ISO, limiting timezone date drift.
- `MultiSelect` serializes selected values as comma-separated strings, matching server preprocessing.

### Styling system

- One global `src/style.css`; no CSS modules, utility framework, token file, theme provider, or component library.
- Google-hosted DM Sans and Manrope are imported from CSS.
- Colors, spacing, radii, typography, status colors, breakpoints, and shadows are hard-coded selectors rather than formal tokens.
- Motion is used only for the statistics carousel through `motion/react`.
- Several semantic primitives exist informally (`panel`, `primary`, `badge`, `form`, `muted`) but are not encapsulated components.

## 3. Backend and API inventory

All endpoints are under `/api`. Routes after `api.use(requireUser)` require a valid session cookie.

| Method/path                                | Auth | Request                         | Response / effect                                                             | Frontend caller                  |
| ------------------------------------------ | ---: | ------------------------------- | ----------------------------------------------------------------------------- | -------------------------------- |
| `GET /auth/config`                         |   No | none                            | `{googleClientId}`                                                            | `Auth` startup                   |
| `GET /auth/session`                        |   No | session cookie                  | `AuthUser` or 401                                                             | `App` startup                    |
| `POST /auth/register`                      |   No | `{email,password,displayName?}` | 201 `AuthUser`, sets cookie, inserts user/session                             | `Auth.submit`                    |
| `POST /auth/login`                         |   No | `{email,password}`              | `AuthUser`, sets cookie                                                       | `Auth.submit`                    |
| `POST /auth/google`                        |   No | `{credential}`                  | `AuthUser`, sets cookie, links/creates user                                   | Google callback in `Auth`        |
| `POST /auth/logout`                        |   No | cookie                          | `{ok:true}`, deletes session, clears cookie                                   | `Settings`                       |
| `POST /auth/forgot-password`               |   No | `{email}`                       | generic message; dev may include reset URL; inserts token and sends email     | `Auth.requestReset`              |
| `POST /auth/validate-reset-token`          |   No | `{token}`                       | `{valid:boolean}`                                                             | `Auth` reset effect              |
| `POST /auth/reset-password`                |   No | `{token,password}`              | message; updates password, consumes tokens, deletes sessions                  | `Auth.saveNewPassword`           |
| `GET /health`                              |   No | none                            | `{ok:true}` after DB query                                                    | Render health check              |
| `POST /auth/account/password-reset`        |  Yes | none                            | generic reset result for session user's email                                 | `Settings`                       |
| `POST /auth/change-password`               |  Yes | `{currentPassword,newPassword}` | `{changed:true}`; updates hash and consumes unused reset tokens               | `Settings`                       |
| `DELETE /auth/account`                     |  Yes | `{confirmation:'DELETE'}`       | `{deleted:true}`; transactional account/data cleanup and cookie clear         | `Settings`                       |
| `POST /parse`                              |  Yes | `{rawJd,originalUrl}`           | complete unsaved `Job` review object                                          | `Add`                            |
| `GET /applications`                        |  Yes | filter query                    | `{items,total,page,limit}`                                                    | `App` list and three stats calls |
| `POST /applications`                       |  Yes | `CreateApplication`             | 201 full `Application`; transactional graph creation                          | `Add`                            |
| `GET /applications/:id`                    |  Yes | UUID path                       | full `Application` or 404                                                     | `App.open`                       |
| `PATCH /applications/:id`                  |  Yes | `{notes?,appliedAt?}`           | refreshed full `Application` or 404                                           | `Detail`                         |
| `DELETE /applications/:id`                 |  Yes | UUID path                       | `{deleted:true}` or 404                                                       | `Detail`                         |
| `POST /applications/:id/events`            |  Yes | `{type,occurredAt,notes}`       | refreshed full `Application` or 404                                           | `Detail`                         |
| `PATCH /applications/:id/events/:eventId`  |  Yes | same event shape                | refreshed full `Application` or 404                                           | `Detail`                         |
| `DELETE /applications/:id/events/:eventId` |  Yes | UUIDs                           | refreshed full `Application` or 404                                           | `Detail`                         |
| `GET /skills?limit=`                       |  Yes | limit 1–500                     | `{items:[name,type,applicationCount,minimumCount,preferredCount,otherCount]}` | No current UI caller             |
| `GET /roles`                               |  Yes | none                            | `{items:[role,applicationCount]}`                                             | No current UI caller             |
| `GET /analytics/overview`                  |  Yes | period/from/to/company          | totals and country/company/month/role breakdowns                              | No current UI caller             |

### Server framework behavior

- `server/app.ts` rejects cross-origin requests unless they match the current host; localhost origins are allowed in development.
- JSON body limit is 2 MB.
- Zod errors become 400 JSON, assigned status errors keep their status, and unexpected failures become a generic 500.
- Express serves `dist` and falls back to `index.html` for non-API GET paths.
- `server/routes.ts` is the HTTP-to-domain adapter; `server/auth.ts` and `server/repositories/applications.ts` hold behavior.

## 4. Data model

### User and authentication

- `users`: UUID, unique normalized email, optional scrypt password hash, optional unique Google subject, display name, creation time. At least password hash or Google subject is required.
- `auth_sessions`: hashed token primary key, user foreign key with cascade, expiry, creation time.
- `password_reset_tokens`: UUID, user cascade foreign key, unique token hash, expiry, used timestamp, creation time.

### Job and application graph

- `companies`: globally normalized/deduplicated company names.
- `jobs`: company reference, title, category, term, recruiting year, work arrangement, original/canonical URL, exact raw JD, compensation, experience, parser metadata, timestamps.
- `job_locations`: ordered location rows cascading with job.
- `requirement_sections`: ordered verbatim sections cascading with job.
- `key_requirements`: ordered minimum/preferred highlights cascading with job.
- `skills`: globally normalized/deduplicated skill dictionary.
- `job_skills`: job-skill join with requirement type and display order; cascades from job.
- `job_role_tags`: one or two ordered role tags cascading from job.
- `applications`: job reference, current status, applied date, notes, timestamps, owner user. User deletion cascades applications; application deletion does not automatically cascade upward to job.
- `application_events`: application cascade foreign key, event type/date/notes, creation time, monotonic sequence.

### Shared TypeScript contracts

`shared/contracts.ts` is the cross-layer source of truth for enums and request shapes. `Job`, `CreateApplication`, `ApplicationEvent`, and `Application` are inferred/declared there and consumed by both client and server. Changing it can break forms, endpoints, AI schema, SQL constraints, and persisted data simultaneously.

## 5. Repository behavior and invariants

- `getApplication` owner-scopes the root row, then assembles locations, requirements, key requirements, skills, role tags, and events into the frontend `Application` shape.
- `createApplication` is atomic. It normalizes/upserts company and skills, writes the complete job graph, application, and initial event, then reads back the result.
- `buildFilters` always starts with `a.user_id=$1`; all user values are bound parameters. Country/location/skill/role filters use `EXISTS` so multi-row joins do not inflate application counts.
- List total and page rows use repeatable-read transactions for consistency.
- Analytics uses repeatable read and excludes `SAVED` records.
- Event mutations lock the owner-scoped application before changing events and recomputing status.
- Application deletion conditionally removes orphan job/company rows. Account deletion additionally considers orphan skills.

## 6. Presentation-layer redesign boundary

### Safe to redesign substantially (low risk)

- Visual tokens, fonts, colors, spacing, radii, shadows, breakpoints, and responsive composition in `style.css`.
- Sidebar visual treatment and mobile navigation, if callbacks and view semantics remain intact.
- Carousel, table, cards, badges, chips, icons, empty states, loading skeletons, panels, modal visuals, and toast visuals.
- Composition/order of existing information on list and detail screens.
- Replacing informal CSS primitives with real presentational components.

### Safe only when preserving controller contracts (medium/high risk)

- List UI in `main.tsx` consumes `useApplicationList`; redesign must preserve filter keys, pagination operations, loading/error behavior, and revision triggers.
- `Auth.tsx` consumes `useAuth`; its Google button ref and reset-mode states are required integration points.
- `Add.tsx` consumes `useAddApplication`; every field in its full mutable `Job` object must remain represented by future presentation.
- `Detail.tsx` consumes `useApplicationDetail`; confirmations remain explicit presentation actions before destructive controller calls.
- `Settings.tsx` consumes `useAccountSettings`; future modals must retain the controller's exact validation and close semantics.
- `common.tsx`: form controls are presentational, but date conversion, query encoding, label normalization, and the API error contract are functional.

Recommended V2 preparation is to extract hooks/controllers without changing their observable behavior, then rebuild presentational components against those stable interfaces.

## 7. Redesign risk map

### LOW RISK

- `src/style.css`: visual-only in intent, though replacement must account for current class/DOM dependencies.
- Static text hierarchy and iconography inside components.
- New presentational primitives added alongside current components.
- Documentation under `docs/v2-redesign`.

### MEDIUM RISK

- `src/components/common.tsx`: easy to visually replace, but preserve request error parsing, comma-list multiselect encoding, and date helpers.
- Carousel code in `main.tsx`: visual behavior is isolated but shares component state.
- Application table markup: callbacks are simple, but row response fields and pagination semantics must stay aligned.
- Requirement bullet formatting and skill ordering in `Detail.tsx`: presentational output encodes meaningful ordering/transformation.

### HIGH RISK

- `src/main.tsx`: application shell, auth gate, all view transitions, list fetching, global async state, stats, and refresh signaling.
- `src/components/Auth.tsx`: security flows and external Google script integration.
- `src/components/Add.tsx`: protected parse-review-save workflow and full editable data object.
- `src/components/Detail.tsx`: mutation logic and current-status lifecycle.
- `src/components/Settings.tsx`: password and destructive account workflows.
- `shared/contracts.ts`: cross-layer API and taxonomy contract.
- `server/routes.ts`, `server/auth.ts`, `server/repositories/applications.ts`: endpoint, security, ownership, transaction, and persistence behavior.
- `server/ai/job-parser/**`: strict AI extraction and validation.
- `server/db/**`: schema, migration history, connection, backup, and transaction semantics.
- `server/app.ts`: security boundary, error contract, and SPA serving.

## 8. Surprising or important coupling

1. `main.tsx` remains the in-memory navigator, layout, auth gate, selected-detail coordinator, and list renderer; query, notification, session, and async behavior have been extracted.
2. Detail navigation has no URL and depends on a previously fetched object in memory.
3. The add controller owns the entire mutable `Job` graph, but the presentation still renders each field explicitly; replacing it can still omit a persisted field.
4. `busy` is global, so unrelated controls may appear busy/disabled during a request elsewhere.
5. Toast timing is centralized in `useNotifications`, while `App` still decides which completed actions produce a toast.
6. Google button rendering depends on a DOM ref, a dynamically inserted global script, and stable callback lifecycle.
7. Reset-password routing is a direct `window.location.pathname` check rather than router state.
8. The UI's label/ordering helpers carry domain meaning, especially skill priority and date-to-ISO conversion.
9. The three dashboard statistics do not use the analytics endpoint; they issue three application-list requests.
10. Backend capabilities exceed current UI capabilities, while post-save structured job editing is absent from both API and UI.
