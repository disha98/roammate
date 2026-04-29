"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/components/require-auth";
import { Button, Input, Panel, Textarea } from "@/components/ui";
import { useAppState } from "@/context/app-state";

export default function NewTripPage() {
  const router = useRouter();
  const { createTrip } = useAppState();
  const [title, setTitle] = useState("");
  const [groupName, setGroupName] = useState("");
  const [summary, setSummary] = useState("");
  const [tentativeStart, setTentativeStart] = useState("");
  const [tentativeEnd, setTentativeEnd] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const tripId = createTrip({ title, groupName, summary, tentativeStart, tentativeEnd });
    router.push(`/trips/${tripId}`);
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
            <Input
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Trip name"
            />
            <Input
              required
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
              placeholder="Group name"
            />
            <Textarea
              required
              rows={4}
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              placeholder="What kind of trip is this and what should the group optimize for?"
            />
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                required
                type="date"
                value={tentativeStart}
                onChange={(event) => setTentativeStart(event.target.value)}
              />
              <Input
                required
                type="date"
                value={tentativeEnd}
                onChange={(event) => setTentativeEnd(event.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button type="submit">Create trip</Button>
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
