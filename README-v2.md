# Roammate V2 Checkpoint

This document summarizes what changed from the v1/demo build to the current v2 checkpoint.

## Summary

V1 was a polished local demo:

- demo auth,
- demo trips and memberships,
- invite records in local state,
- random fallback imagery for searched cities,
- public-ish invite preview assumptions.

V2 moves the app into a hybrid real-data state:

- Supabase auth is live,
- core trip/account entities persist in Supabase,
- the app is fully login-gated,
- share-link joins work against persisted invite records,
- searched cities use provider-backed imagery with a placeholder fallback,
- some planning data still remains local-only.

## What Changed

### Auth and access

- Replaced demo login with Supabase email/password auth.
- Added account creation from `/login`.
- Gated the entire app behind authentication, including invite routes.
- Removed the public landing/use pattern; signed-in users route into the dashboard.

### Persisted in Supabase

These entities are now persisted:

- `profiles`
- `trips`
- `trip_members`
- `trip_invites`

This includes:

- trip creation,
- dashboard visibility for created/joined trips,
- invite link creation,
- invite join flow,
- trip stage updates.

### Still local-only

These parts of the planning experience still use browser local state:

- recurring profile availability windows,
- trip availability ranges,
- trip destinations,
- shortlist state,
- final date option selections,
- votes.

## UX Changes

- Added explicit field labels on the create-trip form.
- Added a clearer planner CTA to move a trip from `collecting_members` to `planning`.
- Invite activity is visible only to the planner.
- Non-planner users see the member roster and passive collection-state messaging only.
- Added a loading state for trip creation/opening so new trips do not flash a false not-found state.

## Destination Search Changes

- Removed the old hash-based random stock image assignment for searched cities.
- Added provider-backed city image lookup for live search results.
- Added a local designed placeholder asset as the only fallback when no trustworthy city image is found.

## Supabase / RLS Changes

- Added a browser Supabase client helper using `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Expanded the SQL schema to match the runtime data shape:
  - `profiles.photo_url`
  - `trips.decided_at`
  - `trip_invites.expires_at`
  - `trip_invites.revoked_at`
- Added helper functions and RLS policies for:
  - trip creator/member/planner checks,
  - joinable share-link access,
  - shared profile visibility between trip members,
  - planner-scoped invite and trip mutations.

## Environment

V2 expects:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `UNSPLASH_ACCESS_KEY`

## Next Step After V2

The next major checkpoint is to move the remaining planning layer into Supabase:

- availability defaults,
- trip availability,
- destination shortlist persistence,
- final date options,
- votes.
