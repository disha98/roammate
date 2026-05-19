/**
 * Pure row-to-domain mapper functions.
 * Shared between client (AppState) and server (dashboard queries, etc.).
 * No "use client" — usable everywhere.
 */

import type {
  AvailabilityRange,
  DestinationCatalogItem,
  DestinationEnrichment,
  Profile,
  ProfileAvailabilityWindow,
  Trip,
  TripDestination,
  TripInvite,
  TripMember,
  TripStatus,
  Vote
} from "@/lib/types";

export function mapProfile(row: {
  id: string;
  email: string;
  display_name: string;
  home_city: string | null;
  passport: string | null;
  photo_url: string | null;
  created_at: string;
}): Profile {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    homeCity: row.home_city ?? "",
    passport: row.passport ?? "",
    photoUrl: row.photo_url ?? undefined,
    createdAt: row.created_at
  };
}

export function mapTrip(row: {
  id: string;
  creator_profile_id: string;
  title: string;
  group_name: string;
  summary: string;
  tentative_start: string;
  tentative_end: string;
  trip_duration?: number | null;
  status: TripStatus;
  created_at: string;
  decided_at: string | null;
  final_date_option_ids?: string[] | null;
  final_destination_id?: string | null;
  final_destination_snapshot?: DestinationCatalogItem | null;
  final_date_start?: string | null;
  final_date_end?: string | null;
  final_locked_by_profile_id?: string | null;
}): Trip {
  return {
    id: row.id,
    title: row.title,
    groupName: row.group_name,
    summary: row.summary,
    tentativeStart: row.tentative_start,
    tentativeEnd: row.tentative_end,
    tripDuration: row.trip_duration ?? 7,
    creatorProfileId: row.creator_profile_id,
    finalDateOptionIds: row.final_date_option_ids ?? [],
    status: row.status,
    createdAt: row.created_at,
    decidedAt: row.decided_at ?? undefined,
    finalDestinationId: row.final_destination_id ?? undefined,
    finalDestinationSnapshot: row.final_destination_snapshot ?? undefined,
    finalDateStart: row.final_date_start ?? undefined,
    finalDateEnd: row.final_date_end ?? undefined,
    finalLockedByProfileId: row.final_locked_by_profile_id ?? undefined
  };
}

export function mapTripMember(row: {
  id: string;
  trip_id: string;
  profile_id: string;
  role: "planner" | "member";
  joined_at: string;
}): TripMember {
  return {
    id: row.id,
    tripId: row.trip_id,
    profileId: row.profile_id,
    role: row.role,
    joinedAt: row.joined_at
  };
}

export function mapTripInvite(row: {
  id: string;
  trip_id: string;
  token: string;
  created_at: string;
  expires_at: string | null;
  revoked_at: string | null;
}): TripInvite {
  return {
    id: row.id,
    tripId: row.trip_id,
    token: row.token,
    createdAt: row.created_at,
    expiresAt: row.expires_at ?? undefined,
    revokedAt: row.revoked_at ?? undefined
  };
}

export function mapAvailabilityRange(row: {
  id: string;
  trip_id: string;
  profile_id: string;
  start_date: string;
  end_date: string;
}): AvailabilityRange {
  return {
    id: row.id,
    tripId: row.trip_id,
    profileId: row.profile_id,
    startDate: row.start_date,
    endDate: row.end_date
  };
}

export function mapTripDestination(
  row: {
    id: string;
    trip_id: string;
    destination_id: string;
    added_by_profile_id: string;
    note: string;
    shortlist: boolean;
    created_at: string;
  },
  snapshot?: DestinationCatalogItem,
  enrichment?: DestinationEnrichment
): TripDestination {
  return {
    id: row.id,
    tripId: row.trip_id,
    destinationId: row.destination_id,
    destinationSnapshot: snapshot,
    destinationEnrichment: enrichment,
    addedByProfileId: row.added_by_profile_id,
    note: row.note,
    shortlist: row.shortlist,
    createdAt: row.created_at
  };
}

export function mapDestinationEnrichment(row: {
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

export function mapVote(row: {
  id: string;
  trip_id: string;
  profile_id: string;
  type: "destination" | "date_window";
  option_id: string;
  created_at: string;
}): Vote {
  return {
    id: row.id,
    tripId: row.trip_id,
    profileId: row.profile_id,
    type: row.type,
    optionId: row.option_id,
    createdAt: row.created_at
  };
}

export function mapProfileAvailabilityWindow(row: {
  id: string;
  profile_id: string;
  label: string;
  start_month_day: string;
  end_month_day: string;
}): ProfileAvailabilityWindow {
  return {
    id: row.id,
    profileId: row.profile_id,
    label: row.label,
    startMonthDay: row.start_month_day,
    endMonthDay: row.end_month_day
  };
}

export function mapDestinationRow(row: {
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
