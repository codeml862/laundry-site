"use client";

import { post, RequestError } from "@/components/customer/http";

export type PaymentSession = { key: string; orderId: string; amount: number; currency: string };
type PaymentConfirmation = { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string };
type CheckoutOptions = {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefill?: { name?: string; email?: string };
  modal: { ondismiss: () => void };
  handler: (reply: PaymentConfirmation) => void;
  theme: { color: string };
};
type Checkout = { open: () => void };
type RazorpayConstructor = new (options: CheckoutOptions) => Checkout;
type RazorpayWindow = Window & { Razorpay?: RazorpayConstructor };

let scriptLoad: Promise<RazorpayConstructor> | undefined;

function loadCheckout() {
  const paymentWindow = window as RazorpayWindow;
  if (paymentWindow.Razorpay) return Promise.resolve(paymentWindow.Razorpay);
  if (!scriptLoad) {
    scriptLoad = new Promise<RazorpayConstructor>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      const timeout = window.setTimeout(fail, 15000);
      function fail() {
        window.clearTimeout(timeout);
        script.remove();
        scriptLoad = undefined;
        reject(new RequestError("Razorpay checkout could not load. Try paying from your account.", 503));
      }
      script.onload = () => {
        window.clearTimeout(timeout);
        if (paymentWindow.Razorpay) resolve(paymentWindow.Razorpay);
        else fail();
      };
      script.onerror = fail;
      document.head.appendChild(script);
    });
  }
  return scriptLoad;
}

export async function openPayment(session: PaymentSession, orderId: string, user: { name: string; email: string }, businessName = "Quicklywash") {
  const Razorpay = await loadCheckout();
  return new Promise<boolean>((resolve, reject) => {
    let confirming = false;
    const checkout = new Razorpay({
      key: session.key,
      order_id: session.orderId,
      amount: session.amount,
      currency: session.currency,
      name: businessName,
      description: "Laundry pickup",
      prefill: user,
      theme: { color: "#35cd63" },
      modal: { ondismiss: () => { if (!confirming) resolve(false); } },
      handler: (reply) => {
        confirming = true;
        post("/api/payments", { action: "verify", orderId, ...reply }).then(() => resolve(true), reject);
      },
    });
    checkout.open();
  });
}
