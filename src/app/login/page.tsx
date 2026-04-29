"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input, Panel, Select } from "@/components/ui";
import { useAppState } from "@/context/app-state";

const passportOptions = ["US", "GB", "IN", "CA"];

export default function LoginPage() {
  const router = useRouter();
  const { currentProfile, isReady, login } = useAppState();
  const [email, setEmail] = useState("maya@example.com");
  const [displayName, setDisplayName] = useState("Maya");
  const [homeCity, setHomeCity] = useState("Chicago");
  const [passport, setPassport] = useState("US");
  const [nextPath, setNextPath] = useState("/dashboard");
  const [inviteToken, setInviteToken] = useState<string | undefined>();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNextPath(params.get("next") ?? "/dashboard");
    setInviteToken(params.get("inviteToken") ?? undefined);
  }, []);

  useEffect(() => {
    if (!isReady || !currentProfile) {
      return;
    }
    router.replace(nextPath);
  }, [currentProfile, isReady, nextPath, router]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const joinedTripId = login({ email, displayName, homeCity, passport }, inviteToken);

    if (joinedTripId) {
      router.push(`/trips/${joinedTripId}`);
      return;
    }

    router.push(nextPath);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl items-center px-6 py-16">
      <div className="grid w-full gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <Panel className="p-8">
          <p className="text-xs uppercase tracking-[0.35em] text-lagoon">Planner Login</p>
          <h1 className="section-title mt-4 text-5xl leading-tight">Open the dashboard, keep every trip thread visible.</h1>
          <p className="mt-5 text-sm text-stone-600">
            Sign in with a name, home city, and passport so your trips can use availability, visa,
            and destination context from the start.
          </p>
          <div className="mt-8 rounded-[2rem] bg-ink px-5 py-6 text-white">
            <p className="text-sm uppercase tracking-[0.3em] text-sun">Quick start profiles</p>
            <ul className="mt-4 space-y-3 text-sm text-stone-200">
              <li>`maya@example.com` / US / Chicago</li>
              <li>`ana@example.com` / GB / London</li>
              <li>`rohan@example.com` / IN / Bengaluru</li>
            </ul>
          </div>
          <Link href="/" className="mt-6 inline-block text-sm font-semibold text-lagoon">
            Back to overview
          </Link>
        </Panel>
        <Panel className="p-8">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-lagoon">Sign in</p>
              <p className="mt-2 text-sm text-stone-600">
                Use one of the sample profiles above or enter your own details.
              </p>
            </div>
            <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Display name" />
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email"
            />
            <Input value={homeCity} onChange={(event) => setHomeCity(event.target.value)} placeholder="Home city" />
            <Select value={passport} onChange={(event) => setPassport(event.target.value)}>
              {passportOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
            <Button className="w-full" type="submit">
              Open dashboard
            </Button>
          </form>
        </Panel>
      </div>
    </main>
  );
}
