"use client";

import { Sparkles, WashingMachine } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useHomeCatalog } from "@/components/site/catalog-provider";

/** Logo + name. `light` is for dark backgrounds such as the footer. */
export function Brand({ className, light = false, compact = false }: { className?: string; light?: boolean; compact?: boolean }) {
  const settings = useHomeCatalog()?.settings;
  const name = settings?.businessName || "Quicklywash";
  const logo = settings?.logo;
  const [failedLogo, setFailedLogo] = useState<string>();
  const showLogo = logo && failedLogo !== logo;

  return (
    <Link
      className={cn("group inline-flex shrink-0 items-center gap-2.5 leading-none", className)}
      href="/"
      aria-label={`${name} home`}
    >
      <span
        className={cn(
          "relative grid size-11 shrink-0 place-items-center rounded-2xl transition-transform duration-300 group-hover:-rotate-6",
          showLogo ? "overflow-hidden bg-transparent" : light ? "bg-white/10 text-white ring-1 ring-white/20" : "bg-secondary text-primary ring-1 ring-primary/15",
        )}
        aria-hidden="true"
      >
        {showLogo
          ? <Image src={logo} width={44} height={44} alt="" className="size-full object-contain" unoptimized referrerPolicy="no-referrer" onError={() => setFailedLogo(logo)} />
          : <>
              <WashingMachine size={24} strokeWidth={2} />
              <Sparkles className={cn("absolute -top-1.5 -right-1.5 size-5", light ? "text-white" : "text-primary")} strokeWidth={2} />
            </>}
      </span>
      <span className={compact ? "sr-only" : "grid gap-1"}>
        <span className={cn("pr-1 text-[1.45rem] font-extrabold tracking-[-0.04em] whitespace-nowrap italic", light ? "text-white" : "text-primary")}>{name}</span>
        <span className={cn("text-xs font-semibold tracking-wide", light ? "text-white/70" : "text-foreground/80")}>Laundry. Simplified.</span>
      </span>
    </Link>
  );
}

