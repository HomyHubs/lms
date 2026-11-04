# ADR 0008 — UI shell, navigation source and role colour tokens (slice-10)

Status: Accepted with the slice-10 PR.

## Context

Each page rendered its own `<main>`, a "Trang chu" back link and copy-pasted Tailwind class strings
with raw hues. The home page was a health check plus a link row, and route role guards in
`App.tsx` repeated the role lists of those links. The owner approved the look recorded in
`docs/design/ui-reference.md`.

## Decision

1. **One layout route.** Every protected page renders inside `AppShell` (sidebar + top bar +
   `<main>`), mounted once as `<RequireAuth><AppShell/></RequireAuth>`.
2. **`NAV_ITEMS` is the single source** for the sidebar, the dashboard shortcuts and the per-route
   `RequireAuth role=...` guard. Adding a page = one entry in `nav.ts` + one element in `PAGES`
   (typed by `NavPath`, so a missing page fails typecheck).
3. **Colours by role, not hue.** `tailwind.config.js` maps `primary/success/accent/warning/danger`
   to Tailwind palettes; feature code uses only these names (plus slate for neutrals).
4. **Repeated class strings become pattern classes** in `index.css` (`.c-card`, `.c-section-title`,
   `.c-hero`, `.c-input`, `.c-table`) or components in `components/ui/` (`Card`, `CardTitle`,
   `StatCard`, `Badge`, `PageHeader`, `buttonVariants`, `TONE_TILE`).
5. **Dashboards reuse existing APIs** (users, branches, classes, timesheet, attendance, exams); no
   new endpoint. The DB health check becomes a chip in the top bar.

## Consequences

- Restyle is behaviour-neutral; existing tests stayed green, plus one shell test per role.
- Search and the notification bell are left for later (bell in slice-9b).
- Users still have no full-name column, so the top bar shows the phone number.
