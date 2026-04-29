# Roammate

Roammate is a travel planning app for groups. It helps one person plan a trip with friends or family, collect availability, compare destinations, and finish with a final vote on where and when to go.

## What the app does

- Sign in and land on a dashboard.
- See trips you created and trips you joined.
- Open any trip into a shared planning workspace.
- Invite people by email or by shareable link.
- Keep profile details in one place, including display name, home city, passport country, profile photo, and recurring availability windows.
- Search cities worldwide, add destinations, compare them, and review typical weather for the trip month and visa requirements.
- Narrow the trip down to a final shortlist and vote on the winning option.

## What has been built so far

The app already has the main product flow working in the UI:

1. A full-width app shell and dashboard.
2. Trip creation with group names so separate planning threads stay organized.
3. Trip pages that change based on the planning stage.
4. Planner-only controls for inviting people and managing the trip.
5. A profile page for personal details and recurring travel windows.
6. A passport-country dropdown so profile data stays clean and consistent.
7. A month-based typical weather summary for destinations.
8. A real visa lookup backed by a repo-local Passport Index dataset snapshot.
9. A live destination search flow backed by Open-Meteo geocoding, plus snapshot storage for selected cities.
10. A small curated fallback list for demo data.
11. Availability suggestions, final shortlist selection, and voting screens.

## Product progress

This project is currently in a polished demo stage.

- The user experience is in place.
- The trip planning flow is clear.
- The profile and planning data model are set up.
- Visa data is real and backed by a stored dataset snapshot.
- Weather summaries are based on the planned trip month rather than today’s current conditions.
- Destination search is live and not limited to a hardcoded list.
- The app still uses local demo state rather than Supabase persistence for everything.

## Current plan

The next real product step is to move the demo state into Supabase so that:

- auth is real,
- trips and members persist across sessions,
- invites are stored and accepted reliably,
- profile availability and trip availability are shared across users,
- votes and final decisions are backed by the database.

## Main screens

- `Dashboard` - shows all trips you are part of.
- `Trip` - the planning workspace for one trip.
- `Profile & settings` - your personal planning profile.
- `Invite preview` - lets someone join a trip from a shareable link.

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
