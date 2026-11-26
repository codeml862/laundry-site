import { changeCustomer, changeStatus, orderView, saveCoupon, saveService, saveSettings, uploadImage } from "@/lib/server/admin";
import { checkPassword, hashPassword, limit, passwordValue, requireUser, token, userFields } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { refundOrder } from "@/lib/server/gateway";
import { api, body, emailValue, expect, oneOf, str } from "@/lib/server/http";
import { dispatchEmail, notify } from "@/lib/server/mail";
import { adminSnapshot } from "@/lib/server/admin-snapshot";
import { requirePermission, requireWorkspaceUser } from "@/lib/server/permissions";

export const GET = api(async(request)=>{
  const user = await requireWorkspaceUser();
  const query = new URL(request.url).searchParams;
  if (query.has("orderId")) {
    await requirePermission("orders");
    const order = await db.order.findUnique({where:{id:str(query.get("orderId"),"order",100)},include:orderView});
    expect(order,"Order not found.",404);
    return {order};
  }
  if (query.has("customerId")) {
    await requirePermission("customers");
    const record = await db.user.findFirst({where:{id:str(query.get("customerId"),"customer",100),role:"CUSTOMER"},select:{id:true,name:true,email:true,verified:true,createdAt:true,addresses:true,profile:true,_count:{select:{orders:true}}}});
    expect(record,"Customer not found.",404);
    const {profile,_count,...customer} = record;
    return {customer:{...customer,phone:profile?.phone ?? "",orderCount:_count.orders}};
  }
  return adminSnapshot(user);
});
const actions = ["createCustomer","profile","status","service","coupon","settings","customer","customerAddress","ticket","enquiry","refund","payment"] as const;
export const POST = api(async(request)=>{
  const user = await requireWorkspaceUser();
  await limit(`operations:${user.id}`,100,5);
  if (request.headers.get("content-type")?.startsWith("multipart/form-data")) {
    await requirePermission(["services","pricing"]);
    expect(user.role !== "RIDER","You do not have access to this action.",403);
    return uploadImage(request);
  }
  const input = await body(request);
  const action = oneOf(input.action,actions,"operations action");
  if (action !== "profile") {
    expect(user.role !== "RIDER","You do not have access to this action.",403);
    if (action === "settings") await requireUser(["ADMIN"],true);
    else if (action === "status") await requirePermission(["orders","pickups"]);
    else if (action === "service") await requirePermission(["services","pricing"]);
    else if (action === "refund" || action === "payment") await requirePermission("payments");
    else if (["customer","customerAddress","createCustomer"].includes(action)) await requirePermission("customers");
    else if (action === "coupon") await requirePermission("coupons");
    else if (action === "ticket" || action === "enquiry") await requirePermission("support");
  }
  switch(action) {
    case "createCustomer": {
      const name = str(input.name,"name",80);
      const email = emailValue(input.email);
      const phone = str(input.phone,"phone",25,true);
      expect(!phone || /^\+?[\d ()-]{10,25}$/.test(phone),"Enter a valid phone number.");
      const existing = await db.user.findUnique({where:{email},select:{id:true}});
      expect(!existing,"This email address is already in use.",409);
      const customer = await db.user.create({data:{name,email,passwordHash:await hashPassword(token()),role:"CUSTOMER",verified:false,profile:{create:{phone}}},select:{id:true}});
      return {customer};
    }
    case "profile": {
      const name = str(input.name,"name",80);
      const email = emailValue(input.email);
      const phone = typeof input.phone === "string" ? input.phone.trim().slice(0,24) : "";
      let passwordHash: string | undefined;
      if (input.newPassword !== undefined) {
        const next = passwordValue(input.newPassword);
        const stored = await db.user.findUnique({where:{id:user.id},select:{passwordHash:true}});
        expect(typeof input.currentPassword === "string" && await checkPassword(input.currentPassword, stored?.passwordHash),"Your current password is incorrect.",400);
        passwordHash = await hashPassword(next);
      }
      const updated = await db.$transaction(async (tx) => {
        const owner = await tx.user.findUnique({where:{email},select:{id:true}});
        expect(!owner || owner.id === user.id,"This email address is already in use.",409);
        // Only the authenticated administrator can edit their own identity.
        const account = await tx.user.update({where:{id:user.id},data:{name,email,...(passwordHash ? {passwordHash} : {})},select:userFields});
        await tx.profile.upsert({where:{userId:user.id},create:{userId:user.id,phone},update:{phone}});
        // Links issued to the previous address must not change this account later.
        if (email !== user.email) await tx.authToken.deleteMany({where:{userId:user.id}});
        return account;
      },{isolationLevel:"Serializable"});
      return {user:{...updated,phone}};
    }
    case "status": await changeStatus(input,user); break;
    case "service": await saveService(input); break;
    case "coupon": await saveCoupon(input); break;
    case "settings": await saveSettings(input); break;
    case "customer": await changeCustomer(input,false); break;
    case "customerAddress": await changeCustomer(input,true); break;
    case "ticket": {
      await db.ticket.update({where:{id:str(input.id,"support request",100)},data:{status:oneOf(input.status,["OPEN","RESOLVED"],"ticket status")}});
      break;
    }
    case "enquiry": {
      await db.enquiry.update({where:{id:str(input.id,"enquiry",100)},data:{status:oneOf(input.status,["NEW","HANDLED"],"enquiry status")}});
      break;
    }
    case "refund": await refundOrder(str(input.orderId,"order",100)); break;
    case "payment": {
      const orderId = str(input.orderId,"order",100);
      const result = await db.$transaction(async(tx)=>{
        const payment = await tx.payment.findUnique({where:{orderId},include:{order:{select:{status:true,userId:true}}}});
        expect(payment?.method === "COD" && ["OUT_FOR_DELIVERY","DELIVERED"].includes(payment.order.status),"COD can be collected during or after delivery.",409);
        if (payment.status === "PAID") return;
        const changed = await tx.payment.updateMany({where:{orderId,status:"PENDING"},data:{status:"PAID"}});
        expect(changed.count === 1,"This payment cannot be marked collected.",409);
        return notify(tx,payment.order.userId,"Payment confirmed",`Cash payment for order ${orderId} was recorded.`,orderId+":paid");
      },{isolationLevel:"Serializable"});
      if (result) await dispatchEmail(result.id);
      break;
    }
  }
  return {ok:true};
});
