import { requirePermission } from "@/lib/server/permissions";
import { requireUser, limit } from "@/lib/server/auth";
import { orderView } from "@/lib/server/admin";
import { db } from "@/lib/server/db";
import { api, expect, indiaDate } from "@/lib/server/http";
import { orderCsvCell, orderListQuery } from "@/lib/server/order-list";

export const GET = api(async(request)=>{
  const user = await requirePermission("orders");
  await limit(`order-list:${user.id}`,180,5);
  const params = new URL(request.url).searchParams;
  const {base,where,page:requestedPage,pageSize} = orderListQuery(params);
  return db.$transaction(async(tx)=>{
    const total = await tx.order.count({where});
    if (params.get("export") === "csv") {
      expect(total <= 10_000,"Limit your filters to 10,000 orders or fewer before exporting.");
      const orders = await tx.order.findMany({where,include:orderView,orderBy:[{createdAt:"desc"},{id:"desc"}]});
      const rows: unknown[][] = [["Order ID","Customer","Email","Phone","Service","Quantity","Pickup date","Pickup slot","Delivery date","Delivery slot","Amount (INR)","Status"]];
      for (const order of orders) {
        const address = order.address as Record<string,unknown>;
        rows.push([order.id,order.user.name,order.user.email,address.phone,order.items.map((item)=>item.name).join("; "),order.items.map((item)=>`${item.quantity} ${item.unit}`).join("; "),order.pickupDate,order.pickupSlot,order.deliveryDate,order.deliverySlot,(order.total/100).toFixed(2),order.status]);
      }
      return {csv:"\ufeff"+rows.map((row)=>row.map(orderCsvCell).join(",")).join("\r\n"),filename:`orders-${indiaDate()}.csv`};
    }
    const page = Math.min(requestedPage,Math.max(1,Math.ceil(total/pageSize)));
    const [orders,statuses] = await Promise.all([
      tx.order.findMany({where,include:orderView,orderBy:[{createdAt:"desc"},{id:"desc"}],skip:(page-1)*pageSize,take:pageSize}),
      tx.order.groupBy({by:["status"],where:base,_count:{_all:true}}),
    ]);
    return {orders,total,page,pageSize,statuses:statuses.map((item)=>({status:item.status,count:item._count._all}))};
  },{isolationLevel:"RepeatableRead",timeout:15000});
});
