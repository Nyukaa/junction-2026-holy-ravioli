"use client";

import {
  Calendar,
  Home,
  MessageCircle,
  TrendingUp,
  User,
  type LucideIcon,
} from "lucide-react";

export type Tab = "home" | "progress" | "coach" | "plan" | "profile";

const tabs: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "progress", label: "Progress", icon: TrendingUp },
  { id: "coach", label: "Coach", icon: MessageCircle },
  { id: "plan", label: "Plan", icon: Calendar },
  { id: "profile", label: "Profile", icon: User },
];

export function BottomNav({
  active,
  onChange,
}: {
  active: Tab;
  onChange: (tab: Tab) => void;
}) {
  return (
    <nav
      aria-label="Bottom navigation"
      className="flex items-center justify-around bg-white px-2 pt-2 pb-1 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            aria-current={isActive ? "page" : undefined}
            onClick={() => onChange(tab.id)}
            className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 transition ${
              isActive
                ? "text-brand-green"
                : "text-[#9ca3af] hover:text-slate-600"
            }`}
          >
            <Icon size={24} strokeWidth={isActive ? 2.2 : 1.8} />
            <span
              className={`text-xs ${isActive ? "font-bold" : "font-normal"}`}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
