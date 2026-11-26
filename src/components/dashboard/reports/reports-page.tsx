"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, CalendarDays, Check, Layers, Lightbulb, LoaderCircle, ShoppingCart, Users, Wallet } from "lucide-react";
import { OrdersChart } from "@/components/dashboard/orders-chart";
import { StatusChart } from "@/components/dashboard/status-chart";
import { money, ui } from "@/components/dashboard/ui";

type Report = {
  range:{from:string;to:string;days:number};
  totals:{orders:number;revenue:number;customers:number;services:number};
  previous:{orders:number;revenue:number;customers:number};
  daily:{date:string;orders:number;revenue:number}[];
  statuses:{status:string;count:number}[];
  topServices:{id:string;name:string;revenue:number;bookings:number;percent:number}[];
  serviceSubtotal:number;
};
const panel="min-w-0 overflow-hidden rounded-2xl border border-[#e2e8da] bg-white shadow-[0_4px_12px_#26361508]";
function change(current:number,previous:number){return previous?Math.round((current-previous)/previous*100):null;}
function RevenueBars({points}:{points:Report["daily"]}){
  const max=Math.max(...points.map((point)=>point.revenue),100);
  const bins=points.length>14?Array.from({length:Math.min(12,points.length)},(_,index)=>{
    const from=Math.floor(index*points.length/12),to=Math.floor((index+1)*points.length/12);
    return {date:points[from].date,endDate:points[to-1].date,revenue:points.slice(from,to).reduce((sum,point)=>sum+point.revenue,0)};
  }):points.map((point)=>({...point,endDate:point.date}));
  const ceiling=Math.max(max,...bins.map((point)=>point.revenue));
  const step=520/Math.max(1,bins.length);
  return <svg viewBox="0 0 640 250" role="img" aria-label="Collected revenue for orders placed in the selected period" className="w-full px-3 pb-4">
    {[0,1,2,3,4].map((tick)=><g key={tick}><line x1="90" x2="615" y1={205-tick*43} y2={205-tick*43} stroke="#ecf0e5" /><text x="80" y={210-tick*43} textAnchor="end" fill="#64715b" fontSize="12">{new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",notation:"compact",maximumFractionDigits:1}).format(ceiling*tick/4/100)}</text></g>)}
    {bins.map((point,index)=>{const height=point.revenue/ceiling*172;return <g key={point.date}><rect x={90+index*step+step*0.16} y={205-height} width={Math.max(1,step*0.68)} height={height} rx="4" fill={index===bins.length-1?"#176d0b":`hsl(95 58% ${79-index/Math.max(1,bins.length-1)*30}%)`}><title>{point.date}{point.endDate!==point.date?` – ${point.endDate}`:""}: {money(point.revenue)}</title></rect>{(bins.length<9||index%2===0||index===bins.length-1)&&<text x={90+index*step+step/2} y="230" textAnchor="middle" fill="#64715b" fontSize="11">{new Date(point.date+"T12:00:00Z").toLocaleDateString("en-IN",{month:"short",day:"numeric",timeZone:"Asia/Kolkata"})}</text>}</g>;})}
  </svg>;
}

export function ReportsPage(){
  const [days,setDays]=useState(7);
  const [data,setData]=useState<Report|null>(null);
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(true);
  const [revision,setRevision]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();setLoading(true);setError("");
    fetch(`/api/admin/reports?days=${days}`,{cache:"no-store",signal:controller.signal}).then(async(response)=>{const result=await response.json();if(!response.ok)throw new Error(result.error||"Reports unavailable.");if(!controller.signal.aborted)setData(result);}).catch((cause)=>{if(!controller.signal.aborted)setError(cause.message||"Reports unavailable.");}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[days,revision]);
  const revenueChange=data?change(data.totals.revenue,data.previous.revenue):null;
  const orderChange=data?change(data.totals.orders,data.previous.orders):null;
  return <div className="grid min-w-0 gap-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{data?`${data.range.from} – ${data.range.to} · India time`:"Business performance"}</p><label className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#dfe5d7] bg-white px-3 text-sm font-semibold"><CalendarDays className="size-4 text-[#397f23]" aria-hidden="true" /><span className="sr-only">Report period</span><select value={days} onChange={(event)=>setDays(Number(event.target.value))} className="bg-transparent outline-none">{[7,30,90].map((value)=><option key={value} value={value}>Last {value} Days</option>)}</select></label></div>
    {error&&<p role="alert" className={ui.alertError}>{error}<button type="button" onClick={()=>setRevision((value)=>value+1)} className="ml-3 underline">Retry</button></p>}
    {loading&&<p role="status" className="inline-flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />Loading reports…</p>}
    {data&&<div className="grid min-w-0 gap-5" aria-busy={loading}>
      <div className="grid gap-4 @min-[24rem]:grid-cols-2 @min-[57rem]:grid-cols-4">{[
        {label:"Orders",value:data.totals.orders.toLocaleString("en-IN"),key:"orders" as const,icon:ShoppingCart},
        {label:"Revenue",value:money(data.totals.revenue),key:"revenue" as const,icon:Wallet},
        {label:"New Customers",value:data.totals.customers.toLocaleString("en-IN"),key:"customers" as const,icon:Users},
        {label:"Active Services",value:data.totals.services.toLocaleString("en-IN"),key:null,icon:Layers},
      ].map(({label,value,key,icon:Icon},index)=>{const delta=key?change(data.totals[key],data.previous[key]):null;return <section key={label} className={`${panel} flex items-center gap-3 p-4 ${index%2?"bg-[#fffbf3]":"bg-[#f7fbf1]"}`}><span className={`grid size-12 shrink-0 place-items-center rounded-2xl ${index%2?"bg-[#fff0d3] text-[#ff7900]":"bg-[#edfad5] text-[#2a8010]"}`}><Icon className="size-7" strokeWidth={1.8} aria-hidden="true" /></span><div className="min-w-0 flex-1"><h2 className="text-sm font-semibold text-[#233719]">{label}</h2><strong className="mt-1 block break-words text-2xl font-extrabold tracking-tight text-[#19340e]">{value}</strong>{key&&<p className="mt-1 text-xs text-muted-foreground">{delta!==null?<span className={`inline-flex items-center font-bold ${delta>=0?"text-[#37851b]":"text-orange-700"}`}>{delta>=0?<ArrowUp className="size-3" aria-hidden="true" />:<ArrowDown className="size-3" aria-hidden="true" />}<span className="sr-only">{delta>=0?"Up ":"Down "}</span>{Math.abs(delta)}%</span>:"No prior activity"} · previous {data.range.days} days</p>}</div></section>;})}</div>
      <div className="grid gap-5 @min-[44rem]:grid-cols-2">
        <section className={panel}><h2 className="p-5 text-xl font-extrabold tracking-tight text-[#17380f]">Orders Trend</h2><OrdersChart points={data.daily} /></section>
        <section className={panel}><h2 className="p-5 text-xl font-extrabold tracking-tight text-[#17380f]">Revenue Trend</h2>{data.daily.length>14&&<p className="px-5 pb-3 text-xs text-muted-foreground">Revenue grouped into consecutive date ranges.</p>}<RevenueBars points={data.daily} />{!data.totals.revenue&&<p className="px-5 pb-4 text-center text-sm text-muted-foreground">No collected revenue in this period.</p>}</section>
        <section className={panel}><h2 className="p-5 text-xl font-extrabold tracking-tight text-[#17380f]">Orders by Status</h2><StatusChart statuses={data.statuses} /></section>
        <section className={panel}><h2 className="p-5 text-xl font-extrabold tracking-tight text-[#17380f]">Top Services by Revenue</h2>{data.topServices.length?<ul className="grid gap-5 px-5 pb-5">{data.topServices.map((service,index)=><li key={service.id} className="grid grid-cols-[minmax(90px,1fr)_minmax(80px,1.5fr)_auto] items-center gap-3 text-sm"><span className="truncate" title={service.name}>{service.name}</span><span className="h-4 overflow-hidden rounded-full bg-[#f0f5e7]"><span className="block h-full rounded-full" style={{width:`${service.percent}%`,background:`hsl(100 63% ${30+index*12}%)`}} /></span><strong>{service.percent}%</strong></li>)}</ul>:<p className="p-6 text-sm text-muted-foreground">Paid service bookings will appear here.</p>}<p className="px-5 pb-4 text-xs text-muted-foreground">Share of collected service subtotals before tax, delivery and discounts.</p></section>
      </div>
      <section className={`${panel} flex flex-wrap items-center gap-5 p-5`}><h2 className="inline-flex items-center gap-3 text-xl font-extrabold text-[#19380f]"><Lightbulb className="size-8 text-[#ff7900]" aria-hidden="true" />Key Insights</h2>{[
        revenueChange===null?"Revenue comparison starts once the prior period has activity.":`Revenue ${revenueChange>=0?"up":"down"} ${Math.abs(revenueChange)}% vs. previous ${data.range.days} days.`,
        orderChange===null?`${data.totals.orders} orders in the selected period.`:`Orders ${orderChange>=0?"up":"down"} ${Math.abs(orderChange)}% (${data.totals.orders} vs. ${data.previous.orders}).`,
        data.topServices[0]?`${data.topServices[0].name} leads paid service subtotals (${data.topServices[0].percent}%).`:"Service insights will appear after collected bookings.",
      ].map((insight)=><p key={insight} className="flex min-w-48 flex-1 items-start gap-3 text-sm"><Check className="size-6 shrink-0 rounded-full bg-[#edf9d7] p-1 text-[#347b1d]" aria-hidden="true" />{insight}</p>)}</section>
      <p className="text-xs text-muted-foreground">Orders and new customers use the selected date range. Revenue includes collected payments for orders placed in that range; refunds and pending payments are excluded. Active service families reflect the current catalog.</p>
    </div>}
  </div>;
}
