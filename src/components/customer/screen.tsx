import type { ReactNode } from "react";
import { Spinner } from "@/components/customer/ui";

/** Page shell for simple customer pages (booking, auth fallbacks): soft background + heading. */
export function CustomerScreen({ eyebrow, title, description, children }: {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <main id="main-content" className="min-h-[70vh] overflow-x-clip bg-[#f5f8f6]">
      <div className="container py-6 sm:py-12 lg:py-14">
        <header className="mb-6 max-w-2xl sm:mb-8">
          {eyebrow && <p className="mb-3 hidden sm:inline-flex rounded-full bg-[#e3f1e6] px-4 py-1.5 text-sm font-semibold text-primary">{eyebrow}</p>}
          <h1 className="text-[1.9rem] leading-[1.08] font-extrabold tracking-[-0.04em] text-foreground sm:text-[2.6rem]">{title}</h1>
          {description && <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:mt-3 sm:text-lg">{description}</p>}
        </header>
        {children}
      </div>
    </main>
  );
}

export function Loading({ message = "Loading…" }: { message?: string }) {
  return <Spinner message={message} />;
}
