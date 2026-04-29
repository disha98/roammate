# Project Proposal: Roammate

## One-Line Description
A group trip planning app that helps friends in different cities find common dates, compare destinations, and make decisions together — without the endless group chat.

## The Problem
Planning a group trip with 6-7 friends scattered across countries is a logistical nightmare. Everyone has different availability, different budgets, different visa requirements, and different airports. The current workflow — WhatsApp threads that go in circles, one person (usually me) manually researching flights and visa rules for every combination, Google Sheets that nobody updates — leads to decision fatigue and trips that never happen. There's no single view that answers: "Can we all afford this, will we all enjoy it, and can we all get there?"

## Target User
The "planner friend" — the person in every friend group who takes charge of trip logistics. Specifically, young professionals and grad students with international friend groups spread across multiple cities/countries, planning 1-3 group trips per year. The planner invites their group; everyone participates, but the planner is the power user.

## Core Features (v1)

1. **User Profiles** — Sign up with email, set your home city (used for flight estimates), passport nationality (used for visa checks), and display name. Profile persists across trips so you only set it up once.

2. **Trip Creation + Group Invites** — Create a trip, invite friends via shareable link. Anyone with the link can join and contribute. Dashboard shows all your active trips across different groups.

3. **Availability Calendar** — Each member marks their free dates. The app finds overlapping windows and highlights the best date ranges for the group. Members can edit their availability at any time.

4. **Destination Explorer (Phase 1 — Browse)** — Add or browse destination suggestions. Each destination shows as a card with:
   - Photos carousel depicting the vibe
   - Category/vibe tags (e.g., "Beach," "City Break," "Adventure," "Cultural")
   - Weather summary for the selected travel dates (via Open-Meteo)
   - Visa status per group member (via passport-index dataset)
   - Rough trip cost estimate (budget range, not exact flights yet)
   - AI-generated 2-3 sentence destination summary

5. **Group Voting** — Poll system where members vote on both preferred destinations AND preferred date windows. Poll stays active for 7-10 days. Results show a clear leaderboard to drive a decision.

## Tech Stack
- **Frontend:** Next.js (App Router) — server components for data-heavy pages, great for the dashboard and comparison views
- **Styling:** Tailwind CSS + shadcn/ui — polished, production-quality UI components without heavy custom CSS work
- **Database:** Supabase (Postgres) — stores user profiles, trips, group memberships, availability, votes, and cached destination data
- **Auth:** Clerk — email-based sign-up, handles the invite flow, persistent profiles across trips
- **APIs:**
  - Open-Meteo (free, no key) — historical weather averages for destination + date combos
  - Passport Index Dataset (open-source JSON) — visa requirement lookups by nationality × destination
  - Kiwi Tequila API (3,000 free req/month) — real flight price search for Phase 2 shortlisted destinations
  - Amadeus API (2,000 free req/month) — backup/supplementary flight pricing
  - OpenAI or Claude API — AI-generated destination summaries and vibe descriptions
  - Unsplash API or Google Places Photos — destination imagery for cards
- **Deployment:** Vercel
- **MCP Servers:**
  - Supabase MCP — for database schema management and queries during development
  - Playwright MCP — for end-to-end testing of the invite and voting flows

## Stretch Goals
- **Phase 2 Destination Comparison:** After voting narrows options to 2-3 finalists, fetch real flight prices per person from their home city. Show a side-by-side "final comparison" dashboard with total estimated trip cost per person (flights + accommodation range + daily budget estimate).
- **Smart Destination Suggestions:** Based on the group's passports (visa-free destinations they all share), budget preferences, and travel dates, auto-suggest destinations that work for everyone.
- **Accommodation Estimates:** Integrate rough hotel/Airbnb price ranges per destination to make the cost picture more complete.
- **Trip Timeline:** Once a destination is picked, generate a basic trip skeleton — arrival/departure logistics, suggested activities by day.
- **Notification System:** Email or push reminders for pending votes, approaching poll deadlines, and new trip invites.
- **Mobile-Responsive PWA:** Ensure the app works beautifully on phones since most friends will open the invite link on mobile.

## Biggest Risk
**API rate limits vs. group size math.** With 6-7 people × multiple destinations × date ranges, flight price queries can explode quickly. The two-phase approach (rough estimates first, real flights only for finalists) mitigates this, but it needs careful caching and smart batching. The secondary risk is the **invite/onboarding friction** — if it takes too long for friends to create a profile and mark availability, they'll just go back to WhatsApp. The first-time experience needs to be dead simple: click link → sign up → mark dates → done in under 2 minutes.

## Week 5 Goal
A deployed app where I can create a trip, invite 6 friends via link, have everyone set up profiles (home city + passport), mark availability on a calendar with automatic overlap detection, browse 5+ destination cards with vibe tags, weather data, visa status per member, and rough cost estimates, and run a group poll on destinations and dates. The dashboard shows multiple active trips. Two real friend groups will have tested it with actual profiles and votes. Demo flow: show a pre-planned trip with full data on the dashboard, then walk through creating a new trip from scratch with pre-loaded friend profiles.
