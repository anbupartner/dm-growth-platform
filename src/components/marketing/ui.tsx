// Public site design primitives — deliberately separate from
// src/components/ui.tsx (the internal admin tool's compact, utilitarian
// card/table language). This is a presentation surface: large type, heavy
// whitespace, minimal chrome — see spec section 3 ("Fresh Business
// Presentation Design").

import clsx from "clsx";
import Link from "next/link";
import type { ReactNode, ButtonHTMLAttributes } from "react";

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx("mx-auto w-full max-w-6xl px-5 sm:px-8", className)}>{children}</div>;
}

export function Section({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={clsx("py-16 sm:py-24", className)}>
      <Container>{children}</Container>
    </section>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">
      {children}
    </p>
  );
}

export function CTAButton({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  onClick,
}: {
  href?: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  const classes = clsx(
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors whitespace-nowrap",
    size === "sm" && "px-4 py-2 text-sm",
    size === "md" && "px-6 py-3 text-sm",
    size === "lg" && "px-8 py-4 text-base",
    variant === "primary" && "bg-slate-900 text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200",
    variant === "secondary" &&
      "border border-slate-300 text-slate-900 hover:border-slate-900 dark:border-slate-700 dark:text-white dark:hover:border-white",
    variant === "ghost" && "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white",
    className
  );
  if (href) {
    return (
      <Link href={href} className={classes} onClick={onClick}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={classes} onClick={onClick}>
      {children}
    </button>
  );
}

export function IconButton({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center rounded-full border border-slate-300 dark:border-slate-700 h-9 w-9 text-slate-600 dark:text-slate-300 hover:border-slate-900 dark:hover:border-white transition-colors",
        className
      )}
      {...props}
    />
  );
}

export function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
      <div className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 dark:text-white tabular-nums">
        {value}
      </div>
      <div className="mt-1.5 text-sm font-medium text-slate-500 dark:text-slate-400">{label}</div>
      {hint && <div className="mt-1 text-xs text-slate-400 dark:text-slate-500">{hint}</div>}
    </div>
  );
}

export function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border border-slate-200 dark:border-slate-700 px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-300",
        className
      )}
    >
      {children}
    </span>
  );
}

export function SampleBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-800 dark:text-amber-400">
      Sample template — replace with a real case study
    </span>
  );
}
