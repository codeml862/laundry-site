import { limit, requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { gateway, openPayment, recordCaptured, validSignature, type ProviderPayment } from "@/lib/server/gateway";
import { api, body, expect, oneOf, str } from "@/lib/server/http";

export const POST = api(async (request)=>{
  const user = await requireUser(["CUSTOMER"],true);
  const input = await body(request);
  const action = oneOf(input.action,["retry","verify"],"payment action");
  const orderId = str(input.orderId,"order",100);
  await limit(`payment:${user.id}`,20,15);
  if (action === "retry") return {razorpay:await openPayment(orderId,user.id)};
  const providerOrder = str(input.razorpay_order_id,"payment order",100);
  const providerPayment = str(input.razorpay_payment_id,"payment reference",100);
  const signature = str(input.razorpay_signature,"payment signature",64);
  const stored = await db.payment.findFirst({where:{orderId,order:{userId:user.id},method:"RAZORPAY"},select:{externalOrderId:true}});
  expect(stored?.externalOrderId === providerOrder,"Payment does not match this order.",404);
  const secret = process.env.RAZORPAY_KEY_SECRET;
  expect(secret && validSignature(providerOrder+"|"+providerPayment,signature,secret),"The payment signature is invalid.");
  const payment = await gateway<ProviderPayment>("/payments/"+encodeURIComponent(providerPayment));
  expect(payment.id === providerPayment && payment.order_id === providerOrder,"Payment does not match this order.");
  await recordCaptured(payment);
  return {ok:true};
});
