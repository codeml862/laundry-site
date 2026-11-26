import { Prisma, type OrderStatus } from "@prisma/client";
import { db } from "@/lib/server/db";
import { nextStatuses } from "@/lib/server/admin";
import { bool, dateField, expect, indiaDate, oneOf, str, type Data } from "@/lib/server/http";
import { hasPermission, requireWorkspaceUser } from "@/lib/server/permissions";

export async function dispatchUser() {
  const user = await requireWorkspaceUser();
  expect(user.role === "RIDER" || hasPermission(user,"pickups"),"You do not have access to pickups.",403);
  return user;
}
type Actor = Awaited<ReturnType<typeof dispatchUser>>;
const view = {rider:true,order:{include:{user:{select:{id:true,name:true,email:true,profile:true}},items:true,payment:{select:{method:true,status:true}}}},history:{orderBy:{createdAt:"asc" as const}}} satisfies Prisma.DispatchRequestInclude;
export async function listDispatch(request:Request,user:Actor) {
  const query = new URL(request.url).searchParams;
  const page = Math.max(1,Math.min(100000,Number(query.get("page")) || 1));
  expect(Number.isInteger(page),"Choose a valid page.");
  const tab = oneOf(query.get("tab") || "all",["all","pickup","delivery","transit","completed"],"filter");
  const search = str(query.get("search") || "","search",100,true);
  const date = query.get("date") ? dateField(query.get("date"),"schedule date") : undefined;
  const scope:Prisma.DispatchRequestWhereInput = user.role === "RIDER" ? {rider:{userId:user.id}} : {};
  const where:Prisma.DispatchRequestWhereInput = {...scope,...(date ? {date} : {}),...(tab === "pickup" || tab === "delivery" ? {kind:tab.toUpperCase()} : tab === "transit" ? {status:"IN_TRANSIT"} : tab === "completed" ? {status:"COMPLETED"} : {}),...(search ? {OR:[{orderId:{contains:search,mode:"insensitive"}},{order:{user:{name:{contains:search,mode:"insensitive"}}}},{rider:{name:{contains:search,mode:"insensitive"}}},...(["line1","city","postalCode"].map(field=>({order:{address:{path:[field],string_contains:search,mode:"insensitive" as const}}})))]} : {})};
  const today = indiaDate();
  const [rows,total,requests,pickups,deliveries,transit,completed,riders,activity,orders,accounts,settings,selected] = await Promise.all([
    db.dispatchRequest.findMany({where,include:view,orderBy:[{date:"asc"},{slot:"asc"},{id:"asc"}],skip:(page-1)*15,take:15}),db.dispatchRequest.count({where}),
    db.dispatchRequest.count({where:scope}),db.dispatchRequest.count({where:{...scope,kind:"PICKUP",date:today,status:{not:"CANCELLED"}}}),db.dispatchRequest.count({where:{...scope,kind:"DELIVERY",date:today,status:{not:"CANCELLED"}}}),db.dispatchRequest.count({where:{...scope,status:"IN_TRANSIT"}}),db.dispatchRequest.count({where:{...scope,status:"COMPLETED"}}),
    db.dispatchRider.findMany({where:user.role === "RIDER" ? {userId:user.id} : {},include:{user:{select:{active:true,role:true}},_count:{select:{requests:{where:{status:{in:["ASSIGNED","IN_TRANSIT"]}}}}}},orderBy:{name:"asc"}}),
    db.dispatchEvent.findMany({where:{request:scope},include:{request:{select:{orderId:true,kind:true}}},orderBy:{createdAt:"desc"},take:12}),
    user.role === "RIDER" ? [] : db.order.findMany({where:{status:{in:["ORDER_PLACED","PICKUP_SCHEDULED","READY","OUT_FOR_DELIVERY"]}},select:{id:true,status:true,pickupDate:true,pickupSlot:true,deliveryDate:true,deliverySlot:true,user:{select:{name:true}},dispatchRequests:{select:{kind:true,status:true}}},orderBy:{createdAt:"desc"},take:200}),
    user.role === "RIDER" ? [] : db.user.findMany({where:{role:"RIDER",active:true},select:{id:true,name:true,email:true},orderBy:{name:"asc"}}),db.settings.findUnique({where:{id:1},select:{slots:true}}),
    query.get("id") ? db.dispatchRequest.findFirst({where:{...scope,id:str(query.get("id"),"request",100)},include:view}) : null,
  ]);
  return {rows,total,page,stats:{requests,pickups,deliveries,transit,completed},riders,activity,orders,accounts,slots:settings?.slots ?? [],selected};
}
export async function mutateDispatch(input:Data,user:Actor) {
  const action = oneOf(input.action,["schedule","rider","assign","progress"],"dispatch action");
  expect(user.role !== "RIDER" || action === "progress","Riders can only update their own assigned requests.",403);
  if(action === "rider") {
    const id = str(input.id,"rider",100,true), name = str(input.name,"rider name",80), phone = str(input.phone,"rider phone",25), userId = str(input.userId,"rider account",100,true) || null;
    expect(/^\+?[\d ()-]{10,25}$/.test(phone) && phone.replace(/\D/g,"").length >= 10,"Enter a valid rider phone.");
    const active = bool(input.active,"rider availability");
    return db.$transaction(async tx=>{
      if(userId) expect(await tx.user.findFirst({where:{id:userId,role:"RIDER",active:true},select:{id:true}}),"Choose an active rider account.");
      if(id && !active) expect(await tx.dispatchRequest.count({where:{riderId:id,status:{in:["ASSIGNED","IN_TRANSIT"]}}}) === 0,"Reassign active requests before disabling this rider.",409);
      return id ? tx.dispatchRider.update({where:{id},data:{name,phone,userId,active}}) : tx.dispatchRider.create({data:{name,phone,userId,active}});
    },{isolationLevel:"Serializable"});
  }
  return db.$transaction(async tx=>{
    async function sync(order:{id:string;status:OrderStatus;payment:{method:string;status:string}|null},status:OrderStatus) {
      if(order.status === status) return;
      expect(nextStatuses[order.status].includes(status),"The order is not ready for this dispatch step. Update the order workflow first.",409);
      expect(order.payment?.method !== "RAZORPAY" || order.payment.status === "PAID","Online payment must be confirmed before fulfilling the order.",409);
      const changed = await tx.order.updateMany({where:{id:order.id,status:order.status},data:{status}});
      expect(changed.count === 1,"This order changed. Refresh and retry.",409);
      await tx.orderHistory.create({data:{orderId:order.id,status,actorId:user.id}});
    }
    if(action === "schedule") {
      const orderId = str(input.orderId,"order",100), kind = oneOf(input.kind,["PICKUP","DELIVERY"],"request type"), date = dateField(input.date,"schedule date"), slot = str(input.slot,"time slot",30);
      expect(date >= indiaDate(),"Choose today or a future date.");
      const settings = await tx.settings.findUnique({where:{id:1}});
      expect(settings?.slots.includes(slot),"Choose a configured time slot.");
      expect(new Date(`${date}T${slot.slice(0,5)}:00+05:30`).getTime() > Date.now(),"Choose a time slot that has not started in India.");
      const order = await tx.order.findUnique({where:{id:orderId},include:{payment:true}});
      expect(order,"Order not found.",404);
      expect(kind === "PICKUP" ? ["ORDER_PLACED","PICKUP_SCHEDULED"].includes(order.status) : ["READY","OUT_FOR_DELIVERY"].includes(order.status),"The order is not eligible for this schedule.",409);
      expect(order.payment?.method !== "RAZORPAY" || order.payment.status === "PAID","Online payment must be confirmed before scheduling fulfilment.",409);
      const existing = await tx.dispatchRequest.findUnique({where:{orderId_kind:{orderId,kind}}});
      expect(!existing || ["PENDING","ASSIGNED","CANCELLED"].includes(existing.status),"This request has already started. It cannot be rescheduled.",409);
      if(kind === "PICKUP" && order.status === "ORDER_PLACED") await sync(order,"PICKUP_SCHEDULED");
      await tx.order.update({where:{id:orderId},data:kind === "PICKUP" ? {pickupDate:date,pickupSlot:slot} : {deliveryDate:date,deliverySlot:slot}});
      const status = existing?.status === "ASSIGNED" ? "ASSIGNED" : "PENDING";
      return tx.dispatchRequest.upsert({where:{orderId_kind:{orderId,kind}},create:{orderId,kind,date,slot,history:{create:{status,note:"Request scheduled",actorId:user.id}}},update:{date,slot,status,...(status === "PENDING" ? {riderId:null} : {}),history:{create:{status,note:"Request rescheduled",actorId:user.id}}}});
    }
    const id = str(input.id,"request",100);
    const record = await tx.dispatchRequest.findFirst({where:{id,...(user.role === "RIDER" ? {rider:{userId:user.id,active:true}} : {})},include:{order:{include:{payment:true}},rider:true}});
    expect(record,"Request not found.",404);
    if(action === "assign") {
      expect(["PENDING","ASSIGNED"].includes(record.status),"Only pending requests can be assigned.",409);
      const riderId = str(input.riderId,"rider",100,true) || null;
      if(riderId) expect(await tx.dispatchRider.findFirst({where:{id:riderId,active:true,OR:[{userId:null},{user:{active:true,role:"RIDER"}}]}}),"Choose an active rider.");
      const status = riderId ? "ASSIGNED" : "PENDING";
      await tx.dispatchRequest.update({where:{id},data:{riderId,status,history:{create:{status,note:riderId ? "Rider assigned" : "Rider unassigned",actorId:user.id}}}});
    } else {
      const status = oneOf(input.status,["IN_TRANSIT","COMPLETED","CANCELLED"],"request status");
      expect(status === "CANCELLED" ? user.role !== "RIDER" && ["PENDING","ASSIGNED"].includes(record.status) : status === "IN_TRANSIT" ? record.status === "ASSIGNED" && record.rider?.active : record.status === "IN_TRANSIT","This request cannot move to that status.",409);
      expect(record.order.status !== "CANCELLED","The customer order has been cancelled.",409);
      expect(status === "CANCELLED" || record.order.payment?.method !== "RAZORPAY" || record.order.payment.status === "PAID","Online payment must be confirmed before fulfilment.",409);
      if(record.kind === "PICKUP" && status === "IN_TRANSIT") expect(record.order.status === "PICKUP_SCHEDULED","Order is no longer awaiting pickup.",409);
      if(record.kind === "PICKUP" && status === "COMPLETED") await sync(record.order,"PICKED_UP");
      if(record.kind === "DELIVERY" && status === "IN_TRANSIT") await sync(record.order,"OUT_FOR_DELIVERY");
      if(record.kind === "DELIVERY" && status === "COMPLETED") await sync(record.order,"DELIVERED");
      const updated = await tx.dispatchRequest.updateMany({where:{id,status:record.status,riderId:record.riderId},data:{status}});
      expect(updated.count === 1,"This request changed. Refresh and retry.",409);
      await tx.dispatchEvent.create({data:{requestId:id,status,note:status === "IN_TRANSIT" ? "Rider started route" : status === "COMPLETED" ? "Request completed" : "Dispatch cancelled; order unchanged",actorId:user.id}});
    }
    return {ok:true};
  },{isolationLevel:"Serializable"});
}
