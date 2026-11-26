"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Download, Eye, LoaderCircle, MoreVertical, Plus, RotateCcw, Search, Shirt } from "lucide-react";
import { Badge, Empty, label, money, ui, when } from "@/components/dashboard/ui";
import { shortId, statusFlow, type Mutate, type Order, type Snapshot } from "@/components/dashboard/types";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { OrderSidePanel } from "./order-side-panel";
import { OrderSummary, orderCounts, orderTabs, type OrderGroup } from "./order-summary";
import { cn } from "@/lib/utils";

type ListResponse = {orders:Order[];total:number;page:number;pageSize:number;statuses:{status:string;count:number}[]};
const emptyFilters = {q:"",service:"",status:"",area:"",from:"",to:""};

export function OrdersPage({snapshot,mutate,onOpen,onNewOrder}:{snapshot:Snapshot;mutate:Mutate;onOpen:(id:string)=>void;onNewOrder:()=>void}) {
  const [filters,setFilters] = useState(emptyFilters);
  const [group,setGroup] = useState<OrderGroup>("all");
  const [page,setPage] = useState(1);
  const [pageSize,setPageSize] = useState(5);
  const [data,setData] = useState<ListResponse|null>(null);
  const [error,setError] = useState("");
  const [loading,setLoading] = useState(true);
  const [exporting,setExporting] = useState(false);
  const [selected,setSelected] = useState<Order|null>(null);
  const [checked,setChecked] = useState<{key:string;ids:string[]}>({key:"",ids:[]});
  const [revision,setRevision] = useState(0);
  const query = useMemo(()=>{
    const params = new URLSearchParams({group,page:String(page),pageSize:String(pageSize)});
    for(const [key,value] of Object.entries(filters))if(value)params.set(key,value);
    return params.toString();
  },[filters,group,page,pageSize]);

  useEffect(()=>{
    const controller=new AbortController();
    const timer=setTimeout(()=>{
      setLoading(true);setError("");
      fetch(`/api/admin/orders?${query}`,{signal:controller.signal,cache:"no-store"}).then(async(response)=>{
        const result=await response.json();if(!response.ok)throw new Error(result.error||"Unable to load orders.");
        if(!controller.signal.aborted){setData(result);setSelected((current)=>current ? result.orders.find((order:Order)=>order.id===current.id)??current : null);}
      }).catch((cause)=>{if(!controller.signal.aborted)setError(cause.message||"Unable to load orders.");}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    },200);
    return()=>{clearTimeout(timer);controller.abort();};
  },[query,snapshot,revision]);

  const counts=orderCounts(data?.statuses??snapshot.dashboard.statuses);
  const total=data?.total??0;
  const currentPage=data?.page??page;
  const pages=Math.max(1,Math.ceil(total/pageSize));
  const visible=data?.orders??[];
  const checkedIds=checked.key===query?checked.ids:[];
  const allChecked=visible.length>0&&visible.every((order)=>checkedIds.includes(order.id));
  const areas=[...new Set([...snapshot.settings.serviceAreas,...snapshot.orders.flatMap((order)=>[order.address.city,order.address.postalCode])])].filter(Boolean).sort();
  function changeFilter(key:keyof typeof filters,value:string) {setLoading(true);setFilters((current)=>({...current,[key]:value}));setPage(1);setSelected(null);}
  function toggle(id:string) {setChecked({key:query,ids:checkedIds.includes(id)?checkedIds.filter((value)=>value!==id):[...checkedIds,id]});}
  function changePage(next:number) {setLoading(true);setPage(next);}

  const updateOrder:Mutate=async(action,fields,message)=>{
    await mutate(action,fields,message);
    setRevision((value)=>value+1);
    if(selected){
      const response=await fetch(`/api/admin?orderId=${encodeURIComponent(selected.id)}`,{cache:"no-store"});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||"Order updated; details could not be refreshed.");
      setSelected(result.order);
    }
  };

  async function exportOrders() {
    setExporting(true);setError("");
    try {
      const params=new URLSearchParams(query);params.set("export","csv");
      if(checkedIds.length)params.set("ids",checkedIds.join(","));
      const response=await fetch(`/api/admin/orders?${params}`,{cache:"no-store"});
      const result=await response.json();if(!response.ok)throw new Error(result.error||"Export failed.");
      const url=URL.createObjectURL(new Blob([result.csv],{type:"text/csv;charset=utf-8"}));
      const anchor=document.createElement("a");anchor.href=url;anchor.download=result.filename;document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }catch(cause){setError(cause instanceof Error?cause.message:"Export failed.");}finally{setExporting(false);}
  }

  return <div className="grid min-w-0 gap-6">
    <OrderSummary statuses={data?.statuses??snapshot.dashboard.statuses} />
    <div className="flex flex-wrap items-center justify-between gap-4"><div className="flex max-w-full gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]" role="group" aria-label="Order groups">{orderTabs.map(({id,label})=><button key={id} type="button" aria-pressed={group===id} onClick={()=>{setLoading(true);setGroup(id);setPage(1);setSelected(null);}} className={cn("min-h-10 shrink-0 rounded-full px-4 text-sm font-medium transition-colors",group===id?"bg-[#106708] text-white":"text-[#202a1c] hover:bg-[#edf6dc]")}>{label} ({counts[id].toLocaleString("en-IN")})</button>)}</div><button type="button" onClick={onNewOrder} className="inline-flex h-11 items-center gap-2 rounded-full bg-[#ff7900] px-5 text-sm font-bold text-white hover:bg-[#e86d00]"><Plus className="size-5" aria-hidden="true" />New Order</button></div>
    {error&&<p role="alert" className={ui.alertError}>{error}<button type="button" className="ml-2 underline" onClick={()=>setRevision((value)=>value+1)}>Retry</button></p>}
    <div className={cn("grid min-w-0 items-start gap-5",selected&&"@min-[70rem]:grid-cols-[minmax(0,1fr)_300px]")}>
      <section aria-label="Orders list" className="min-w-0 overflow-hidden rounded-2xl border border-[#e1e7d8] bg-white shadow-[0_3px_12px_#27391506]">
        <div className="grid gap-3 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex h-10 min-w-48 flex-1 items-center gap-2 rounded-xl border border-[#dce2d6] px-3"><Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /><span className="sr-only">Search by order ID, customer, email or phone</span><input type="search" maxLength={100} value={filters.q} onChange={(event)=>changeFilter("q",event.target.value)} placeholder="Search by Order ID, Customer, or Phone…" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label>
            <button type="button" onClick={()=>{setFilters(emptyFilters);setGroup("all");setPage(1);setSelected(null);setLoading(true);}} className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-[#2d7718] hover:bg-secondary"><RotateCcw className="size-4" aria-hidden="true" />Reset</button>
            <button type="button" disabled={exporting||loading||!total} onClick={()=>void exportOrders()} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#378326] px-4 text-sm font-bold text-[#246315] hover:bg-secondary disabled:opacity-50">{exporting?<LoaderCircle className="size-4 animate-spin" />:<Download className="size-4" aria-hidden="true" />}Export{checkedIds.length?` (${checkedIds.length})`:""}</button>
          </div>
          <div className="grid grid-cols-1 gap-3 @min-[30rem]:grid-cols-2 @min-[62rem]:grid-cols-4">
            <div className="flex min-w-0 items-center gap-2 rounded-xl border border-[#dce2d6] px-3 py-1.5 @min-[30rem]:col-span-2 @min-[62rem]:col-span-1"><CalendarDays className="size-4 shrink-0 text-[#467234]" aria-hidden="true" /><label className="grid min-w-0 flex-1 gap-0.5 text-[0.65rem] text-muted-foreground">Pickup from<input type="date" value={filters.from} max={filters.to||undefined} onChange={(event)=>changeFilter("from",event.target.value)} className="min-w-0 w-full bg-transparent text-xs text-foreground outline-none" /></label><span className="text-muted-foreground">–</span><label className="grid min-w-0 flex-1 gap-0.5 text-[0.65rem] text-muted-foreground">Pickup to<input type="date" value={filters.to} min={filters.from||undefined} onChange={(event)=>changeFilter("to",event.target.value)} className="min-w-0 w-full bg-transparent text-xs text-foreground outline-none" /></label></div>
            <select aria-label="Filter by service" value={filters.service} onChange={(event)=>changeFilter("service",event.target.value)} className="h-11 min-w-0 rounded-xl border border-[#dce2d6] bg-white px-3 text-sm"><option value="">All Services</option>{snapshot.services.map((service)=><option key={service.id} value={service.id}>{service.name}</option>)}</select>
            <select aria-label="Filter by order status" value={filters.status} onChange={(event)=>changeFilter("status",event.target.value)} className="h-11 min-w-0 rounded-xl border border-[#dce2d6] bg-white px-3 text-sm"><option value="">All Status</option>{[...statusFlow,"CANCELLED"].map((status)=><option key={status} value={status}>{label(status)}</option>)}</select>
            <select aria-label="Filter by pickup area" value={filters.area} onChange={(event)=>changeFilter("area",event.target.value)} className="h-11 min-w-0 rounded-xl border border-[#dce2d6] bg-white px-3 text-sm"><option value="">All Areas</option>{areas.map((area)=><option key={area}>{area}</option>)}</select>
          </div>
        </div>
        <div aria-busy={loading} className={cn("relative min-h-48",loading&&"pointer-events-none opacity-50")}>
          {loading&&<div className="absolute inset-0 z-10 grid place-items-center bg-white/50" role="status"><span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm shadow-sm"><LoaderCircle className="size-4 animate-spin text-primary" />Loading orders…</span></div>}
          {visible.length ? <div className="overflow-x-auto [scrollbar-width:thin]"><table className="w-full min-w-[900px] border-collapse text-left text-sm"><thead className="bg-[#eef6e4] text-[#213c17]"><tr><th scope="col" className="w-10 px-4 py-4"><input type="checkbox" aria-label="Select all orders on this page" checked={allChecked} ref={(node)=>{if(node)node.indeterminate=checkedIds.length>0&&!allChecked;}} onChange={()=>setChecked({key:query,ids:allChecked?[]:visible.map((order)=>order.id)})} className="size-4 accent-[#1c7b0d]" /></th>{["Order ID","Customer","Service","Items","Pickup Date","Delivery Date","Amount","Status","Action"].map((heading)=><th key={heading} scope="col" className="px-3 py-4 font-bold whitespace-nowrap">{heading}</th>)}</tr></thead><tbody className="divide-y divide-[#edf0e6]">{visible.map((order)=><tr key={order.id} className={cn("transition-colors hover:bg-[#f5faec]",selected?.id===order.id&&"bg-[#eff8df]")}>
            <td className="px-4 py-5"><input type="checkbox" aria-label={`Select ${shortId(order.id)}`} checked={checkedIds.includes(order.id)} onChange={()=>toggle(order.id)} className="size-4 accent-[#1c7b0d]" /></td>
            <td className="px-3 py-5"><button type="button" onClick={()=>setSelected(order)} className="whitespace-nowrap font-bold text-[#215018] hover:underline">{shortId(order.id)}</button></td>
            <td className="px-3 py-5"><button type="button" onClick={()=>setSelected(order)} className="text-left"><strong className="block whitespace-nowrap text-[#1e2d18]">{order.user.name}</strong><span className="mt-1 block whitespace-nowrap text-xs text-muted-foreground">{order.address.phone||order.user.email}</span></button></td>
            <td className="px-3 py-5"><span className="inline-flex items-center gap-2 rounded-lg bg-[#f8fbf2] px-2 py-1.5"><Shirt className="size-5 shrink-0 text-[#3f8426]" aria-hidden="true" /><span className="max-w-36 text-xs leading-snug">{order.items.map((item)=>item.name).join(", ")}</span></span></td>
            <td className="px-3 py-5 text-xs whitespace-nowrap">{order.items.map((item)=>`${item.quantity} ${item.unit==="KG"?"kg":item.unit==="ITEM"?"items":"service"}`).join(", ")}</td>
            <td className="px-3 py-5 whitespace-nowrap">{when(order.pickupDate)}<span className="mt-1 block text-xs text-muted-foreground">{order.pickupSlot}</span></td>
            <td className="px-3 py-5 whitespace-nowrap">{when(order.deliveryDate)}<span className="mt-1 block text-xs text-muted-foreground">{order.deliverySlot}</span></td>
            <td className="px-3 py-5 font-bold whitespace-nowrap">{money(order.total)}</td><td className="px-3 py-5"><Badge value={order.status} /></td>
            <td className="px-3 py-5"><span className="inline-flex gap-1"><button type="button" onClick={()=>setSelected(order)} aria-label={`View ${shortId(order.id)}`} aria-pressed={selected?.id===order.id} className="grid size-9 place-items-center rounded-lg hover:bg-secondary"><Eye className="size-4" /></button><DropdownMenu><DropdownMenuTrigger aria-label={`Actions for ${shortId(order.id)}`} className="grid size-9 place-items-center rounded-lg hover:bg-secondary"><MoreVertical className="size-4" /></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={()=>setSelected(order)}>View order details</DropdownMenuItem><DropdownMenuItem onClick={()=>onOpen(order.id)}>Manage payment / status</DropdownMenuItem></DropdownMenuContent></DropdownMenu></span></td>
          </tr>)}</tbody></table></div> : !loading&&<Empty title={counts.all?"No matching orders":"No orders yet"} message={counts.all?"Try another search or reset the filters.":"Create a new order to get started."} />}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#edf0e7] px-4 py-5 text-sm"><p className="text-muted-foreground">Showing {total?(currentPage-1)*pageSize+1:0}–{Math.min(currentPage*pageSize,total)} of {total.toLocaleString("en-IN")} orders</p><div className="flex flex-wrap items-center gap-2"><label className="inline-flex items-center gap-2 text-xs text-muted-foreground">Rows<select aria-label="Orders per page" value={pageSize} onChange={(event)=>{setPageSize(Number(event.target.value));setPage(1);setLoading(true);}} className="h-9 rounded-lg border border-border bg-white px-2">{[5,10,25,50].map((size)=><option key={size}>{size}</option>)}</select></label><nav aria-label="Orders pagination" className="flex items-center gap-1"><button type="button" aria-label="Previous page" disabled={loading||currentPage<=1} onClick={()=>changePage(currentPage-1)} className="grid size-9 place-items-center rounded-lg border border-border disabled:opacity-40"><ChevronLeft className="size-4" /></button>{[...new Set([1,...Array.from({length:3},(_,index)=>currentPage-1+index).filter((value)=>value>0&&value<=pages),pages])].sort((a,b)=>a-b).map((value,index,values)=><span key={value} className="inline-flex items-center gap-1">{index>0&&value-values[index-1]>1&&<span className="px-1">…</span>}<button type="button" aria-current={value===currentPage?"page":undefined} disabled={loading} onClick={()=>changePage(value)} className={cn("grid size-9 place-items-center rounded-lg border border-border",value===currentPage?"border-[#166c0b] bg-[#166c0b] font-bold text-white":"hover:bg-secondary")}>{value}</button></span>)}<button type="button" aria-label="Next page" disabled={loading||currentPage>=pages} onClick={()=>changePage(currentPage+1)} className="grid size-9 place-items-center rounded-lg border border-border disabled:opacity-40"><ChevronRight className="size-4" /></button></nav></div></div>
      </section>
      {selected&&<OrderSidePanel key={selected.id} order={selected} services={snapshot.services} mutate={updateOrder} close={()=>setSelected(null)} onManage={()=>onOpen(selected.id)} />}
    </div>
  </div>;
}
