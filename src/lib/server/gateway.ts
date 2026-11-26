import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/server/db";
import { ApiError, expect } from "@/lib/server/http";
import { dispatchEmail, notify } from "@/lib/server/mail";

export function validSignature(message: string, signature: string, secret: string) {
  if (!/^[a-fA-F0-9]{64}$/.test(signature)) return false;
  return timingSafeEqual(createHmac("sha256",secret).update(message).digest(),Buffer.from(signature,"hex"));
}
export async function gateway<T>(path: string, data?: object, idempotencyKey?: string) {
  const {RAZORPAY_KEY_ID:key,RAZORPAY_KEY_SECRET:secret} = process.env;
  expect(key && secret,"Online payments are unavailable.",503);
  const response = await fetch("https://api.razorpay.com/v1"+path,{
    method:data ? "POST" : "GET",headers:{
      Authorization:"Basic "+Buffer.from(key+":"+secret).toString("base64"),
      "Content-Type":"application/json",
      ...(idempotencyKey ? {"X-Refund-Idempotency":idempotencyKey} : {}),
    },body:data ? JSON.stringify(data) : undefined,cache:"no-store",signal:AbortSignal.timeout(12_000)
  }).catch(()=>{throw new ApiError("Could not reach the payment provider. Try again.",502);});
  expect(response.ok,"The payment provider could not complete this request.",502);
  return await response.json() as T;
}
export async function openPayment(orderId: string, userId: string) {
  expect(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET,"Online payments are unavailable.",503);
  const payment = await db.payment.findFirst({where:{orderId,order:{userId}},include:{order:{select:{status:true}}}});
  expect(payment?.method === "RAZORPAY" && payment.order.status !== "CANCELLED" && payment.status === "PENDING","This order has no pending online payment.",409);
  if (payment.externalOrderId) return {key:process.env.RAZORPAY_KEY_ID,orderId:payment.externalOrderId,amount:payment.amount,currency:"INR"};
  const now = new Date();
  const claimed = await db.payment.updateMany({where:{orderId,externalOrderId:null,status:"PENDING",order:{status:{not:"CANCELLED"}},OR:[{operationAt:null},{operationAt:{lt:new Date(Date.now()-30_000)}}]},data:{operationAt:now}});
  expect(claimed.count === 1,"Payment setup is already in progress. Please retry shortly.",409);
  try {
    type ExternalOrder = {id:string;amount:number;currency:string;receipt:string};
    const previous = await gateway<{items:ExternalOrder[]}>("/orders?receipt="+encodeURIComponent(orderId));
    const external = previous.items.find(item=>item.receipt === orderId)
      ?? await gateway<ExternalOrder>("/orders",{amount:payment.amount,currency:"INR",receipt:orderId});
    expect(external.amount === payment.amount && external.currency === "INR" && external.receipt === orderId,"Payment order could not be matched.",502);
    await db.payment.update({where:{orderId},data:{externalOrderId:external.id}});
    return {key:process.env.RAZORPAY_KEY_ID,orderId:external.id,amount:payment.amount,currency:"INR"};
  } finally {
    await db.payment.updateMany({where:{orderId,operationAt:now},data:{operationAt:null}});
  }
}
export type ProviderPayment = {id:string;order_id:string;amount:number;currency:string;status:string};
export async function recordCaptured(payment: ProviderPayment) {
  expect(payment.status === "captured" && payment.currency === "INR","Payment capture is still pending. Please check again shortly.",409);
  const result = await db.$transaction(async (tx) => {
    const stored = await tx.payment.findUnique({where:{externalOrderId:payment.order_id},include:{order:{select:{userId:true}}}});
    expect(stored?.amount === payment.amount && stored.method === "RAZORPAY","Payment does not match this order.");
    if (stored.externalPaymentId === payment.id) return;
    const changed = await tx.payment.updateMany({where:{orderId:stored.orderId,status:"PENDING"},data:{status:"PAID",externalPaymentId:payment.id}});
    expect(changed.count === 1,"This order already has a payment.",409);
    return notify(tx,stored.order.userId,"Payment confirmed",`Online payment for order ${stored.orderId} was received. Check your account for pickup and order details.`,stored.orderId+":paid");
  },{isolationLevel:"Serializable"});
  if (result) await dispatchEmail(result.id);
}
export type ProviderRefund = {id:string;payment_id:string;amount:number;currency:string;status:string;notes?:{attempt?:string}};
export async function recordRefund(refund: ProviderRefund) {
  if (refund.currency !== "INR" || !["failed","processed","pending"].includes(refund.status)) return;
  const attempt = refund.notes?.attempt;
  const match = attempt ? {OR:[{refundId:refund.id},{refundId:null,refundAttempt:attempt}]} : {refundId:refund.id};
  await db.payment.updateMany({
    where:{...match,externalPaymentId:refund.payment_id,amount:refund.amount,status:"REFUND_PENDING",order:{status:"CANCELLED"}},
    data:refund.status === "failed" ? {status:"PAID",refundId:null,refundAttempt:null} :
      {refundId:refund.id,status:refund.status === "processed" ? "REFUNDED" : "REFUND_PENDING"},
  });
}
export async function refundOrder(orderId: string) {
  const payment = await db.payment.findUnique({where:{orderId},include:{order:{select:{status:true}}}});
  expect(payment?.method === "RAZORPAY" && payment.order.status === "CANCELLED" && payment.externalPaymentId,"Only cancelled online orders with a captured payment can be refunded.",409);
  if (payment.status === "REFUNDED") return;
  expect(payment.status === "PAID" || payment.status === "REFUND_PENDING","Payment is not eligible for a refund.",409);
  let refund: ProviderRefund;
  if (payment.refundId) {
    refund = await gateway<ProviderRefund>("/refunds/"+encodeURIComponent(payment.refundId));
  } else {
    const attempt = payment.refundAttempt ?? randomUUID();
    if (!payment.refundAttempt) {
      const saved = await db.payment.updateMany({where:{orderId,status:"PAID",refundAttempt:null},data:{status:"REFUND_PENDING",refundAttempt:attempt}});
      expect(saved.count === 1,"A refund attempt is already changing. Refresh and retry.",409);
    }
    refund = await gateway<ProviderRefund>(`/payments/${encodeURIComponent(payment.externalPaymentId)}/refund`,{amount:payment.amount,notes:{orderId,attempt}},attempt);
    refund = {...refund,notes:{attempt}};
  }
  expect(refund.payment_id === payment.externalPaymentId && refund.amount === payment.amount && refund.currency === "INR","Refund details do not match this order.",502);
  await recordRefund(refund);
  expect(refund.status !== "failed","Razorpay reported a failed refund. You can retry the request.",502);
}
