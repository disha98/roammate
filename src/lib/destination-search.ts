import type { DestinationCatalogItem } from "@/lib/types";
import { resolveDestinationImage } from "@/lib/destination-images";

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

export async function normalizeDestination(result: OpenMeteoSearchResult): Promise<DestinationCatalogItem> {
  const region = result.admin1?.trim();
  const imageData = await resolveDestinationImage(result);

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
    image: imageData.image,
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
    source: "search",
    imageSource: imageData.imageSource
  };
}
