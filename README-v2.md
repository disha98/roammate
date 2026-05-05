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

### Planning data — now fully persisted in Supabase

All planning state has been migrated from localStorage to Supabase. Nothing remains local-only:

- `availability_ranges` — per-member date ranges for each trip
- `trip_destinations` — destination options added to a trip (with destination catalog upsert)
- `votes` — member votes on destination/date finalists
- `profile_availability_windows` — recurring personal availability windows
- `trips.final_date_option_ids` — planner-selected final date options
- `trips.trip_duration` — actual trip length in days (separate from the broader planning window)

## UX Changes

- Added explicit field labels on the create-trip form.
- Added a clearer planner CTA to move a trip from `collecting_members` to `planning`.
- Invite activity is visible only to the planner.
- Non-planner users see the member roster and passive collection-state messaging only.
- Added a loading state for trip creation/opening so new trips do not flash a false not-found state.
- Planner can remove members from a trip.
- Members can leave a trip (removes their votes, availability, and membership).
- Planner can delete trips with an inline confirmation panel (no browser alerts).
- Planner can edit the trip window (tentative start/end dates) and trip duration after creation.
- Trip creation form includes a "Trip length (days)" field.
- Dashboard cards show trip duration, member count, and attention indicators (e.g., "Vote now", "Add your dates").
- Invite flow replaced email form with copy-link UX: "Generate link" → "Copy" button with clipboard feedback.
- Profile photo input replaced with a device file upload button (uploads to Supabase Storage `avatars` bucket).
- "Open voting" CTA added to the planning stage when shortlist and final dates are ready.

## Destination Search Changes

- Removed the old hash-based random stock image assignment for searched cities.
- Added provider-backed city image lookup for live search results.
- Added a local designed placeholder asset as the only fallback when no trustworthy city image is found.

## Availability Overlap Algorithm

- Accepts an optional `tripDuration` parameter (actual trip length in days).
- Uses a sliding window approach: finds contiguous runs of coverage > 0, then slides a window of `tripDuration` days to find the best coverage windows.
- Returns up to 6 options sorted by coverage then length.
- Separates "trip window" (broad flexible date range) from "trip duration" (actual trip length).

## Supabase / RLS Changes

- Added a browser Supabase client helper using `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Expanded the SQL schema to match the runtime data shape:
  - `profiles.photo_url`
  - `trips.decided_at`
  - `trips.final_date_option_ids text[]`
  - `trips.trip_duration integer`
  - `trip_invites.expires_at`
  - `trip_invites.revoked_at`
  - `profile_availability_windows` table
- Added helper functions and RLS policies for:
  - trip creator/member/planner checks,
  - joinable share-link access,
  - shared profile visibility between trip members,
  - planner-scoped invite and trip mutations,
  - planning tables: availability_ranges, destinations, trip_destinations, votes, profile_availability_windows,
  - delete policies for trips (creator only) and trip_members (planner or self).
- Supabase Storage: `avatars` bucket with per-user folder policies for profile photo uploads.

## Environment

V2 expects:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- `UNSPLASH_ACCESS_KEY`

Optional:
- `NEXT_PUBLIC_APP_URL` — base URL for generated invite links (falls back to `VERCEL_URL` or `localhost:3000`)

## Supabase Setup Required

1. Run `src/lib/supabase/schema.sql` in the Supabase SQL editor to create/update all tables, columns, and RLS policies.
2. Create an `avatars` storage bucket (public) with policies allowing authenticated users to upload to their own folder path.

## What's Next

- Visa lookup integration per member passport and destination.
- Weather summary per destination and trip date window.
- AI-generated destination summaries.
- Destination recommendations based on group preferences.
