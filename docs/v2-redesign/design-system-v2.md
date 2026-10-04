# Applytics V2 Product Design System

## Design read

Applytics V2 is a private, information-dense productivity workspace for people managing an active job search. Its visual language should feel calm, exact, and quietly premium: editorial discipline, mature software controls, warm neutral surfaces, and a distinct forest-green identity. It is not an AI showcase. AI is one assistive step inside a user-controlled record-keeping workflow.

Design configuration:

- `DESIGN_VARIANCE: 4/10` — disciplined composition with a few recognizable brand moments.
- `MOTION_INTENSITY: 3/10` — short, functional transitions with no ambient animation.
- `VISUAL_DENSITY: 6/10` — efficient enough for hundreds of records without becoming a cockpit.

This document defines product and presentation decisions only. It does not change the functionality freeze, expose backend-only features, or authorize implementation.

## 1. Product design principles

### 1.1 The record is the product

Applications, job descriptions, requirements, dates, and status history are the primary material. The interface should spend visual emphasis on making records easy to scan, compare, verify, and revisit. Decorative dashboard content must never displace actual application information.

### 1.2 Human review is a first-class boundary

AI parsing produces a draft, not truth. The transition from pasted source to parsed structure must visibly include a review state. The UI should make source preservation, editable extraction, and deliberate saving understandable without framing the user as correcting a failed system.

### 1.3 Dense, not cramped

Density comes from strong alignment, compact control heights, predictable columns, and progressive disclosure. It should not come from tiny text, abbreviated labels, or compressed touch targets.

### 1.4 Status should be visible before it is read

Status uses position, label, and restrained semantic color together. Color accelerates scanning but never carries meaning alone.

### 1.5 Quiet confidence

Use plain language, stable layouts, precise feedback, and minimal elevation. Avoid promotional language inside the authenticated product. Success states should be brief and calm.

### 1.6 One hierarchy per screen

Each screen has one dominant task:

- My Applications: find and open a record.
- Add Application: capture, review, then save.
- Application Detail: understand a record and maintain its status history.
- Settings: manage access and account security.

Secondary operations should remain available without competing with that task.

### 1.7 Existing behavior is a contract

Presentation can change substantially, but it must continue to expose all frozen behavior and every currently editable field. A cleaner screen must not be achieved by silently removing capability.

## 2. Existing UX audit

### 2.1 What should remain conceptually

- A persistent product identity and three primary destinations: My Applications, Add Application, and Settings.
- My Applications as the default authenticated destination.
- A clear split between common and advanced filters.
- Role as the strongest table signal, followed by company/location, status, and dates.
- Parse → review → save as a staged mental model.
- Collapsible original JD and status-update form.
- A two-column detail composition on wide screens, with history alongside job information.
- Restrained sage, forest, warm white, and semantic status colors.
- Inline validation for forms and modal treatment for sensitive account actions.
- Current success, error, loading, empty, and destructive states.

### 2.2 Global shell issues

- The current sidebar consumes substantial width for only three destinations and lacks a clear account/session area.
- Navigation icons are typographic symbols with inconsistent visual weight.
- The content width can become too broad, while page headings and panels do not share a strict grid.
- Global errors and toasts visually float above pages without a unified feedback placement model.
- The application has no router; the redesign must avoid visual affordances that promise bookmarkable pages or browser-history behavior.

### 2.3 My Applications issues

- The single-statistic carousel hides two useful values and requires interaction to compare three small totals. The motion carries more weight than the information.
- Search controls occupy a large card before the user reaches their records.
- Primary and advanced filters are conceptually correct, but control hierarchy and active-filter visibility are weak.
- Table scanning is hindered when employment type, location, setting, status, and date compete at similar visual weight.
- Loading replaces the record count with text but does not preserve the table's visual structure.
- The empty state uses the same composition for a new account and a filtered no-match result even though their next actions differ.
- Pagination works but is visually detached from the result summary.

### 2.4 Add Application issues

- The step labels communicate the process, but they are passive and do not clearly mark completion or the current state.
- Before parsing, the layout is appropriately simple. After parsing, one very long form creates weak orientation and high review fatigue.
- Repeated subforms for locations, requirements, and skills create cards within cards and make it hard to understand section boundaries.
- All extracted information appears with similar visual priority even though company/title, category, location, requirements, and skills deserve different review emphasis.
- The final save action is far from the stage indicator and can disappear below a long page.
- Parser progress is communicated only through the button label and shared busy state.

### 2.5 Application Detail issues

- Posting facts, skills, requirements, notes, raw JD, timeline, and deletion compete as a sequence of similarly styled panels.
- The header does not establish a compact record identity block with company, role, current status, location, and application date together.
- The right-side timeline is useful, but the update control and existing history need stronger relationship and clearer event hierarchy.
- Source links and read-only structured information can look like form content because panels share the same treatment.
- Destructive deletion is correctly separated, but its page-end placement should be consistent with the content column rather than becoming a dominant full-width block.

### 2.6 Authentication issues

- The current single card is understandable but visually generic and does little to establish product trust or explain what is private.
- Sign-in, create-account, forgot-password, and reset states share the same visual shell but lack a consistent reserved feedback region, causing vertical movement.
- Google sign-in needs equal clarity without becoming more prominent than the primary credential flow.
- Reset-link checking and invalid-link states are functionally correct and should become more composed terminal states.

### 2.7 Settings issues

- Account, password, sign-out, and deletion are correctly grouped by risk, but normal account actions could be easier to scan as rows.
- Password change and delete-account modals are appropriate because they are consequential and interruptive.
- The danger section already uses restraint; V2 should preserve that restraint and increase separation through layout rather than saturated color.

### 2.8 Responsive issues

- On mobile, the sidebar becomes a compressed horizontal strip rather than a purposeful mobile navigation pattern.
- Two-column form grids can remain two columns at widths where labels and values become uncomfortable.
- A desktop table cannot simply shrink without losing scan hierarchy or producing horizontal-scroll dependence.
- Long review and detail pages need mobile section navigation and sticky actions, not only vertical stacking.

## 3. Information architecture

### 3.1 Global application shell

Use a compact left rail on desktop and compact laptop screens. The rail contains:

1. Applytics wordmark.
2. Primary navigation: My Applications and Add Application.
3. Settings anchored to the bottom.

The rail should be approximately 13.5–14.5rem wide on standard desktop and 4rem wide in an icon-led compact mode on smaller laptops. Because no router exists, navigation remains button-based and must not imply native links or deep-link behavior.

The main canvas uses a warm off-white background and a centered content grid with a maximum width around 88rem. Page headers align to the same grid as page content. Feedback appears in a consistent top-right toast region; page-level errors appear directly below the page header.

### 3.2 Primary navigation

- **My Applications** — record discovery and overview.
- **Add Application** — capture and review workflow.
- **Settings** — account and security.

Do not add Dashboard, Analytics, Skills, Roles, or Interview views in V2. Those would expose new product functionality.

### 3.3 My Applications structure

1. Compact page header.
2. Three always-visible summary values.
3. Search and primary filters.
4. Active-filter summary and Advanced Filters disclosure.
5. Result count and sort controls.
6. Application table on larger screens; structured record rows on smaller screens.
7. Pagination and page-size selection.

### 3.4 Add Application structure

The flow is one page with two durable stages rather than three visually separate pages:

1. **Source** — URL and exact JD, followed by Parse with AI.
2. **Review & save** — all extracted data, application record fields, and save.

“Saved” is an outcome, not a navigable stage. The existing three-step semantic sequence remains visible as progress: Source → Review → Saved, but only the first two are interactive work states.

### 3.5 Application Detail structure

1. Back action and record identity header.
2. Wide main content column: Overview, Requirements, Skills, Source JD, Notes.
3. Narrow persistent side column: current status, timeline, and status update.
4. Page-end danger action aligned with the main content column.

Structured job fields remain read-only after save. Only application date, notes, and timeline events expose editing controls.

### 3.6 Settings structure

1. Account identity.
2. Security actions: Change password, reset through email, and sign out.
3. Separated danger zone: Delete account.

### 3.7 Authentication structure

Use a focused two-region desktop composition:

- A quiet brand/context region that communicates private organization and source preservation in one concise statement.
- A credential region containing the active form.

On small screens, the brand context reduces to wordmark plus one sentence above the form. No marketing carousel, testimonials, or decorative dashboard preview.

## 4. Core user flows

### 4.1 Sign in and create account

- Land with Sign in selected and a stable heading region.
- Email and password form is the primary path.
- Forgot password sits adjacent to the password label or immediately below the password field.
- Submit button spans the form width.
- A quiet divider separates Google sign-in.
- Create account reuses the same shell and adds optional name plus real-time password validation.
- Errors reserve space near the relevant field when local and in a form-level alert when server-wide.

### 4.2 My Applications and discovery

- Show the three existing totals in one compact strip so the user can compare without interaction.
- Place Job Title and Company search first, followed by Country and Employment Type.
- Advanced Filters opens an anchored disclosure region below the primary row.
- Applied filters appear as removable compact tokens above the results. “Clear all” appears only when filters are active.
- Results update using the existing 200 ms behavior.
- Sort and record count sit on one baseline directly above the list.
- Selecting either the primary role text or row disclosure control opens detail using the current in-memory behavior.

### 4.3 Add and parse

- The source stage presents URL first and full JD second.
- A persistent source-preservation note states that the original description is stored exactly as provided.
- Parse remains disabled until existing validity conditions are met.
- During parsing, lock duplicate submission, retain the entered source, and show a compact inline progress state with factual copy such as “Extracting job details…”. Do not show fake percentages or animated AI decoration.
- Errors remain attached to the source stage so the user can revise and retry.

### 4.4 Review parsed information

- After a successful parse, move focus to a Review heading and summarize that nothing has been saved yet.
- Present review sections in this order:
  1. Identity: company and title.
  2. Classification: employment type, term/year, setting, role focus.
  3. Locations.
  4. Compensation and experience.
  5. Requirements.
  6. Skills and ATS keywords.
  7. Application record: initial status, date, notes.
  8. Source and parser metadata in a low-emphasis disclosure.
- Keep all current fields editable. Repeated data uses clean bordered rows with explicit Add and Remove controls rather than nested cards.
- A sticky review footer shows “Not saved” and the Save Application action. On mobile it becomes a safe-area-aware bottom action bar.

### 4.5 Save

- Save uses the same request and validation contract.
- While saving, disable repeated submission and keep the current review visible.
- Success transitions to the new detail view and uses the existing toast.
- No optimistic saved state should appear before the server returns the complete application.

### 4.6 Detail and status maintenance

- Enter detail with record identity and current status immediately visible.
- Read job information in the main column without form-like styling.
- Add a status update from a collapsed control directly above the timeline.
- Existing events stay ordered as returned. Edit occurs inline within the event position; delete remains an explicit confirmed action.
- Application date and notes edit in a clearly labeled Application Record section.
- Delete Application remains at page end with calm danger styling.

### 4.7 Settings and account actions

- Account identity is read-only and scannable.
- Change password opens the existing modal flow.
- Wrong current password marks its field without moving the error behind the backdrop.
- Forgot current password sends the protected reset email and displays the existing generic response.
- Account deletion opens a compact modal, requires exact `DELETE`, and keeps the final action disabled until matched.

## 5. V2 visual direction: Quiet Ledger

### 5.1 Visual philosophy

“Quiet Ledger” treats Applytics as a carefully maintained personal record. It combines the clarity of a ledger, the warmth of paper-adjacent surfaces, and the precision of mature productivity software.

The distinctive elements are:

- A narrow forest-green identity marker rather than a large colored shell.
- Warm mineral neutrals instead of cold gray dashboard surfaces.
- Fine rules and alignment replacing stacks of floating cards.
- Tabular figures and compact metadata for dates and counts.
- Small areas of muted sage that signal selection, progress, or grouping.
- Semantic status marks shaped as a small leading dot plus text label rather than bright pills.

### 5.2 Color philosophy

Use one brand hue family: deep forest through pale sage. Warm neutral surfaces carry most of the interface. Blue, amber, red, and stronger green appear only for information and semantic state. There are no brand gradients.

### 5.3 Typography philosophy

Use **Manrope** for product identity and major headings, and **DM Sans** for controls, body text, and dense data. These already belong to the project and create enough distinction without adding a dependency. Enable tabular numerals for counts, dates, compensation, and pagination.

Headings should be compact and sentence case. Use weight, size, and spacing before using uppercase. Uppercase is reserved for very small metadata labels where it improves table scanning.

### 5.4 Spacing and density

The base rhythm is 4px. Dense controls use 36–40px heights; primary actions use 40–44px. Page sections should be separated by 28–40px, while related form rows use 12–20px. Large blank zones should only signal a meaningful page transition.

### 5.5 Surfaces, borders, and elevation

- Base background: warm off-white.
- Working surface: near-white with a slight warm cast.
- Most sections use spacing and a top rule rather than full card borders.
- Cards are reserved for summary groups, forms requiring containment, modals, and empty states.
- Borders are 1px and low contrast; stronger borders mark focus or selected structure.
- Shadows appear only on floating layers and modals.

### 5.6 Radius

Use modest radii: 6px for controls, 8px for contained sections, 12px for modals. Avoid pills except for compact filter tokens whose shape communicates removability.

### 5.7 Iconography

Use one coherent outline icon family at 1.5–1.75px stroke. Icons support recognized actions such as filter, edit, delete, external link, and chevron. Navigation always pairs icon and text in expanded layouts. Never use emoji or arbitrary Unicode symbols as product icons.

### 5.8 Motion

- Hover/focus: 120–160ms.
- Disclosure, modal, and toast: 180–240ms.
- Use opacity plus no more than 6–10px translation.
- Status and table data never animate merely because a query refreshed.
- Reduced-motion mode removes translation and uses near-instant opacity changes.

### 5.9 Feedback

- Success: compact toast, neutral surface, forest accent, check icon, no exclamation mark.
- Error: inline near the failed task plus persistent page alert when the error blocks the page.
- Loading: preserve layout with skeleton rows or reserved form space.
- Disabled: reduced contrast with cursor and semantic state; remain legible.

## 6. Preliminary design tokens

Token names express purpose rather than component ownership. Values are proposed starting points and require contrast verification during implementation.

### 6.1 Color

| Token                      |          Proposed value | Use                                     |
| -------------------------- | ----------------------: | --------------------------------------- |
| `--color-bg`               |               `#F4F5F1` | Application canvas                      |
| `--color-surface`          |               `#FBFCF9` | Primary working surfaces                |
| `--color-surface-elevated` |               `#FFFFFF` | Menus, toasts, modals                   |
| `--color-text-primary`     |               `#1F2D29` | Main text                               |
| `--color-text-secondary`   |               `#586660` | Supporting text                         |
| `--color-text-tertiary`    |               `#7B8781` | Metadata and placeholders               |
| `--color-border`           |               `#DDE2DC` | Quiet separators                        |
| `--color-border-strong`    |               `#BAC5BD` | Selected groups and strong divisions    |
| `--color-brand`            |               `#285440` | Primary action and identity             |
| `--color-brand-hover`      |               `#1F4534` | Primary hover                           |
| `--color-brand-subtle`     |               `#E4ECE4` | Active nav and selected backgrounds     |
| `--color-success`          |               `#356B4B` | Offer/success accents                   |
| `--color-success-subtle`   |               `#E6F0E8` | Success background                      |
| `--color-warning`          |               `#9A6A20` | OA/pending-attention accents            |
| `--color-warning-subtle`   |               `#F5EDDC` | Warning background                      |
| `--color-danger`           |               `#A3483E` | Destructive action and rejection accent |
| `--color-danger-subtle`    |               `#F5E9E7` | Danger background                       |
| `--color-info`             |               `#426B7A` | Interview/information accent            |
| `--color-info-subtle`      |               `#E5EEF0` | Information background                  |
| `--color-focus`            |               `#3F7B60` | Focus ring                              |
| `--color-overlay`          | `rgba(24, 34, 29, .42)` | Modal backdrop                          |

### 6.2 Status colors

All statuses use text plus a dot. Closely related stages share families to avoid a rainbow table.

| Status                               | Foreground        | Subtle background |
| ------------------------------------ | ----------------- | ----------------- |
| Saved                                | neutral secondary | neutral surface   |
| Applied                              | forest            | pale sage         |
| OA                                   | amber             | pale amber        |
| Recruiter / Phone Screen             | teal              | pale teal         |
| Technical / Onsite / Final Interview | blue-green        | pale blue-green   |
| Offer                                | strong green      | pale success      |
| Rejected                             | muted brick       | pale danger       |
| Withdrawn                            | warm gray         | neutral surface   |
| Ghosted                              | muted plum-gray   | pale neutral      |

### 6.3 Typography

| Token            | Specification                  |
| ---------------- | ------------------------------ |
| `--font-display` | Manrope, system sans-serif     |
| `--font-body`    | DM Sans, system sans-serif     |
| Display          | 2rem / 1.15, 650, `-0.03em`    |
| Page title       | 1.75rem / 1.2, 650, `-0.025em` |
| Section title    | 1.0625rem / 1.35, 650          |
| Body             | 0.9375rem / 1.55, 400          |
| Secondary body   | 0.875rem / 1.5, 400            |
| Label            | 0.8125rem / 1.3, 600           |
| Metadata         | 0.75rem / 1.35, 500            |
| Table            | 0.875rem / 1.4, 400–600        |

Numbers and dates use `font-variant-numeric: tabular-nums`.

### 6.4 Spacing

`--space-1: 4px`, `--space-2: 8px`, `--space-3: 12px`, `--space-4: 16px`, `--space-5: 20px`, `--space-6: 24px`, `--space-8: 32px`, `--space-10: 40px`, `--space-12: 48px`, `--space-16: 64px`.

### 6.5 Radius

- `--radius-sm: 6px` — inputs, buttons, tags.
- `--radius-md: 8px` — contained sections and dropdowns.
- `--radius-lg: 12px` — modals and prominent empty states.

### 6.6 Elevation

- `--shadow-surface: 0 1px 2px rgba(31, 45, 41, .05)`.
- `--shadow-floating: 0 10px 28px rgba(31, 45, 41, .12)`.
- `--shadow-modal: 0 24px 64px rgba(20, 31, 26, .20)`.

### 6.7 Motion

- `--duration-fast: 140ms`.
- `--duration-normal: 200ms`.
- `--duration-slow: 280ms`.
- Standard easing: `cubic-bezier(.2, .8, .2, 1)`.
- Exit easing: `cubic-bezier(.4, 0, 1, 1)`.

## 7. Component system

### 7.1 Button

Use four variants only:

- **Primary** — one dominant action per region; forest fill and white text.
- **Secondary** — neutral surface, visible border.
- **Tertiary** — text action without a container.
- **Danger** — outlined by default; filled only for the final confirmed destructive action.

Buttons use 40px default height, 36px compact height, 6px radius, and clear pressed/focus states. Loading keeps the label width stable.

### 7.2 Icon Button

Square 36px target on desktop and at least 44px on touch devices. Always provide accessible name and tooltip for unfamiliar actions. Destructive icons gain red only on hover/focus or when inside a destructive confirmation.

### 7.3 Text Input and Textarea

Labels sit above controls. Supporting or error copy has a reserved line below when needed. Inputs use a surface fill, quiet border, and 2px focus ring outside the border. Textareas resize vertically and maintain readable minimum heights.

### 7.4 Select and MultiSelect

Select uses consistent control height and a single chevron. MultiSelect summary shows the field label plus selected count; the menu provides checkboxes and remains keyboard navigable. Selected values may also appear in the active-filter row, but should not duplicate as pills inside the closed control.

### 7.5 Search and Filter

Search is a labeled input rather than a decorative global search bar. Primary filters form one aligned row. Advanced Filters is a disclosure with a clear active count. Active filters use removable tokens and a quiet “Clear all” action.

### 7.6 Tabs and segmented navigation

Use tabs for mutually exclusive views inside one bounded context, such as Sign in/Create account. Use an underline or low-contrast selected fill. Do not use tabs for the Add Application stages because those stages represent progress rather than freely interchangeable content.

### 7.7 Status indicator

Status consists of a 6px semantic dot and sentence-case label. A subtle background may be used in detail headers; table status should remain compact. The full label is always visible.

### 7.8 Badge and metadata tag

Badges describe compact read-only metadata such as employment type or role focus. They use neutral/sage fills, 6px radius, and no heavy border. Avoid turning ordinary text into a badge.

### 7.9 Application table and row

- Header uses small metadata typography and a single bottom rule.
- Rows use 56–64px minimum height and a hover surface rather than separate card borders.
- Role is semibold primary text.
- Company and location form the secondary line or secondary column.
- Status receives the strongest non-title scan cue.
- Dates and type are quiet metadata with tabular figures.
- The entire row may present hover affordance, while actual activation remains on explicit interactive elements unless semantics are implemented correctly.

### 7.10 Card and Section

Use **Section** by default: title, optional supporting text/action, and content separated by spacing or a rule. Use **Card** only when content needs containment or elevation: summary strip, source form, modal, or empty state. Avoid nested cards.

### 7.11 Modal

Compact, centered, max width based on task complexity. Modal includes title, one concise description, content, and right-aligned actions. It traps focus, closes safely where allowed, restores focus, and prevents background interaction. Destructive modals do not close while a destructive request is running.

### 7.12 Drawer

Do not use a drawer in the initial V2. Existing workflows do not require one, and adding it would complicate focus, mobile behavior, and in-memory navigation. Reconsider only if Advanced Filters outgrow their inline disclosure.

### 7.13 Dropdown and Tooltip

Dropdowns support short action lists, never full forms. Tooltips explain icon-only controls and abbreviations; they do not contain essential instructions.

### 7.14 Toast

Top-right desktop, centered above the safe area on mobile. Compact elevated surface with icon, message, and optional dismiss control. Preserve the current 3.5-second success timing. Errors that require action remain inline rather than disappearing only as toasts.

### 7.15 Empty, loading, skeleton, and error states

- New account empty state: explain how to add the first application and provide one clear action through existing navigation.
- Filter no-match state: identify that filters caused the result and offer Clear filters.
- Loading list: skeleton rows matching table columns; retain header and pagination footprint.
- Blocking page error: inline alert below page header.
- Field/form error: nearest relevant field or action group.

### 7.16 Pagination

Result count, page position, page size, and Previous/Next belong to one footer region. Disable unavailable actions without hiding them. On mobile, show page position between full-width previous/next controls and place page size in a secondary row.

### 7.17 Date input

Use native date input initially to preserve behavior and platform accessibility. Maintain English labels around it; do not promise control over the browser's native calendar language.

### 7.18 Timeline

Use a continuous vertical rule, semantic status dot, event label, date, optional notes, and compact edit/delete actions. The latest event receives stronger text, not a larger decorative card. Inline edit retains the event's place in the sequence.

### 7.19 Job requirements

Each source section uses its original heading and a clean bullet list. Minimum/preferred classification may be communicated as quiet metadata where already available, but repeated row-level classification labels should not overwhelm the content.

### 7.20 Skills

Separate Core Skills from Preferred / Good to Have. Within each group preserve the existing technical priority ordering. Use compact tags for specific named skills; longer technical domains may use text rows if tags become difficult to scan. Do not invent proficiency levels.

## 8. My Applications design

### 8.1 Page header

Use a compact header containing:

- Page title: My Applications.
- No redundant subtitle.
- No second Add Application button because the persistent navigation already contains that destination.

### 8.2 Statistics

Replace the interaction-dependent carousel presentation with a compact three-cell summary strip while preserving exactly:

- Total Applications — all records.
- Past Month — `appliedWithin=1m`.
- Past Year — `appliedWithin=1y`.

All three values remain visible at once on desktop. They are textual metrics with tabular figures, not charts. On narrow screens they become a horizontally scrollable snap row or a 3-column compact strip when space permits. No fake trend arrows or comparisons.

### 8.3 Search and filters

Primary row:

1. Job Title.
2. Company.
3. Country multi-select.
4. Employment Type multi-select.

Advanced disclosure contains current status, work setting, term, applied within, from/to dates, year, and location/state/province. The disclosure label shows an active count. Applied filters appear immediately below the control region.

### 8.4 Result toolbar

One baseline contains:

- Left: “7 applications” or loading state.
- Right: Sort By control.

Do not repeat “Application history” if the page title and result context are already clear. If retained, use it as a small section heading rather than a second page title.

### 8.5 Desktop table

Recommended columns:

1. Role / Company — flexible and dominant.
2. Type — compact.
3. Location — country code primary, work setting secondary.
4. Status — semantic indicator.
5. Application date — quiet tabular date.
6. Disclosure chevron.

Recently updated remains the default sort even though the visible date remains application date. The sort label must make that distinction clear.

### 8.6 Compact and mobile records

At tablet width, merge Type and Location into one metadata line beneath role/company. At mobile width, each record becomes a border-separated list row:

- Role and status on the first line.
- Company on the second line.
- Type, country, setting, and application date in a compact metadata line.
- Chevron aligned to the center-right.

These are rows, not floating cards with large gaps.

### 8.7 States

- **Loading:** retain summary/filter layout and render 5–8 skeleton rows.
- **No applications:** concise onboarding copy tied to Add Application.
- **No matches:** state active filters caused the result and expose Clear filters.
- **Error:** keep filters and prior structure visible; display the existing error message prominently.

## 9. Add Application and AI Review design

### 9.1 Stage header

Use a thin progress header:

`1 Source` → `2 Review` → `3 Saved`

The current stage has a forest underline and strong text. Completed stages use a check mark and neutral text. Saved does not become complete until the server confirms persistence.

### 9.2 Source stage

Use one contained source panel, max width approximately 58rem:

- Job URL: single line.
- Full job description: large textarea sized for meaningful inspection.
- Privacy/source note below the textarea.
- Parse with AI aligned at the bottom-right.

No AI gradient, sparkle icon, or model branding. A small structured-document icon is sufficient if any icon is used.

### 9.3 Parsing state

Keep source visible and read-only while busy. In the action area show a small spinner or progress line and “Extracting job details…”. Below it, optional secondary copy may say “This usually takes several seconds.” Do not show a countdown because the real response time varies and the backend timeout is a technical limit, not a promise.

### 9.4 Review layout

On desktop, use a 15rem section index beside a 42–52rem form column. The index lists existing sections and marks sections containing data. It scrolls with the page only where safe and does not introduce routing.

Review sections use top rules and headings, not separate elevated cards. Identity and classification appear first in a contained review summary because they are the highest-risk fields for misclassification.

Repeated groups use rows:

- Locations: one row per location, three fields, remove action.
- Requirements: section title/type header plus textarea; preserve order.
- Skills: name, taxonomy, requirement level; core/technical entries appear before softer terms according to existing order.

Compensation and experience use explicit Add/Remove states so null values remain distinguishable from incomplete values.

### 9.5 Source comparison

The exact original JD remains accessible in a collapsed Source reference near the end of review. On wide screens an optional user-opened side-by-side reference can be a presentation treatment, but the default should not permanently split the viewport because it would constrain the large structured form. This must not create or modify data.

### 9.6 Sticky save bar

Once review exists, a sticky footer within the main canvas displays:

- Left: “Not saved” and a short reminder to review extracted fields.
- Right: Save Application.

The bar should not obscure the last field. It becomes a full-width bottom action area on mobile. Save remains disabled under the same existing conditions.

## 10. Application Detail design

### 10.1 Record header

Use a compact back action followed by:

- Company as a clear eyebrow or secondary heading.
- Job title as page title.
- Current status at the right on desktop and beneath title on mobile.
- One metadata line containing non-unknown employment type, term/year, work setting, primary location, and application date where appropriate.

Unknown values remain omitted as they are today.

### 10.2 Main column

Order:

1. **Overview** — source links, role focus, locations, compensation, experience.
2. **Job requirements** — original headings and bullet content.
3. **Skills** — Core, then Preferred / Good to Have.
4. **Full original job description** — collapsed by default.
5. **Application record** — editable date and notes.
6. **Delete application** — page-end danger row.

Overview should use a definition-grid pattern for compact facts rather than a sequence of headings and paragraphs.

### 10.3 Timeline column

The right column starts with current status and the collapsed **Add Status Update** control. “Add Status Update” is more direct than “Record a Next Step.” It then shows Application Timeline.

Events use a continuous line with readable dates and restrained actions. Editing expands within the selected event. Deleting retains the current browser-confirmation behavior unless a later approved implementation replaces it with an equivalent confirmation component.

The side column may remain sticky below the page header on wide screens, provided long timelines can scroll naturally and do not trap the viewport.

### 10.4 Read-only clarity

Structured job content uses text, tags, and definition rows rather than disabled inputs. This makes it clear that company, job title, requirements, compensation, and parsed skills are not persistently editable after save.

### 10.5 Deletion

Use a thin, lightly tinted danger section aligned to the main column. The button is danger-outline until confirmation. Do not allow the section to span beneath the timeline column or dominate the record.

## 11. Authentication design

### 11.1 Composition

Desktop uses a 42/58 split with a maximum overall width around 64rem. The left region contains wordmark, one sentence, and a minimal ledger-line motif. The right region contains the form on a near-white surface. The composition remains mostly flat; no hero illustration is required.

Suggested context copy: “Keep every application, source posting, and status change in one private workspace.” This is explanatory copy, not a new product promise.

### 11.2 Form hierarchy

- Sign in/Create account segmented control.
- Heading and concise description.
- Reserved form-level feedback area.
- Fields.
- Primary submit.
- Divider.
- Google sign-in or setup-required disabled state.

Forgot and reset modes replace the segmented control with a clear back action. Reset-token checking uses a quiet progress state; invalid links use one terminal alert and two recovery actions without rendering password inputs.

### 11.3 Validation

Sign-in enables with non-empty password and validates credentials only on submit. Registration shows the existing five-character rule while typing. Reset retains matching and minimum requirements. Errors use field borders, icon/text, and `aria-describedby`; color alone is insufficient.

## 12. Settings design

### 12.1 Account section

Use a simple settings list within a constrained 44–50rem column:

- Name, when present.
- Email.
- Change password action.
- Sign out action.

Rows have labels on the left and values/actions on the right on desktop, then stack deliberately on mobile.

### 12.2 Change password

Retain a centered modal. Group current password separately from the new/confirm pair. The reset-email action is a tertiary link below current password. Keep a stable inline response area so success/error copy does not shift the action row.

Successful change closes the modal and uses the existing top-level toast. It should never leave success copy behind the modal backdrop.

### 12.3 Delete account

Place the danger section 32–40px below normal account settings. Default view contains heading, existing description, and danger-outline button. Confirmation modal preserves exact `DELETE`, neutral Cancel, disabled destructive state, backdrop/close/Escape behavior, and concise warning copy.

## 13. Responsive strategy

### 13.1 Desktop: 1280px and above

- Expanded 13.5–14.5rem rail.
- Main content max width around 88rem.
- Full application table.
- Add Review uses section index plus form.
- Detail uses approximately 2fr / 0.9fr columns.

### 13.2 Compact laptop: 960–1279px

- Rail collapses to an icon-led 4rem mode with tooltips, or stays narrow if labels remain readable.
- Main page padding reduces to 24–32px.
- Table merges lower-priority metadata.
- Detail remains two columns until the main content becomes narrower than approximately 38rem.
- Review section index becomes a horizontal sticky section menu or is removed in favor of clear section headings.

### 13.3 Tablet: 720–959px

- Use a compact top bar plus a short bottom/side navigation pattern based on orientation; keep all three destinations visible.
- Summary metrics remain in one compact row or horizontal snap region.
- Filters use a two-column grid; Advanced Filters remains inline.
- Application rows use a hybrid list layout rather than a squeezed table.
- Detail becomes one column with timeline after the identity/overview and before long source content.
- Modals use most of the viewport width but remain centered.

### 13.4 Mobile: below 720px

- Top bar contains wordmark; bottom navigation contains the three destinations with icons and labels.
- Page padding is 16px; controls and interactive targets are at least 44px high.
- Primary filters stack; Advanced Filters opens as an inline full-width disclosure. A future drawer is not required.
- Applications render as compact border-separated rows.
- Add source and review are single-column; stage indicator shortens to names and sticky save uses the bottom safe area.
- Detail places identity, status, overview, timeline/update, requirements, skills, source, notes, and deletion in a deliberate order rather than mechanically preserving desktop columns.
- Modals become inset sheets with scrollable content and fixed action footer when content exceeds viewport height.

## 14. Accessibility strategy

- Text/background and interactive states must meet WCAG AA contrast. Secondary text must not become placeholder-gray on off-white.
- Every navigation item, icon button, filter, disclosure, timeline action, and carousel replacement control is keyboard reachable.
- Use `:focus-visible` with a 2px high-contrast ring and sufficient offset.
- Modal opening moves focus to the heading or first input, traps focus, closes according to current safe behaviors, and restores focus to the trigger.
- Status always includes readable text; dots and color are supplemental.
- Form labels remain programmatically connected. Errors use `aria-invalid`, `aria-describedby`, and an appropriate alert/live region.
- Toasts use a polite live region for success and do not steal focus.
- Loading updates expose appropriate busy state without repeatedly announcing every debounced list request.
- Reduced-motion preference removes transforms, spring motion, and nonessential transitions.
- Long titles, company names, URLs, requirement content, notes, and JD text wrap without clipping. Raw JD preserves line breaks and supports horizontal wrapping rather than forcing page overflow.
- Table semantics remain native at table breakpoints. Mobile list rows use meaningful headings and grouped metadata rather than visually restyled table fragments.
- Pointer targets are at least 44px on touch layouts; desktop compact targets remain at least 36px with adequate separation.
- Destructive actions require explicit confirmation and cannot be triggered by backdrop dismissal.

## 15. Anti-patterns Applytics should never use

- Purple, blue, or rainbow gradients to imply AI.
- Sparkles, magic wands, robots, or glowing parser surfaces.
- Dashboard metrics or trends that do not exist in the product data.
- A card around every section, followed by cards inside those cards.
- Oversized greeting banners or hero copy inside authenticated screens.
- Status communicated only by color.
- Hidden core filters behind an icon-only control on desktop.
- Replacing the original JD with a generated summary.
- Auto-saving parsed AI output before user review.
- A review redesign that omits a currently editable field.
- Disabled inputs used to present ordinary read-only job information.
- Unbounded full-width text on large screens.
- Excessive pills, fully rounded buttons, glass panels, glow, or heavy shadows.
- Motion on every row, metric, or filter update.
- A mobile table that relies primarily on horizontal scrolling.
- A full-screen destructive red area for account or application deletion.
- Navigation or links that imply URL-addressable views while the product still uses in-memory navigation.
- Silent exposure of Skills, Roles, Analytics, generic search, interview-only, or exact-skill backend features.

## 16. Open design decisions requiring product-owner approval

These decisions affect presentation only but should be approved before implementation:

1. **Statistics presentation:** approve replacing the one-at-a-time carousel with a three-value summary strip while preserving the exact three metrics and queries.
2. **Desktop shell:** approve the compact left rail and its icon-led compact-laptop state, while keeping the same three destinations and in-memory navigation.
3. **Mobile navigation:** approve moving the three destinations into a bottom navigation bar on mobile.
4. **Add Review navigation:** approve a desktop section index for the long review form; it changes orientation only and does not create routes or omit fields.
5. **Sticky Save bar:** approve a persistent “Not saved / Save Application” footer during parsed review.
6. **Detail order:** approve placing Application Timeline before long requirements/source sections on mobile while retaining all content.
7. **Status-update label:** approve **Add Status Update** as the direct presentation label for the existing event-creation workflow.
8. **Existing fonts:** approve retaining Manrope + DM Sans as the V2 pair rather than adding a new font dependency.
9. **Icon system:** select one implementation family during engineering; Phosphor is the recommended direction, but no dependency should be added until implementation is approved.

No functional decisions are requested in this phase. Router adoption, structured post-save job editing, analytics UI, skills/roles UI, and additional search features remain outside the approved V2 visual scope.
