"use client";

import { useEffect, useState } from "react";

interface WeatherSummaryProps {
  city: string;
  lat: number;
  lon: number;
  startDate: string;
  endDate: string;
}

interface WeatherPayload {
  label: string;
  summary: string;
}

interface DailyWeatherResponse {
  daily?: {
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_sum?: number[];
    weather_code?: number[];
  };
}

type WeatherState =
  | { kind: "loading" }
  | { kind: "ready"; payload: WeatherPayload }
  | { kind: "error"; message: string };

const weatherDescriptions: Record<number, string> = {
  0: "clear skies",
  1: "mostly clear skies",
  2: "partly cloudy weather",
  3: "overcast skies",
  45: "foggy conditions",
  48: "misty conditions",
  51: "light drizzle",
  53: "patchy drizzle",
  55: "steady drizzle",
  61: "light rain",
  63: "rainy weather",
  65: "heavy rain",
  71: "light snow",
  73: "snow showers",
  75: "heavier snowfall",
  80: "brief rain showers",
  81: "showery weather",
  82: "intense showers",
  95: "possible thunderstorms"
};

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatMonthLabel(date: string) {
  return new Intl.DateTimeFormat("en", { month: "long" }).format(new Date(`${date}T00:00:00`));
}

function chooseMode(startDate: string, endDate: string) {
  const historicalStart = new Date(`${startDate}T00:00:00`);
  const historicalEnd = new Date(`${endDate}T00:00:00`);
  historicalStart.setFullYear(historicalStart.getFullYear() - 1);
  historicalEnd.setFullYear(historicalEnd.getFullYear() - 1);

  return {
    endpoint: "https://archive-api.open-meteo.com/v1/archive",
    label: `Typical weather for ${formatMonthLabel(startDate)}`,
    startDate: historicalStart.toISOString().slice(0, 10),
    endDate: historicalEnd.toISOString().slice(0, 10)
  };
}

function buildSummary(city: string, label: string, data: DailyWeatherResponse["daily"]) {
  if (
    !data?.temperature_2m_max?.length ||
    !data.temperature_2m_min?.length ||
    !data.precipitation_sum?.length
  ) {
    return { label, summary: `Weather details for ${city} are not available right now.` };
  }

  const avgHigh = Math.round(average(data.temperature_2m_max));
  const avgLow = Math.round(average(data.temperature_2m_min));
  const totalRain = Math.round(average(data.precipitation_sum));
  const topCode = data.weather_code?.[0];
  const tone = weatherDescriptions[topCode ?? -1] ?? "mixed conditions";

  return {
    label,
    summary: `${city} usually sees ${tone}, with daytime highs around ${avgHigh}°C, lows near ${avgLow}°C, and about ${totalRain} mm of daily precipitation.`
  };
}

export function WeatherSummary({ city, lat, lon, startDate, endDate }: WeatherSummaryProps) {
  const [state, setState] = useState<WeatherState>({ kind: "loading" });

  useEffect(() => {
    const mode = chooseMode(startDate, endDate);
    const controller = new AbortController();
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      start_date: mode.startDate,
      end_date: mode.endDate,
      daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum",
      timezone: "auto"
    });

    async function loadWeather() {
      try {
        setState({ kind: "loading" });
        const response = await fetch(`${mode.endpoint}?${params.toString()}`, {
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error("Weather request failed");
        }

        const payload = (await response.json()) as DailyWeatherResponse;
        setState({ kind: "ready", payload: buildSummary(city, mode.label, payload.daily) });
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setState({
          kind: "error",
          message: `We couldn't load weather details for ${city} right now.`
        });
      }
    }

    void loadWeather();
    return () => controller.abort();
  }, [city, endDate, lat, lon, startDate]);

  if (state.kind === "loading") {
      return (
        <div className="rounded-[1.5rem] bg-mist px-4 py-3 text-sm text-stone-700">
        Checking typical weather for {city}…
        </div>
      );
  }

  if (state.kind === "error") {
    return (
      <div className="rounded-[1.5rem] bg-mist px-4 py-3 text-sm text-stone-700">
        {state.message}
      </div>
    );
  }

  return (
    <div className="rounded-[1.5rem] bg-mist px-4 py-3 text-sm text-stone-700">
      <p className="font-semibold text-ink">{state.payload.label}</p>
      <p className="mt-1">{state.payload.summary}</p>
    </div>
  );
}
