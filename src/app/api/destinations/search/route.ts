import { NextResponse } from "next/server";
import { normalizeDestination, type OpenMeteoSearchResult } from "@/lib/destination-search";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const cache = new Map<
  string,
  { expiresAt: number; payload: Awaited<ReturnType<typeof normalizeDestination>>[] }
>();
const TTL = 1000 * 60 * 60 * 24;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const rateLimitBuckets = new Map<string, number[]>();

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}

function isRateLimited(key: string) {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const recent = (rateLimitBuckets.get(key) ?? []).filter((timestamp) => timestamp > windowStart);

  recent.push(now);
  rateLimitBuckets.set(key, recent);

  return recent.length > RATE_LIMIT_MAX_REQUESTS;
}

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Destination search is unavailable." }, { status: 503 });
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";
  if (query.length > 80) {
    return NextResponse.json({ error: "Search query is too long." }, { status: 400 });
  }

  const rateLimitKey = `${user.id}:${getClientIp(request)}`;
  if (isRateLimited(rateLimitKey)) {
    return NextResponse.json(
      { error: "Too many destination searches. Please try again shortly." },
      {
        status: 429,
        headers: {
          "Retry-After": "60"
        }
      }
    );
  }

  if (query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const cacheKey = query.toLowerCase();
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({ results: cached.payload });
  }

  const searchUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
  searchUrl.searchParams.set("name", query);
  searchUrl.searchParams.set("count", "12");
  searchUrl.searchParams.set("language", "en");
  searchUrl.searchParams.set("format", "json");

  const response = await fetch(searchUrl.toString(), {
    headers: { Accept: "application/json" }
  });

  if (!response.ok) {
    return NextResponse.json({ results: [] }, { status: 200 });
  }

  const payload = (await response.json()) as { results?: OpenMeteoSearchResult[] };
  const candidates = (payload.results ?? [])
    .filter(
      (item) =>
        item.country_code &&
        Number.isFinite(item.latitude) &&
        Number.isFinite(item.longitude)
    )
    .sort((left, right) => (right.population ?? 0) - (left.population ?? 0))
    .slice(0, 12);

  const results = await Promise.all(candidates.map((item) => normalizeDestination(item)));

  cache.set(cacheKey, { expiresAt: Date.now() + TTL, payload: results });

  return NextResponse.json({ results });
}
