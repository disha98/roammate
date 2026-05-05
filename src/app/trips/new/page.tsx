"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/components/require-auth";
import { Button, Input, Panel, Textarea } from "@/components/ui";
import { useAppState } from "@/context/app-state";

export default function NewTripPage() {
  const router = useRouter();
  const { createTrip, isPending } = useAppState();
  const [title, setTitle] = useState("");
  const [groupName, setGroupName] = useState("");
  const [summary, setSummary] = useState("");
  const [tentativeStart, setTentativeStart] = useState("");
  const [tentativeEnd, setTentativeEnd] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    try {
      const tripId = await createTrip({ title, groupName, summary, tentativeStart, tentativeEnd });
      router.push(`/trips/${tripId}`);
    } catch (error) {
      setErrorMessage((error as Error).message || "We couldn’t create the trip right now.");
    }
  }

  return (
    <RequireAuth>
      <AppShell>
        <Panel className="mx-auto max-w-3xl p-8">
          <p className="text-xs uppercase tracking-[0.35em] text-lagoon">Create Trip</p>
          <h1 className="section-title mt-3 text-4xl">Open a new planning thread.</h1>
          <p className="mt-3 max-w-2xl text-sm text-stone-600">
            This defines the group lane on the dashboard and gives the trip its first planning
            window.
          </p>
          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="trip-title">
                Trip name
              </label>
              <Input
                id="trip-title"
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Late summer escape"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="group-name">
                Group name
              </label>
              <Input
                id="group-name"
                required
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
                placeholder="MBA friends"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink" htmlFor="trip-summary">
                Trip summary
              </label>
              <Textarea
                id="trip-summary"
                required
                rows={4}
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                placeholder="What kind of trip is this and what should the group optimize for?"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-ink" htmlFor="tentative-start">
                  Tentative start date
                </label>
                <Input
                  id="tentative-start"
                  required
                  type="date"
                  value={tentativeStart}
                  onChange={(event) => setTentativeStart(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-ink" htmlFor="tentative-end">
                  Tentative end date
                </label>
                <Input
                  id="tentative-end"
                  required
                  type="date"
                  value={tentativeEnd}
                  onChange={(event) => setTentativeEnd(event.target.value)}
                />
              </div>
            </div>
            {errorMessage ? (
              <div className="rounded-[1.5rem] border border-coral/20 bg-coral/5 px-4 py-3 text-sm text-coral">
                {errorMessage}
              </div>
            ) : null}
            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Creating..." : "Create trip"}
              </Button>
              <Button href="/dashboard" variant="secondary">
                Cancel
              </Button>
            </div>
          </form>
        </Panel>
      </AppShell>
    </RequireAuth>
  );
}
