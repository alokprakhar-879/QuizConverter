"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/import", label: "Create" },
  { href: "/quiz", label: "Quiz" },
  { href: "/bank", label: "Bank" },
  { href: "/history", label: "Progress" },
];

export function AppShell({
  children,
  title,
  lede,
  actions,
}: {
  children: ReactNode;
  title?: string;
  lede?: string;
  actions?: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="border-b border-line bg-card/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link href="/" className="text-[15px] font-semibold tracking-tight">
            Meridian
          </Link>
          <nav className="flex items-center gap-0.5 overflow-x-auto text-sm">
            {NAV.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-md px-3 py-1.5 transition",
                    active ? "bg-fg text-white" : "text-muted hover:bg-line hover:text-fg",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 py-10">
        {(title || lede || actions) && (
          <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
            <div>
              {title && <h1 className="text-2xl font-semibold tracking-tight md:text-[1.75rem]">{title}</h1>}
              {lede && <p className="mt-1.5 max-w-xl text-sm leading-6 text-muted">{lede}</p>}
            </div>
            {actions}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}

export function PrimaryButton({
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg bg-fg px-4 py-2 text-sm font-medium text-white transition hover:bg-fg/90 disabled:opacity-40",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-card px-4 py-2 text-sm text-fg transition hover:bg-bg disabled:opacity-40",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

export const fieldClass =
  "w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-fg placeholder:text-muted/70";
