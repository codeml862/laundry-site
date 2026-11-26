import { ArrowRight, CircleCheck, PackageCheck, ShoppingBag, Truck, WashingMachine } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const steps = [
  {
    icon: ShoppingBag,
    image: "/images/laundry-hero.webp",
    title: "Book online",
    description: "Choose your services, a saved address and a pickup slot. See the total before you confirm.",
  },
  {
    icon: Truck,
    image: "/images/home-linens.webp",
    title: "We pick it up",
    description: "Hand over your bag at your door in the slot you chose. Add notes for anything delicate.",
  },
  {
    icon: WashingMachine,
    image: "/images/wash-fold.webp",
    title: "Cleaned with care",
    description: "Washed, dried, ironed or dry cleaned, then quality checked before it leaves us.",
  },
  {
    icon: PackageCheck,
    image: "/images/press-care.webp",
    title: "Delivered fresh",
    description: "Your laundry comes back to your door, folded or pressed and ready to put away.",
  },
];

/* Mirrors the order statuses customers see in their account. */
const timeline = ["Order placed", "Picked up", "Washing", "Ironing", "Quality check", "Out for delivery", "Delivered"];
const current = 3;

export function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-title" className="bg-[#f5fcf7] py-10 sm:py-20 lg:py-24">
      <div className="container">
        <div className="flex flex-col gap-4 sm:gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <Badge variant="secondary" className="h-7 rounded-full bg-white px-3 text-xs font-bold tracking-[0.08em] text-primary uppercase ring-1 ring-border">
              How it works
            </Badge>
            <h2 id="how-title" className="mt-4 text-[2.1rem] leading-[1.08] font-extrabold tracking-[-0.045em] text-foreground sm:text-[2.6rem] lg:text-5xl">
              Fresh laundry in <span className="text-primary">four simple steps.</span>
            </h2>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-lg">
              No laundromat trips and no waiting around. Book in a minute and follow every stage from your account.
            </p>
          </div>
          <Link
            href="/book"
            className={cn(
              buttonVariants(),
              "group h-12 shrink-0 self-start rounded-full bg-(--cta) px-6 text-base font-semibold text-white shadow-[0_12px_30px_#f37a1f40] hover:bg-(--cta-hover) md:self-auto",
            )}
          >
            Book a pickup
            <ArrowRight className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </div>

        <ol className="mt-6 grid gap-4 sm:mt-10 sm:grid-cols-2 sm:gap-5 lg:mt-12 lg:grid-cols-4 lg:gap-6">
          {steps.map(({ icon: Icon, image, title, description }) => (
            <li
              key={title}
              className="group relative flex flex-col overflow-hidden rounded-3xl border border-border bg-white shadow-[0_2px_8px_#1f2a2208] transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_22px_44px_#1f2a2217]"
            >
              <div className="relative aspect-[16/7] overflow-hidden bg-secondary sm:aspect-[16/11]">
                <Image
                  src={image}
                  alt=""
                  fill
                  sizes="(max-width: 639px) calc(100vw - 40px), (max-width: 1023px) 45vw, 290px"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                />
              </div>

              <div className="relative flex flex-1 flex-col p-5 pt-8">
                <span className="absolute -top-6 right-5 grid size-12 place-items-center rounded-2xl bg-primary text-white shadow-[0_10px_24px_#1e7f3a55] ring-4 ring-white">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="text-lg font-bold tracking-[-0.02em] text-foreground">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
              </div>
            </li>
          ))}
        </ol>

        {/* Order tracking preview */}
        <div className="mt-5 min-w-0 rounded-3xl border border-border bg-white p-4 sm:mt-8 sm:p-6 lg:mt-10 lg:flex lg:items-center lg:gap-10 lg:p-8">
          <div className="shrink-0 lg:w-56">
            <p className="text-sm font-semibold text-primary">Live order tracking</p>
            <p className="mt-1 text-lg font-bold tracking-[-0.02em] text-foreground">Always know where your laundry is.</p>
          </div>

          <ol aria-label="Example order progress" className="mt-5 flex flex-1 gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] lg:mt-0">
            {timeline.map((label, index) => {
              const done = index < current;
              const active = index === current;
              return (
                <li key={label} className="grid min-w-[6.25rem] flex-1 gap-2">
                  <span
                    className={cn(
                      "h-1.5 rounded-full",
                      done && "bg-primary",
                      active && "bg-[linear-gradient(90deg,var(--color-primary)_50%,#e2f2f6_50%)]",
                      !done && !active && "bg-[#e2f6e8]",
                    )}
                  />
                  <span className={cn("inline-flex items-center gap-1 text-xs font-semibold whitespace-nowrap", done || active ? "text-foreground" : "text-muted-foreground/70", active && "text-primary")}>
                    {done && <CircleCheck className="size-3.5 text-primary" aria-hidden="true" />}
                    {label}
                  </span>
                </li>
              );
            })}
          </ol>

          <Link href="/account" className="mt-5 inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-primary hover:underline lg:mt-0">
            Track my order <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
