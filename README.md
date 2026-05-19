# Roammate

Roammate is a travel planning app for groups. It helps one person plan a trip with friends or family, collect availability, compare destinations, and finish with a final vote on where and when to go.

## What the app does

- Sign in and land on a dashboard.
- See trips you created and trips you joined.
- Open any trip into a shared planning workspace.
- Invite people by shareable link.
- Keep profile details in one place, including display name, home city, passport country, profile photo, and recurring availability windows.
- Search cities worldwide, add destinations, compare them, and review typical weather for the trip month and visa requirements.
- Narrow the trip down to a final shortlist, vote, and let the planner lock the final destination and date window.

## What has been built so far

The app has the full planning flow working end-to-end:

1. Full-width app shell and dashboard with created/joined trip separation and group-based organization.
2. Trip creation with group names, tentative date windows, and trip duration.
3. Trip pages that change based on the planning stage (collecting members, planning, voting, decided).
4. Planner-only controls for inviting people, managing members, and advancing trip stages.
5. Profile page with display name, home city, passport country, profile photo upload, and recurring availability windows.
6. Passport-country dropdown so profile data stays clean and consistent.
7. Month-based typical weather summaries for destinations based on trip dates.
8. Real visa lookup backed by a repo-local Passport Index dataset snapshot.
9. Live destination search backed by Open-Meteo geocoding with auth and rate limiting.
10. LLM-powered destination intelligence via Groq: city-specific summaries, vibe tags, and top activities.
11. Destination detail overlay with cost snapshots and per-member travel estimates based on home city.
12. Date-window overlap suggestions with sliding window algorithm.
13. Availability entry, final shortlist selection, voting screens, and persisted planner lock flow for the final trip outcome.
14. Planning-stage destination recommendations generated from trip context, validated against weather fit and visa friction.
15. Supabase-backed auth and full persistence: profiles, trips, members, link invites, availability, destinations, enrichments, votes, and final locked outcomes.
16. Server-side route protection via Next.js middleware with Supabase session enforcement.
17. Provider-backed searched-city image lookup with a designed placeholder fallback.
18. Invite link preview with sign-in CTA and auto-join after authentication.

## Product progress

This project is now at its v4 final desktop release state on the current branch.

- The full user experience is in place from trip creation through group decision.
- All planning data is persisted in Supabase (nothing remains in localStorage).
- The entire app is auth-gated with server-side session enforcement.
- Invites are link-only across the shipped product.
- Destination intelligence is powered by Groq LLM with structured JSON output and token-optimized requests.
- Planning recommendations are LLM-suggested, then validated against geocoding, trip-window weather, and best-effort visa fit.
- Only LLM-synthesized content is shown; the UI shows "unavailable" instead of generic filler.
- Visa data is real and dataset-backed.
- Weather summaries are based on the planned trip month.
- Destination search is live, authenticated, and rate-limited.
- Cost estimates are derived from World Bank income-level data with city-level adjustments.
- Per-member travel cost estimates are computed from home city distance.
- Final destination and date winners are persisted explicitly when the planner locks the outcome.
- The app branding now uses the new shared people-in-pin mark across the shell, auth surfaces, and browser icon path.
- Shared loading states and dashboard transitions have been polished so auth/session loading is centered while dashboard data loading stays in normal page flow.

## What’s next

- Richer destination intelligence as token budgets allow.
- Recommendation tuning and smarter ranking inputs if product direction expands.
- Deployment and operational hardening outside the repo-local product scope.

## Environment

Local development expects:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- `UNSPLASH_ACCESS_KEY`
- `GROQ_API_KEY` (for LLM-powered destination intelligence; free at https://console.groq.com/keys)

Optional:

- `GROQ_MODEL` — override the default model (defaults to `openai/gpt-oss-20b`)
- `NEXT_PUBLIC_APP_URL` — base URL for generated invite links (falls back to `VERCEL_URL` or `localhost:3000`)

Auth uses Supabase email/password sign-in and account creation from `/login`.

## Supabase setup

1. Run `src/lib/supabase/schema.sql` in the Supabase SQL editor to create all tables, columns, and RLS policies.
2. Create an `avatars` storage bucket (public) with policies allowing authenticated users to upload to their own folder path.

## Main screens

- `Dashboard` - shows all trips you are part of.
- `Trip` - the planning workspace for one trip.
- `Profile & settings` - your personal planning profile.
- `Invite preview` - lets someone join a trip from a shareable link.

For a focused summary of what changed in each checkpoint, see [README-v2.md](README-v2.md), [README-v3.md](README-v3.md), and [README-v4.md](README-v4.md).

## Local development

```bash
npm run dev
```

Other useful commands:

- `npm run typecheck`
- `npm run build`
- `npm run lint`

## Project notes for future sessions

- Keep `AGENTS.md` and `PLANS.md` updated when the product shape changes.
- Do not replace the passport country dropdown with free text.
- Keep visa lookup dataset-backed and cached.
- Keep destination search live and store the selected city as a snapshot on the trip.
- Keep the dashboard and trip workspace user-facing rather than development-facing in copy and labels.
