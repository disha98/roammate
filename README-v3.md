# Roammate V3 Checkpoint

This document summarizes what changed from the v2 checkpoint to the current v3 checkpoint.

## Summary

V2 had the core trip/account layer persisted in Supabase with demo-quality destination content. Destination summaries, vibe tags, and activity suggestions were generic filler derived from static catalog tags and template sentences.

V3 adds the destination intelligence layer, upgrades the framework, hardens server-side access, and switches to LLM-powered destination content:

- Next.js 15 to 16 upgrade with `@supabase/ssr` for server-side auth.
- Server-side route protection via middleware.
- New destination enrichment API with cost snapshots, per-member travel estimates, and cached enrichment data in Supabase.
- Destination intelligence powered by Groq LLM (free tier) with structured JSON output.
- Quality guardrails: generic heuristic content is no longer shown; "unavailable" states replace filler.
- Auth and rate limiting on destination search.
- React state fixes for login and profile hydration.
- Token-optimized LLM calls (~600-800 tokens per destination).

## What Changed

### Framework and infrastructure

- Upgraded Next.js from 15 to 16.
- Added `@supabase/ssr` for server-side Supabase client support.
- Added `eslint.config.mjs` (ESLint flat config).
- Build command now uses `--webpack` flag.
- Updated PostCSS override to `^8.5.14`.
- Updated `eslint-config-next` to match Next.js 16.
- Updated `tsconfig.json` for Next.js 16 compatibility.

### Server-side auth and route protection

- Added `middleware.ts` with Supabase session enforcement for `/`, `/dashboard`, `/trips/*`, `/profile`, and `/invite/*`.
- Added `src/lib/supabase/server.ts` — server-side Supabase client helper using `@supabase/ssr`.
- Updated `src/lib/supabase/client.ts` for the new SSR package.

### Destination enrichment API

- New route: `src/app/api/destinations/enrichment/route.ts`
  - Reads or refreshes cached per-destination enrichment from Supabase `destination_enrichments` table.
  - Returns destination detail, enrichment data, trip-local cost totals, and per-member route cost estimates.
  - Requires authenticated Supabase user.
  - Geocodes member home cities via Open-Meteo for travel cost estimation.
- New module: `src/lib/destination-intelligence.ts`
  - Fetches source material from Wikipedia, Wikivoyage, and World Bank APIs.
  - Synthesizes summaries, vibe tags, and top activities via Groq LLM.
  - Derives budget tier and local cost estimates from World Bank income-level data.
  - Estimates travel cost from member home city to destination using haversine distance.

### Destination enrichment in the trip workspace

- `src/app/trips/[tripId]/page.tsx` — major expansion (+695 lines):
  - Click-to-open destination detail overlay with:
    - longer destination description,
    - vibe tags,
    - top activities / what to do there,
    - category-level cost estimates (lodging, food, transport, activities),
    - per-member route estimates based on each member's saved home city.
  - Destination cards on the main board show brief summary and vibe tags.
  - "Unreliable" branch shows a clear "City details unavailable" panel instead of generic filler.
- `src/context/app-state.tsx`:
  - Loads `destination_enrichments` from Supabase alongside trip destinations.
  - Maps enrichment rows and passes them through to the trip workspace.
- `src/lib/types.ts`:
  - Added `DestinationEnrichment`, `DestinationLocalCosts`, `DestinationActivity` types.

### LLM provider: Groq

- Added Groq API integration using the OpenAI-compatible chat completions endpoint.
- Default model: `openai/gpt-oss-20b` (smallest model supporting structured JSON output on Groq).
- Structured output uses `response_format: { type: "json_schema" }` for reliable JSON responses.
- The source label is provider-agnostic: `llm_synthesized`.

### Quality guardrails for destination content

- `hasReliableDestinationIntelligence` only returns `true` when `enrichment.source === "llm_synthesized"`.
- Destination cards show "Destination details loading..." and "Tags unavailable" when LLM data is not yet available.
- The destination detail overlay shows a "City details unavailable right now" panel instead of generic template text.
- Weather, visa, and cost data still display normally since those come from reliable non-LLM sources.

### Token optimization

- System prompt shortened with explicit length constraints for each output field.
- User prompt is compact plain text: city name, Wikipedia short summary, and 1500 chars of guide text.
- `max_tokens` set to 1024 to prevent runaway generation.
- Estimated per-request usage: ~600-800 total tokens.

### Destination search hardening

- `src/app/api/destinations/search/route.ts` now requires authenticated Supabase user.
- Added per-user/per-IP rate limiting (20 requests/min).
- Added query length validation (max 80 chars).

### React state fixes

- `src/app/login/page.tsx` — fixed redirect race condition: replaced state boolean with a ref, wrapped URL param reads in `queueMicrotask`.
- `src/app/profile/page.tsx` — fixed React state-during-render warning with `queueMicrotask`.
- `src/context/app-state.tsx` — `isReady` initializes to `true` when Supabase is not configured to avoid blank screen.

### Schema additions

- `src/lib/supabase/schema.sql` — added `destination_enrichments` table and RLS policies for authenticated read/write of cached enrichment rows.

### Other

- Added `favicon.ico`.
- `.gitignore` — broader `.env.*` coverage.
- `CLAUDE.md` — added guardrails section (no reading env files, no pushing without confirmation, no schema changes without confirmation).

## New Files

| File | Purpose |
|------|---------|
| `middleware.ts` | Server-side Supabase session enforcement |
| `src/lib/supabase/server.ts` | Server-side Supabase client helper |
| `src/app/api/destinations/enrichment/route.ts` | Destination detail + per-member cost API |
| `src/lib/destination-intelligence.ts` | LLM-powered enrichment + cost estimation |
| `eslint.config.mjs` | ESLint flat config for Next.js 16 |
| `favicon.ico` | App favicon |
| `README-v3.md` | This file |

## Environment

V3 expects:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- `UNSPLASH_ACCESS_KEY`
- `GROQ_API_KEY` (required for LLM-powered destination intelligence; free at <https://console.groq.com/keys>)

Optional:

- `GROQ_MODEL` — override the default model (defaults to `openai/gpt-oss-20b`)
- `NEXT_PUBLIC_APP_URL` — base URL for generated invite links

## Rate Limits (Groq free tier, openai/gpt-oss-20b)

| Metric | Limit |
|--------|-------|
| Requests/min | 30 |
| Requests/day | 1,000 |
| Tokens/min | 8,000 |
| Tokens/day | 200,000 |

With the current token optimization, this supports roughly 10 destination enrichments per minute.

## Supabase Changes

- New table: `destination_enrichments` (keyed by `destination_id`) with RLS policies for authenticated users.
- Run the updated `src/lib/supabase/schema.sql` in the Supabase SQL editor to apply.

## What's Next

- Richer destination intelligence as token budgets allow (more activities, longer descriptions).
- Explicit final trip outcome persistence in the `decided` phase.
- Email delivery for invites.
- Destination recommendations based on group preferences.
