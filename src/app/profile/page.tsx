"use client";

import Image from "next/image";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/components/require-auth";
import { Button, Input, Panel, Select } from "@/components/ui";
import { useAppState } from "@/context/app-state";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatMonthDay, getInitials } from "@/lib/utils";

export default function ProfilePage() {
  const {
    currentProfile,
    updateCurrentProfile,
    addProfileAvailabilityWindow,
    removeProfileAvailabilityWindow,
    getProfileAvailabilityWindows
  } = useAppState();

  const [displayName, setDisplayName] = useState("");
  const [homeCity, setHomeCity] = useState("");
  const [passport, setPassport] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [label, setLabel] = useState("");
  const [startMonthDay, setStartMonthDay] = useState("08-01");
  const [endMonthDay, setEndMonthDay] = useState("08-31");
  const [countryCodes, setCountryCodes] = useState<string[]>([]);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!currentProfile) {
      return;
    }

    queueMicrotask(() => {
      setDisplayName(currentProfile.displayName);
      setHomeCity(currentProfile.homeCity);
      setPassport(currentProfile.passport);
      setPhotoUrl(currentProfile.photoUrl ?? "");
    });
  }, [currentProfile]);

  useEffect(() => {
    let mounted = true;

    async function loadCountries() {
      try {
        const response = await fetch("/api/countries");
        if (!response.ok) {
          throw new Error("Unable to load countries");
        }
        const data = (await response.json()) as { countries: string[] };
        if (mounted) {
          setCountryCodes(data.countries);
        }
      } catch {
        if (mounted) {
          setCountryCodes(["US", "GB", "IN", "CA"]);
        }
      }
    }

    void loadCountries();

    return () => {
      mounted = false;
    };
  }, []);

  const availabilityWindows = getProfileAvailabilityWindows();

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveState("saving");
    try {
      await updateCurrentProfile({ displayName, homeCity, passport, photoUrl });
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1800);
    } catch {
      setSaveState("idle");
    }
  }

  async function handlePhotoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !currentProfile) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${currentProfile.id}/avatar.${ext}`;

      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (error) {
        console.error("Upload failed:", error.message);
        return;
      }

      const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = `${publicUrlData.publicUrl}?t=${Date.now()}`;
      setPhotoUrl(url);
    } finally {
      setUploading(false);
    }
  }

  async function handleWindowSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await addProfileAvailabilityWindow({ label, startMonthDay, endMonthDay });
    setLabel("");
  }

  return (
    <RequireAuth>
      <AppShell>
        <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <Panel className="p-6">
            <p className="text-xs uppercase tracking-[0.35em] text-lagoon">Profile</p>
            <h1 className="section-title mt-2 text-4xl">Your planner profile</h1>
            <p className="mt-3 text-sm text-stone-600">
              Keep your travel identity and usual availability in one place so every trip starts
              with better context.
            </p>

            <div className="mt-6 flex items-center gap-4 rounded-[1.8rem] bg-mist p-4">
              <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-ink text-xl font-semibold text-white">
                {photoUrl ? (
                  <Image src={photoUrl} alt={displayName || "Profile photo"} fill className="object-cover" />
                ) : (
                  getInitials(displayName || currentProfile?.displayName || "R")
                )}
              </div>
              <div>
                <p className="text-lg font-semibold text-ink">{displayName || currentProfile?.displayName}</p>
                <p className="text-sm text-stone-500">{currentProfile?.email}</p>
                <p className="mt-1 text-sm text-stone-600">
                  {homeCity || "Add your home city"} · Passport {passport || "not set"}
                </p>
              </div>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleProfileSubmit}>
              <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Display name" />
              <Input value={homeCity} onChange={(event) => setHomeCity(event.target.value)} placeholder="Home city" />
              <Select required value={passport} onChange={(event) => setPassport(event.target.value)}>
                <option value="" disabled>
                  Passport country
                </option>
                {countryCodes.map((code) => (
                  <option key={code} value={code}>
                    {formatCountryName(code)} ({code})
                  </option>
                ))}
              </Select>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="rounded-full border border-ink/12 bg-mist px-4 py-2 text-sm font-medium text-ink transition hover:bg-lagoon/10 disabled:opacity-50"
                >
                  {uploading ? "Uploading..." : photoUrl ? "Change photo" : "Upload photo"}
                </button>
                {photoUrl && (
                  <span className="ml-3 text-xs text-stone-500">Photo set</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Button type="submit" disabled={saveState === "saving"}>
                  {saveState === "saving" ? "Saving..." : "Save profile"}
                </Button>
                <span
                  className={`text-sm font-medium ${
                    saveState === "saved" ? "text-lagoon" : "text-stone-500"
                  }`}
                >
                  {saveState === "saved" ? "Profile saved" : "Changes stay local until saved."}
                </span>
              </div>
            </form>
          </Panel>

          <Panel className="p-6">
            <p className="text-xs uppercase tracking-[0.35em] text-lagoon">Availability defaults</p>
            <h2 className="section-title mt-2 text-4xl">Your usual travel windows</h2>
            <p className="mt-3 text-sm text-stone-600">
              Add recurring windows like “late August” or “winter break.” When a trip falls inside
              one of these ranges, Roammate can suggest those dates in the trip planner.
            </p>

            <form className="mt-6 grid gap-3 rounded-[1.8rem] bg-mist p-4 lg:grid-cols-[1.2fr_0.8fr_0.8fr_auto]" onSubmit={handleWindowSubmit}>
              <Input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Window name" />
              <Input type="date" value={`2026-${startMonthDay}`} onChange={(event) => setStartMonthDay(event.target.value.slice(5))} />
              <Input type="date" value={`2026-${endMonthDay}`} onChange={(event) => setEndMonthDay(event.target.value.slice(5))} />
              <Button type="submit">Add window</Button>
            </form>

            <div className="mt-6 space-y-3">
              {availabilityWindows.length === 0 ? (
                <div className="rounded-[1.6rem] border border-dashed border-ink/10 bg-white/70 p-4 text-sm text-stone-500">
                  No recurring availability yet.
                </div>
              ) : (
                availabilityWindows.map((window) => (
                  <div key={window.id} className="flex items-center justify-between gap-4 rounded-[1.6rem] border border-ink/8 bg-white/75 p-4">
                    <div>
                      <p className="font-semibold text-ink">{window.label}</p>
                      <p className="text-sm text-stone-600">
                        {formatMonthDay(window.startMonthDay)} to {formatMonthDay(window.endMonthDay)}
                      </p>
                    </div>
                    <button className="text-sm font-semibold text-coral" onClick={() => void removeProfileAvailabilityWindow(window.id)} type="button">
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </Panel>
        </div>
      </AppShell>
    </RequireAuth>
  );
}

function formatCountryName(code: string) {
  const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
  return displayNames.of(code) ?? code;
}
