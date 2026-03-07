"use client";

import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────
   DeepLux MED — Unified Brand Component
   Hierarchy:  DeepLux.org  →  MED  →  Expediente (DLM)
   ───────────────────────────────────────────── */

interface DeepLuxLogoProps {
  /** full = sidebar expanded, compact = sidebar collapsed,
   *  auth = login/register centered, header = mobile top-bar */
  variant?: "full" | "compact" | "auth" | "header";
  /** Show the "Expediente (DLM)" product line */
  showProduct?: boolean;
  className?: string;
}

/* ── SVG Icon (matches icon.svg) ── */
function LogoIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="dl-bg" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0ea5e9" />
          <stop offset="100%" stopColor="#1e3a5f" />
        </linearGradient>
        <linearGradient id="dl-dot" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0ea5e9" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="108" fill="url(#dl-bg)" />
      {/* D letter */}
      <path
        d="M120 112h80c88 0 140 52 140 144s-52 144-140 144h-80V112zm56 48v192h24c60 0 96-36 96-96s-36-96-96-96h-24z"
        fill="white"
        opacity="0.95"
      />
      {/* L letter */}
      <path
        d="M296 112h56v232h80v56H296V112z"
        fill="white"
        opacity="0.85"
      />
      {/* Accent dot — "lux" */}
      <circle cx="416" cy="136" r="20" fill="url(#dl-dot)" opacity="0.9" />
    </svg>
  );
}

/* ── Variant-specific sizes ── */
const iconSizes = {
  full: "h-8 w-8",
  compact: "h-9 w-9",
  auth: "h-14 w-14",
  header: "h-7 w-7",
} as const;

export default function DeepLuxLogo({
  variant = "full",
  showProduct = true,
  className,
}: DeepLuxLogoProps) {
  const handleLogoClick = () => {
    window.open("https://deeplux.org", "_blank", "noopener,noreferrer");
  };

  /* ─── Compact: icon only ─── */
  if (variant === "compact") {
    return (
      <button
        onClick={handleLogoClick}
        title="Visitar deeplux.org"
        className={cn(
          "group flex items-center justify-center rounded-xl transition-transform duration-200 hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400",
          className
        )}
        type="button"
      >
        <LogoIcon className={cn(iconSizes.compact, "rounded-lg drop-shadow-lg")} />
      </button>
    );
  }

  /* ─── Auth: large centered ─── */
  if (variant === "auth") {
    return (
      <div className={cn("flex flex-col items-center gap-3", className)}>
        <button
          onClick={handleLogoClick}
          title="Visitar deeplux.org"
          className="group focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-xl transition-transform duration-200 hover:scale-105"
          type="button"
        >
          <LogoIcon className={cn(iconSizes.auth, "rounded-xl drop-shadow-xl")} />
        </button>

        <div className="text-center">
          <button
            onClick={handleLogoClick}
            className="group inline-flex items-baseline gap-0 focus:outline-none"
            type="button"
            title="Visitar deeplux.org"
          >
            <span className="text-2xl font-bold text-white tracking-tight">
              Deep
            </span>
            <span className="text-2xl font-bold text-white tracking-tight">
              Lux
            </span>
            <span className="text-lg font-semibold text-sky-400 group-hover:text-sky-300 transition-colors">
              .org
            </span>
          </button>

          <div className="flex items-center justify-center gap-2 mt-1">
            <div className="h-px w-6 bg-gradient-to-r from-transparent to-sky-500/50" />
            <span className="text-xs font-bold tracking-[0.3em] text-sky-400/80 uppercase">
              MED
            </span>
            <div className="h-px w-6 bg-gradient-to-l from-transparent to-sky-500/50" />
          </div>

          {showProduct && (
            <p className="text-sm text-gray-400 mt-1.5 font-medium">
              Expediente <span className="text-gray-500">(DLM)</span>
            </p>
          )}
        </div>
      </div>
    );
  }

  /* ─── Header: horizontal compact (mobile) ─── */
  if (variant === "header") {
    return (
      <button
        onClick={handleLogoClick}
        title="Visitar deeplux.org"
        className={cn(
          "group inline-flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-lg",
          className
        )}
        type="button"
      >
        <LogoIcon className={cn(iconSizes.header, "rounded-md drop-shadow-md flex-shrink-0")} />
        <span className="text-white text-lg font-bold tracking-tight">
          Expediente
          <span className="text-sky-400 font-semibold ml-1 text-sm">DLM</span>
        </span>
      </button>
    );
  }

  /* ─── Full: sidebar expanded (default) ─── */
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      {/* Top row: icon + company name */}
      <button
        onClick={handleLogoClick}
        title="Visitar deeplux.org"
        className="group inline-flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-lg"
        type="button"
      >
        <LogoIcon className={cn(iconSizes.full, "rounded-lg drop-shadow-lg flex-shrink-0")} />
        <div className="flex flex-col items-start min-w-0">
          <span className="inline-flex items-baseline">
            <span className="text-sm font-bold text-white/70 tracking-tight leading-none">
              DeepLux
            </span>
            <span className="text-xs font-semibold text-sky-400/60 group-hover:text-sky-300 transition-colors leading-none">
              .org
            </span>
          </span>
          <span className="text-[9px] font-bold tracking-[0.2em] text-sky-400/50 uppercase leading-tight mt-0.5">
            MED
          </span>
        </div>
      </button>

      {/* Product name — prominently displayed */}
      {showProduct && (
        <div className="pl-[42px] mt-0.5">
          <div className="h-px w-full bg-gradient-to-r from-cyan-500/40 via-sky-400/20 to-transparent mb-1.5" />
          <span className="text-sm font-bold text-white tracking-tight leading-none">
            Expediente
          </span>
          <span className="ml-1.5 text-[10px] font-bold tracking-wider text-cyan-400 bg-cyan-400/10 px-1.5 py-0.5 rounded uppercase">
            DLM
          </span>
        </div>
      )}
    </div>
  );
}

export { LogoIcon };
