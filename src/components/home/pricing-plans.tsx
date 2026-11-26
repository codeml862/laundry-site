import { ArrowRight, BadgePercent, Check, Clock3, Leaf, ShieldCheck, Shirt, Sparkles, Star, Tag, Truck, WashingMachine } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

const plans = [
  { name: "Regular Laundry", description: "Everyday washing & folding, priced by weight.", price: 60, unit: "kg", from: false, icon: Sparkles, image: "/images/wash-fold.webp", features: ["Wash, Dry & Fold", "Quality Detergent", "Ready in 48 hrs", "Free Pickup & Delivery"], popular: false },
  { name: "Express Laundry", description: "Same care, back the same day.", price: 100, unit: "kg", from: false, icon: WashingMachine, image: "/images/wash-and-iron.webp", features: ["Wash, Dry & Fold", "Priority Processing", "Ready in 3 hrs", "Free Pickup & Delivery"], popular: true },
  { name: "Laundry Bag", description: "One fixed price per bag: Small, Medium or Large.", price: 200, unit: "bag", from: true, icon: Shirt, image: "/images/hero-basket.webp", features: ["Small ₹200 · Medium ₹250 · Large ₹300", "Wash, Dry & Fold", "Ready in 48 hrs", "No Weighing Needed"], popular: false },
];

const benefits = [
  { icon: Truck, label: "Pickup & Delivery" },
  { icon: ShieldCheck, label: "Hygienic Processing" },
  { icon: Leaf, label: "Fabric Friendly" },
  { icon: Clock3, label: "On-Time Delivery" },
  { icon: BadgePercent, label: "Transparent Pricing" },
];

export function PricingPlans() {
  return (
    <>
      <div className="relative isolate pt-2 pb-6 sm:pb-14 lg:py-6">
        <div className="absolute -top-16 right-0 -z-10 hidden h-80 w-[48%] overflow-hidden lg:block">
          <Image src="/images/hero-basket.webp" alt="" fill sizes="45vw" className="object-cover object-center" />
          <div className="absolute inset-0 bg-linear-to-r from-[#fcf9f1] via-[#fcf9f1]/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-[#fcf9f1] to-transparent" />
        </div>
        <p className="inline-flex items-center gap-2 rounded-full bg-[#eaf3d4] px-4 py-2 text-sm font-bold text-[#16451b] sm:text-base">
          <Tag className="size-5" aria-hidden="true" /> Simple &amp; Transparent Pricing
        </p>
        <h2 id="pricing-title" className="mt-4 max-w-3xl text-[2rem] leading-[1.08] font-extrabold tracking-[-0.045em] text-[#092d10] sm:text-5xl lg:text-6xl">
          Our Pricing <span className="text-[#ff7900] underline decoration-3 underline-offset-8">Plans</span>
        </h2>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:mt-5 sm:text-lg">
          Choose the service that fits your needs. No hidden charges, just clean and fresh clothes.
        </p>
      </div>

      <div className="grid gap-7 lg:grid-cols-3 lg:gap-5">
        {plans.map(({ name, description, price, unit, from, icon: Icon, image, features, popular }) => (
          <article key={name} className={cn("relative flex min-w-0 flex-col overflow-visible rounded-3xl border bg-white p-5 shadow-[0_8px_24px_#243b1712] sm:rounded-[1.75rem] sm:p-7", popular ? "border-[#68ac1d] bg-linear-to-b from-[#f5fbe8] to-white ring-1 ring-[#68ac1d]" : "border-[#e6ebd9]")}>
            {popular && <span className="absolute -top-4 right-5 inline-flex items-center gap-1.5 rounded-full bg-[#ff7900] px-4 py-1.5 text-sm font-bold text-white"><Star className="size-4" aria-hidden="true" /> Most Popular</span>}
            <div className="flex items-center gap-3">
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[#edf6d8] text-[#3c8f12]"><Icon className="size-8" strokeWidth={1.7} aria-hidden="true" /></span>
              <div><h3 className="text-xl font-extrabold tracking-tight text-[#123b17] xl:text-2xl">{name}</h3><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>
            </div>
            <p className="my-4 flex flex-wrap items-baseline gap-x-2 font-extrabold tracking-tight text-[#103615] sm:my-5">{from && <span className="text-base sm:text-xl">From</span>}<span className="text-4xl sm:text-5xl">₹{price}</span><span className="whitespace-nowrap text-lg sm:text-xl">/ {unit}</span></p>
            <div className="relative flex flex-1 flex-col overflow-hidden border-t border-[#dfe5d8] pt-5">
              <div aria-hidden="true" className="pointer-events-none absolute -right-7 bottom-0 h-48 w-40 opacity-25 [mask-image:linear-gradient(to_right,transparent,black)]">
                <Image src={image} alt="" fill sizes="160px" className="object-cover" />
              </div>
              <ul className="relative grid gap-2.5 text-sm text-[#374139] sm:text-base">
                {features.map((feature) => <li key={feature} className="flex items-start gap-2.5"><Check className="mt-0.5 size-4 shrink-0 rounded-full bg-[#55a50c] p-0.5 text-white" strokeWidth={3} aria-hidden="true" />{feature}</li>)}
              </ul>
              <Link href="/book" aria-label={`Book ${name}`} className={cn("relative mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border text-base font-bold transition-colors focus-visible:outline-offset-4", popular ? "border-[#ff7900] bg-[#ff7900] text-white hover:bg-[#e66d00]" : "border-[#33862b] bg-white/90 text-[#15521c] hover:bg-[#edf6d8]")}>Book Now <ArrowRight className="size-5" aria-hidden="true" /></Link>
            </div>
          </article>
        ))}
      </div>

      <ul className="mt-5 grid grid-cols-2 gap-x-3 gap-y-4 rounded-3xl bg-white/75 p-4 shadow-[0_8px_24px_#243b170c] sm:mt-8 sm:grid-cols-3 sm:gap-x-5 sm:gap-y-6 sm:p-6 lg:grid-cols-5 lg:rounded-full">
        {benefits.map(({ icon: Icon, label }) => <li key={label} className="flex min-w-0 items-center gap-2 text-sm font-bold text-[#203523] sm:gap-3 lg:justify-center"><Icon className="size-6 shrink-0 text-[#398323] sm:size-8" strokeWidth={1.7} aria-hidden="true" />{label}</li>)}
      </ul>
    </>
  );
}
