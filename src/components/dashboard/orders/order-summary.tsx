import { CircleCheck, CircleX, RefreshCw, ShoppingCart, Truck } from "lucide-react";

export const progressStatuses = ["RECEIVED","WASHING","DRYING","IRONING","QUALITY_CHECK","READY","OUT_FOR_DELIVERY"];
export const orderTabs = [
  {id:"all",label:"All Orders",icon:ShoppingCart},
  {id:"progress",label:"In Progress",icon:RefreshCw},
  {id:"picked",label:"Picked Up",icon:Truck},
  {id:"completed",label:"Completed",icon:CircleCheck},
  {id:"cancelled",label:"Cancelled",icon:CircleX},
] as const;
export type OrderGroup = typeof orderTabs[number]["id"];
export function orderCounts(statuses:{status:string;count:number}[]):Record<OrderGroup,number> {
  const count=(values:string[])=>statuses.filter((item)=>values.includes(item.status)).reduce((sum,item)=>sum+item.count,0);
  return {all:statuses.reduce((sum,item)=>sum+item.count,0),progress:count(progressStatuses),picked:count(["PICKED_UP"]),completed:count(["DELIVERED"]),cancelled:count(["CANCELLED"])};
}
export function OrderSummary({statuses}:{statuses:{status:string;count:number}[]}) {
  const counts=orderCounts(statuses);
  return <div className="grid grid-cols-1 gap-3 @min-[24rem]:grid-cols-2 @min-[58rem]:grid-cols-5">{orderTabs.map(({id,label,icon:Icon})=><section key={id} className="flex items-center gap-3 rounded-2xl border border-[#e7ebdf] bg-white p-4 shadow-[0_3px_8px_#26351608]"><span className={`grid size-12 shrink-0 place-items-center rounded-2xl ${id==="cancelled"?"bg-[#fff2e3] text-[#ff7900]":"bg-[#eff7db] text-[#328314]"}`}><Icon className="size-7" strokeWidth={1.8} aria-hidden="true" /></span><div className="min-w-0"><h2 className="text-sm font-semibold text-[#192c15]">{label==="All Orders"?"Total Orders":label}</h2><strong className="mt-1 block text-2xl font-extrabold tracking-tight text-[#14210f]">{counts[id].toLocaleString("en-IN")}</strong></div></section>)}</div>;
}
