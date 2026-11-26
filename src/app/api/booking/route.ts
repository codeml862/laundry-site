import { limit, requireUser } from "@/lib/server/auth";
import { quote, requestedItems } from "@/lib/server/catalog";
import { db } from "@/lib/server/db";
import { openPayment } from "@/lib/server/gateway";
import { api, ApiError, body, dateField, expect, indiaDate, integer, oneOf, str } from "@/lib/server/http";
import { dispatchEmail, notify } from "@/lib/server/mail";
import { requirePermission } from "@/lib/server/permissions";

export const POST = api(async (request)=>{
  const input = await body(request);
  const action = oneOf(input.action,["quote","create","adminCreate"],"booking action");
  const items = requestedItems(input.items);
  const coupon = str(input.coupon,"coupon",40,true);
  if (action === "quote") return (await quote(db,items,coupon)).amounts;
  const actor = action === "adminCreate" ? await requirePermission("orders") : await requireUser(["CUSTOMER"],true);
  const customer = action === "adminCreate" ? await db.user.findFirst({where:{id:str(input.userId,"customer",100),role:"CUSTOMER",active:true},select:{id:true}}) : actor;
  expect(customer,"Select an active customer.",404);
  const user = customer;
  const method = oneOf(input.method,["COD","RAZORPAY"],"payment method");
  expect(action !== "adminCreate" || method === "COD","Admin orders use cash on delivery.");
  const pickupDate = dateField(input.pickupDate,"pickup date");
  const deliveryDate = input.deliveryDate ? dateField(input.deliveryDate,"delivery date") : null;
  const requestId = str(input.requestId,"booking reference",100,true) || null;
  const addressId = str(input.addressId,"pickup address",100);
  await limit(`booking:${actor.id}`,12,15);
  const result = await db.$transaction(async (tx)=>{
    const existing = requestId ? await tx.order.findUnique({where:{userId_requestId:{userId:user.id,requestId}},include:{payment:true}}) : null;
    if (existing) return {order:existing,notification:null};
    const priced = await quote(tx,items,coupon);
    const {settings,amounts} = priced;
    if (input.expectedTotal !== undefined) {
      expect(amounts.total === integer(input.expectedTotal,"quoted total",0,50_000_000),"Your price changed. Review the updated total before booking again.",409);
    }
    expect(amounts.subtotal >= settings.minimum,"Your cart does not meet the minimum order amount.");
    expect(method === "COD" ? settings.cod : settings.onlinePayments,"Choose an available payment method.");
    expect(method !== "RAZORPAY" || amounts.total === 0 || amounts.total >= 100,"Online payment requires at least ₹1. Choose another payment method.");
    const today = indiaDate();
    expect(pickupDate >= today && pickupDate <= indiaDate(new Date(Date.now()+60*86_400_000)),"Choose a pickup date within the next 60 days.");
    const pickupSlot = oneOf(input.pickupSlot,settings.slots,"pickup slot");
    const slotStart = /^(\d{2}:\d{2})/.exec(pickupSlot)?.[1];
    const pickupStart = Date.parse(pickupDate+"T"+(slotStart ?? "00:00")+":00+05:30");
    if (slotStart) expect(pickupStart > Date.now(),"Choose a pickup slot that has not started.");
    const deliverySlot = deliveryDate ? oneOf(input.deliverySlot,settings.slots,"delivery slot") : null;
    expect(deliveryDate || !input.deliverySlot,"Choose a delivery date for this slot.");
    if (deliveryDate && deliverySlot) {
      const start = /^(\d{2}:\d{2})/.exec(deliverySlot)?.[1] ?? "00:00";
      const pickupEnd = /[–-](\d{2}:\d{2})$/.exec(pickupSlot)?.[1];
      const pickupComplete = pickupEnd ? Date.parse(pickupDate+"T"+pickupEnd+":00+05:30") : pickupStart;
      const promised = pickupComplete + Math.max(...priced.items.map(item=>item.hours))*3_600_000;
      expect(Date.parse(deliveryDate+"T"+start+":00+05:30") >= promised,"Choose a delivery slot after the estimated turnaround time.");
      expect(deliveryDate <= indiaDate(new Date(Date.now()+90*86_400_000)),"Choose a delivery date within 90 days.");
    }
    const address = await tx.address.findFirst({where:{id:addressId,userId:user.id},select:{label:true,line1:true,line2:true,city:true,postalCode:true,phone:true}});
    expect(address,"Select one of your saved addresses.");
    expect(!settings.serviceAreas.length || settings.serviceAreas.some((area)=>[address.postalCode,address.city.toLowerCase()].includes(area.toLowerCase())),"This address is outside our pickup area.");
    const order = await tx.order.create({data:{
      ...amounts,userId:user.id,requestId,address,pickupDate,pickupSlot,deliveryDate,deliverySlot,
      instructions:str(input.instructions,"instructions",1500,true),
      items:{create:priced.items.map(({serviceId,name,price,unit,quantity})=>({serviceId,name,price,unit,quantity}))},
      history:{create:{status:"ORDER_PLACED",actorId:actor.id}},
      payment:{create:{method,amount:amounts.total,status:amounts.total === 0 ? "PAID" : "PENDING"}},
      ...(priced.coupon ? {couponUsage:{create:{couponId:priced.coupon.id}}} : {}),
    },include:{payment:true}});
    if (action !== "adminCreate") await tx.cartItem.deleteMany({where:{cartId:user.id}});
    const awaitingPayment = method === "RAZORPAY" && amounts.total > 0;
    const notification = await notify(tx,user.id,awaitingPayment ? "Payment pending" : "Booking confirmed",
      awaitingPayment ? `Order ${order.id} was saved. Complete payment to confirm pickup.` :
        `Order ${order.id} was placed for pickup on ${pickupDate} (${pickupSlot}).`,order.id+":placed");
    return {order,notification};
  },{isolationLevel:"Serializable",timeout:10_000});
  if (result.notification) await dispatchEmail(result.notification.id);
  const orderId = result.order.id;
  if (result.order.payment?.method === "RAZORPAY" && result.order.payment.status === "PENDING") {
    try { return {orderId,razorpay:await openPayment(orderId,user.id)}; }
    catch (error) { return {orderId,paymentError:error instanceof ApiError ? error.message : "Payment setup is temporarily unavailable. Retry from your account."}; }
  }
  return {orderId};
});
