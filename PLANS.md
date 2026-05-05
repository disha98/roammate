# Roammate Plan Status

Last updated: 2026-05-05

## Current Snapshot

The app is now in a hybrid V2 checkpoint:

- dashboard separates created and joined trips,
- trip workspace is phase-aware,
- profile page supports passport country selection and recurring availability defaults,
- visa lookups are real and use a repo-local dataset snapshot,
- weather summaries are live,
- destination search is live and selected cities are stored as snapshots,
- searched-city images now use provider lookup with a designed placeholder fallback instead of random stock images,
- destination shortlist and voting UI exist.
- Supabase auth and persisted core entities are wired in for:
  - profiles,
  - trips,
  - trip members,
  - trip invites.
- auth now uses email/password sign-in and account creation rather than passwordless email links.
- the entire app is auth-gated, including invite routes.
- collecting-members stage now has a clear planner CTA to move into planning.
- invite activity is planner-only.

The main missing pieces are the remaining planning entities, which still live in browser `localStorage`.

## Shipped vs Pending

### Shipped in the current demo build

- dashboard and app shell,
- trip creation backed by Supabase,
- invite preview/join UX backed by Supabase,
- planner-only controls for invite actions,
- planner-only invite activity visibility,
- profile page with Supabase-backed profile identity,
- recurring availability windows,
- live destination search plus selected-city snapshots,
- curated fallback destinations for demo data,
- live weather,
- dataset-backed visa lookup,
- stage-driven trip workspace,
- voting/decision screens.

### Still pending

- Supabase persistence for profile availability, trip availability, destinations, votes,
- real email delivery for invites,
- stronger backend enforcement and validation of planner/member permissions,
- deployment hardening,
- migration of remaining planning state off browser `localStorage`.

## Recommended Next Sequence

### Phase 1

Shipped:

- Supabase auth,
- persisted profiles,
- persisted trips,
- persisted trip members,
- persisted trip invites,
- persisted invite preview/join flow.

### Phase 2

Persist planning state:

- profile availability windows,
- trip availability ranges,
- trip destinations and shortlist state,
- final date option selections,
- votes.

### Phase 3

Productionize invites and permissions:

- real email delivery,
- stricter server-side permission enforcement,
- broader QA of RLS behavior for join/share/profile visibility,
- better error states for invalid joins and write failures.

### Phase 4

Finish production readiness:

- error handling,
- loading states,
- mobile polish,
- deployment,
- sample/demo data strategy,
- weather/visa enrichment caching strategy for persisted destination records.

## Maintenance Rule

Whenever the implementation changes materially, update both:

- `AGENTS.md` for handoff/context,
- `PLANS.md` for current status and next work.
