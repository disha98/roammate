import { NextResponse } from "next/server";
import { normalizeDestination, type OpenMeteoSearchResult } from "@/lib/destination-search";

const cache = new Map<string, { expiresAt: number; payload: ReturnType<typeof normalizeDestination>[] }>();
const TTL = 1000 * 60 * 60 * 24;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";

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
  const results = (payload.results ?? [])
    .filter(
      (item) =>
        item.country_code &&
        Number.isFinite(item.latitude) &&
        Number.isFinite(item.longitude)
    )
    .sort((left, right) => (right.population ?? 0) - (left.population ?? 0))
    .slice(0, 12)
    .map((item) => normalizeDestination(item));

  cache.set(cacheKey, { expiresAt: Date.now() + TTL, payload: results });

  return NextResponse.json({ results });
}
