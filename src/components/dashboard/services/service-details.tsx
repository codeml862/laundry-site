"use client";

import Image from "next/image";
import { Clock3, Layers, Pencil, Tag, Trash2, X } from "lucide-react";
import { money } from "@/components/dashboard/ui";
import { serviceImage, titleCase, type ManagedService, type ServiceFamily } from "./service-model";

export function ServiceDetails({family,busy,onAvailability,onEdit,onClose}:{family:ServiceFamily;busy:boolean;onAvailability:(row:ManagedService,active:boolean,family:boolean)=>Promise<void>;onEdit:()=>void;onClose:()=>void}) {
  const active=family.variants.some((row)=>row.active);
  const price=Math.min(...family.variants.map((row)=>row.price));
  const hours=family.variants.map((row)=>row.hours);
  const image=serviceImage(family);
  return <aside className="min-w-0 self-start rounded-2xl border border-[#e4e9dc] bg-white p-4 shadow-[0_4px_12px_#26351608] @min-[66rem]:sticky @min-[66rem]:top-5" aria-label="Service details">
    <div className="flex items-center justify-between gap-2"><h2 className="text-xl font-extrabold tracking-tight text-[#16380f]">Service Details</h2><button type="button" onClick={onClose} aria-label="Close service details" className="grid size-8 place-items-center rounded-full hover:bg-secondary"><X className="size-5" /></button></div>
    <div className="mt-4 flex items-start gap-3"><div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-[#f7f6ed]"><Image src={image} alt="" fill sizes="80px" className="object-cover" unoptimized={image.startsWith("http")} /></div><div className="min-w-0"><h3 className="font-extrabold text-[#162a10]">{family.name}</h3><span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${active?"bg-[#e7f8cf] text-[#256c0e]":"bg-stone-100 text-stone-600"}`}>{active?"Active":"Inactive"}</span><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{family.description}</p></div></div>
    <dl className="mt-5 grid gap-4 text-sm">{[
      {icon:Layers,label:"Category",value:family.category},
      {icon:Tag,label:"Configured options",value:family.variants.length},
      {icon:Tag,label:"Starting Price",value:money(price)},
      {icon:Clock3,label:"Est. Turnaround",value:Math.min(...hours)===Math.max(...hours)?`${hours[0]} hours`:`${Math.min(...hours)}–${Math.max(...hours)} hours`},
    ].map(({icon:Icon,label,value})=><div key={label} className="flex items-start gap-2"><Icon className="size-4 shrink-0 text-[#368719]" aria-hidden="true" /><dt>{label}</dt><dd className="ml-auto text-right font-semibold">{value}</dd></div>)}</dl>
    <section className="mt-5 border-t border-[#edf0e5] pt-4"><h3 className="font-extrabold text-[#173b10]">Service Settings</h3><label className="mt-4 flex items-center justify-between gap-3 text-sm font-medium">Service Available<input type="checkbox" role="switch" checked={active} disabled={busy} onChange={(event)=>void onAvailability(family.variants[0],event.target.checked,true)} aria-label={`${family.name} available`} className="h-5 w-9 accent-[#318214]" /></label><p className="mt-1 text-xs text-muted-foreground">Changes all configured options in this service.</p></section>
    <section className="mt-5 border-t border-[#edf0e5] pt-4"><h3 className="font-extrabold text-[#173b10]">Types &amp; Sizes</h3><ul className="mt-2 divide-y divide-[#edf0e5]">{family.variants.map((row)=><li key={row.id} className="flex items-center gap-2 py-2.5 text-sm"><span className="min-w-0 flex-1"><strong className="block text-xs">{titleCase(row.speed||"REGULAR")} · {titleCase(row.size||"MEDIUM")}</strong><span className="mt-0.5 block text-xs text-muted-foreground">{money(row.price)} · {row.hours} hrs</span></span><input type="checkbox" role="switch" checked={row.active} disabled={busy} onChange={(event)=>void onAvailability(row,event.target.checked,false)} aria-label={`${row.name} available`} className="h-5 w-9 accent-[#318214]" /></li>)}</ul></section>
    <div className="mt-5 grid gap-2 border-t border-[#edf0e5] pt-4"><button type="button" onClick={onEdit} className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#3c8425] text-sm font-bold text-[#296a16] hover:bg-secondary"><Pencil className="size-4" aria-hidden="true" />Edit Service</button><button type="button" disabled={!active||busy} onClick={()=>void onAvailability(family.variants[0],false,true)} className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-red-200 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40"><Trash2 className="size-4" aria-hidden="true" />Deactivate Service</button><p className="text-xs text-muted-foreground">Deactivation preserves past orders and pricing history.</p></div>
  </aside>;
}
