import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/site/legal-page";
import { pageSeo } from "@/lib/seo";

export const metadata: Metadata = pageSeo("Privacy Policy", "How Quicklywash collects, uses and protects your personal information.", "/privacy");

const link = "font-semibold text-primary underline underline-offset-2";

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="26 November 2026"
      intro={<>
        <p>This Privacy Policy explains how Quicklywash (“we”, “us”, “our”) collects, uses, shares and protects your personal information when you use our website, customer account and laundry pickup and delivery services (the “Services”).</p>
        <p>We process personal data in accordance with applicable Indian law, including the Digital Personal Data Protection Act, 2023 and the Information Technology Act, 2000. By using the Services, you agree to the practices described here.</p>
      </>}
      sections={[
        {
          heading: "1. Information we collect",
          body: <>
            <p><strong>Information you give us</strong></p>
            <ul>
              <li>Account details: your name, email address, password (stored only in encrypted, hashed form) and phone number.</li>
              <li>Pickup and delivery addresses, including address labels and contact numbers.</li>
              <li>Order details: services chosen, quantities, pickup and delivery slots, special care instructions, coupons used and reviews you leave.</li>
              <li>Messages you send to our support team.</li>
            </ul>
            <p><strong>Information collected automatically</strong></p>
            <ul>
              <li>Sign-in session information stored in a secure cookie so you stay logged in.</li>
              <li>Technical information such as your IP address, used to protect accounts against misuse (for example, limiting repeated sign-in attempts).</li>
              <li>Items in your cart, saved in your browser or account so they are kept between visits.</li>
            </ul>
            <p><strong>Information from others</strong></p>
            <ul>
              <li>If you sign in with Google, we receive your name and verified email address from Google.</li>
              <li>If you pay online, our payment partner Razorpay tells us whether the payment succeeded and gives us a transaction reference. We do not receive or store your full card, UPI or bank details.</li>
            </ul>
          </>,
        },
        {
          heading: "2. How we use your information",
          body: <ul>
            <li>To create and manage your account and verify your email address.</li>
            <li>To schedule pickups and deliveries, process your laundry and complete your orders.</li>
            <li>To calculate prices, apply coupons, take payment and issue refunds.</li>
            <li>To send order updates, pickup reminders, password reset links and other service messages.</li>
            <li>To answer support requests and handle complaints or claims.</li>
            <li>To keep the Services secure, prevent fraud and enforce our <Link href="/terms" className={link}>Terms of Service</Link>.</li>
            <li>To improve our services using order history and feedback.</li>
            <li>To meet legal, tax and accounting obligations.</li>
          </ul>,
        },
        {
          heading: "3. Who we share it with",
          body: <>
            <p>We do not sell your personal information. We share it only where needed to provide the Services:</p>
            <ul>
              <li><strong>Our team and riders</strong>: staff see the order details they need, and riders see the name, phone number and address for the pickups and deliveries assigned to them.</li>
              <li><strong>Service providers</strong> that operate on our behalf, such as hosting and database providers, email delivery, payment processing (Razorpay) and sign-in (Google). They may use the data only to provide their service to us.</li>
              <li><strong>Authorities</strong>, where required by law, court order or to protect the rights, safety or property of our customers, our staff or the public.</li>
            </ul>
          </>,
        },
        {
          heading: "4. Cookies",
          body: "We use essential cookies to keep you signed in and to secure sign-in with Google. These are required for the Services to work. We do not use advertising cookies.",
        },
        {
          heading: "5. How long we keep it",
          body: <ul>
            <li>Account and address details are kept while your account is active.</li>
            <li>Order and payment records are kept for as long as required for tax, accounting and legal purposes.</li>
            <li>Sign-in sessions expire after a period of inactivity, and one-time links (such as password resets) expire after a short time.</li>
            <li>When information is no longer needed, we delete or anonymise it.</li>
          </ul>,
        },
        {
          heading: "6. How we protect it",
          body: "Your connection to the Services is encrypted (HTTPS). Passwords are stored only as secure hashes, access to customer data is limited to team members who need it for their role, and sign-in attempts are rate-limited. No system is completely secure, but we work to protect your information and will act promptly if a breach affects you, including notifying you and the authorities where the law requires.",
        },
        {
          heading: "7. Your rights",
          body: <>
            <p>Subject to applicable law, you can:</p>
            <ul>
              <li>access the personal information we hold about you;</li>
              <li>correct or update it; most details can be changed directly in your account;</li>
              <li>ask us to delete your information, unless we must keep it for legal reasons;</li>
              <li>withdraw consent where we rely on it, which may affect our ability to provide the Services;</li>
              <li>nominate another person to exercise these rights on your behalf;</li>
              <li>raise a grievance with us, and if it is not resolved, with the Data Protection Board of India.</li>
            </ul>
            <p>To make a request, contact us using the details below. We may need to verify your identity before acting on it.</p>
          </>,
        },
        {
          heading: "8. Children",
          body: "The Services are intended for adults. We do not knowingly collect personal information from children under 18 without the consent of a parent or guardian.",
        },
        {
          heading: "9. Changes to this policy",
          body: "We may update this Privacy Policy from time to time. The updated version will be posted on this page with a new “Last updated” date. If changes are significant, we will let you know through the website or by email.",
        },
        {
          heading: "10. Contact and grievances",
          body: <p>For privacy questions, requests or complaints, contact us through <Link href="/account?tab=support" className={link}>Support in your account</Link> or the email address shown in the website footer. We aim to respond within 30 days.</p>,
        },
      ]}
    />
  );
}
