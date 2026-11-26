import { db } from "@/lib/server/db";
import { recordCaptured, recordRefund, validSignature, type ProviderPayment, type ProviderRefund } from "@/lib/server/gateway";
import { api, expect, readText } from "@/lib/server/http";

export const POST = api(async(request)=>{
  const content = await readText(request, 100_000);
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  expect(secret && validSignature(content,signature,secret),"Invalid webhook signature.",401);
  const payload = JSON.parse(content) as {
    event:string;
    payload?:{payment?:{entity:ProviderPayment};refund?:{entity:ProviderRefund}};
  };
  if (payload.event === "payment.captured" && payload.payload?.payment) {
    const payment = payload.payload.payment.entity;
    if (await db.payment.findUnique({where:{externalOrderId:payment.order_id},select:{orderId:true}})) await recordCaptured(payment);
  }
  if (["refund.processed","refund.failed"].includes(payload.event) && payload.payload?.refund) {
    const refund = payload.payload.refund.entity;
    await recordRefund({...refund,status:payload.event === "refund.processed" ? "processed" : "failed"});
  }
  return {ok:true};
},false);
