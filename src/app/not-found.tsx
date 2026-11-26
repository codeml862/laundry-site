import type { Metadata } from "next";
import { ArrowRight, Home, Leaf, Search, Shirt, Sparkles, WashingMachine } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page Not Found",
  description: "This page seems to have slipped out of the laundry basket. Head home or explore our laundry services.",
};

export default function NotFound() {
  return (
    <main id="main-content" className="relative isolate overflow-hidden bg-[#f6faf4] py-14 sm:py-20">
      <div aria-hidden="true" className="pointer-events-none absolute -top-32 -right-28 -z-10 size-96 rounded-full bg-[#e4efcd] blur-3xl" />
      <div className="container flex min-h-[60vh] flex-col items-center justify-center text-center">
        <p className="inline-flex items-center gap-2 rounded-full border border-[#dce9d1] bg-white px-4 py-2 text-sm font-semibold text-primary"><Search className="size-4" aria-hidden="true" /> Page not found</p>
        <div aria-hidden="true" className="relative my-7 flex items-center gap-2 text-[7rem] leading-none font-extrabold tracking-[-0.07em] text-[#174825] sm:gap-4 sm:text-[10rem]">
          <span>4</span>
          <span className="relative grid size-28 place-items-center rounded-[1.75rem] border-2 border-[#bfdbaf] bg-white shadow-[0_16px_40px_#25532315] sm:size-36 sm:rounded-[2rem]">
            <WashingMachine className="size-20 text-primary sm:size-24" strokeWidth={1.25} />
            <Sparkles className="absolute -top-4 -right-4 size-9 text-[#f37a1f]" />
          </span>
          <span>4</span>
          <Shirt className="absolute -bottom-5 -left-4 size-9 -rotate-12 text-[#6e9b57] sm:-left-14 sm:size-12" strokeWidth={1.5} />
          <Leaf className="absolute -right-3 bottom-0 size-8 rotate-12 text-[#6e9b57] sm:-right-12 sm:size-10" strokeWidth={1.5} />
        </div>
        <h1 className="mt-4 max-w-xl text-3xl leading-tight font-extrabold tracking-tight text-[#123b20] sm:text-5xl">Oops! This page got<br className="hidden sm:block" /> lost in the wash.</h1>
        <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">We couldn’t find the page you’re looking for. Let’s get you back to fresh starts and clean clothes.</p>
        <div className="mt-8 flex w-full max-w-md flex-col justify-center gap-3 sm:flex-row">
          <Link href="/" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-(--cta) px-6 font-semibold text-white transition-colors hover:bg-(--cta-hover)"><Home className="size-4" aria-hidden="true" /> Back to Home</Link>
          <Link href="/services" className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-primary/40 bg-white px-6 font-semibold text-primary transition-colors hover:bg-secondary">Explore Services <ArrowRight className="size-4" aria-hidden="true" /></Link>
        </div>
        <p className="mt-7 text-sm text-muted-foreground">Need a hand? <Link href="/#contact" className="font-semibold text-primary underline underline-offset-4">Contact our team</Link></p>
      </div>
    </main>
  );
}
