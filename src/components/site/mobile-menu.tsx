"use client";

import { ArrowRight, ChevronRight, Menu } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Brand } from "@/components/site/brand";
import { navigation } from "@/components/site/navigation";

export function MobileMenu({ actions }: { actions: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="outline"
            size="icon-lg"
            className="size-11 rounded-full border-border bg-white/80 text-foreground shadow-xs hover:bg-accent hover:text-primary lg:hidden"
            aria-label="Open navigation"
          />
        }
      >
        <Menu className="size-5" />
      </SheetTrigger>
      <SheetContent
        side="right"
        className="gap-0 border-l-border bg-white p-0 data-[side=right]:w-[88vw] sm:max-w-sm"
        onClick={(event) => {
          if (event.target instanceof Element && event.target.closest("a")) setOpen(false);
        }}
      >
        <SheetHeader className="shrink-0 gap-1 border-b border-border px-4 pt-5 pb-4 sm:px-5">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Brand className="mr-7 [&>span:first-child]:size-9 [&>span:last-child>span:first-child]:text-lg sm:[&>span:first-child]:size-11 sm:[&>span:last-child>span:first-child]:text-[1.45rem]" />
          <SheetDescription className="pt-2">Laundry pickup &amp; delivery, on your schedule.</SheetDescription>
        </SheetHeader>

        <nav aria-label="Mobile navigation" className="grid min-h-0 gap-1 overflow-y-auto p-3">
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group flex min-h-12 items-center gap-3 rounded-xl px-3 text-[0.95rem] font-medium text-foreground transition-colors hover:bg-accent hover:text-primary"
            >
              <span className="grid size-9 place-items-center rounded-lg bg-secondary text-primary transition-colors group-hover:bg-white">
                <Icon className="size-[18px]" aria-hidden="true" />
              </span>
              {label}
              <ChevronRight className="ml-auto size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
            </Link>
          ))}
        </nav>

        <SheetFooter className="shrink-0 gap-2.5 border-t border-border bg-muted/60 p-4">
          <Link
            href="/book"
            className={cn(buttonVariants(), "h-12 w-full rounded-xl bg-primary text-[0.95rem] font-semibold text-white shadow-[0_8px_20px_#1e7f3a26] hover:bg-primary/90")}
          >
            Book a pickup <ArrowRight aria-hidden="true" />
          </Link>
          <div className="grid grid-cols-2 gap-2.5 [&>a:only-child]:col-span-2">{actions}</div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
