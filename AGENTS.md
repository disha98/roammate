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

The app now has a hybrid v2 architecture: core trip/account data is persisted in Supabase, while the remaining planning layer is still local-only.

Implemented now:

- dashboard with created/joined trip separation and group-based organization,
- trip creation,
- invite preview/join flow,
- trip workspace with stage-driven UX,
- planner-only controls for member invites and trip management,
- non-planner users do not see invite activity,
- collecting-members stage includes an explicit planner CTA to move the trip into planning,
- profile page with display name, home city, passport country dropdown, photo URL, and recurring availability windows,
- live weather summaries,
- real visa lookup backed by a repo-local Passport Index CSV snapshot,
- destination catalog and shortlist flow,
- date-window overlap suggestions,
- voting / decision UI.
- Supabase-backed auth and persisted core trip records when env vars are configured:
  - profiles,
  - trips,
  - trip members,
  - trip invites.
- auth now uses email/password sign-in and account creation from the `/login` screen.
- live searched-city images now attempt a real provider lookup and fall back to a designed placeholder instead of random stock photos.

Still local-only / not yet persisted:

- recurring profile availability windows,
- trip availability ranges,
- destination shortlist state,
- votes and final date selections,
- email delivery for invites.

## Important Architecture Notes

- The main state container is `src/context/app-state.tsx`.
- The app now uses a hybrid state model:
  - Supabase is the source of truth for auth, profiles, trips, trip members, and trip invites.
  - browser `localStorage` is still the source of truth for profile availability defaults, trip availability, trip destinations, shortlist state, votes, and final date option picks.
- Local planning state is stored per authenticated profile under the `roammate-planning-state-v2:<profileId>` key.
- The app shell spans the full viewport width and the profile/settings entry lives bottom-left in the sidebar.
- The workspace is phase-based:
  - `draft` / `collecting_members` emphasizes invites and membership,
  - `planning` emphasizes availability and destinations,
  - `voting` emphasizes final choices,
  - `decided` emphasizes the outcome.
- The entire app is behind authentication. `/`, `/dashboard`, trip routes, and invite routes all require login.
- Destination selection is live-search backed. The trip workspace should search world cities from an API rather than rely on a fixed picker, and the selected city should be stored as a snapshot on the trip.
- Destination search imagery should never use random unrelated photos. Search results now try a provider-backed city image lookup via `UNSPLASH_ACCESS_KEY`; if no trustworthy image is found, use the local placeholder.
- Supabase RLS is required for the persisted experience. The current schema file contains helper functions and policies for:
  - trip visibility,
  - joinable share links,
  - shared profile visibility between trip members,
  - planner-scoped invite/trip mutations.
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
- `src/lib/destination-images.ts` - provider-backed searched-city image resolution with placeholder fallback.
- `src/lib/supabase/client.ts` - browser Supabase client helper.
- `src/lib/supabase/schema.sql` - baseline schema plus RLS policies for persisted core entities.

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

## Environment

Local development now expects:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `UNSPLASH_ACCESS_KEY`

The Supabase client helper still accepts the legacy anon key env var as a fallback, but the preferred variable is `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

## Next Real Product Step

Move the remaining planning state into real Supabase persistence while keeping the same UI flow:

- recurring profile availability windows,
- trip availability ranges,
- trip destinations and shortlist state,
- votes and final date selections.
