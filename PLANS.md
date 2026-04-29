# Roammate Plan Status

Last updated: 2026-04-27

## Current Snapshot

The app is already usable as a polished demo:

- dashboard separates created and joined trips,
- trip workspace is phase-aware,
- profile page supports passport country selection and recurring availability defaults,
- visa lookups are real and use a repo-local dataset snapshot,
- weather summaries are live,
- destination search is live and selected cities are stored as snapshots,
- destination shortlist and voting UI exist.

The main missing piece is backend persistence. The current implementation still stores state in `localStorage` rather than Supabase.

## Shipped vs Pending

### Shipped in the current demo build

- dashboard and app shell,
- trip creation,
- invite preview/join UX,
- planner-only controls for invite actions,
- profile page,
- recurring availability windows,
- live destination search plus selected-city snapshots,
- curated fallback destinations for demo data,
- live weather,
- dataset-backed visa lookup,
- stage-driven trip workspace,
- voting/decision screens.

### Still pending

- Supabase auth,
- Supabase persistence for profiles, trips, members, invites, availability, destinations, votes,
- real email delivery for invites,
- backend enforcement of planner/member permissions,
- deployment hardening,
- data migration off demo `localStorage`.

## Recommended Next Sequence

### Phase 1

Move auth and state persistence to Supabase while keeping the current UI intact.

### Phase 2

Make invites real:

- email invites,
- invite tokens,
- join completion after sign-in,
- backend permission checks.

### Phase 3

Persist planning data:

- profile availability,
- trip availability,
- destination shortlist,
- visa/weather enrichment caching,
- votes.

### Phase 4

Finish production readiness:

- error handling,
- loading states,
- mobile polish,
- deployment,
- sample/demo data strategy.

## Maintenance Rule

Whenever the implementation changes materially, update both:

- `AGENTS.md` for handoff/context,
- `PLANS.md` for current status and next work.
