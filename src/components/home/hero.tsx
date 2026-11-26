import { ArrowRight, CalendarCheck, CalendarDays, Leaf, Truck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HeroCopy } from "@/components/home/hero-copy";

const features = [
  { icon: Truck, title: "Doorstep", detail: "Pickup & Delivery" },
  { icon: Leaf, title: "Premium", detail: "Fabric Care" },
  { icon: CalendarCheck, title: "Scheduled", detail: "Delivery Slots" },
];

export function Hero() {
  return (
    <section aria-labelledby="home-title" className="relative isolate overflow-hidden bg-[#fbfdfb]">
      {/* Photo: right half on large screens, blended into the white background */}
      <div className="absolute inset-y-0 right-0 -z-10 hidden w-[56%] lg:block">
        <Image
          src="/images/hero-basket.webp"
          alt=""
          fill
          sizes="56vw"
          className="object-cover object-[center_60%]"
          preload
        />
        <div className="absolute inset-0 bg-linear-to-r from-[#fbfdfb] via-[#fbfdfb]/40 via-25% to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-linear-to-t from-[#fbfdfb] to-transparent" />
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute -top-48 -left-48 -z-10 size-[34rem] rounded-full bg-[#ecf6ee]/70 blur-3xl" />

      <div className="container grid min-w-0 items-center pt-7 pb-16 sm:pt-14 sm:pb-24 lg:min-h-[min(86vh,720px)] lg:pt-14 lg:pb-28">
        <HeroCopy className="max-w-[40rem]">
          <p className="inline-flex items-center gap-2.5 rounded-full bg-[#ecf6ee] px-5 py-2.5 text-sm font-semibold text-primary sm:text-base">
            <Truck className="size-5" aria-hidden="true" />
            Laundry Pickup &amp; Delivery
          </p>

          <h1
            id="home-title"
            className="mt-5 text-[clamp(2.25rem,11vw,2.9rem)] leading-[1.04] font-extrabold tracking-[-0.04em] text-foreground sm:mt-7 sm:text-6xl lg:text-[4.1rem] xl:text-[4.6rem]"
          >
            Laundry Day?
            <span className="block pr-3 text-primary italic">
              Leave It to{" "}
              <span className="relative inline-block">
                Us.
                <svg
                  viewBox="0 0 220 18"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                  className="absolute -bottom-[0.18em] -left-[60%] h-[0.2em] w-[160%] overflow-visible"
                >
                  <path
                    d="M3 12C60 4 150 3 217 10"
                    className="animate-swash fill-none stroke-(--cta) stroke-[5] [stroke-dasharray:230] [stroke-dashoffset:230] [stroke-linecap:round]"
                  />
                </svg>
              </span>
            </span>
          </h1>

          <p className="mt-5 max-w-[34rem] text-base leading-relaxed text-muted-foreground sm:mt-7 sm:text-xl sm:leading-relaxed">
            Professional laundry care at your doorstep. Book a pickup, relax, and let us take care of your clothes.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:mt-9 sm:flex-row sm:gap-4">
            <Link
              href="/book"
              className={cn(
                buttonVariants({ size: "lg" }),
                "group h-14 rounded-full bg-(--cta) px-7 text-base font-semibold text-white shadow-[0_14px_30px_#f37a1f45] hover:-translate-y-0.5 hover:bg-(--cta-hover) sm:text-lg",
              )}
            >
              <CalendarDays className="size-5" aria-hidden="true" />
              Book a Pickup
              <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
            <Link
              href="/services"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-14 rounded-full border-2 border-primary bg-white/80 px-8 text-base font-semibold text-primary hover:bg-primary hover:text-primary-foreground sm:text-lg",
              )}
            >
              Explore Services
            </Link>
          </div>

          <ul className="mt-7 grid grid-cols-3 items-start gap-2 sm:mt-12 sm:flex sm:flex-nowrap sm:items-center sm:gap-0">
            {features.map(({ icon: Icon, title, detail }, index) => (
              <li key={title} className={cn("flex min-w-0 flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3 sm:pr-6", index > 0 && "sm:border-l-2 sm:border-[#dcebdf] sm:pl-6")}>
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#ecf6ee] text-primary sm:size-12">
                  <Icon className="size-6" aria-hidden="true" />
                </span>
                <span className="grid text-xs leading-snug font-semibold text-foreground sm:text-[0.95rem]">
                  <span>{title}</span>
                  <span>{detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </HeroCopy>
      </div>

      {/* Photo for phones and tablets */}
      <div className="container -mt-10 pb-14 sm:-mt-12 sm:pb-24 lg:hidden">
        <div className="relative aspect-[16/10] overflow-hidden rounded-3xl shadow-[0_24px_60px_#1d211e1f] sm:rounded-[2rem]">
          <Image
            src="/images/hero-basket.webp"
            alt="Folded towels in a laundry basket beside a washing machine"
            fill
            sizes="(max-width: 1023px) calc(100vw - 40px), 1px"
            className="object-cover object-[center_65%]"
          />
        </div>
      </div>
    </section>
  );
}
