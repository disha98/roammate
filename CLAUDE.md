# Roammate v1 Plan: 4-Phase Weekly MVP

## Summary

  Build Roammate as a multi-trip planning app where users log in, see all trips they created or joined on a dashboard, open any trip into a shared planning workspace, invite others by email or link,
  collect availability, compare destinations, and finish with a final vote on destination and dates.

  The implementation should be staged over 4 weeks so each week ends with a coherent, testable increment while preserving the full v1 shape from the start.

  Core product model for v1:

- Trip is the main planning object.
- Each trip has a trip-scoped group_name used for dashboard organization.
- Users can belong to many trips.
- Invite links allow a trip preview before authentication, then join after sign-in.
- Trip lifecycle should support draft, collecting_members, planning, voting, and decided.

## Key Changes and Architecture

### Product Structure

- Dashboard is the primary landing experience after login.
- Dashboard shows:
  - trips created by the user,
  - trips joined by the user,
  - grouping by group_name,
  - status badges so users can distinguish collecting_members, planning, and voting trips quickly.
- Trip detail page is a single planning workspace with modular sections:
  - trip summary,
  - member roster and invite actions,
  - availability,
  - destination shortlist/explorer,
  - voting/final decision.

### Data Model and Interfaces

- Use Supabase Auth for authentication.
- Initial schema should include:
  - profiles: user identity, display name, home city, passport nationality, onboarding completeness.
  - trips: creator, title, group_name, tentative start/end dates, lifecycle status.
  - trip_members: trip membership, role, join status.
  - trip_invites: email invites and share-link tokens with expiry/status.
  - availability_ranges: member-provided date ranges for each trip.
  - destinations: curated seed destination catalog with metadata, imagery, tags, country code, coordinates.
  - trip_destinations: destinations attached to a trip, planner notes, shortlist state, cached enrichment.
  - votes: per-user destination/date-window votes for the final decision phase.
  - optional cache support for weather, visa results, and AI summaries if kept separate from trip_destinations.
- Public interface decisions:
  - authenticated dashboard route,
  - trip create route/modal,
  - trip preview route for invite links,
  - authenticated join-trip action after preview,
  - trip workspace route by trip id,
  - server actions or route handlers for invites, destinations, availability, and voting.

### Integration Strategy

- Weather: live Open-Meteo summaries by destination and trip date window.
- Visa: server-side lookup from local passport-index dataset.
- AI summary: one cached summary per destination.
- Destination imagery: seeded source first; dynamic image sourcing can wait.
- Recommendations: manual destination entry first, lightweight recommendations only after the manual planning loop exists.

## 4 Weekly Phases

### Phase 1: Foundation, Auth, Dashboard, Trip Creation

- Scaffold Next.js app with App Router, TypeScript, Tailwind, and a clean mobile-responsive shell.
- Configure Supabase Auth, protected routes, server/client helpers, and environment handling.
- Implement profile bootstrapping on first login.
- Build dashboard with:
  - My Trips,
  - Joined Trips,
  - grouping by group_name,
  - empty states and basic status display.
- Implement trip creation with:
  - trip title,
  - group name,
  - tentative date window,
  - default lifecycle status of draft or collecting_members.
- Build base trip workspace page with placeholder sections for members, availability, destinations, and voting.
- Outcome at end of week:
  - user can sign in,
  - create multiple trips,
  - see them organized on the dashboard,
  - open a trip workspace.

### Phase 2: Members, Invites, and Join Flow

- Add member roster and trip roles.
- Implement two invite modes:
  - email invite records,
  - shareable join link token.
- Build invite-link preview page:
  - trip title,
  - planner identity,
  - basic group/trip summary,
  - clear CTA to sign in and join.
- After authentication, invite link should auto-complete join if valid.
- Support joined-trip visibility on the dashboard.
- Add profile-completeness indicators for required planning data:
  - display name,
  - home city,
  - passport nationality.
- Add planner action to move trip from collecting_members to planning.
- Outcome at end of week:
  - planner can invite people,
  - invitees can preview and join,
  - joined users appear separately on the dashboard,
  - trip workspace has real group context.

### Phase 3: Planning Mode with Availability and Destinations

- Implement availability entry using range selection on daily granularity.
- Show overlap results at the trip level:
  - common windows,
  - partially overlapping candidate windows,
  - clear incomplete-data states when not all members have responded.
- Seed curated destination catalog and planner-facing destination add flow.
- Build destination cards in the trip workspace with:
  - image,
  - city/country,
  - vibe/category tags,
  - AI summary,
  - live weather summary for relevant date windows,
  - visa status per current member.
- Allow planner to manually curate and narrow destination options.
- Introduce lightweight recommendation hooks only if Phase 3 core loop is stable:
  - recommended destinations can be additive, not required.
- Outcome at end of week:
  - trip is meaningfully in planning mode,
  - members can provide dates,
  - planner can assemble and compare destination options.

### Phase 4: Voting, Decision, Polish, Deployment

- Implement final shortlist flow:
  - planner selects final destination candidates,
  - planner selects viable date windows based on availability results.
- Build voting system:
  - members vote on destination finalists,
  - members vote on date-window finalists,
  - results are aggregated clearly.
- Add decision state:
  - trip can be marked decided,
  - winning destination and date window become the canonical trip outcome.
- Improve UX quality:
  - loading states,
  - error handling,
  - mobile polish,
  - clearer planner/member permissions,
  - dashboard status clarity.
- Add deployment and demo readiness:
  - production env setup,
  - seeded sample data for demo if needed,
  - basic end-to-end validation of create/join/plan/vote flow.
- Outcome at end of week:
  - end-to-end MVP from trip creation through final group decision.

## Test Plan

### Core Flows

- User can sign up, sign in, and persist session.
- User can create several trips with different group_name values.
- User can see created trips and joined trips separately on the dashboard.
- User can open any trip into the shared workspace.

### Invite and Membership

- Email invite records are created correctly.
- Shareable link opens a preview page before auth.
- After auth, valid link joins the user to the trip.
- Joined trip appears on the invitee dashboard.
- Invalid or expired invite links fail gracefully.

### Planning Workspace

- Members can save availability ranges.
- Overlap logic identifies common or best candidate windows.
- Planner can add destinations from the seed catalog.
- Destination cards render weather, visa, and cached summary data safely.
- Missing home city/passport data shows incomplete profile state instead of breaking the page.

### Voting and Outcome

- Planner can move trip to voting with narrowed destination/date options.
- Members can submit votes once and update within allowed rules if supported.
- Winning destination/date are computed consistently.
- Trip can be marked decided and reflected on the dashboard.

### Non-Happy Paths

- Weather or AI enrichment failures degrade gracefully.
- Duplicate joins or duplicate destination attachments are handled consistently.
- Trips with no invites, no availability, or no destinations still render usable empty states.
- Mobile layout remains functional for invite, dashboard, workspace, and voting.

## Assumptions and Defaults

- Supabase Auth is the auth system for v1.
- “Group” is a trip-scoped label used for dashboard organization, not a reusable synced entity.
- Group creation happens implicitly during trip creation via group_name.
- Invite links show a preview first, then require authentication to complete join.
- Availability uses date ranges, not per-day manual toggles.
- Destinations are manual-first in v1; recommendations are secondary.
- Rough cost estimates and live flight pricing are deferred beyond this 4-phase MVP unless time remains.
- Full standalone group management, contact books, notifications, and accommodation pricing are out of scope for this v1 roadmap.

## Guardrails

- Never read, write, or include in tool output:
  - `.env`, `.env.local`, `.env.*`, `.env.*.local`,
  - any file containing API keys, tokens, or connection strings,
  - `package-lock.json` directly; update it only through npm commands.
- Require explicit user confirmation before:
  - any `git push` or PR creation,
  - schema changes in `schema.sql` or migrations,
  - changes to `middleware.ts` or auth configuration.
