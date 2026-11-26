import { db } from "@/lib/server/db";
import { indiaDate } from "@/lib/server/http";

/** Lifetime totals are aggregated in the database, independently of the paginated order list. */
export async function dashboardSummary() {
  const now = new Date();
  const start = new Date(now.getTime() - 90 * 86_400_000);
  const [orders, customers, revenue, statuses, activity, customerActivity, services] = await Promise.all([
    db.order.count(),
    db.user.count({where:{role:"CUSTOMER"}}),
    db.order.aggregate({where:{payment:{status:"PAID"}},_sum:{total:true}}),
    db.order.groupBy({by:["status"],_count:{_all:true}}),
    db.order.findMany({where:{createdAt:{gte:start}},select:{createdAt:true,total:true,payment:{select:{status:true}}}}),
    db.user.findMany({where:{role:"CUSTOMER",createdAt:{gte:start}},select:{createdAt:true}}),
    db.orderItem.groupBy({by:["serviceId","name"],where:{order:{status:{not:"CANCELLED"}}},_count:{_all:true},orderBy:{_count:{serviceId:"desc"}},take:5}),
  ]);
  const daily = new Map<string, {date:string;orders:number;revenue:number;customers:number}>();
  for (let index = 0; index < 90; index++) {
    const date = indiaDate(new Date(now.getTime() - index * 86_400_000));
    daily.set(date,{date,orders:0,revenue:0,customers:0});
  }
  for (const item of activity) {
    const day = daily.get(indiaDate(item.createdAt));
    if (day) { day.orders++; if (item.payment?.status === "PAID") day.revenue += item.total; }
  }
  for (const item of customerActivity) {
    const day = daily.get(indiaDate(item.createdAt));
    if (day) day.customers++;
  }
  return {
    orders,customers,revenue:revenue._sum.total ?? 0,
    statuses:statuses.map((item)=>({status:item.status,count:item._count._all})),
    daily:[...daily.values()].sort((a,b)=>a.date.localeCompare(b.date)),
    services:services.map((item)=>({id:item.serviceId,name:item.name,count:item._count._all})),
  };
}
