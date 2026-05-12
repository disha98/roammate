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

The app is now in a v3 checkpoint state: the core trip/account layer and the active planning layer are persisted in Supabase, and destination intelligence is cached per city in Supabase for reuse across trips.

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
- destination cards that show brief vibe tags and summary copy on the main board,
- click-to-open destination detail overlay with:
  - longer destination description,
  - top activities / what to do there,
  - category-level cost estimates,
  - per-member route estimates based on each member's saved home city,
- date-window overlap suggestions,
- voting / decision UI.
- Supabase-backed auth and persisted trip/planning records when env vars are configured:
  - profiles,
  - trips,
  - trip members,
  - trip invites,
  - profile availability windows,
  - trip availability ranges,
  - trip destinations,
  - final date option picks on trips,
  - votes,
  - cached destination enrichments.
- auth now uses email/password sign-in and account creation from the `/login` screen.
- live searched-city images now attempt a real provider lookup and fall back to a designed placeholder instead of random stock photos.
- destination enrichment is now LLM-powered via Groq API:
  - free APIs provide source material: Wikipedia / Wikivoyage for destination copy, World Bank for cost tiering, Open-Meteo for geocoding,
  - Groq LLM (`openai/gpt-oss-20b`) synthesizes summaries, vibe tags, and top activities from the source material,
  - structured JSON output ensures reliable response format,
  - token usage is optimized (~600-800 tokens per request) for free tier limits,
  - when LLM data is unavailable, the UI shows explicit "unavailable" states instead of generic filler,
  - only `llm_synthesized` source enrichments are shown as reliable; heuristic/mixed data is treated as unavailable,
  - per-member travel estimates are derived at request time from the member home city and destination coordinates.

Still not fully productized:

- email delivery for invites,
- explicit persisted final destination/date winners in the `decided` phase.

## Important Architecture Notes

- The main state container is `src/context/app-state.tsx`.
- Supabase is now the source of truth for auth, profiles, trips, trip members, trip invites, profile availability windows, availability ranges, trip destinations, votes, and cached destination enrichment.
- The trip workspace still derives the final decided state from votes rather than storing explicit winning destination/date fields.
- The app shell spans the full viewport width and the profile/settings entry lives bottom-left in the sidebar.
- The workspace is phase-based:
  - `draft` / `collecting_members` emphasizes invites and membership,
  - `planning` emphasizes availability and destinations,
  - `voting` emphasizes final choices,
  - `decided` emphasizes the outcome.
- The entire app is behind authentication. `/`, `/dashboard`, trip routes, and invite routes all require login.
- Destination selection is live-search backed. The trip workspace should search world cities from an API rather than rely on a fixed picker, and the selected city should be stored as a snapshot on the trip.
- Destination search imagery should never use random unrelated photos. Search results now try a provider-backed city image lookup via `UNSPLASH_ACCESS_KEY`; if no trustworthy image is found, use the local placeholder.
- Destination enrichment now has a second layer:
  - `/api/destinations/enrichment` reads or refreshes cached per-destination detail,
  - `destination_enrichments` is keyed by `destination_id`,
  - the overlay computes trip-local totals plus per-member route estimates from profile `homeCity`,
  - only free APIs should be used for this enrichment path unless product direction changes explicitly.
- Supabase RLS is required for the persisted experience. The current schema file contains helper functions and policies for:
  - trip visibility,
  - joinable share links,
  - shared profile visibility between trip members,
  - planner-scoped invite/trip mutations,
  - authenticated reads/writes for shared destination enrichment cache rows.
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
- `src/lib/destination-intelligence.ts` - LLM-powered destination enrichment (Groq API) and cost estimation helpers.
- `src/lib/availability.ts` - overlap and window calculation helpers.
- `src/lib/types.ts` - shared app state types.
- `src/lib/demo-data.ts` - initial local demo state.
- `src/lib/destination-images.ts` - provider-backed searched-city image resolution with placeholder fallback.
- `src/lib/supabase/client.ts` - browser Supabase client helper.
- `src/lib/supabase/schema.sql` - baseline schema plus RLS policies for persisted core entities.
- `src/app/api/destinations/enrichment/route.ts` - cached destination detail and per-member cost API.

## Working Rules

- Do not revert user changes unless explicitly asked.
- Use `apply_patch` for file edits.
- Prefer small, targeted changes over broad rewrites.
- Keep ASCII unless the file already requires otherwise.
- If adding behavior, update the corresponding handoff plan so the next session knows the new state.
- Never read, write, or include in tool output:
  - `.env`, `.env.local`, `.env.*`, `.env.*.local`,
  - any file containing API keys, tokens, or connection strings,
  - `package-lock.json` directly; update it only through npm commands.
- Require explicit user confirmation before:
  - any `git push` or PR creation,
  - schema changes in `schema.sql` or migrations,
  - changes to `middleware.ts` or auth configuration.

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
- `GROQ_API_KEY` (required for LLM-powered destination intelligence)

Optional:

- `GROQ_MODEL` — override the default LLM model (defaults to `openai/gpt-oss-20b`)

The Supabase client helper still accepts the legacy anon key env var as a fallback, but the preferred variable is `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

The app now also has server-side route protection:

- `middleware.ts` enforces Supabase session checks for `/`, `/dashboard`, `/trips/*`, `/profile`, and `/invite/*`,
- `/api/destinations/search` now requires an authenticated Supabase user and applies a basic per-user/per-IP rate limit,
- `/api/destinations/enrichment` also requires an authenticated Supabase user.

## Next Real Product Step

- Richer destination intelligence as token budgets allow (more activities, longer descriptions).
- Explicit final trip outcome persistence once the group moves into `decided`.
- Email delivery for invites.
- Destination recommendations based on group preferences.
