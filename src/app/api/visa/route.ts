import { NextResponse } from "next/server";
import { lookupVisaRequirement } from "@/lib/visa-dataset";

const responseCache = new Map<string, Awaited<ReturnType<typeof lookupVisaRequirement>>>();

function cacheKey(passport: string, destination: string) {
  return `${passport.toUpperCase()}_${destination.toUpperCase()}`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const passport = url.searchParams.get("passport")?.trim().toUpperCase();
  const destination = url.searchParams.get("destination")?.trim().toUpperCase();

  if (!passport || !destination) {
    return NextResponse.json({ error: "passport and destination are required" }, { status: 400 });
  }

  const key = cacheKey(passport, destination);
  const cached = responseCache.get(key);
  if (cached) {
    return NextResponse.json(cached);
  }

  const result = await lookupVisaRequirement(passport, destination);

  responseCache.set(key, result);

  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "public, max-age=86400"
    }
  });
}
