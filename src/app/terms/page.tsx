import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/site/legal-page";
import { pageSeo } from "@/lib/seo";

export const metadata: Metadata = pageSeo("Terms of Service", "The terms that apply when you book laundry pickup, cleaning and delivery with Quicklywash.", "/terms");

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="26 November 2026"
      intro={<>
        <p>These Terms of Service (“Terms”) govern your use of the Quicklywash website, customer account and laundry pickup, cleaning and delivery services (together, the “Services”). “Quicklywash”, “we”, “us” and “our” refer to the business operating the Services. “You” refers to the person using the Services or placing a booking.</p>
        <p>By creating an account or placing a booking, you agree to these Terms. If you do not agree, please do not use the Services.</p>
      </>}
      sections={[
        {
          heading: "1. Eligibility and your account",
          body: <>
            <p>You must be at least 18 years old, or use the Services with the consent of a parent or guardian, and provide accurate information when you register.</p>
            <ul>
              <li>Keep your login details confidential. You are responsible for activity carried out through your account.</li>
              <li>Keep your name, phone number and addresses up to date so we can complete pickups and deliveries.</li>
              <li>We may suspend or close accounts that are used fraudulently, abusively or in breach of these Terms.</li>
            </ul>
          </>,
        },
        {
          heading: "2. Our services",
          body: <>
            <p>We collect garments and household textiles from your chosen address, clean them according to the service you select, and return them to you. Services currently include:</p>
            <ul>
              <li><strong>Laundry (Regular)</strong>: wash, dry and fold, charged per kilogram, with an estimated turnaround of 48 hours.</li>
              <li><strong>Laundry (Express)</strong>: the same service with priority processing, charged per kilogram, with an estimated turnaround of 3 hours.</li>
              <li><strong>Laundry bag</strong>: a fixed price per bag in Small, Medium or Large.</li>
              <li>Item services such as ironing, dry cleaning and shoe cleaning, charged per item.</li>
            </ul>
            <p>Service availability, prices and turnaround times are shown on the website and at checkout, and may change. The price confirmed in your order applies to that order.</p>
          </>,
        },
        {
          heading: "3. Bookings and pickup",
          body: <ul>
            <li>A booking is confirmed when it appears in your account with an order number.</li>
            <li>Pickups are made in the date and time slot you choose. Please make the items available at the address provided during that slot.</li>
            <li>If we cannot collect the items because no one is available or the address cannot be reached, we may reschedule or cancel the booking.</li>
            <li>A minimum order value applies, as shown at checkout. Orders below the minimum cannot be placed.</li>
          </ul>,
        },
        {
          heading: "4. Prices, weight and payment",
          body: <>
            <ul>
              <li>Prices are listed in Indian Rupees (₹) and include any taxes shown at checkout.</li>
              <li>For services charged per kilogram, the final amount is based on the weight measured at our facility. If it differs from the quantity you booked, we will update the order total before delivery.</li>
              <li>You can pay by cash on delivery where offered, or online through our payment partner, Razorpay. Online payments are subject to Razorpay’s terms.</li>
              <li>Cash on delivery orders must be paid in full when the items are returned.</li>
              <li>Coupon codes must be applied at checkout, cannot be exchanged for cash and are subject to their stated conditions and expiry dates.</li>
            </ul>
          </>,
        },
        {
          heading: "5. Turnaround and delivery",
          body: <>
            <p>Turnaround times are estimates that begin once items are collected. Delays can occur because of order volume, weather, public holidays, special care requirements or events outside our control. We will keep you informed through your account.</p>
            <p>Delivery is made to the address on the order. Please check your items at the time of delivery or as soon as possible afterwards.</p>
          </>,
        },
        {
          heading: "6. Cancellations and changes",
          body: <ul>
            <li>You may cancel or change a booking before the items are picked up by contacting support from your account.</li>
            <li>Once items have been collected and processing has started, the order cannot be cancelled.</li>
            <li>Where an online payment is refunded, it is returned to the original payment method. Processing times depend on your bank or payment provider.</li>
          </ul>,
        },
        {
          heading: "7. Your responsibilities",
          body: <ul>
            <li>Check all pockets and remove cash, jewellery, cards, documents, electronics and other valuables before pickup. We are not responsible for items left in garments.</li>
            <li>Tell us about delicate fabrics, stains or special care needs in the booking instructions.</li>
            <li>Do not include items that are hazardous, contaminated with chemicals or bodily fluids, or unlawful. We may refuse or return such items without processing.</li>
          </ul>,
        },
        {
          heading: "8. Garment care",
          body: <>
            <p>We follow care labels and standard cleaning practices. Some natural changes can occur during normal cleaning and are not treated as damage, including:</p>
            <ul>
              <li>colour fading or bleeding from fabrics that are not colour-fast;</li>
              <li>minor shrinkage, or wear on items that are old or already weakened;</li>
              <li>stains that cannot be removed without risking damage to the fabric;</li>
              <li>damage to buttons, sequins, prints or decorations that are not suitable for washing.</li>
            </ul>
            <p>Items without a care label are cleaned using the method we consider most suitable, at your risk.</p>
          </>,
        },
        {
          heading: "9. Damage or missing items",
          body: <ul>
            <li>Report any damaged or missing item through support within 48 hours of delivery, with photos where possible.</li>
            <li>We will investigate each claim fairly. Where we are responsible, we may re-clean the item, repair it, or offer compensation.</li>
            <li>Compensation for any single item is limited to ten (10) times the service charge for that item, unless a higher value was declared and accepted by us in writing before pickup.</li>
          </ul>,
        },
        {
          heading: "10. Unclaimed items",
          body: "If items cannot be delivered and are not collected within 30 days of the completed order, despite reasonable attempts to contact you, we may donate or dispose of them.",
        },
        {
          heading: "11. Limitation of liability",
          body: <>
            <p>To the extent permitted by law, our total liability for any order is limited to the amount set out in section 9. We are not liable for indirect or consequential losses, such as loss of use or loss of opportunity, arising from the Services.</p>
            <p>Nothing in these Terms limits any rights you have under applicable consumer protection law that cannot be excluded.</p>
          </>,
        },
        {
          heading: "12. Privacy",
          body: <p>We use your personal information to provide the Services, as described in our <Link href="/privacy" className="font-semibold text-primary underline underline-offset-2">Privacy Policy</Link>.</p>,
        },
        {
          heading: "13. Changes to these Terms",
          body: "We may update these Terms from time to time. The updated version will be posted on this page with a new “Last updated” date. Bookings made before a change are governed by the Terms in effect when the booking was placed.",
        },
        {
          heading: "14. Governing law",
          body: "These Terms are governed by the laws of India. Any dispute will be subject to the jurisdiction of the courts in the city where Quicklywash provides the Services to you.",
        },
        {
          heading: "15. Contact us",
          body: <p>For questions about these Terms, or to raise a concern about an order, contact us through <Link href="/account?tab=support" className="font-semibold text-primary underline underline-offset-2">Support in your account</Link> or the contact details shown in the website footer.</p>,
        },
      ]}
    />
  );
}
