"use client";

import { Eye, Handshake, Leaf, MapPin, ShieldCheck, ShoppingBasket, Target, Truck } from "lucide-react";
import Image from "next/image";
import { useHomeCatalog } from "@/components/site/catalog-provider";

const values = [
  { icon: Leaf, title: "Quality Care", description: "Gentle and effective cleaning for every fabric." },
  { icon: Handshake, title: "Customer First", description: "Your convenience is our priority." },
  { icon: ShieldCheck, title: "Trust & Safety", description: "Hygienic, secure and reliable service." },
  { icon: Leaf, title: "Sustainability", description: "Working towards a cleaner, greener tomorrow." },
];

export function AboutSection() {
  const settings = useHomeCatalog()?.settings;
  const name = settings?.businessName || "Quicklywash";
  const areaCount = settings?.serviceAreas?.length ?? 0;
  const highlights = [
    { icon: Truck, title: "Doorstep", label: "Pickup & Delivery" },
    { icon: MapPin, title: areaCount ? `${areaCount}` : "Local", label: areaCount === 1 ? "Service Area" : "Service Areas" },
    { icon: ShoppingBasket, title: "Expert", label: "Laundry Care" },
  ];

  return (
    <section id="about" aria-labelledby="about-title" className="relative isolate overflow-hidden bg-[#fcfaf5] py-10 sm:py-16 lg:py-20">
      <div aria-hidden="true" className="pointer-events-none absolute -top-20 -left-24 -z-10 size-72 rounded-full bg-[#e5edbb]/45 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-32 -bottom-32 -z-10 size-80 rounded-full bg-[#dfeab9]/50 blur-3xl" />
      <div className="container">
        <div className="grid overflow-hidden rounded-[2rem] bg-white/40 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="flex flex-col justify-center px-1 pb-5 sm:px-5 sm:pb-8 lg:py-9 lg:pr-8 xl:pr-10">
            <p className="inline-flex w-fit items-center gap-2 rounded-full bg-[#e7eeaa] px-5 py-2 text-sm font-bold text-[#143c16] sm:text-base">
              <Leaf className="size-5" aria-hidden="true" /> About {name}
            </p>
            <h2 id="about-title" className="mt-4 text-[2rem] leading-[1.05] font-extrabold tracking-[-0.045em] text-[#101b10] sm:mt-5 sm:text-5xl xl:text-[3.6rem]">
              We Make Laundry<br className="hidden sm:block" /> Life <span className="relative inline-block pb-3 text-[#ff7900] italic">Easier
                <svg aria-hidden="true" viewBox="0 0 250 18" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-3 w-full fill-none stroke-[#ff7900]"><path d="M3 14Q125 -4 247 12" strokeWidth="4" strokeLinecap="round" /></svg>
              </span>
            </h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-[#485048] sm:text-lg">
              {name} is a modern, on-demand laundry service that brings professional cleaning, care and convenience directly to your doorstep.
            </p>
            <ul className="mt-5 grid grid-cols-1 gap-3 min-[400px]:grid-cols-3 min-[400px]:gap-2 sm:mt-7 sm:gap-4 lg:mt-9">
              {highlights.map(({ icon: Icon, title, label }, index) => (
                <li key={label} className={`flex items-center gap-2.5 min-[400px]:flex-col min-[400px]:items-start sm:flex-row sm:items-center lg:flex-col lg:items-start xl:flex-row xl:items-center ${index > 0 ? "min-[400px]:border-l min-[400px]:border-[#e1e4d7] min-[400px]:pl-3" : ""}`}>
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#eff5d2] text-[#39811c]"><Icon className="size-6" strokeWidth={1.8} aria-hidden="true" /></span>
                  <span className="grid gap-0.5"><strong className="text-xl leading-tight font-extrabold tracking-tight text-[#174819]">{title}</strong><span className="text-xs leading-snug text-[#454d43] sm:text-sm">{label}</span></span>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative min-h-56 overflow-hidden rounded-3xl bg-[#e9ecdc] sm:min-h-96 sm:rounded-[2rem] lg:min-h-[460px]">
            <Image src="/images/about-laundry-care.webp" alt="A welcoming laundry care professional holding freshly folded white and green towels" fill sizes="(min-width: 1024px) 52vw, 100vw" className="object-cover object-[center_45%]" />
          </div>
        </div>
        <div className="mt-5 grid gap-5 sm:mt-8 sm:gap-8 lg:grid-cols-[0.85fr_1fr_1.15fr] lg:items-stretch lg:gap-7 xl:gap-9">
          <div className="relative min-h-44 overflow-hidden rounded-3xl bg-[#e8eddf] sm:min-h-72 sm:rounded-[1.75rem]">
            <Image src="/images/hero-basket.webp" alt="Freshly folded towels in a wicker laundry basket beside a green plant" fill sizes="(min-width: 1024px) 30vw, 100vw" className="object-cover" />
          </div>
          <div className="grid content-center gap-5 sm:grid-cols-2 sm:gap-8 lg:grid-cols-1 lg:gap-9">
            <div className="flex items-start gap-4">
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[#edf5ce] text-[#39811c]"><Target className="size-8" strokeWidth={1.8} aria-hidden="true" /></span>
              <div><h3 className="text-2xl font-extrabold tracking-tight text-[#142013]">Our Mission</h3><p className="mt-1.5 text-sm leading-relaxed text-[#485048] sm:text-base">To deliver high-quality, hassle-free laundry service with care, consistency and convenience.</p></div>
            </div>
            <div className="flex items-start gap-4">
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[#edf5ce] text-[#39811c]"><Eye className="size-8" strokeWidth={1.8} aria-hidden="true" /></span>
              <div><h3 className="text-2xl font-extrabold tracking-tight text-[#142013]">Our Vision</h3><p className="mt-1.5 text-sm leading-relaxed text-[#485048] sm:text-base">To become India’s most trusted and customer-loved laundry brand.</p></div>
            </div>
          </div>
          <div className="border-t border-[#d7e1c9] pt-7 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-7 xl:pl-9">
            <h3 className="text-2xl font-extrabold tracking-tight text-[#174819]">Our Core Values</h3>
            <ul className="mt-4 grid gap-x-5 gap-y-4 sm:mt-5 sm:grid-cols-2 sm:gap-y-6 lg:gap-x-3 lg:gap-y-7">
              {values.map(({ icon: Icon, title, description }) => (
                <li key={title} className="flex items-start gap-3 lg:flex-col xl:flex-row">
                  <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#f0f5d8] text-[#39811c]"><Icon className="size-7" strokeWidth={1.8} aria-hidden="true" /></span>
                  <div><h4 className="text-base font-bold tracking-tight text-[#172015]">{title}</h4><p className="mt-1 text-sm leading-snug text-[#485048]">{description}</p></div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
