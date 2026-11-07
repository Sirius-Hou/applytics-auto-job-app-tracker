# Applytics V2 Implementation Phase 1

## Scope completed

Phase 1 establishes the V2 visual foundation, authenticated shell, reusable presentation primitives, and the My Applications benchmark screen. Add Application, Application Detail, Authentication, and Settings retain their existing presentation and behavior for later phases.

## Files and components created

- `src/v2.css` — scoped V2 tokens, shell, My Applications, responsive, focus, semantic state, skeleton, and reduced-motion styling.
- `src/components/v2/AppShell.tsx` — authenticated desktop rail, mobile brand bar, mobile bottom navigation, toast placement, and non-list global error placement.
- `src/components/v2/MyApplications.tsx` — V2 statistics, filters, active tokens, results, responsive records, states, and pagination.
- `src/components/v2/Primitives.tsx` — `StatusIndicator`, `FilterToken`, `EmptyState`, `SkeletonRows`, and `Section`.
- `docs/v2-redesign/implementation-phase-1.md` — this implementation record.

The approved `@phosphor-icons/react` package supplies one coherent icon family.

## Tokens implemented

`src/v2.css` defines the Phase 1 tokens required for:

- warm off-white, near-white, mineral neutral, forest, sage, and semantic colors;
- Manrope headings and DM Sans application text;
- compact control and data typography with tabular numerals;
- 6px, 8px, and 12px radii;
- quiet borders and stronger structural borders;
- surface and floating elevation;
- focus rings;
- fast and normal functional motion;
- success, warning, danger, information, and application-status accents.

The tokens are scoped through V2 component classes where practical so the four later-phase legacy screens can continue to coexist.

## Presentation primitives

- Status uses a semantic dot plus complete text, never color alone.
- Active filter tokens support individual removal and preserve comma-separated multi-select values.
- Empty state distinguishes a new ledger from a filtered no-match result and routes through the existing navigation behavior.
- Skeleton rows preserve result-table structure during debounced loading.
- Buttons, icon buttons, filters, selects, multi-selects, pagination, toast, focus, and reduced-motion states have a shared V2 treatment.

## My Applications changes

- Replaced the one-at-a-time animated carousel presentation with an always-visible three-value ledger strip.
- Preserved Total Applications, Past Month, and Past Year controller data and request semantics.
- Preserved Job Title, Company, Country, and Employment Type as primary filters.
- Preserved all eight exposed Advanced Filters and added a quiet active count.
- Added removable active filter tokens and conditional Clear all.
- Aligned result count/loading state with Sort By.
- Rebuilt the desktop table hierarchy around Role / Company, Type, Location, Status, Application Date, and an explicit disclosure action.
- Added semantic status indicators, loading skeletons, distinct zero-data/no-match states, and integrated pagination.
- Detail opening remains attached to the role and explicit chevron control.

## Shell and navigation changes

- Desktop uses a compact Applytics left rail with My Applications, Add Application, and Settings.
- Settings remains anchored to the bottom.
- Detail continues to mark My Applications as active.
- Compact laptop mode reduces the rail to icon-led navigation with native title tooltips and accessible labels.
- Mobile uses a fixed Applytics top brand bar and three-item bottom navigation with icons and visible labels.
- Navigation remains in-memory. No router, route, or URL semantics were added.

## Responsive behavior

- At compact laptop widths, the rail collapses, filters move to two columns, and the table removes its lower-priority Type column.
- At tablet widths, the table is replaced with border-separated record rows rather than horizontal scrolling.
- At mobile widths, primary/advanced filters use one column, summary metrics use a compact snap row, result controls remain readable, pagination becomes a two-column control group, and navigation respects the bottom safe area.
- Touch navigation and pagination targets are at least 44px in mobile layouts.

## Controller and API changes

None. Phase 1 consumes the existing `useApplicationList`, `useAsyncStatus`, `useNotifications`, and `useSession` interfaces. The 200ms debounce, filter serialization, list requests, statistics requests, pagination, sort defaults, revision behavior, errors, and detail loading remain unchanged.

## Backend and shared contracts

No files under `server/**` or `shared/contracts.ts` changed.

## Validation

- Production TypeScript/Vite build: passed.
- Automated unit tests: passed, 5/5.
- PostgreSQL integration tests: passed, including migrations, persistence, filters, history, authentication, password changes/recovery, account deletion, and REST validation. The first attempt was blocked by a stale prior test PostgreSQL listener on the dedicated test port; stopping that test-only process restored a clean passing run.
- Browser smoke test: passed for registration, My Applications loading, active-filter token creation/removal, in-memory Settings navigation, and account deletion cleanup.
- Accessibility tree inspection confirmed named primary navigation, statistics region, search region, result region, labeled controls, status text, and explicit detail actions.

## Known visual issues and remaining work

- Authentication, Add Application, Application Detail, and Settings retain their previous presentation by design. They share the new shell after authentication but are not Phase 1 visual benchmarks.
- Native date-picker language remains browser/platform controlled.
- Full responsive visual review should be repeated in real mobile browsers during final V2 QA; Phase 1 provides dedicated breakpoint DOM and CSS rather than a squeezed desktop table.
- Advanced multi-select menus retain the existing `<details>` behavior and will receive any deeper interaction refinement only if product review identifies a concrete issue.
- The current global busy state remains shared across operations because changing it would alter behavior outside this visual phase.
