import { db } from "@/lib/server/db";
import { dateField, expect, indiaDate } from "@/lib/server/http";

export function reportRange(params:URLSearchParams,now=new Date()) {
  const days=Number(params.get("days")||7);
  expect([7,30,90].includes(days),"Choose a 7, 30 or 90 day report.");
  const to=params.get("to")?dateField(params.get("to"),"report end date"):indiaDate(now);
  const defaultFrom=indiaDate(new Date(Date.parse(to+"T00:00:00+05:30")-(days-1)*86400000));
  const from=params.get("from")?dateField(params.get("from"),"report start date"):defaultFrom;
  const start=new Date(from+"T00:00:00+05:30");
  const end=new Date(Date.parse(to+"T00:00:00+05:30")+86400000);
  const length=Math.round((+end-+start)/86400000);
  expect(length>0&&length<=366,"Choose a report period of up to 366 days.");
  const previousStart=new Date(+start-length*86400000);
  return {from,to,start,end,previousStart,length};
}

/** Revenue is collected value for orders placed in the period, not settlement timing. */
export async function reportSummary(params:URLSearchParams) {
  const range=reportRange(params);
  const {start,end,previousStart}=range;
  return db.$transaction(async(tx)=>{
    const [orders,previousOrders,customers,previousCustomers,services] = await Promise.all([
      tx.order.findMany({where:{createdAt:{gte:start,lt:end}},select:{status:true,createdAt:true,total:true,payment:{select:{status:true}},items:{select:{serviceId:true,name:true,quantity:true,price:true,service:{select:{familyKey:true,familyName:true}}}}}}),
      tx.order.findMany({where:{createdAt:{gte:previousStart,lt:start}},select:{total:true,payment:{select:{status:true}}}}),
      tx.user.count({where:{role:"CUSTOMER",createdAt:{gte:start,lt:end}}}),
      tx.user.count({where:{role:"CUSTOMER",createdAt:{gte:previousStart,lt:start}}}),
      tx.service.findMany({where:{active:true},select:{id:true,familyKey:true}}),
    ]);
    const daily=new Map<string,{date:string;orders:number;revenue:number}>();
    for(let index=0;index<range.length;index++){
      const date=indiaDate(new Date(+start+index*86400000));
      daily.set(date,{date,orders:0,revenue:0});
    }
    const statuses=new Map<string,number>();
    const serviceRevenue=new Map<string,{id:string;name:string;revenue:number;bookings:number}>();
    let revenue=0;
    for(const order of orders){
      const day=daily.get(indiaDate(order.createdAt));
      if(day)day.orders++;
      statuses.set(order.status,(statuses.get(order.status)||0)+1);
      if(order.payment?.status!=="PAID")continue;
      revenue+=order.total;if(day)day.revenue+=order.total;
      for(const item of order.items){
        const id=item.service.familyKey||item.serviceId;
        const row=serviceRevenue.get(id)||{id,name:item.service.familyName||item.name,revenue:0,bookings:0};
        row.revenue+=Math.round(item.price*item.quantity);row.bookings++;serviceRevenue.set(id,row);
      }
    }
    const previousRevenue=previousOrders.reduce((total,order)=>total+(order.payment?.status==="PAID"?order.total:0),0);
    const topServices=[...serviceRevenue.values()].sort((a,b)=>b.revenue-a.revenue);
    const serviceSubtotal=topServices.reduce((total,row)=>total+row.revenue,0);
    return {
      range:{from:range.from,to:range.to,days:range.length},
      totals:{orders:orders.length,revenue,customers,services:new Set(services.map((item)=>item.familyKey||item.id)).size},
      previous:{orders:previousOrders.length,revenue:previousRevenue,customers:previousCustomers},
      daily:[...daily.values()],statuses:[...statuses].map(([status,count])=>({status,count})),
      topServices:topServices.slice(0,5).map((row)=>({...row,percent:serviceSubtotal?Math.round(row.revenue/serviceSubtotal*1000)/10:0})),
      serviceSubtotal,
    };
  },{isolationLevel:"RepeatableRead",timeout:20000});
}
