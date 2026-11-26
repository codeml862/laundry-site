import { requirePermission } from "@/lib/server/permissions";
import { limit } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { api, expect, indiaDate } from "@/lib/server/http";
import { paymentCsvCell, paymentListQuery, paymentPeriod } from "@/lib/server/payment-list";

const select = {orderId:true,method:true,status:true,amount:true,externalOrderId:true,externalPaymentId:true,refundId:true,createdAt:true,updatedAt:true,order:{select:{status:true,subtotal:true,tax:true,discount:true,deliveryFee:true,total:true,user:{select:{id:true,name:true,email:true}}}}} as const;

export const GET = api(async(request)=>{
  const user = await requirePermission("payments");
  await limit(`payment-list:${user.id}`,180,5);
  const params = new URL(request.url).searchParams;
  const {where,page:requestedPage,pageSize,days} = paymentListQuery(params);
  return db.$transaction(async(tx)=>{
    const total = await tx.payment.count({where});
    if (params.get("export") === "csv") {
      expect(total <= 10_000,"Limit your filters to 10,000 payments or fewer before exporting.");
      const records = await tx.payment.findMany({where,select,orderBy:[{createdAt:"desc"},{orderId:"desc"}]});
      const rows:unknown[][] = [["Order ID","Payment reference","Customer","Email","Method","Amount (INR)","Status","Created at","Updated at","Refund ID"]];
      for (const item of records) rows.push([item.orderId,item.externalPaymentId,item.order.user.name,item.order.user.email,item.method === "COD" ? "Cash" : "Online (Razorpay)",(item.amount/100).toFixed(2),item.status,item.createdAt.toISOString(),item.updatedAt.toISOString(),item.refundId]);
      return {csv:"\ufeff"+rows.map((row)=>row.map(paymentCsvCell).join(",")).join("\r\n"),filename:`payments-${indiaDate()}.csv`};
    }
    const page = Math.min(requestedPage,Math.max(1,Math.ceil(total/pageSize)));
    const period = paymentPeriod(days);
    const [payments,statuses,methods,daily] = await Promise.all([
      tx.payment.findMany({where,select,orderBy:[{createdAt:"desc"},{orderId:"desc"}],skip:(page-1)*pageSize,take:pageSize}),
      tx.payment.groupBy({by:["status"],_count:{_all:true},_sum:{amount:true}}),
      tx.payment.groupBy({by:["method"],where:{status:"PAID"},_count:{_all:true},_sum:{amount:true}}),
      tx.$queryRaw<{date:string;amount:bigint}[]>`SELECT to_char("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD') AS date, SUM(amount)::bigint AS amount FROM "Payment" WHERE status = 'PAID' AND "createdAt" >= ${period.start} AND "createdAt" < ${period.end} GROUP BY 1 ORDER BY 1`,
    ]);
    const totals = Object.fromEntries(statuses.map((item)=>[item.status,{count:item._count._all,amount:item._sum.amount ?? 0}]));
    return {payments,total,page,pageSize,stats:{collected:totals.PAID?.amount ?? 0,successful:totals.PAID?.count ?? 0,pending:totals.PENDING?.count ?? 0,refunded:totals.REFUNDED?.count ?? 0,refundPending:totals.REFUND_PENDING?.count ?? 0,failed:null},methods:methods.map((item)=>({method:item.method,amount:item._sum.amount ?? 0,count:item._count._all})),daily:period.dates.map((date)=>({date,amount:Number(daily.find((item)=>item.date === date)?.amount ?? 0)}))};
  },{isolationLevel:"RepeatableRead",timeout:15000});
});
