import type { DestinationCatalogItem } from "@/lib/types";
import type { OpenMeteoSearchResult } from "@/lib/destination-search";

export const PLACEHOLDER_DESTINATION_IMAGE = "/city-placeholder.svg";

interface UnsplashPhoto {
  alt_description?: string | null;
  description?: string | null;
  urls: {
    regular: string;
  };
  location?: {
    city?: string | null;
    country?: string | null;
    name?: string | null;
    title?: string | null;
  } | null;
}

function includesNormalized(haystack: string | null | undefined, needle: string) {
  if (!haystack) {
    return false;
  }

  return haystack.toLowerCase().includes(needle.toLowerCase());
}

function isLikelyCityMatch(photo: UnsplashPhoto, result: OpenMeteoSearchResult) {
  const city = result.name.trim();
  const country = result.country.trim();

  if (includesNormalized(photo.location?.city, city)) {
    return true;
  }

  if (includesNormalized(photo.location?.name, city) || includesNormalized(photo.location?.title, city)) {
    return true;
  }

  const description = [photo.alt_description, photo.description].filter(Boolean).join(" ");
  if (includesNormalized(description, city) && includesNormalized(description, country)) {
    return true;
  }

  return includesNormalized(description, city);
}

export async function resolveDestinationImage(result: OpenMeteoSearchResult): Promise<Pick<DestinationCatalogItem, "image" | "imageSource">> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    return {
      image: PLACEHOLDER_DESTINATION_IMAGE,
      imageSource: "placeholder"
    };
  }

  const searchUrl = new URL("https://api.unsplash.com/search/photos");
  searchUrl.searchParams.set(
    "query",
    [result.name, result.admin1, result.country, "city"].filter(Boolean).join(" ")
  );
  searchUrl.searchParams.set("orientation", "landscape");
  searchUrl.searchParams.set("content_filter", "high");
  searchUrl.searchParams.set("per_page", "6");

  const response = await fetch(searchUrl.toString(), {
    headers: {
      Authorization: `Client-ID ${accessKey}`,
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    return {
      image: PLACEHOLDER_DESTINATION_IMAGE,
      imageSource: "placeholder"
    };
  }

  const payload = (await response.json()) as { results?: UnsplashPhoto[] };
  const match = (payload.results ?? []).find((photo) => isLikelyCityMatch(photo, result));

  if (!match?.urls.regular) {
    return {
      image: PLACEHOLDER_DESTINATION_IMAGE,
      imageSource: "placeholder"
    };
  }

  return {
    image: match.urls.regular,
    imageSource: "provider"
  };
}
