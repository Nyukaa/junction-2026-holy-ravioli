import type { ReactNode } from "react";

export type IconName =
  | "arrow"
  | "calendar"
  | "check"
  | "chevron"
  | "home"
  | "plane"
  | "send"
  | "shield"
  | "spark"
  | "trend"
  | "user"
  | "wallet";

const paths: Record<IconName, ReactNode> = {
  arrow: <path d="M5 12h14M14 7l5 5-5 5" />,
  calendar: (
    <>
      <rect x="3.5" y="5.5" width="17" height="15" rx="3" />
      <path d="M8 3.5v4M16 3.5v4M3.5 10h17" />
    </>
  ),
  check: <path d="m5 12 4 4L19 7" />,
  chevron: <path d="m9 18 6-6-6-6" />,
  home: <path d="m4 10 8-6 8 6v9a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1Z" />,
  plane: (
    <>
      <path d="m3 11 18-7-7 17-3-7-8-3Z" />
      <path d="m11 14 4-4" />
    </>
  ),
  send: (
    <>
      <path d="m3 11 18-7-7 17-3-7-8-3Z" />
      <path d="m11 14 4-4" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 5 6v5c0 4.5 2.8 8 7 10 4.2-2 7-5.5 7-10V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  spark: (
    <path d="m12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3Z" />
  ),
  trend: (
    <>
      <path d="M4 17 10 11l4 4 6-8" />
      <path d="M15 7h5v5" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </>
  ),
  wallet: (
    <>
      <path d="M4 7.5h15a2 2 0 0 1 2 2v9H5a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2h12" />
      <path d="M16 12h5v4h-5a2 2 0 0 1 0-4Z" />
    </>
  ),
};

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
