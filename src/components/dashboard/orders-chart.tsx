"use client";

import { useId } from "react";

export function OrdersChart({ points }: { points: {date:string;orders:number}[] }) {
  const id = useId().replaceAll(":", "");
  const ceiling = Math.max(4, Math.ceil(Math.max(...points.map((point)=>point.orders), 1) / 4) * 4);
  const xy = points.map((point,index)=>({x:48+index/Math.max(1,points.length-1)*560,y:204-point.orders/ceiling*170,...point}));
  const line = xy.map((point,index)=>`${index ? "L" : "M"}${point.x},${point.y}`).join(" ");
  return <div className="px-4 pb-4">
    <svg viewBox="0 0 632 245" role="img" aria-label={`Orders per day. ${points.reduce((sum,point)=>sum+point.orders,0)} orders in the selected period.`} className="h-auto w-full">
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#9ed46b" stopOpacity="0.65" /><stop offset="100%" stopColor="#eaf6d9" stopOpacity="0.35" /></linearGradient></defs>
      {[0,1,2,3,4].map((tick)=><g key={tick}><line x1="48" x2="608" y1={204-tick*42.5} y2={204-tick*42.5} stroke="#edf0e9" /><text x="35" y={209-tick*42.5} textAnchor="end" fill="#65705e" fontSize="12">{ceiling*tick/4}</text></g>)}
      <path d={`${line} L608,204 L48,204 Z`} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke="#278115" strokeWidth="2.5" strokeLinejoin="round" />
      {xy.filter((_,index)=>index % Math.max(1,Math.floor(points.length/12))===0 || index===xy.length-1).map((point)=><circle key={point.date} cx={point.x} cy={point.y} r="3.5" fill="white" stroke="#278115" strokeWidth="2"><title>{point.date}: {point.orders} orders</title></circle>)}
      {xy.filter((_,index)=>index % Math.max(1,Math.ceil(points.length/6))===0 || index===xy.length-1).map((point)=><text key={point.date} x={point.x} y="230" textAnchor="middle" fill="#596452" fontSize="11">{new Date(point.date+"T12:00:00Z").toLocaleDateString("en-IN",{month:"short",day:"numeric",timeZone:"Asia/Kolkata"})}</text>)}
    </svg>
    {!points.some((point)=>point.orders) && <p className="text-center text-sm text-muted-foreground">No orders in this period yet.</p>}
  </div>;
}
