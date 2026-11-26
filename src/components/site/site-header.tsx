import { Suspense } from "react";
import { Brand } from "@/components/site/brand";
import { DesktopNav, HeaderShell } from "@/components/site/header-shell";
import { MobileMenu } from "@/components/site/mobile-menu";
import { SiteAccountLinks, SiteAuth } from "@/components/site/site-auth";

function HeaderActions() {
  return (
    <div className="ml-auto flex items-center gap-2 lg:ml-0">
      {/* Tablet and up: account buttons stay visible next to the menu. */}
      <div className="hidden items-center gap-1.5 md:flex">
        <SiteAccountLinks />
      </div>
      <MobileMenu actions={<SiteAccountLinks stacked />} />
    </div>
  );
}

export function SiteHeader() {
  return (
    <HeaderShell>
      <div className="container flex h-[68px] items-center gap-4 md:h-[74px] lg:h-20 lg:gap-6">
        <Brand />
        <DesktopNav />
        <Suspense fallback={<HeaderActions />}>
          <SiteAuth><HeaderActions /></SiteAuth>
        </Suspense>
      </div>
    </HeaderShell>
  );
}
