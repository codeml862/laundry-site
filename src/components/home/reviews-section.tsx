"use client";

import { ArrowRight, BadgeCheck, Star } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useHomeCatalog } from "@/components/site/catalog-provider";

const dateFormat = new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" });
const pageSize = 6;

function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span className={cn("inline-flex gap-0.5", className)} role="img" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star key={index} className={cn("size-4", index < Math.round(rating) ? "fill-amber-400 text-amber-400" : "fill-[#e7ece8] text-[#e7ece8]")} aria-hidden="true" />
      ))}
    </span>
  );
}

export function ReviewsSection() {
  const catalog = useHomeCatalog();
  const reviews = catalog?.reviews ?? [];
  const [shown, setShown] = useState(pageSize);
  const average = reviews.length ? reviews.reduce((total, review) => total + review.rating, 0) / reviews.length : 0;
  const happy = reviews.length ? Math.round((reviews.filter((review) => review.rating >= 4).length / reviews.length) * 100) : 0;

  return (
    <section id="reviews" aria-labelledby="reviews-title" className="bg-white py-10 sm:py-20 lg:py-24">
      <div className="container">
        <div className="flex flex-col gap-4 border-b border-border pb-5 sm:gap-6 sm:pb-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <p className="text-sm font-bold tracking-[0.12em] text-primary uppercase">Customer reviews</p>
            <h2 id="reviews-title" className="mt-3 text-[2rem] leading-[1.1] font-extrabold tracking-[-0.04em] text-foreground sm:text-[2.5rem]">
              What our customers say
            </h2>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">Only customers with a delivered order can leave a review.</p>
          </div>
          {reviews.length > 0 && (
            <div className="flex items-center gap-5 md:text-right">
              <div>
                <p className="text-4xl font-extrabold tracking-tight text-foreground">{average.toFixed(1)}<span className="text-lg font-semibold text-muted-foreground">/5</span></p>
                <Stars rating={average} className="mt-1" />
              </div>
              <div className="h-12 w-px bg-border" aria-hidden="true" />
              <div>
                <p className="text-4xl font-extrabold tracking-tight text-foreground">{happy}%</p>
                <p className="mt-1 text-sm text-muted-foreground">rated 4★ or more · {reviews.length} review{reviews.length === 1 ? "" : "s"}</p>
              </div>
            </div>
          )}
        </div>

        {!catalog && (
          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-48 rounded-2xl" />)}
          </div>
        )}

        {catalog && !reviews.length && (
          <div className="mt-5 flex flex-col gap-4 rounded-2xl bg-[#f5f8f6] p-4 sm:mt-8 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div>
              <p className="text-lg font-bold text-foreground">No reviews yet</p>
              <p className="mt-1 max-w-lg text-sm leading-relaxed text-muted-foreground">Reviews appear here after customers receive their orders. Book a pickup and be one of the first to share your experience.</p>
            </div>
            <Link href="/book" className="group inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary/90">
              Book a pickup <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </div>
        )}

        {reviews.length > 0 && (
          <>
            <ul className="mt-8 columns-1 gap-5 sm:columns-2 lg:columns-3">
              {reviews.slice(0, shown).map(({ name, rating, comment, createdAt }, index) => (
                <li key={createdAt + name + index} className="mb-5 break-inside-avoid">
                  <figure className="rounded-2xl border border-border bg-white p-5 transition-colors hover:border-primary/30 sm:p-6">
                    <Stars rating={rating} />
                    <blockquote className="mt-3 text-[0.95rem] leading-relaxed text-foreground">“{comment}”</blockquote>
                    <figcaption className="mt-5 flex items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#ecf6ee] text-sm font-bold text-primary" aria-hidden="true">{name.charAt(0).toUpperCase()}</span>
                      <span className="grid min-w-0">
                        <strong className="truncate text-sm font-semibold text-foreground">{name}</strong>
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><BadgeCheck className="size-3.5 text-primary" aria-hidden="true" /> Verified order · {dateFormat.format(new Date(createdAt))}</span>
                      </span>
                    </figcaption>
                  </figure>
                </li>
              ))}
            </ul>
            {reviews.length > shown && (
              <div className="mt-2 flex justify-center">
                <button type="button" onClick={() => setShown((value) => value + pageSize)} className="inline-flex h-11 items-center rounded-full border border-border bg-white px-6 text-sm font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary">
                  Show more reviews
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
