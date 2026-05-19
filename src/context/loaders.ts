"use client";

import type { User } from "@supabase/supabase-js";
import { destinationCatalog } from "@/lib/destinations";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
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
  Vote
} from "@/lib/types";
import {
  mapProfile,
  mapTrip,
  mapTripMember,
  mapTripInvite,
  mapAvailabilityRange,
  mapTripDestination,
  mapDestinationEnrichment,
  mapVote,
  mapProfileAvailabilityWindow,
  mapDestinationRow
} from "./mappers";
import { sortTrips } from "./helpers";

export interface PersistedState {
  profiles: Profile[];
  currentProfileId: string | null;
  trips: Trip[];
  tripMembers: TripMember[];
  tripInvites: TripInvite[];
  profileAvailabilityWindows: ProfileAvailabilityWindow[];
  availabilityRanges: AvailabilityRange[];
  tripDestinations: TripDestination[];
  destinationEnrichments: DestinationEnrichment[];
  votes: Vote[];
}

export const emptyPersistedState: PersistedState = {
  profiles: [],
  currentProfileId: null,
  trips: [],
  tripMembers: [],
  tripInvites: [],
  profileAvailabilityWindows: [],
  availabilityRanges: [],
  tripDestinations: [],
  destinationEnrichments: [],
  votes: []
};

export async function loadPersistedStateForUser(userId: string): Promise<PersistedState> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    return emptyPersistedState;
  }

  const [profileResult, createdTripsResult, membershipResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, display_name, home_city, passport, photo_url, created_at")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("trips")
      .select(
        "id, creator_profile_id, title, group_name, summary, tentative_start, tentative_end, trip_duration, status, created_at, decided_at, final_date_option_ids, final_destination_id, final_destination_snapshot, final_date_start, final_date_end, final_locked_by_profile_id"
      )
      .eq("creator_profile_id", userId),
    supabase
      .from("trip_members")
      .select("id, trip_id, profile_id, role, joined_at")
      .eq("profile_id", userId)
  ]);

  const createdTrips = (createdTripsResult.data ?? []).map(mapTrip);
  const membershipRows = (membershipResult.data ?? []).map(mapTripMember);
  const visibleTripIds = new Set([
    ...createdTrips.map((trip) => trip.id),
    ...membershipRows.map((member) => member.tripId)
  ]);

  const tripIds = Array.from(visibleTripIds);

  const [joinedTripsResult, allMembersResult, invitesResult, availRangesResult, tripDestsResult, votesResult, pawResult] = tripIds.length
    ? await Promise.all([
        supabase
          .from("trips")
          .select(
            "id, creator_profile_id, title, group_name, summary, tentative_start, tentative_end, trip_duration, status, created_at, decided_at, final_date_option_ids, final_destination_id, final_destination_snapshot, final_date_start, final_date_end, final_locked_by_profile_id"
          )
          .in("id", tripIds),
        supabase
          .from("trip_members")
          .select("id, trip_id, profile_id, role, joined_at")
          .in("trip_id", tripIds),
        supabase
          .from("trip_invites")
          .select("id, trip_id, token, created_at, expires_at, revoked_at")
          .in("trip_id", tripIds),
        supabase
          .from("availability_ranges")
          .select("id, trip_id, profile_id, start_date, end_date")
          .in("trip_id", tripIds),
        supabase
          .from("trip_destinations")
          .select("id, trip_id, destination_id, added_by_profile_id, note, shortlist, created_at")
          .in("trip_id", tripIds),
        supabase
          .from("votes")
          .select("id, trip_id, profile_id, type, option_id, created_at")
          .in("trip_id", tripIds),
        supabase
          .from("profile_availability_windows")
          .select("id, profile_id, label, start_month_day, end_month_day")
          .eq("profile_id", userId)
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] },
       await supabase
         .from("profile_availability_windows")
         .select("id, profile_id, label, start_month_day, end_month_day")
         .eq("profile_id", userId)
      ];

  const tripById = new Map<string, Trip>();
  for (const trip of [...createdTrips, ...((joinedTripsResult.data ?? []) as never[]).map(mapTrip)]) {
    tripById.set(trip.id, trip);
  }

  const trips = sortTrips(Array.from(tripById.values()));
  const tripMembers = ((allMembersResult.data ?? []) as never[]).map(mapTripMember);
  const tripInvites = ((invitesResult.data ?? []) as never[]).map(mapTripInvite);
  const availabilityRanges = ((availRangesResult.data ?? []) as never[]).map(mapAvailabilityRange);
  const votesData = ((votesResult.data ?? []) as never[]).map(mapVote);
  const profileAvailabilityWindows = ((pawResult.data ?? []) as never[]).map(mapProfileAvailabilityWindow);

  // Fetch destination snapshots for trip_destinations
  const tripDestRows = (tripDestsResult.data ?? []) as never[];
  let tripDestinations: TripDestination[] = [];
  let destinationEnrichments: DestinationEnrichment[] = [];

  if (tripDestRows.length > 0) {
    const destinationIds = [...new Set(tripDestRows.map((r: { destination_id: string }) => r.destination_id))];
    const [destResult, enrichmentResult] = await Promise.all([
      supabase
        .from("destinations")
        .select("id, city, country, country_code, lat, lon, image, tags, best_for, summary")
        .in("id", destinationIds),
      supabase
        .from("destination_enrichments")
        .select(
          "destination_id, short_summary, long_summary, vibe_tags, top_activities, budget_tier, local_costs, source, coverage, fetched_at, stale_at"
        )
        .in("destination_id", destinationIds)
    ]);

    const destMap = new Map<string, DestinationCatalogItem>();
    for (const row of (destResult.data ?? []) as never[]) {
      const mapped = mapDestinationRow(row);
      destMap.set(mapped.id, mapped);
    }

    const enrichmentMap = new Map<string, DestinationEnrichment>();
    destinationEnrichments = ((enrichmentResult.data ?? []) as never[]).map(mapDestinationEnrichment);
    for (const enrichment of destinationEnrichments) {
      enrichmentMap.set(enrichment.destinationId, enrichment);
    }

    tripDestinations = tripDestRows.map((row: never) => {
      const r = row as { destination_id: string };
      const snapshot = destMap.get(r.destination_id) ?? destinationCatalog.find((d) => d.id === r.destination_id);
      return mapTripDestination(row, snapshot, enrichmentMap.get(r.destination_id));
    });
  }

  // Fetch related profiles
  const relatedProfileIds = new Set<string>([userId]);
  for (const member of tripMembers) {
    relatedProfileIds.add(member.profileId);
  }
  for (const trip of trips) {
    relatedProfileIds.add(trip.creatorProfileId);
  }

  const profilesResult = relatedProfileIds.size
    ? await supabase
        .from("profiles")
        .select("id, email, display_name, home_city, passport, photo_url, created_at")
        .in("id", Array.from(relatedProfileIds))
    : { data: [] };

  const profiles = ((profilesResult.data ?? []) as never[]).map(mapProfile);
  if (profileResult.data) {
    const current = mapProfile(profileResult.data);
    if (!profiles.some((profile) => profile.id === current.id)) {
      profiles.unshift(current);
    }
  }

  return {
    profiles,
    currentProfileId: userId,
    trips,
    tripMembers,
    tripInvites,
    profileAvailabilityWindows,
    availabilityRanges,
    tripDestinations,
    destinationEnrichments,
    votes: votesData
  };
}

export async function ensureProfile(user: User) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase || !user.email) {
    return null;
  }

  const email = user.email.trim().toLowerCase();
  const { data: existing } = await supabase
    .from("profiles")
    .select("id, email, display_name, home_city, passport, photo_url, created_at")
    .eq("id", user.id)
    .maybeSingle();

  if (existing) {
    return mapProfile(existing);
  }

  const fallbackName = email.split("@")[0]?.replace(/[._-]+/g, " ") ?? "Traveler";
  const displayName = fallbackName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");

  const inserted = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      email,
      display_name: displayName || "Traveler",
      home_city: "",
      passport: "",
      photo_url: null
    })
    .select("id, email, display_name, home_city, passport, photo_url, created_at")
    .single();

  return inserted.data ? mapProfile(inserted.data) : null;
}
