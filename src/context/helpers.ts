/**
 * Pure helper functions for AppState.
 * No "use client" — usable everywhere.
 */

import { computeDateWindowOptions } from "@/lib/availability";
import type {
  AvailabilityRange,
  DateWindowOption,
  InviteStatus,
  ProfileAvailabilityWindow,
  Trip,
  TripInvite,
  TripMember
} from "@/lib/types";
import { createId } from "@/lib/utils";

export function createUuid(prefix: string) {
  return globalThis.crypto?.randomUUID?.() ?? createId(prefix);
}

export function createInviteToken() {
  return globalThis.crypto?.randomUUID?.().replace(/-/g, "") ?? createId("invite");
}

export function getInviteStatus(invite: TripInvite): InviteStatus {
  if (invite.revokedAt) {
    return "revoked";
  }

  if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
    return "expired";
  }

  return "pending";
}

export function sortTrips(trips: Trip[]) {
  return [...trips].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function getFinalDateOptionsForTrip(
  trips: Trip[],
  availabilityRanges: AvailabilityRange[],
  tripMembers: TripMember[],
  tripId: string
): DateWindowOption[] {
  const trip = trips.find((item) => item.id === tripId);
  if (!trip) {
    return [];
  }

  const members = tripMembers.filter((item) => item.tripId === tripId);
  const ranges = availabilityRanges.filter((item) => item.tripId === tripId);
  const options = computeDateWindowOptions(trip.tentativeStart, trip.tentativeEnd, members, ranges, trip.tripDuration);
  return options.filter((option) => trip.finalDateOptionIds.includes(option.id));
}

export function mapWindowToTripDates(
  window: ProfileAvailabilityWindow,
  tripStart: string,
  tripEnd: string
) {
  const startYear = tripStart.slice(0, 4);
  const endYear = tripEnd.slice(0, 4);
  const candidates = [
    `${startYear}-${window.startMonthDay}`,
    `${endYear}-${window.startMonthDay}`
  ].map((candidateStart) => {
    const candidateYear = candidateStart.slice(0, 4);
    const crossesYear = window.endMonthDay < window.startMonthDay;
    const candidateEnd = `${String(Number(candidateYear) + (crossesYear ? 1 : 0))}-${window.endMonthDay}`;
    return { candidateStart, candidateEnd };
  });

  for (const candidate of candidates) {
    const overlapStart = candidate.candidateStart > tripStart ? candidate.candidateStart : tripStart;
    const overlapEnd = candidate.candidateEnd < tripEnd ? candidate.candidateEnd : tripEnd;
    if (overlapStart <= overlapEnd) {
      return {
        label: window.label,
        startDate: overlapStart,
        endDate: overlapEnd,
        sourceWindowId: window.id
      };
    }
  }

  return null;
}
