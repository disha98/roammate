import type { DestinationCatalogItem } from "@/lib/types";

export interface OpenMeteoSearchResult {
  id?: number;
  name: string;
  country: string;
  country_code: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  population?: number;
  timezone?: string;
}

function hashText(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

const fallbackImages = [
  "https://images.unsplash.com/photo-1505761671935-60b3a7427bad?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1489493887464-892be6d1daae?auto=format&fit=crop&w=1200&q=80"
];

export function normalizeDestination(result: OpenMeteoSearchResult): DestinationCatalogItem {
  const key = `${result.name}-${result.country_code}-${result.admin1 ?? ""}`;
  const image = fallbackImages[hashText(key) % fallbackImages.length];
  const region = result.admin1?.trim();

  return {
    id: `search-${result.country_code}-${result.name}-${region ?? "city"}-${Math.round(result.latitude * 1000)}-${Math.round(result.longitude * 1000)}`.replace(
      /[^a-zA-Z0-9-_]/g,
      "-"
    ),
    city: result.name,
    country: result.country,
    countryCode: result.country_code,
    region,
    lat: result.latitude,
    lon: result.longitude,
    image,
    tags: region ? ["City Break", "Culture", "Food"] : ["City Break", "Food", "Planning"],
    bestFor: [
      "major city planning",
      "flight search comparison",
      "hotel and itinerary planning"
    ],
    summary: region
      ? `${result.name} in ${region}, ${result.country} is a strong planning base for a group trip.`
      : `${result.name}, ${result.country} is a strong planning base for a group trip.`,
    population: result.population,
    source: "search"
  };
}
