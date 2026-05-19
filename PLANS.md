# Roammate Final Release Status

Last updated: 2026-05-18

## Current Status

The final desktop release plan in this document has been implemented on the current branch.

Shipped now:

- link-only invites across product copy, app logic, and schema assumptions,
- persisted planner-locked final destination/date outcomes on trips,
- planner reopen flow back to `voting` while retaining the last locked outcome until re-locked,
- planning-stage recommendation panel backed by `/api/destinations/recommendations`,
- LLM-suggested recommendations validated with geocoding, trip-window weather, and best-effort visa fit,
- passing `npm run typecheck`, `npm run lint`, and `npm run build`.

## Release Target

This is the final ship plan for the production-ready desktop release.

The release must:

- remove email invites and ship link-only invites end to end,
- persist explicit final trip outcomes instead of deriving them only from votes,
- add 3-4 planning-stage destination recommendations generated from LLM trip context,
- keep recommendations focused on trip-window weather suitability first and low visa friction for most of the group second,
- stay on free APIs/providers only,
- finish with desktop-quality UX cleanup and successful `typecheck`, `lint`, and `build`.

Mobile-specific polish is not required for this release.

## Locked Product Decisions

### Invites

- invites are link-only in the shipped product,
- email-invite UI, copy, logic, and schema support should be removed rather than hidden,
- invite preview and join flow remain authenticated and share-link based.

### Final Outcome

- the planner explicitly reviews and locks the final destination and date window,
- the planner may lock any shortlisted destination and any final date option, not just top-voted winners,
- locking persists the outcome to the trip record and moves the trip into `decided`,
- reopening a decision returns the trip to `voting`,
- the last locked outcome remains visible until a new outcome is re-locked.

### Recommendations

- recommendations appear in the planning board near destination search/add flows,
- recommendations are generated from a prompt built from the trip window, trip duration, trip members, passport data when available, and current trip board context,
- the LLM proposes the cities, then each city must be validated with geocoding/country metadata before display,
- only 3-4 recommendations should be shown,
- already-added trip destinations should be hidden from recommendations,
- any trip member may add a recommended destination to the board,
- each recommendation should show 2-3 short reasons,
- if recommendation generation fails, hide the section entirely,
- if some traveler profiles are incomplete, still show best-effort recommendations using known data.

## Implementation Work

### 1. Link-only invite cleanup

- update shared types and app state to remove email-invite support,
- update `trip_invites` reads/writes to link-only behavior,
- remove unused email-invite state/actions,
- remove invite-by-email wording from dashboard, docs, and other user-facing copy,
- tighten invite join/update handling around the link-only flow.

### 2. Persisted decision model

- extend `trips` with persisted winner fields for destination and date window,
- map those fields into shared trip state,
- add planner actions to lock a final destination/date pair and to reopen the decision,
- replace decided-stage vote-derived winners with persisted outcome rendering,
- keep vote counts available during review while treating the planner lock as the source of truth.

### 3. Planning recommendations

- add an authenticated recommendations API route,
- build an LLM prompt using trip data and visa/weather goals,
- validate suggested cities before display,
- compute explanation copy from the validated result,
- show recommendations only during planning and only when they load successfully,
- allow direct add-to-trip behavior from each recommendation card.

### 4. Desktop release hardening

- clean up stale copy that still promises email invites,
- tighten empty/error/loading states around invites, finalization, and recommendations,
- keep the experience user-facing rather than developer-facing,
- run `npm run typecheck`, `npm run lint`, and `npm run build`.

## Acceptance Criteria

- planners can create, copy, revoke, preview, and use link invites with no email-invite traces left in the product,
- locked destination/date outcomes persist across reloads and render correctly in the decided stage,
- planners can reopen a locked decision and re-lock a new outcome,
- non-planners cannot lock or reopen outcomes,
- recommendations show at most 4 validated cities with rationale and can be added into the trip,
- recommendations hide cleanly on failure without generic fallback content,
- the app passes typecheck, lint, and build before handoff.

## Maintenance Rule

Whenever the implementation changes materially, update both:

- `AGENTS.md` for handoff/context,
- `PLANS.md` for current status and next work.
