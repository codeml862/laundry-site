"use client";

import { useState } from "react";
import Image from "next/image";
import { CalendarDays, MapPin, Phone, RefreshCw, Shirt, Truck, UserRound, X } from "lucide-react";
import { ActionForm, Badge, Field, label, money, ui, when } from "@/components/dashboard/ui";
import { nextStatuses, read, shortId, type Mutate, type Order, type Service } from "@/components/dashboard/types";

export function OrderSidePanel({order,services,mutate,close,onManage}:{order:Order;services:Service[];mutate:Mutate;close:()=>void;onManage:()=>void}) {
  const [editing,setEditing] = useState(false);
  const waiting = order.payment?.method==="RAZORPAY" && order.payment.status!=="PAID";
  const statuses = nextStatuses(order.status).filter((status)=>!waiting||status==="CANCELLED");
  const phone=order.address.phone?.replace(/[^\d+]/g,"");
  return <aside aria-label="Order details" className="min-w-0 self-start rounded-2xl border border-[#e1e7d8] bg-white p-4 shadow-[0_4px_12px_#27391508] @min-[70rem]:sticky @min-[70rem]:top-5">
    <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-extrabold tracking-tight text-[#16380e]">Order Details</h2><button type="button" onClick={close} aria-label="Close order details" className="grid size-8 place-items-center rounded-full hover:bg-secondary"><X className="size-5" /></button></div>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2"><strong className="text-lg font-extrabold text-[#1a4813]">{shortId(order.id)}</strong><Badge value={order.status} /></div>
    <div className="mt-4 flex items-center gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#eef6d9] text-[#388322]"><UserRound className="size-6" aria-hidden="true" /></span><div className="min-w-0"><p className="font-bold text-[#182914]">{order.user.name}</p><p className="mt-0.5 break-all text-sm text-muted-foreground">{order.address.phone || order.user.email}</p></div></div>
    <dl className="mt-5 grid gap-3 text-sm">
      <div className="grid grid-cols-[18px_1fr] gap-x-2"><CalendarDays className="size-4 text-[#327b20]" aria-hidden="true" /><dt className="font-medium">Pickup Date</dt><dd className="col-start-2 mt-1 text-muted-foreground">{when(order.pickupDate)} · {order.pickupSlot}</dd></div>
      <div className="grid grid-cols-[18px_1fr] gap-x-2"><Truck className="size-4 text-[#327b20]" aria-hidden="true" /><dt className="font-medium">Delivery Date</dt><dd className="col-start-2 mt-1 text-muted-foreground">{order.deliveryDate?`${when(order.deliveryDate)}${order.deliverySlot?` · ${order.deliverySlot}`:""}`:"Not scheduled yet"}</dd></div>
      <div className="grid grid-cols-[18px_1fr] gap-x-2"><MapPin className="size-4 text-[#327b20]" aria-hidden="true" /><dt className="font-medium">Address</dt><dd className="col-start-2 mt-1 text-muted-foreground">{[order.address.line1,order.address.line2,order.address.city,order.address.postalCode].filter(Boolean).join(", ")}</dd></div>
    </dl>
    <div className="mt-5 border-t border-[#edf0e7] pt-4"><h3 className="text-sm font-extrabold text-[#16380e]">Service &amp; Items</h3><ul className="mt-2 divide-y divide-[#edf0e7]">{order.items.map((item)=>{
      const image=services.find((service)=>service.id===item.serviceId)?.image;
      return <li key={item.serviceId} className="flex items-center gap-2.5 py-3"><span className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#f2f6ea] text-[#34831c]">{image?<Image src={image} alt="" fill sizes="40px" className="object-cover" unoptimized={image.startsWith("http")} />:<Shirt className="size-6" aria-hidden="true" />}</span><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{item.name}</p><p className="mt-0.5 text-xs text-muted-foreground">{item.quantity} {item.unit==="KG"?"kg":item.unit==="ITEM"?"items":"service"} × {money(item.price)}</p></div><strong className="text-sm">{money(Math.round(item.price*item.quantity))}</strong></li>;
    })}</ul></div>
    <dl className="mt-1 space-y-2 border-t border-[#edf0e7] pt-3 text-sm text-muted-foreground"><div className="flex justify-between gap-2"><dt>Subtotal</dt><dd>{money(order.subtotal)}</dd></div><div className="flex justify-between gap-2"><dt>Tax &amp; delivery</dt><dd>{money(order.tax+order.deliveryFee)}</dd></div>{order.discount>0&&<div className="flex justify-between gap-2"><dt>Discount</dt><dd>−{money(order.discount)}</dd></div>}</dl>
    <div className="mt-4 flex items-center justify-between gap-2 rounded-xl bg-[#eff8da] px-3 py-2.5 font-bold text-[#183c0d]"><span>Total Amount</span><span>{money(order.total)}</span></div>
    {order.instructions&&<p className="mt-3 rounded-xl bg-[#fafbf7] p-3 text-sm text-muted-foreground"><strong className="block text-[#21371a]">Care notes</strong>{order.instructions}</p>}
    <div className="mt-4 grid gap-2">
      {statuses.length>0&&<button type="button" className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#39821d] text-sm font-bold text-[#2e7419] hover:bg-secondary" onClick={()=>setEditing((value)=>!value)} aria-expanded={editing}><RefreshCw className="size-4" aria-hidden="true" />Update Status</button>}
      {editing&&statuses.length>0&&<ActionForm key={order.status} button="Save status" submit={async(form)=>{const status=read(form,"status");if(status==="CANCELLED"&&!window.confirm("Cancel this order?"))return;await mutate("status",{orderId:order.id,status},"Order status updated.");setEditing(false);}}><Field label="Next status" wide><select name="status" required defaultValue=""><option value="" disabled>Select status</option>{statuses.map((status)=><option key={status} value={status}>{label(status)}</option>)}</select></Field></ActionForm>}
      {waiting&&order.status!=="CANCELLED"&&<p className="text-xs text-muted-foreground">Online payment must be confirmed before fulfilment.</p>}
      {phone&&<a href={`tel:${phone}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#ff7900] text-sm font-bold text-white hover:bg-[#e96e00]"><Phone className="size-4" aria-hidden="true" />Contact Customer</a>}
      <button type="button" onClick={onManage} className={ui.secondary}>Payment &amp; full history</button>
    </div>
  </aside>;
}
