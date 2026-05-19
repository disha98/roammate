"use client";

import { cn } from "@/lib/utils";

function LogoIcon({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 256 256"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="roammate-brand-gradient" x1="48" y1="84" x2="206" y2="206" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#1786F4" />
          <stop offset="1" stopColor="#12D3B8" />
        </linearGradient>
      </defs>
      <path
        d="M128 209C133.333 197 144.467 180.933 161.4 160.8C184.333 133.533 196.667 108.267 198.4 85C201.067 48.333 172.6 20 128 20C83.4 20 54.933 48.333 57.6 85C59.333 108.267 71.667 133.533 94.6 160.8C111.533 180.933 122.667 197 128 209Z"
        stroke="url(#roammate-brand-gradient)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="95" cy="102" r="14" stroke="url(#roammate-brand-gradient)" strokeWidth="10" />
      <path
        d="M76 143.5V135.5C76 120.312 88.3122 108 103.5 108H104.5C113.167 108 120.896 112.011 125.94 118.282"
        stroke="url(#roammate-brand-gradient)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="161" cy="102" r="14" stroke="url(#roammate-brand-gradient)" strokeWidth="10" />
      <path
        d="M180 143.5V135.5C180 120.312 167.688 108 152.5 108H151.5C142.833 108 135.104 112.011 130.06 118.282"
        stroke="url(#roammate-brand-gradient)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="128" cy="100" r="20" stroke="url(#roammate-brand-gradient)" strokeWidth="10" />
      <path
        d="M103 171V148C103 129.775 117.775 115 136 115H120C138.225 115 153 129.775 153 148V171"
        stroke="url(#roammate-brand-gradient)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({
  className,
  iconSize = 28,
  showWordmark = true,
  wordmarkClassName
}: {
  className?: string;
  iconSize?: number;
  showWordmark?: boolean;
  wordmarkClassName?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <LogoIcon size={iconSize} />
      {showWordmark ? (
        <span className={cn("section-title text-2xl tracking-tight text-ink", wordmarkClassName)}>
          Roammate
        </span>
      ) : null}
    </div>
  );
}

export function LogoMark({ className, size = 24 }: { className?: string; size?: number }) {
  return <LogoIcon className={className} size={size} />;
}
