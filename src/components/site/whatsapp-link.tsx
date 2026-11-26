"use client";

import { MessageCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useHomeCatalog } from "@/components/site/catalog-provider";

/** WhatsApp chat button, shown only when a contact phone is set in business settings. */
export function WhatsAppLink({ className }: { className?: string }) {
  const phone = useHomeCatalog()?.settings?.contactPhone?.replace(/\D/g, "");
  if (!phone || phone.length < 10) return null;
  const number = phone.length === 10 ? "91" + phone : phone;

  return (
    <a
      href={`https://wa.me/${number}`}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        buttonVariants({ variant: "outline" }),
        "h-11 rounded-full border-emerald-200 bg-white/80 px-4 font-semibold text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800",
        className,
      )}
    >
      <MessageCircle className="size-[18px]" aria-hidden="true" /> Chat on WhatsApp
    </a>
  );
}
