"use client";

import { useEffect, useState } from "react";
import { fetchVisaLookup, type VisaLookupResult } from "@/lib/visa";

export function VisaRequirement({
  passportCode,
  destinationCode,
  fallback = "Loading visa status..."
}: {
  passportCode: string;
  destinationCode: string;
  fallback?: string;
}) {
  const [result, setResult] = useState<VisaLookupResult | null>(null);

  useEffect(() => {
    let mounted = true;

    async function run() {
      try {
        const lookup = await fetchVisaLookup(passportCode, destinationCode);
        if (mounted) {
          setResult(lookup);
        }
      } catch {
        if (mounted) {
          setResult({
            passportCode,
            destinationCode,
            status: "unknown",
            label: fallback,
            rawRequirement: ""
          });
        }
      }
    }

    void run();

    return () => {
      mounted = false;
    };
  }, [destinationCode, fallback, passportCode]);

  return (
    <span className="font-medium text-ink" title={result?.rawRequirement || undefined}>
      {result?.label ?? fallback}
    </span>
  );
}
