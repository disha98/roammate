"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input, Panel } from "@/components/ui";
import { useAppState } from "@/context/app-state";

export default function LoginPage() {
  const router = useRouter();
  const { currentProfile, isConfigured, isPending, isReady, joinTripByInviteToken, login } =
    useAppState();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [nextPath, setNextPath] = useState("/dashboard");
  const [inviteToken, setInviteToken] = useState<string | undefined>();
  const [authState, setAuthState] = useState<
    "idle" | "submitting" | "signed_up" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [hasCompletedRedirect, setHasCompletedRedirect] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNextPath(params.get("next") ?? "/dashboard");
    setInviteToken(params.get("inviteToken") ?? undefined);
  }, []);

  useEffect(() => {
    if (!isReady || !currentProfile || hasCompletedRedirect) {
      return;
    }

    setHasCompletedRedirect(true);
    void (async () => {
      if (inviteToken) {
        const joinedTripId = await joinTripByInviteToken(inviteToken);
        router.replace(joinedTripId ? `/trips/${joinedTripId}` : nextPath);
        return;
      }

      router.replace(nextPath);
    })();
  }, [currentProfile, hasCompletedRedirect, inviteToken, isReady, joinTripByInviteToken, nextPath, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthState("submitting");
    setErrorMessage("");

    try {
      await login({ email, password, mode, nextPath, inviteToken });
      setAuthState(mode === "signup" ? "signed_up" : "idle");
    } catch (error) {
      setAuthState("error");
      setErrorMessage((error as Error).message || "We couldn’t complete sign-in right now.");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl items-center px-6 py-16">
      <div className="grid w-full gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <Panel className="p-8">
          <p className="text-xs uppercase tracking-[0.35em] text-lagoon">Planner Login</p>
          <h1 className="section-title mt-4 text-5xl leading-tight">Open the dashboard, keep every trip thread visible.</h1>
          <p className="mt-5 text-sm text-stone-600">
            Sign in with your email and password. If you are new here, create an account first and
            then continue into the app.
          </p>
          <div className="mt-8 rounded-[2rem] bg-ink px-5 py-6 text-white">
            <p className="text-sm uppercase tracking-[0.3em] text-sun">How it works</p>
            <ul className="mt-4 space-y-3 text-sm text-stone-200">
              <li>Create an account with email and password once.</li>
              <li>Use the same credentials to return to any trip or invite.</li>
              <li>Finish your profile inside the app after sign-in.</li>
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
                Use your Roammate email and password to access the app.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 rounded-[1.5rem] bg-mist p-1">
              <button
                type="button"
                className={`rounded-[1.1rem] px-4 py-2 text-sm font-semibold transition ${
                  mode === "login" ? "bg-white text-ink shadow-sm" : "text-stone-500"
                }`}
                onClick={() => setMode("login")}
              >
                Sign in
              </button>
              <button
                type="button"
                className={`rounded-[1.1rem] px-4 py-2 text-sm font-semibold transition ${
                  mode === "signup" ? "bg-white text-ink shadow-sm" : "text-stone-500"
                }`}
                onClick={() => setMode("signup")}
              >
                Create account
              </button>
            </div>
            <Input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email"
            />
            <Input
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
            />
            {!isConfigured ? (
              <div className="rounded-[1.5rem] border border-coral/20 bg-coral/5 px-4 py-3 text-sm text-coral">
                Supabase auth is not configured yet. Add `NEXT_PUBLIC_SUPABASE_URL` and
                `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` before signing in.
              </div>
            ) : null}
            {authState === "signed_up" ? (
              <div className="rounded-[1.5rem] border border-lagoon/20 bg-lagoon/5 px-4 py-3 text-sm text-lagoon">
                Account created. If your Supabase project requires email confirmation, verify the
                address first, then sign in with the same password.
              </div>
            ) : null}
            {authState === "error" ? (
              <div className="rounded-[1.5rem] border border-coral/20 bg-coral/5 px-4 py-3 text-sm text-coral">
                {errorMessage || "We couldn’t complete sign-in right now."}
              </div>
            ) : null}
            <Button className="w-full" type="submit" disabled={!isConfigured || isPending || authState === "submitting"}>
              {authState === "submitting"
                ? mode === "signup"
                  ? "Creating account..."
                  : "Signing in..."
                : mode === "signup"
                  ? "Create account"
                  : "Sign in"}
            </Button>
          </form>
        </Panel>
      </div>
    </main>
  );
}
