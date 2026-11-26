import { AboutSection } from "@/components/home/about-section";
import { AtAGlance } from "@/components/home/at-a-glance";
import { ContactSection } from "@/components/home/contact-section";
import { FaqSection } from "@/components/home/faq-section";
import { Hero } from "@/components/home/hero";
import { HowItWorks } from "@/components/home/how-it-works";
import { PriceList } from "@/components/home/price-list";
import { ReviewsSection } from "@/components/home/reviews-section";
import { ServicesSection } from "@/components/home/services-section";
import { pageSeo, siteDescription, siteName } from "@/lib/seo";

export const metadata = pageSeo(siteName, siteDescription, "/");

export default function HomePage() {
  return (
    <>
      <main id="main-content">
        <Hero />

        <AtAGlance />

        <ServicesSection />

        <HowItWorks />

        <AboutSection />

        <PriceList />

        <ReviewsSection />

        <FaqSection />

        <ContactSection />
      </main>
    </>
  );
}

