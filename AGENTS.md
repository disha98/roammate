# Roammate Handoff Guide

Read this file first in a new session. It should give enough context to continue work without re-discovering the project state.

## What This App Is

Roammate is a multi-trip travel planning app.

The intended product flow is:

- log in,
- land on a dashboard showing trips you created and trips you joined,
- open any trip into a shared planning workspace,
- invite people by email or link,
- collect member availability,
- compare destinations,
- vote on the final destination and date window.

## Current State

The app already has the product shape and most of the UI, but the backend is still demo-mode local state.

Implemented now:

- dashboard with created/joined trip separation and group-based organization,
- trip creation,
- invite preview/join flow,
- trip workspace with stage-driven UX,
- planner-only controls for member invites and trip management,
- profile page with display name, home city, passport country dropdown, photo URL, and recurring availability windows,
- live weather summaries,
- real visa lookup backed by a repo-local Passport Index CSV snapshot,
- destination catalog and shortlist flow,
- date-window overlap suggestions,
- voting / decision UI.

Still demo-only:

- app state persists in `localStorage`,
- auth is local/demo rather than Supabase-backed,
- email invites are records in app state, not real sent emails,
- votes, availability, memberships, and trips are not yet persisted in Supabase.

## Important Architecture Notes

- The main state container is `src/context/app-state.tsx`.
- The current demo state model is normalized on load to survive older saved state.
- The app shell spans the full viewport width and the profile/settings entry lives bottom-left in the sidebar.
- The workspace is phase-based:
  - `draft` / `collecting_members` emphasizes invites and membership,
  - `planning` emphasizes availability and destinations,
  - `voting` emphasizes final choices,
  - `decided` emphasizes the outcome.
- Destination selection is live-search backed. The trip workspace should search world cities from an API rather than rely on a fixed picker, and the selected city should be stored as a snapshot on the trip.
- Profile passport country must remain a fixed country selector, not free text.
- Visa data must stay real and dataset-backed. Current source of truth is the local CSV snapshot in `src/lib/visa-data/passport-index-tidy-iso2.csv`.
- Keep the UI language user-facing; avoid development-sounding copy.

## Key Files

- `src/app/dashboard/page.tsx` - dashboard and summary cards.
- `src/app/trips/[tripId]/page.tsx` - trip workspace and phase-specific planning flow.
- `src/app/profile/page.tsx` - profile, passport country dropdown, availability defaults.
- `src/components/app-shell.tsx` - shell, sidebar, profile/settings placement.
- `src/components/visa-requirement.tsx` - visa rendering component.
- `src/lib/visa-dataset.ts` - dataset-backed visa resolution.
- `src/lib/visa-data/passport-index-tidy-iso2.csv` - local Passport Index snapshot.
- `src/lib/destinations.ts` - curated destination seed data.
- `src/lib/availability.ts` - overlap and window calculation helpers.
- `src/lib/types.ts` - shared app state types.
- `src/lib/demo-data.ts` - initial local demo state.

## Working Rules

- Do not revert user changes unless explicitly asked.
- Use `apply_patch` for file edits.
- Prefer small, targeted changes over broad rewrites.
- Keep ASCII unless the file already requires otherwise.
- If adding behavior, update the corresponding handoff plan so the next session knows the new state.

## Verification

Use these commands when changing app behavior:

- `npm run typecheck`
- `npm run build`
- `npm run lint`

## Next Real Product Step

Move the current demo state into real Supabase persistence while keeping the same UI flow:

- auth,
- profiles,
- trips,
- trip members,
- invites,
- availability,
- destinations,
- votes.
