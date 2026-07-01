"use client";

import { cn } from "@/lib/utils/cn";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { ThemeToggle } from "./ThemeToggle";

export interface HeaderProps {
  className?: string;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
}

export function Header({ className, title, description, actions }: HeaderProps) {
  void title;
  void description;
  return (
    <header
      className={cn(
        "flex h-16 items-center justify-between border-b border-white/[0.08] bg-surface-container-low/50 px-6 backdrop-blur-sm",
        className
      )}
    >
      <div className="flex items-center gap-4">
        {/* Mobile menu button */}
        <button
          type="button"
          className="rounded-lg p-2 text-on-surface-variant hover:bg-white/[0.05] lg:hidden"
          aria-label="Open sidebar"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>

        {/* Search bar */}
        <div className="relative hidden md:block">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            placeholder="Search devices, logs..."
            className="h-10 w-80 rounded-full border border-white/[0.08] bg-surface-container pl-10 pr-4 text-sm text-on-surface placeholder-on-surface-variant/60 transition-all focus:border-primary/50 focus:bg-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {actions}

        {/* Nav links */}
        <div className="hidden items-center gap-1 lg:flex">
          <a
            href="#"
            className="rounded-full px-3 py-1.5 text-sm font-medium text-on-surface-variant transition-colors hover:bg-white/[0.05] hover:text-on-surface"
          >
            Docs
          </a>
          <a
            href="#"
            className="rounded-full px-3 py-1.5 text-sm font-medium text-on-surface-variant transition-colors hover:bg-white/[0.05] hover:text-on-surface"
          >
            API
          </a>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-medium text-emerald-400">Status</span>
        </div>

        {/* Theme toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <NotificationBell />

        {/* Redeploy button */}
        <button
          type="button"
          className="hidden items-center gap-2 rounded-full bg-gradient-to-r from-primary-container to-secondary-container px-4 py-2 text-sm font-medium text-white shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30 sm:flex"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          Redeploy
        </button>

        {/* User avatar */}
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary-container to-tertiary-container text-sm font-medium text-white"
        >
          A
        </button>
      </div>
    </header>
  );
}
