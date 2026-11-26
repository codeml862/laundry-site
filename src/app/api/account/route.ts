import { checkPassword, hashPassword, limit, passwordValue, requireUser } from "@/lib/server/auth";
import { pricedItems, requestedItems } from "@/lib/server/catalog";
import { db } from "@/lib/server/db";
import { addressFields, api, body, expect, integer, oneOf, str } from "@/lib/server/http";

export const GET = api(async () => {
  const user = await requireUser();
  const [profile,addresses,orders,notifications,tickets,available] = await Promise.all([
    db.profile.findUnique({where:{userId:user.id},select:{phone:true}}),
    db.address.findMany({where:{userId:user.id},orderBy:{id:"desc"}}),
    db.order.findMany({where:{userId:user.id},orderBy:{createdAt:"desc"},include:{
      items:true,history:{orderBy:{createdAt:"asc"}},payment:{select:{method:true,status:true,amount:true}},
      review:{select:{rating:true,comment:true}}
    }}),
    db.notification.findMany({where:{userId:user.id},orderBy:{createdAt:"desc"},take:100}),
    db.ticket.findMany({where:{userId:user.id},orderBy:{createdAt:"desc"}}),
    db.coupon.findMany({where:{active:true,OR:[{expiresAt:null},{expiresAt:{gt:new Date()}}]},include:{_count:{select:{uses:true}}}}),
  ]);
  const coupons = available.filter((coupon)=>coupon.limit === null || coupon._count.uses < coupon.limit)
    .map(({code,kind,value,minimum,expiresAt})=>({code,kind,value,minimum,expiresAt}));
  return {user,profile:profile ?? {phone:""},addresses,orders,notifications,tickets,coupons};
});
const actions = ["profile","password","address","deleteAddress","support","readNotification","readAllNotifications","review","cart"] as const;
export const POST = api(async (request) => {
  const user = await requireUser();
  const input = await body(request);
  const action = oneOf(input.action,actions,"account action");
  if (action === "profile") {
    const name = str(input.name,"name",80);
    const phone = str(input.phone,"phone",25,true);
    expect(!phone || /^\+?[\d ()-]{10,25}$/.test(phone),"Enter a valid phone number.");
    await db.user.update({where:{id:user.id},data:{name,profile:{upsert:{create:{phone},update:{phone}}}}});
  }
  if (action === "password") {
    await limit(`password:${user.id}`,5,15);
    const next = passwordValue(input.newPassword);
    const stored = await db.user.findUnique({where:{id:user.id},select:{passwordHash:true}});
    expect(typeof input.currentPassword === "string" && await checkPassword(input.currentPassword, stored?.passwordHash),"Your current password is incorrect.");
    await db.user.update({where:{id:user.id},data:{passwordHash:await hashPassword(next)}});
  }
  if (action === "readAllNotifications") {
    await db.notification.updateMany({where:{userId:user.id,read:false},data:{read:true}});
  }
  if (action === "address") {
    const data = addressFields(input);
    const id = str(input.id,"address",100,true);
    if (id) {
      const result = await db.address.updateMany({where:{id,userId:user.id},data});
      expect(result.count === 1,"Address not found.",404);
      return {address:{...data,id}};
    }
    const address = await db.address.create({data:{...data,userId:user.id}});
    return {address};
  }
  if (action === "deleteAddress") {
    await db.address.deleteMany({where:{id:str(input.id,"address",100),userId:user.id}});
  }
  if (action === "support") {
    await limit(`support:${user.id}`,8,60);
    await db.ticket.create({data:{userId:user.id,subject:str(input.subject,"subject",120),message:str(input.message,"message",2000)}});
  }
  if (action === "readNotification") {
    await db.notification.updateMany({where:{id:str(input.id,"notification",100),userId:user.id},data:{read:true}});
  }
  if (action === "review") {
    expect(user.verified,"Verify your email before reviewing an order.",403);
    const orderId = str(input.orderId,"order",100);
    const order = await db.order.findFirst({where:{id:orderId,userId:user.id,status:"DELIVERED"},select:{id:true}});
    expect(order,"Only your delivered orders can be reviewed.",404);
    const data = {rating:integer(input.rating,"rating",1,5),comment:str(input.comment,"review",500)};
    await db.review.upsert({where:{orderId},create:{...data,orderId,userId:user.id},update:data});
  }
  if (action === "cart") {
    const items = requestedItems(input.items,true);
    await db.$transaction(async (tx)=>{
      await pricedItems(tx,items);
      await tx.cart.upsert({where:{userId:user.id},create:{userId:user.id},update:{}});
      await tx.cartItem.deleteMany({where:{cartId:user.id}});
      await tx.cartItem.createMany({data:items.map(item=>({...item,cartId:user.id}))});
    },{isolationLevel:"Serializable"});
  }
  return {ok:true};
});
