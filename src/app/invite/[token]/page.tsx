"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Logo } from "@/components/logo";
import { RequireAuth } from "@/components/require-auth";
import { SkeletonLine, SkeletonBlock } from "@/components/skeleton";
import { useToast } from "@/components/toast";
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
    getTripMembers,
    isPending,
    joinTripByInviteToken
  } = useAppState();
  const { toast } = useToast();
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

  const tripId = preview?.trip?.id;
  const members = tripId ? getTripMembers(tripId) : [];
  const isAlreadyMember = currentProfile
    ? members.some((m) => m.profileId === currentProfile.id)
    : false;

  return (
    <RequireAuth>
      {!preview ? (
        <main className="mx-auto flex min-h-screen max-w-4xl items-center px-6 py-16">
          <Panel className="w-full overflow-hidden">
            <div className="grid gap-8 p-8 md:grid-cols-[1.05fr_0.95fr]">
              <div>
                <SkeletonLine className="h-3 w-24" />
                <SkeletonLine className="mt-4 h-10 w-64" />
                <SkeletonLine className="mt-4 h-4 w-full" />
                <SkeletonLine className="mt-2 h-4 w-3/4" />
                <div className="mt-6 flex gap-3">
                  <SkeletonBlock className="h-7 w-24 rounded-full" />
                  <SkeletonBlock className="h-7 w-20 rounded-full" />
                </div>
              </div>
              <SkeletonBlock className="h-56 rounded-[2rem]" />
            </div>
          </Panel>
        </main>
      ) : !preview.trip || !preview.invite ? (
        <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-16">
          <Panel className="w-full p-10 text-center">
            <Logo className="mx-auto mb-6 justify-center" iconSize={28} />
            <p className="text-xs uppercase tracking-[0.35em] text-coral">Invite not found</p>
            <p className="section-title mt-4 text-4xl">This join link is no longer valid.</p>
            <p className="mt-4 text-sm text-stone-500">
              Ask the trip planner to send you a fresh invite link.
            </p>
            <Button href="/dashboard" className="mt-6">
              Go to dashboard
            </Button>
          </Panel>
        </main>
      ) : (
        <InvitePreviewContent
          currentProfile={currentProfile}
          formatDate={formatDate}
          getInviteStatus={getInviteStatus}
          isPending={isPending}
          isAlreadyMember={isAlreadyMember}
          joinTripByInviteToken={joinTripByInviteToken}
          paramsToken={params.token}
          preview={preview}
          routerPush={router.push}
          toast={toast}
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
  isAlreadyMember,
  joinTripByInviteToken,
  paramsToken,
  preview,
  routerPush,
  toast
}: {
  currentProfile: ReturnType<typeof useAppState>["currentProfile"];
  formatDate: typeof import("@/lib/utils").formatDate;
  getInviteStatus: ReturnType<typeof useAppState>["getInviteStatus"];
  isPending: boolean;
  isAlreadyMember: boolean;
  joinTripByInviteToken: ReturnType<typeof useAppState>["joinTripByInviteToken"];
  paramsToken: string;
  preview: NonNullable<Awaited<ReturnType<ReturnType<typeof useAppState>["getInvitePreview"]>>>;
  routerPush: (href: string) => void;
  toast: (message: string, type?: "success" | "error" | "info") => void;
}) {
  const inviteStatus = getInviteStatus(preview.invite!);
  const canJoin = inviteStatus === "pending" && !isAlreadyMember;

  async function handleJoin() {
    const tripId = await joinTripByInviteToken(paramsToken);
    if (tripId) {
      toast("Welcome aboard! Redirecting to the trip...");
      routerPush(`/trips/${tripId}`);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl items-center px-6 py-16">
      <Panel className="w-full overflow-hidden">
        <div className="grid gap-8 p-8 md:grid-cols-[1.05fr_0.95fr]">
          <div>
            <Logo iconSize={22} wordmarkClassName="text-lg" className="mb-5" />
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
            <p className="text-sm uppercase tracking-[0.35em] text-sun">What you&apos;re joining</p>
            <ul className="mt-5 space-y-4 text-sm text-stone-200">
              <li>Planner: {preview.planner?.displayName}</li>
              <li>Members already in: {preview.memberCount}</li>
              <li>Invite status: {inviteStatusLabel(inviteStatus)}</li>
              <li>
                Tentative window: {formatDate(preview.trip!.tentativeStart)} to{" "}
                {formatDate(preview.trip!.tentativeEnd)}
              </li>
              {preview.trip!.tripDuration ? (
                <li>Duration: {preview.trip!.tripDuration} days</li>
              ) : null}
              <li>Signed in as: {currentProfile?.email}</li>
            </ul>
            {isAlreadyMember ? (
              <div className="mt-6 space-y-3">
                <div className="rounded-[1.5rem] bg-lagoon/20 px-4 py-3 text-sm text-lagoon">
                  You&apos;re already part of this trip.
                </div>
                <Button
                  className="w-full transition hover:scale-[1.02]"
                  onClick={() => routerPush(`/trips/${preview.trip!.id}`)}
                >
                  Go to trip
                </Button>
              </div>
            ) : canJoin ? (
              <Button
                className="mt-6 w-full transition hover:scale-[1.02]"
                disabled={isPending}
                onClick={handleJoin}
              >
                {isPending ? "Joining..." : "Join this trip"}
              </Button>
            ) : (
              <div className="mt-6 space-y-3">
                <div className="rounded-[1.5rem] bg-white/10 px-4 py-3 text-sm text-stone-200">
                  {inviteStatus === "revoked"
                    ? "This invite was revoked by the planner."
                    : "This invite has expired."}
                </div>
                <p className="text-xs text-stone-400">
                  Ask the trip planner to generate a new invite link.
                </p>
              </div>
            )}
          </div>
        </div>
      </Panel>
    </main>
  );
}

function inviteStatusLabel(status: "pending" | "expired" | "revoked") {
  return {
    pending: "Ready to join",
    expired: "Expired",
    revoked: "Revoked"
  }[status];
}
