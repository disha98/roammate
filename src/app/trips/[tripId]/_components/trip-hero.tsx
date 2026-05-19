"use client";

import Link from "next/link";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button, Input, Panel, StatusBadge } from "@/components/ui";
import { useAppState } from "@/context/app-state";
import type { TripStatus } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { stageCopy, statusLabel } from "./utils";

const statusFlow: TripStatus[] = ["collecting_members", "planning", "voting"];

export function TripHero({
  trip,
  isPlanner,
  onStatusChange,
  onLeaveTrip,
  onDeleteTrip,
  onUpdateTrip,
  canOpenVoting,
  showDeleteConfirm,
  setShowDeleteConfirm,
  showEditWindow,
  setShowEditWindow,
  editStart,
  setEditStart,
  editEnd,
  setEditEnd,
  editDuration,
  setEditDuration
}: {
  trip: NonNullable<ReturnType<ReturnType<typeof useAppState>["getTripById"]>>;
  isPlanner: boolean;
  onStatusChange: (tripId: string, status: TripStatus) => Promise<void>;
  onLeaveTrip: (tripId: string) => Promise<void>;
  onDeleteTrip: (tripId: string) => Promise<void>;
  onUpdateTrip: (tripId: string, input: { tentativeStart: string; tentativeEnd: string; tripDuration: number }) => Promise<void>;
  canOpenVoting: boolean;
  showDeleteConfirm: boolean;
  setShowDeleteConfirm: (value: boolean) => void;
  showEditWindow: boolean;
  setShowEditWindow: (value: boolean) => void;
  editStart: string;
  setEditStart: (value: string) => void;
  editEnd: string;
  setEditEnd: (value: string) => void;
  editDuration: string;
  setEditDuration: (value: string) => void;
}) {
  return (
    <Panel className="overflow-hidden">
      <div className="grid gap-6 p-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/dashboard" className="text-sm font-semibold text-lagoon">
              Back to dashboard
            </Link>
            <StatusBadge status={trip.status} />
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-stone-700">
              {trip.groupName}
            </span>
          </div>
          <h1 className="section-title mt-4 text-5xl text-ink">{trip.title}</h1>
          <p className="mt-4 max-w-4xl text-sm text-stone-600">{trip.summary}</p>
          <div className="mt-5">
            <p className="text-xs uppercase tracking-[0.25em] text-stone-500">
              Target window: {formatDate(trip.tentativeStart)} to {formatDate(trip.tentativeEnd)} · {trip.tripDuration} day trip
            </p>
            {isPlanner ? (
              showEditWindow ? (
                <div className="mt-3 rounded-[1.5rem] border border-ink/8 bg-white/80 p-4">
                  <p className="text-sm font-semibold text-ink">Edit trip window</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1">
                      <label className="text-xs text-stone-500" htmlFor="edit-start">Window opens</label>
                      <Input id="edit-start" type="date" value={editStart} onChange={(e) => setEditStart(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-stone-500" htmlFor="edit-end">Window closes</label>
                      <Input id="edit-end" type="date" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-stone-500" htmlFor="edit-duration">Trip length (days)</label>
                      <Input id="edit-duration" type="number" min={1} value={editDuration} onChange={(e) => setEditDuration(e.target.value)} />
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button
                      onClick={() => {
                        void onUpdateTrip(trip.id, {
                          tentativeStart: editStart,
                          tentativeEnd: editEnd,
                          tripDuration: Number(editDuration) || 7
                        });
                        setShowEditWindow(false);
                      }}
                    >
                      Save
                    </Button>
                    <Button variant="secondary" onClick={() => setShowEditWindow(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="mt-2 text-xs font-medium text-lagoon underline underline-offset-2"
                  onClick={() => {
                    setEditStart(trip.tentativeStart);
                    setEditEnd(trip.tentativeEnd);
                    setEditDuration(String(trip.tripDuration));
                    setShowEditWindow(true);
                  }}
                >
                  Edit window
                </button>
              )
            ) : null}
          </div>
        </div>
        <div className="rounded-[2rem] bg-ink p-5 text-white">
          <p className="text-sm uppercase tracking-[0.35em] text-sun">Trip stage</p>
          <p className="mt-3 text-sm text-stone-200">
            {stageCopy[trip.status]}
          </p>
          {isPlanner ? (
            trip.status === "decided" ? (
              <p className="mt-4 text-sm text-stone-300">
                This trip is locked in. Reopen the decision below if plans change.
              </p>
            ) : (
              <div className="mt-4 flex flex-wrap gap-2">
                {statusFlow.map((status) => (
                  <Button
                    key={status}
                    variant={trip.status === status ? "primary" : "secondary"}
                    disabled={status === "voting" && !canOpenVoting}
                    className={
                      trip.status === status
                        ? "bg-white text-ink hover:bg-white"
                        : "border-white/10 bg-white/10 text-white hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                    }
                    onClick={() => void onStatusChange(trip.id, status)}
                  >
                    {statusLabel(status)}
                  </Button>
                ))}
              </div>
            )
          ) : (
            <div className="mt-4">
              <p className="text-sm text-stone-300">
                The planner controls when this trip moves into the next stage.
              </p>
              <Button
                variant="secondary"
                className="mt-3 border-coral/30 bg-coral/10 text-coral hover:border-coral/50 hover:text-coral"
                onClick={() => void onLeaveTrip(trip.id)}
              >
                Leave trip
              </Button>
            </div>
          )}
          {isPlanner && !canOpenVoting && trip.status === "planning" ? (
            <p className="mt-4 text-sm text-stone-300">
              Choose at least one shortlisted destination and one final date window before voting opens.
            </p>
          ) : null}
          {isPlanner ? (
            <div className="mt-4">
              <button
                type="button"
                className="text-xs font-medium text-stone-400 underline underline-offset-2 hover:text-coral"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete trip
              </button>
              <ConfirmDialog
                open={showDeleteConfirm}
                title="Delete this trip?"
                message="This will permanently delete the trip and all its data. This cannot be undone."
                confirmLabel="Delete"
                onConfirm={() => void onDeleteTrip(trip.id)}
                onCancel={() => setShowDeleteConfirm(false)}
              />
            </div>
          ) : null}
        </div>
      </div>
    </Panel>
  );
}
