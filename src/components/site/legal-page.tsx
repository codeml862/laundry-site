import Link from "next/link";
import type { ReactNode } from "react";
import { btn } from "@/components/customer/ui";

type Section = { heading?: string; body: ReactNode };

/** Plain layout for policy pages such as Privacy and Terms. `body` may be text or paragraphs/lists. */
export function LegalPage({ title, updated, intro, sections }: { title: string; updated?: string; intro?: ReactNode; sections: Section[] }) {
  return (
    <main id="main-content" className="overflow-x-clip bg-[#f5f8f6] py-10 sm:py-16">
      <div className="container">
        <article className="mx-auto max-w-3xl rounded-3xl border border-border bg-white p-5 sm:p-10 lg:p-14">
          <h1 className="text-[2rem] leading-tight font-extrabold tracking-[-0.04em] text-foreground sm:text-5xl">{title}</h1>
          {updated && <p className="mt-3 text-sm text-muted-foreground">Last updated: {updated}</p>}
          {intro && <div className="mt-6 grid gap-3 leading-relaxed text-muted-foreground">{intro}</div>}
          <div className="mt-8 grid gap-8">
            {sections.map(({ heading, body }, index) => (
              <section key={heading ?? index}>
                {heading && <h2 className="text-lg font-bold text-foreground sm:text-xl">{heading}</h2>}
                <div className="mt-2 grid gap-3 leading-relaxed text-muted-foreground [&_li]:pl-1 [&_ul]:grid [&_ul]:list-disc [&_ul]:gap-1.5 [&_ul]:pl-5">
                  {typeof body === "string" ? <p>{body}</p> : body}
                </div>
              </section>
            ))}
          </div>
          <Link className={`${btn.primary} mt-10`} href="/account">Open my account</Link>
        </article>
      </div>
    </main>
  );
}
