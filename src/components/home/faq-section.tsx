"use client";

import { ArrowRight, MessageCircleQuestion } from "lucide-react";
import Link from "next/link";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useHomeCatalog } from "@/components/site/catalog-provider";
import { WhatsAppLink } from "@/components/site/whatsapp-link";

const rupees = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export function FaqSection() {
  const settings = useHomeCatalog()?.settings;
  const minimum = settings?.minimum ? rupees.format(settings.minimum / 100) : "";

  const questions = [
    {
      question: "How do I book a pickup?",
      answer: "Add the services you need, sign in, then choose your pickup address, date and time slot. You’ll see the full price before you confirm.",
    },
    {
      question: "What’s the difference between Regular and Express?",
      answer: "Both include washing, drying and folding. Regular is ready in about 48 hours. Express gets priority processing and is ready in about 3 hours, at a higher per-kg rate.",
    },
    {
      question: "How is my laundry priced?",
      answer: `Laundry is charged per kilogram, weighed at our facility. You can also choose a Laundry bag at one fixed price for Small, Medium or Large. Items like ironing, dry cleaning and shoe cleaning are priced per item.${minimum ? ` The minimum order is ${minimum}.` : ""}`,
    },
    {
      question: "Is pickup and delivery free?",
      answer: "Any pickup or delivery fee is shown in your order summary before you confirm, so there are no surprises at the door.",
    },
    {
      question: "How can I pay?",
      answer: "Pay with cash on delivery, or online by UPI, card or netbanking where available. Your payment status is always visible in your account.",
    },
    {
      question: "Can I leave care instructions?",
      answer: "Yes. Add notes about stains, delicate fabrics or anything else in the instructions field when you book. Please empty all pockets before pickup.",
    },
    {
      question: "Can I change or cancel my booking?",
      answer: "Yes, before your items are picked up. Contact support from your account and we’ll update or cancel it for you.",
    },
  ];

  return (
    <section id="faq" aria-labelledby="faq-title" className="bg-[#f5f8f6] py-10 sm:py-20 lg:py-24">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold tracking-[0.12em] text-primary uppercase">FAQs</p>
          <h2 id="faq-title" className="mt-3 text-[2rem] leading-[1.1] font-extrabold tracking-[-0.04em] text-foreground sm:text-[2.5rem]">
            Frequently asked questions
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">Quick answers about pickups, pricing and payments.</p>
        </div>

        <Accordion defaultValue={[questions[0].question]} className="mx-auto mt-6 max-w-3xl rounded-2xl border border-border bg-white px-4 sm:mt-10 sm:px-8">
          {questions.map(({ question, answer }) => (
            <AccordionItem key={question} value={question} className="border-b border-border last:border-b-0">
              <AccordionTrigger className="gap-3 py-4 text-left text-base font-semibold text-foreground hover:text-primary hover:no-underline sm:gap-4 sm:py-5 sm:text-[1.05rem]">
                {question}
              </AccordionTrigger>
              <AccordionContent className="pr-8 pb-5 text-[0.95rem] leading-relaxed text-muted-foreground">
                {answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="mx-auto mt-6 flex max-w-3xl flex-col gap-4 rounded-2xl border border-border bg-white p-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#ecf6ee] text-primary"><MessageCircleQuestion className="size-5" aria-hidden="true" /></span>
            <div>
              <p className="font-semibold text-foreground">Still have a question?</p>
              <p className="text-sm text-muted-foreground">Our team usually replies within a few hours.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/account?tab=support" className="group inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary/90">
              Contact support <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
            <WhatsAppLink className="h-10" />
          </div>
        </div>
      </div>
    </section>
  );
}
