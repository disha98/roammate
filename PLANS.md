# Roammate Plan Status

Last updated: 2026-05-12

## Current Snapshot

The app is now in a V3 checkpoint:

- dashboard separates created and joined trips,
- trip workspace is phase-aware,
- profile page supports passport country selection and recurring availability defaults,
- visa lookups are real and use a repo-local dataset snapshot,
- weather summaries are live,
- destination search is live and selected cities are stored as snapshots,
- searched-city images now use provider lookup with a designed placeholder fallback instead of random stock images,
- destination shortlist and voting UI exist.
- Supabase auth and persisted core entities are wired in for all planning data.
- auth now uses email/password sign-in and account creation rather than passwordless email links.
- the entire app is auth-gated, including invite routes.
- protected app routes now also have server-side Supabase session enforcement through Next.js middleware.
- collecting-members stage now has a clear planner CTA to move into planning.
- invite activity is planner-only.
- destination search is now authenticated and rate-limited server-side before it can spend provider quota.
- destination intelligence is now LLM-powered via Groq API (free tier, `openai/gpt-oss-20b`).
- generic heuristic destination content is no longer shown; the UI shows "unavailable" when LLM data is missing.
- token usage is optimized (~600-800 tokens per destination) for free tier rate limits.

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

- real email delivery for invites,
- stronger backend enforcement and validation of planner/member permissions,
- tighter invite-token RLS and membership validation,
- deployment hardening,
- explicit final trip outcome persistence in the `decided` phase,
- destination recommendations based on group preferences.

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
