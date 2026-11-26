import { orderView } from "@/lib/server/admin";
import { db } from "@/lib/server/db";
import { dashboardSummary } from "@/lib/server/dashboard";
import { hasPermission, type requireWorkspaceUser } from "@/lib/server/permissions";

/** Everything the operations dashboard shows, filtered by what this user may see. */
export async function adminSnapshot(user: Awaited<ReturnType<typeof requireWorkspaceUser>>) {
  const [settings,orders,services,customerRows,couponRows,tickets,dashboard,staff,enquiries] = await Promise.all([
    db.settings.findUniqueOrThrow({where:{id:1}}),
    hasPermission(user,"orders") ? db.order.findMany({include:orderView,orderBy:{createdAt:"desc"},take:1000}) : Promise.resolve([]),
    ["services","pricing","orders"].some((key)=>hasPermission(user,key)) ? db.service.findMany({orderBy:{name:"asc"}}) : Promise.resolve([]),
    ["customers","orders"].some((key)=>hasPermission(user,key)) ? db.user.findMany({where:{role:"CUSTOMER"},select:{id:true,name:true,email:true,verified:true,createdAt:true,addresses:true,profile:true,_count:{select:{orders:true}}},orderBy:{createdAt:"desc"},take:1000}) : Promise.resolve([]),
    hasPermission(user,"coupons") ? db.coupon.findMany({include:{_count:{select:{uses:true}}},orderBy:{code:"asc"}}) : Promise.resolve([]),
    hasPermission(user,"support") ? db.ticket.findMany({include:{user:{select:{name:true,email:true}}},orderBy:{createdAt:"desc"},take:1000}) : Promise.resolve([]),
    ["dashboard","reports"].some((key)=>hasPermission(user,key)) ? dashboardSummary() : Promise.resolve({orders:0,customers:0,revenue:0,statuses:[],daily:[],services:[]}),
    user.role === "ADMIN" ? db.user.findMany({where:{role:{in:["ADMIN","STAFF","RIDER"]}},select:{id:true,name:true,email:true,role:true,active:true,createdAt:true},orderBy:{name:"asc"}}) : Promise.resolve([]),
    hasPermission(user,"support") ? db.enquiry.findMany({orderBy:{createdAt:"desc"},take:500}) : Promise.resolve([]),
  ]);
  const customers = customerRows.map(({profile,_count,...customer})=>({...customer,phone:profile?.phone ?? "",orderCount:_count.orders}));
  const coupons = couponRows.map(({_count,...coupon})=>({...coupon,used:_count.uses}));
  const profile = await db.profile.findUnique({where:{userId:user.id},select:{phone:true}});
  return {user:{...user,phone:profile?.phone ?? ""},orders,settings,services,customers,coupons,tickets,dashboard,staff,enquiries};
}
