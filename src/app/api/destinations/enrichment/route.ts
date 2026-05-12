import { NextResponse } from "next/server";
import { buildDestinationEnrichment, estimateTravelCostUsd, haversineMiles } from "@/lib/destination-intelligence";
import type { DestinationCatalogItem, DestinationEnrichment } from "@/lib/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface GeocodeResult {
  latitude: number;
  longitude: number;
  country_code?: string;
}

const geocodeCache = new Map<string, GeocodeResult | null>();

function looksAmbiguous(text: string) {
  const normalized = text.toLowerCase();
  return (
    normalized.includes("may refer to") ||
    normalized.includes("there is more than one place called") ||
    normalized.includes("disambiguation") ||
    normalized.includes("=== united states of america ===") ||
    normalized.includes("== other places ==")
  );
}

function mapDestinationRow(row: {
  id: string;
  city: string;
  country: string;
  country_code: string;
  lat: number;
  lon: number;
  image: string;
  tags: string[];
  best_for: string[];
  summary: string;
}): DestinationCatalogItem {
  return {
    id: row.id,
    city: row.city,
    country: row.country,
    countryCode: row.country_code,
    lat: row.lat,
    lon: row.lon,
    image: row.image,
    tags: row.tags ?? [],
    bestFor: row.best_for ?? [],
    summary: row.summary,
    source: "catalog"
  };
}

function mapEnrichmentRow(row: {
  destination_id: string;
  short_summary: string;
  long_summary: string;
  vibe_tags: string[];
  top_activities: {
    title: string;
    description?: string;
    category?: "food" | "culture" | "outdoors" | "nightlife" | "wellness" | "shopping" | "scenic";
  }[];
  budget_tier: "value" | "balanced" | "premium";
  local_costs: {
    currency?: "USD";
    lodgingMidUsd?: number;
    foodMidUsd?: number;
    localTransportMidUsd?: number;
    activitiesMidUsd?: number;
    dailyTotalUsd?: number;
  };
  source: "heuristic" | "wikimedia" | "mixed_free_apis" | "llm_synthesized";
  coverage: "partial" | "complete";
  fetched_at: string;
  stale_at: string;
}): DestinationEnrichment {
  return {
    destinationId: row.destination_id,
    shortSummary: row.short_summary,
    longSummary: row.long_summary,
    vibeTags: row.vibe_tags ?? [],
    topActivities: row.top_activities ?? [],
    budgetTier: row.budget_tier,
    localCosts: {
      currency: row.local_costs?.currency ?? "USD",
      lodgingMidUsd: row.local_costs?.lodgingMidUsd ?? 0,
      foodMidUsd: row.local_costs?.foodMidUsd ?? 0,
      localTransportMidUsd: row.local_costs?.localTransportMidUsd ?? 0,
      activitiesMidUsd: row.local_costs?.activitiesMidUsd ?? 0,
      dailyTotalUsd: row.local_costs?.dailyTotalUsd ?? 0
    },
    source: row.source,
    coverage: row.coverage,
    fetchedAt: row.fetched_at,
    staleAt: row.stale_at
  };
}

async function geocodeHomeCity(homeCity: string) {
  const key = homeCity.trim().toLowerCase();
  if (!key) {
    return null;
  }

  if (geocodeCache.has(key)) {
    return geocodeCache.get(key) ?? null;
  }

  const geocodeUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
  geocodeUrl.searchParams.set("name", homeCity);
  geocodeUrl.searchParams.set("count", "1");
  geocodeUrl.searchParams.set("language", "en");
  geocodeUrl.searchParams.set("format", "json");

  const response = await fetch(geocodeUrl.toString(), {
    headers: { Accept: "application/json" }
  });

  if (!response.ok) {
    geocodeCache.set(key, null);
    return null;
  }

  const payload = (await response.json()) as {
    results?: GeocodeResult[];
  };
  const result = payload.results?.[0] ?? null;
  geocodeCache.set(key, result);
  return result;
}

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Destination enrichment is unavailable." }, { status: 503 });
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const url = new URL(request.url);
  const destinationId = url.searchParams.get("destinationId")?.trim();
  const tripId = url.searchParams.get("tripId")?.trim();

  if (!destinationId) {
    return NextResponse.json({ error: "Destination id is required." }, { status: 400 });
  }

  const destinationResult = await supabase
    .from("destinations")
    .select("id, city, country, country_code, lat, lon, image, tags, best_for, summary")
    .eq("id", destinationId)
    .maybeSingle();

  if (!destinationResult.data) {
    return NextResponse.json({ error: "Destination not found." }, { status: 404 });
  }

  const destination = mapDestinationRow(destinationResult.data);

  const enrichmentResult = await supabase
    .from("destination_enrichments")
    .select(
      "destination_id, short_summary, long_summary, vibe_tags, top_activities, budget_tier, local_costs, source, coverage, fetched_at, stale_at"
    )
    .eq("destination_id", destinationId)
    .maybeSingle();

  let enrichment = enrichmentResult.data ? mapEnrichmentRow(enrichmentResult.data) : null;
  const wantsLlmSynthesis = Boolean(process.env.GROQ_API_KEY);
  const shouldRefreshCachedEnrichment =
    !enrichment ||
    new Date(enrichment.staleAt).getTime() <= Date.now() ||
    looksAmbiguous(enrichment.shortSummary) ||
    looksAmbiguous(enrichment.longSummary) ||
    (wantsLlmSynthesis && enrichment.source !== "llm_synthesized");

  if (shouldRefreshCachedEnrichment) {
    const nextEnrichment = await buildDestinationEnrichment(destination);
    await supabase.from("destination_enrichments").upsert(
      {
        destination_id: nextEnrichment.destinationId,
        short_summary: nextEnrichment.shortSummary,
        long_summary: nextEnrichment.longSummary,
        vibe_tags: nextEnrichment.vibeTags,
        top_activities: nextEnrichment.topActivities,
        budget_tier: nextEnrichment.budgetTier,
        local_costs: nextEnrichment.localCosts,
        source: nextEnrichment.source,
        coverage: nextEnrichment.coverage,
        fetched_at: nextEnrichment.fetchedAt,
        stale_at: nextEnrichment.staleAt,
        updated_at: new Date().toISOString()
      },
      { onConflict: "destination_id" }
    );
    enrichment = nextEnrichment;
  }

  if (!enrichment) {
    return NextResponse.json({ error: "Destination enrichment could not be generated." }, { status: 500 });
  }

  let tripDuration = 5;
  let memberEstimates: {
    profileId: string;
    displayName: string;
    homeCity: string;
    travelCostUsd: number | null;
    localTripCostUsd: number;
    totalTripCostUsd: number | null;
    note: string;
  }[] = [];

  if (tripId) {
    const tripResult = await supabase
      .from("trips")
      .select("id, trip_duration")
      .eq("id", tripId)
      .maybeSingle();

    if (!tripResult.data) {
      return NextResponse.json({ error: "Trip not found." }, { status: 404 });
    }

    tripDuration = tripResult.data.trip_duration ?? 5;

    const membersResult = await supabase
      .from("trip_members")
      .select("profile_id")
      .eq("trip_id", tripId);

    const profileIds = (membersResult.data ?? []).map((row) => row.profile_id);
    if (profileIds.length > 0) {
      const profilesResult = await supabase
        .from("profiles")
        .select("id, display_name, home_city")
        .in("id", profileIds);

      const localTripCostUsd = enrichment.localCosts.dailyTotalUsd * tripDuration;
      memberEstimates = await Promise.all(
        (profilesResult.data ?? []).map(async (profile) => {
          const homeCity = profile.home_city?.trim() ?? "";
          if (!homeCity) {
            return {
              profileId: profile.id,
              displayName: profile.display_name,
              homeCity: "",
              travelCostUsd: null,
              localTripCostUsd,
              totalTripCostUsd: null,
              note: "Add a home city in the profile to personalize travel cost."
            };
          }

          const geocodedHomeCity = await geocodeHomeCity(homeCity);
          if (!geocodedHomeCity) {
            return {
              profileId: profile.id,
              displayName: profile.display_name,
              homeCity,
              travelCostUsd: null,
              localTripCostUsd,
              totalTripCostUsd: null,
              note: "We could not estimate the route from this home city yet."
            };
          }

          const distanceMiles = haversineMiles(
            geocodedHomeCity.latitude,
            geocodedHomeCity.longitude,
            destination.lat,
            destination.lon
          );
          const travelCostUsd = estimateTravelCostUsd({
            distanceMiles,
            sameCountry: geocodedHomeCity.country_code === destination.countryCode
          });

          return {
            profileId: profile.id,
            displayName: profile.display_name,
            homeCity,
            travelCostUsd,
            localTripCostUsd,
            totalTripCostUsd: localTripCostUsd + travelCostUsd,
            note:
              geocodedHomeCity.country_code === destination.countryCode
                ? "Estimated as a domestic route."
                : "Estimated as an origin-to-destination route."
          };
        })
      );
    }
  }

  return NextResponse.json({
    destination,
    enrichment,
    tripDuration,
    localCostSummary: {
      ...enrichment.localCosts,
      tripTotalUsd: enrichment.localCosts.dailyTotalUsd * tripDuration
    },
    memberEstimates
  });
}
