import { NextResponse } from "next/server";
import {
  getTypicalWeatherSnapshot,
  suggestDestinationCandidates
} from "@/lib/destination-intelligence";
import { normalizeDestination, type OpenMeteoSearchResult } from "@/lib/destination-search";
import type { RecommendedDestination } from "@/lib/types";
import { lookupVisaRequirement } from "@/lib/visa-dataset";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function cityKey(city: string, country: string) {
  return `${city.trim().toLowerCase()}::${country.trim().toLowerCase()}`;
}

function isVisaLight(status: string) {
  return status === "visa_free" || status === "same_country";
}

async function resolveCandidateCity(city: string, country: string) {
  const searchUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
  searchUrl.searchParams.set("name", city);
  searchUrl.searchParams.set("count", "5");
  searchUrl.searchParams.set("language", "en");
  searchUrl.searchParams.set("format", "json");

  const response = await fetch(searchUrl.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 60 * 60 * 24 }
  });
  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as { results?: OpenMeteoSearchResult[] };
  const candidates = (payload.results ?? []).filter(
    (item) =>
      item.country_code &&
      Number.isFinite(item.latitude) &&
      Number.isFinite(item.longitude)
  );
  if (candidates.length === 0) {
    return null;
  }

  const normalizedCountry = country.trim().toLowerCase();
  const exactMatch =
    candidates.find(
      (item) =>
        item.name.trim().toLowerCase() === city.trim().toLowerCase() &&
        item.country.trim().toLowerCase() === normalizedCountry
    ) ??
    candidates.find((item) => item.country.trim().toLowerCase() === normalizedCountry) ??
    candidates[0];

  return normalizeDestination(exactMatch);
}

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Destination recommendations are unavailable." }, { status: 503 });
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const url = new URL(request.url);
  const tripId = url.searchParams.get("tripId")?.trim();
  if (!tripId) {
    return NextResponse.json({ error: "Trip id is required." }, { status: 400 });
  }

  const tripResult = await supabase
    .from("trips")
    .select(
      "id, title, summary, tentative_start, tentative_end, trip_duration, status"
    )
    .eq("id", tripId)
    .maybeSingle();

  if (!tripResult.data) {
    return NextResponse.json({ error: "Trip not found." }, { status: 404 });
  }

  const trip = tripResult.data;

  if (trip.status !== "planning") {
    return NextResponse.json({ recommendations: [] satisfies RecommendedDestination[] });
  }

  const [membersResult, tripDestinationsResult] = await Promise.all([
    supabase
      .from("trip_members")
      .select("profile_id")
      .eq("trip_id", tripId),
    supabase
      .from("trip_destinations")
      .select("destination_id")
      .eq("trip_id", tripId)
  ]);

  const profileIds = (membersResult.data ?? []).map((member) => member.profile_id);
  const profilesResult = profileIds.length
    ? await supabase
        .from("profiles")
        .select("id, passport, home_city")
        .in("id", profileIds)
    : { data: [] };

  const existingDestinationIds = new Set(
    (tripDestinationsResult.data ?? []).map((entry) => entry.destination_id)
  );

  const existingDestinationsResult = existingDestinationIds.size
    ? await supabase
        .from("destinations")
        .select("id, city, country")
        .in("id", Array.from(existingDestinationIds))
    : { data: [] };

  const existingCityKeys = new Set(
    (existingDestinationsResult.data ?? []).map((entry) => cityKey(entry.city, entry.country))
  );
  const currentDestinationLabels = (existingDestinationsResult.data ?? []).map(
    (entry) => `${entry.city}, ${entry.country}`
  );

  const knownPassports = (profilesResult.data ?? [])
    .map((profile) => profile.passport?.trim().toUpperCase() ?? "")
    .filter(Boolean);
  const knownHomeCities = (profilesResult.data ?? [])
    .map((profile) => profile.home_city?.trim() ?? "")
    .filter(Boolean);

  const candidates = await suggestDestinationCandidates({
    tripTitle: trip.title,
    tripSummary: trip.summary,
    tentativeStart: trip.tentative_start,
    tentativeEnd: trip.tentative_end,
    tripDuration: trip.trip_duration ?? 7,
    memberCount: profileIds.length,
    passports: knownPassports,
    homeCities: knownHomeCities,
    currentDestinations: currentDestinationLabels
  });

  console.log("[recommendations] LLM candidates:", candidates.length, candidates.map((c) => `${c.city}, ${c.country}`));

  if (candidates.length === 0) {
    console.log("[recommendations] No candidates from LLM — returning empty");
    return NextResponse.json({ recommendations: [] satisfies RecommendedDestination[] });
  }

  const recommendations = (
    await Promise.all(
      candidates.map(async (candidate) => {
        const destination = await resolveCandidateCity(candidate.city, candidate.country);
        if (!destination) {
          return null;
        }

        if (
          existingDestinationIds.has(destination.id) ||
          existingCityKeys.has(cityKey(destination.city, destination.country))
        ) {
          return null;
        }

        const weather = await getTypicalWeatherSnapshot({
          city: destination.city,
          lat: destination.lat,
          lon: destination.lon,
          startDate: trip.tentative_start,
          endDate: trip.tentative_end
        });

        const visaResults = await Promise.all(
          knownPassports.map((passport) =>
            lookupVisaRequirement(passport, destination.countryCode)
          )
        );

        const visaFreeMemberCount = visaResults.filter((result) => isVisaLight(result.status)).length;
        const knownPassportCount = knownPassports.length;
        const visaSummary =
          knownPassportCount > 0
            ? `${visaFreeMemberCount} of ${knownPassportCount} travelers with saved passports would avoid a visa here.`
            : "Visa fit is based on available trip profiles, and more passport details would sharpen it.";

        return {
          destination,
          reasons: [candidate.reason, weather.summary, visaSummary],
          weatherSummary: weather.summary,
          weatherScore: weather.score,
          visaSummary,
          visaFreeMemberCount,
          knownPassportCount
        } satisfies RecommendedDestination;
      })
    )
  )
    .filter((entry): entry is RecommendedDestination => {
      if (!entry) console.log("[recommendations] candidate filtered out (null — geocode failed or already on board)");
      return Boolean(entry);
    })
    .sort((left, right) => {
      if (right.weatherScore !== left.weatherScore) {
        return right.weatherScore - left.weatherScore;
      }

      if (right.visaFreeMemberCount !== left.visaFreeMemberCount) {
        return right.visaFreeMemberCount - left.visaFreeMemberCount;
      }

      return right.knownPassportCount - left.knownPassportCount;
    })
    .slice(0, 4);

  console.log(`[recommendations] ${recommendations.length} survived filtering (need >= 3)`);
  if (recommendations.length < 3) {
    return NextResponse.json({ recommendations: [] satisfies RecommendedDestination[] });
  }

  return NextResponse.json({ recommendations });
}
