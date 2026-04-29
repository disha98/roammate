"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export function Button({
  className,
  href,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> &
  React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href?: string;
    variant?: "primary" | "secondary" | "ghost";
  }) {
  const classes = cn(
    "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition",
    variant === "primary" &&
      "bg-ink text-white shadow-panel hover:-translate-y-0.5 hover:bg-stone-900",
    variant === "secondary" &&
      "border border-ink/10 bg-white/70 text-ink hover:border-lagoon hover:text-lagoon",
    variant === "ghost" && "text-ink/70 hover:text-ink",
    className
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {props.children}
      </Link>
    );
  }

  return <button className={classes} {...props} />;
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-2xl border border-ink/10 bg-white/90 px-4 py-3 text-sm outline-none ring-0 transition placeholder:text-stone-400 focus:border-lagoon",
        className
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-3xl border border-ink/10 bg-white/90 px-4 py-3 text-sm outline-none transition placeholder:text-stone-400 focus:border-lagoon",
        className
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full rounded-2xl border border-ink/10 bg-white/90 px-4 py-3 text-sm outline-none transition focus:border-lagoon",
        className
      )}
      {...props}
    />
  );
}

export function Panel({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("panel rounded-4xl shadow-panel", className)} {...props} />;
}

export function StatusBadge({ status }: { status: string }) {
  const palette =
    {
      draft: "bg-white text-stone-700",
      collecting_members: "bg-sun/20 text-amber-900",
      planning: "bg-lagoon/15 text-lagoon",
      voting: "bg-plum/15 text-plum",
      decided: "bg-coral/15 text-coral"
    }[status] ?? "bg-white text-stone-700";

  return (
    <span className={cn("rounded-full px-3 py-1 text-xs font-semibold capitalize", palette)}>
      {status.replaceAll("_", " ")}
    </span>
  );
}
