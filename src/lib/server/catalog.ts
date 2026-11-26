import { db } from "@/lib/server/db";
import { expect, object, str } from "@/lib/server/http";
import type { Prisma, Service } from "@prisma/client";

export const razorpayConfigured = () => Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
export async function getSettings(tx: Prisma.TransactionClient = db) {
  const settings = await tx.settings.findUnique({where:{id:1}});
  expect(settings,"The laundry catalog is being set up. Please try again soon.",503);
  return {...settings,onlinePayments:settings.onlinePayments && razorpayConfigured()};
}
export function requestedItems(value: unknown, allowEmpty = false) {
  expect(Array.isArray(value) && value.length <= 30 && (allowEmpty || value.length > 0), "Choose at least one service (maximum 30).");
  const ids = new Set<string>();
  return value.map((raw) => {
    const item = object(raw);
    const serviceId = str(item.serviceId,"service",100);
    const quantity = item.quantity;
    expect(typeof quantity === "number" && Number.isFinite(quantity) && quantity >= 0.25 && quantity <= 200 && Number.isInteger(quantity*4), "Enter a valid quantity in quarter-unit increments.");
    expect(!ids.has(serviceId), "Each service may appear once in the cart.");
    ids.add(serviceId);
    return {serviceId,quantity};
  });
}
export async function pricedItems(tx: Prisma.TransactionClient, requested: ReturnType<typeof requestedItems>) {
  const services = await tx.service.findMany({where:{active:true,id:{in:requested.map(({serviceId})=>serviceId)}}});
  const byId = new Map<string,Service>(services.map((service)=>[service.id,service]));
  return requested.map(({serviceId,quantity}) => {
    const service = byId.get(serviceId);
    expect(service, "A selected service is no longer available. Update your cart.",409);
    expect(service.unit === "KG" || Number.isInteger(quantity), `Choose a whole-number quantity for ${service.name}.`);
    expect(service.unit !== "FIXED" || quantity === 1, `Only one ${service.name} service can be booked per order.`);
    return {serviceId,name:service.name,price:service.price,unit:service.unit,quantity,hours:service.hours};
  });
}
export async function quote(tx: Prisma.TransactionClient, requested: ReturnType<typeof requestedItems>, couponCode: string) {
  const items = await pricedItems(tx,requested);
  const settings = await getSettings(tx);
  const subtotal = items.reduce((total,item)=>total+Math.round(item.price*item.quantity),0);
  expect(subtotal <= 10_000_000,"For orders over ₹1,00,000, contact support.");
  const coupon = couponCode ? await tx.coupon.findUnique({where:{code:couponCode.toUpperCase()},include:{_count:{select:{uses:true}}}}) : null;
  if (couponCode) {
    expect(coupon?.active && (!coupon.expiresAt || coupon.expiresAt > new Date()) && (coupon.limit === null || coupon._count.uses < coupon.limit), "This coupon is unavailable or expired.");
    expect(subtotal >= coupon.minimum, "Your order does not meet this coupon's minimum.");
  }
  const discount = coupon ? Math.min(subtotal,coupon.kind === "FIXED" ? coupon.value : Math.round(subtotal*coupon.value/100)) : 0;
  const deliveryFee = settings.deliveryFee;
  const tax = Math.round((subtotal-discount+deliveryFee)*settings.taxBps/10_000);
  return {amounts:{subtotal,discount,deliveryFee,tax,total:subtotal-discount+deliveryFee+tax},coupon,items,settings};
}
