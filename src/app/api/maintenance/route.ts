import { limit } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { api, expect, indiaDate } from "@/lib/server/http";
import { dispatchEmail, notify } from "@/lib/server/mail";
import { timingSafeEqual } from "node:crypto";

export const GET = api(async(request)=>{
  const secret = process.env.CRON_SECRET;
  const supplied = Buffer.from(request.headers.get("authorization") ?? "");
  const valid = secret ? Buffer.from("Bearer "+secret) : null;
  expect(valid && supplied.length === valid.length && timingSafeEqual(supplied,valid),"Unauthorized.",401);
  await limit("maintenance",1,2);
  const tomorrow = indiaDate(new Date(Date.now()+86_400_000));
  const upcoming = await db.order.findMany({
    where:{pickupDate:tomorrow,status:{in:["ORDER_PLACED","PICKUP_SCHEDULED"]},payment:{is:{OR:[{method:"COD"},{status:"PAID"}]}}},
    select:{id:true,userId:true,pickupSlot:true},
  });
  for (const order of upcoming) {
    await notify(db,order.userId,"Pickup reminder",`Order ${order.id} is scheduled for pickup tomorrow (${order.pickupSlot}).`,order.id+":reminder");
  }
  const queued = await db.notification.findMany({where:{emailedAt:null,user:{verified:true}},select:{id:true},orderBy:{createdAt:"asc"},take:30});
  await Promise.all(queued.map(({id})=>dispatchEmail(id)));
  const now = new Date();
  await db.$transaction([
    db.rateLimit.deleteMany({where:{expiresAt:{lt:now}}}),
    db.authToken.deleteMany({where:{expiresAt:{lt:now}}}),
    db.session.deleteMany({where:{expiresAt:{lt:now}}})
  ]);
  return {reminders:upcoming.length,emailQueueProcessed:queued.length};
},false);
