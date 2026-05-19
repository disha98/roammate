# Roammate V4 Final Release

This document summarizes what changed from the v3 checkpoint to the current v4 final desktop release state.

## Summary

V3 had persisted trips, authenticated route protection, LLM-powered destination enrichment, and a working planning flow through voting, but two product gaps remained: invite behavior still carried old email-model assumptions, and the decided state was still derived from votes rather than stored explicitly.

V4 closes those release gaps and adds the final product layer:

- link-only invites across app behavior and schema assumptions,
- explicit persisted final trip outcomes with a planner review-and-lock flow,
- planning-stage destination recommendations generated from trip context and validated against weather and visa fit,
- updated shared branding with the new people-in-pin mark and browser icon,
- polished loading and shell UX around auth, dashboard transitions, and sidebar navigation copy.

## What Changed

### Final outcome persistence

- `src/lib/types.ts`
  - `Trip` now includes persisted final outcome fields:
    - `finalDestinationId`,
    - `finalDestinationSnapshot`,
    - `finalDateStart`,
    - `finalDateEnd`,
    - `finalLockedByProfileId`.
- `src/lib/supabase/schema.sql`
  - `trips` now stores explicit final destination/date outcome fields.
- `src/context/app-state.tsx`
  - Added planner actions to:
    - lock a final destination/date pair from the voting stage,
    - reopen a decided trip back to `voting`.
  - Finalization now writes persisted outcome data rather than relying only on vote-derived UI.
- `src/app/trips/[tripId]/page.tsx`
  - Voting now includes a planner-only review-and-lock step.
  - Decided state now renders from persisted trip outcome fields.
  - Reopening a decision returns the trip to `voting` while preserving the last locked result until a new one is confirmed.

### Link-only invite model

- `src/lib/types.ts`
  - removed the old invite type split and accepted-email invite state from the shared model.
- `src/context/app-state.tsx`
  - removed unused email-invite behavior,
  - invite creation/join now follows the link-only contract.
- `src/lib/supabase/schema.sql`
  - removed old invite columns that supported multi-type/email invite behavior,
  - invite policies now assume a link-only invite model.
- user-facing copy was updated across dashboard, trip, and invite surfaces so the shipped product consistently describes share-link invites rather than email invites.

### Planning-stage recommendations

- New route: `src/app/api/destinations/recommendations/route.ts`
  - authenticated recommendation endpoint,
  - builds an LLM prompt from trip context,
  - validates suggested cities through geocoding,
  - scores them using trip-window weather suitability and best-effort visa fit.
- `src/lib/destination-intelligence.ts`
  - added helpers for:
    - typical weather snapshots,
    - weather scoring,
    - LLM recommendation candidate generation.
- `src/lib/types.ts`
  - added `RecommendedDestination`.
- `src/app/trips/[tripId]/page.tsx`
  - planning stage now shows 3-4 recommendation cards when enough validated suggestions are available,
  - already-added destinations are filtered out,
  - any member can add a recommendation to the trip board,
  - the section hides entirely if recommendation generation does not produce enough validated results.

### Branding and shell polish

- `src/components/logo.tsx`
  - replaced the old pin-and-route logo with the new people-in-pin brand mark.
- `src/app/icon.svg`
  - new browser icon asset matching the brand mark.
- `src/app/layout.tsx`
  - metadata icons now point to the shared SVG icon path.
- `src/components/app-shell.tsx`
  - refreshed sidebar branding,
  - more descriptive left-rail navigation copy,
  - stronger profile/settings explanation,
  - better mobile header logo sizing.

### Loading and transition polish

- `src/components/require-auth.tsx`
  - auth/session loading now renders as a centered overlay panel.
- `src/app/page.tsx`
  - larger brand presentation and richer redirect/loading copy on `/`.
- `src/app/dashboard/loading.tsx`
  - dashboard route-level loading now uses normal top-of-page layout flow instead of an awkward centered skeleton.
- `src/components/app-shell.tsx`
  - removed shell-level centering fallback that caused dashboard refreshes to jump vertically during client hydration.

### Other UI polish

- `src/app/dashboard/page.tsx`
  - richer hero copy,
  - more descriptive empty states,
  - lifecycle copy now matches the planner-lock outcome model.
- minor string cleanup in invite and trip surfaces to satisfy lint and keep copy consistent.

## New Files

| File | Purpose |
|------|---------|
| `src/app/api/destinations/recommendations/route.ts` | Authenticated planning-stage recommendation API |
| `src/app/dashboard/loading.tsx` | Dashboard route loading state |
| `src/app/icon.svg` | Shared browser icon / favicon asset |
| `README-v4.md` | This file |

## Environment

V4 expects the same environment as V3:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- `UNSPLASH_ACCESS_KEY`
- `GROQ_API_KEY`

Optional:

- `GROQ_MODEL`
- `NEXT_PUBLIC_APP_URL`

## Verification

V4 changes were verified with:

- `npm run typecheck`
- `npm run lint`
- `npm run build`

## Supabase Changes

Run the updated `src/lib/supabase/schema.sql` in Supabase to pick up:

- persisted final trip outcome columns on `trips`,
- link-only invite contract changes,
- any associated policy updates from the current branch.

## What's Next

- Richer destination intelligence as token budgets allow.
- Recommendation ranking and prompt tuning if product direction expands.
- Deployment and operational hardening outside the repo-local feature scope.
