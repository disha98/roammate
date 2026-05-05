"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { RequireAuth } from "@/components/require-auth";
import { Button, Panel, StatusBadge } from "@/components/ui";
import { useAppState } from "@/context/app-state";
import { formatDate } from "@/lib/utils";

export default function InvitePreviewPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const {
    currentProfile,
    getInvitePreview,
    getInviteStatus,
    isPending,
    joinTripByInviteToken
  } = useAppState();
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof getInvitePreview>> | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      const nextPreview = await getInvitePreview(params.token);
      if (active) {
        setPreview(nextPreview);
      }
    })();

    return () => {
      active = false;
    };
  }, [getInvitePreview, params.token]);

  return (
    <RequireAuth>
      {!preview ? (
        <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-16">
          <Panel className="w-full p-10 text-center">
            <p className="text-xs uppercase tracking-[0.35em] text-lagoon">Loading invite</p>
            <p className="section-title mt-4 text-4xl">Checking this trip link…</p>
          </Panel>
        </main>
      ) : !preview.trip || !preview.invite ? (
        <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-16">
          <Panel className="w-full p-10 text-center">
            <p className="text-xs uppercase tracking-[0.35em] text-coral">Invite not found</p>
            <p className="section-title mt-4 text-4xl">This join link is no longer valid.</p>
          </Panel>
        </main>
      ) : (
        <InvitePreviewContent
          currentProfile={currentProfile}
          formatDate={formatDate}
          getInviteStatus={getInviteStatus}
          isPending={isPending}
          joinTripByInviteToken={joinTripByInviteToken}
          paramsToken={params.token}
          preview={preview}
          routerPush={router.push}
        />
      )}
    </RequireAuth>
  );
}

function InvitePreviewContent({
  currentProfile,
  formatDate,
  getInviteStatus,
  isPending,
  joinTripByInviteToken,
  paramsToken,
  preview,
  routerPush
}: {
  currentProfile: ReturnType<typeof useAppState>["currentProfile"];
  formatDate: typeof import("@/lib/utils").formatDate;
  getInviteStatus: ReturnType<typeof useAppState>["getInviteStatus"];
  isPending: boolean;
  joinTripByInviteToken: ReturnType<typeof useAppState>["joinTripByInviteToken"];
  paramsToken: string;
  preview: NonNullable<Awaited<ReturnType<ReturnType<typeof useAppState>["getInvitePreview"]>>>;
  routerPush: (href: string) => void;
}) {
  const inviteStatus = getInviteStatus(preview.invite!);
  const canJoin = inviteStatus === "pending";

  async function handleJoin() {
    const tripId = await joinTripByInviteToken(paramsToken);
    if (tripId) {
      routerPush(`/trips/${tripId}`);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl items-center px-6 py-16">
      <Panel className="w-full overflow-hidden">
        <div className="grid gap-8 p-8 md:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-lagoon">Trip Preview</p>
            <h1 className="section-title mt-4 text-5xl leading-tight">{preview.trip!.title}</h1>
            <p className="mt-4 text-sm text-stone-600">{preview.trip!.summary}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <StatusBadge status={preview.trip!.status} />
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-stone-700">
                {preview.trip!.groupName}
              </span>
            </div>
          </div>
          <div className="rounded-[2rem] bg-ink p-6 text-white">
            <p className="text-sm uppercase tracking-[0.35em] text-sun">What you’re joining</p>
            <ul className="mt-5 space-y-4 text-sm text-stone-200">
              <li>Planner: {preview.planner?.displayName}</li>
              <li>Members already in: {preview.memberCount}</li>
              <li>Invite status: {inviteStatusLabel(inviteStatus)}</li>
              <li>
                Tentative window: {formatDate(preview.trip!.tentativeStart)} to{" "}
                {formatDate(preview.trip!.tentativeEnd)}
              </li>
              <li>Signed in as: {currentProfile?.email}</li>
            </ul>
            {canJoin ? (
              <Button className="mt-6 w-full" disabled={isPending} onClick={handleJoin}>
                Join this trip
              </Button>
            ) : (
              <div className="mt-6 rounded-[1.5rem] bg-white/10 px-4 py-3 text-sm text-stone-200">
                {inviteStatus === "accepted"
                  ? "This invite has already been used."
                  : inviteStatus === "revoked"
                    ? "This invite was revoked by the planner."
                    : "This invite has expired."}
              </div>
            )}
          </div>
        </div>
      </Panel>
    </main>
  );
}

function inviteStatusLabel(status: "pending" | "accepted" | "expired" | "revoked") {
  return {
    pending: "Ready to join",
    accepted: "Already used",
    expired: "Expired",
    revoked: "Revoked"
  }[status];
}
