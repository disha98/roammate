"use client";

import type {
  DestinationCatalogItem,
  DestinationEnrichment,
  TripStatus
} from "@/lib/types";

export interface DestinationDetailsResponse {
  destination: DestinationCatalogItem;
  enrichment: DestinationEnrichment;
  tripDuration: number;
  localCostSummary: DestinationEnrichment["localCosts"] & {
    tripTotalUsd: number;
  };
  memberEstimates: {
    profileId: string;
    displayName: string;
    homeCity: string;
    travelCostUsd: number | null;
    localTripCostUsd: number;
    totalTripCostUsd: number | null;
    note: string;
  }[];
}

export interface DestinationRecommendationsResponse {
  recommendations?: import("@/lib/types").RecommendedDestination[];
}

export function hasReliableDestinationIntelligence(
  _destination: DestinationCatalogItem,
  enrichment: DestinationEnrichment | undefined
) {
  if (!enrichment) {
    return false;
  }

  return enrichment.source === "llm_synthesized";
}

export function CostPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.2rem] bg-mist px-4 py-3">
      <p className="text-xs uppercase tracking-[0.22em] text-stone-500">{label}</p>
      <p className="mt-1 text-base font-semibold text-ink">{value}</p>
    </div>
  );
}

export function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

export function budgetTierLabel(tier: DestinationEnrichment["budgetTier"]) {
  return {
    value: "Better-value",
    balanced: "Balanced-budget",
    premium: "Higher-spend"
  }[tier];
}

export function statusLabel(status: TripStatus) {
  return status.replaceAll("_", " ");
}

export function inviteStatusLabel(status: "pending" | "expired" | "revoked") {
  return {
    pending: "Pending",
    expired: "Expired",
    revoked: "Revoked"
  }[status];
}

export const stageCopy: Record<TripStatus, string> = {
  draft: "This trip is still being outlined.",
  collecting_members: "Invite everyone who should help shape the trip.",
  planning: "Collect dates, compare destinations, and narrow the shortlist.",
  voting: "Finalists are in place. Time for the group to choose.",
  decided: "The destination and dates are locked in."
};
