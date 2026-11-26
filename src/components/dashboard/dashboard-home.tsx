"use client";

import { useState } from "react";
import { ArrowDown, ArrowRight, ArrowUp, Eye, Layers, MoreVertical, Plus, Shirt, ShoppingBasket, Truck, UserPlus, Users, Settings2 } from "lucide-react";
import { OrdersChart } from "@/components/dashboard/orders-chart";
import { StatusChart } from "@/components/dashboard/status-chart";
import { Badge, Empty, money, Table, when } from "@/components/dashboard/ui";
import { shortId, type Snapshot } from "@/components/dashboard/types";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { hasPermission } from "@/lib/dashboard-permissions";

export const dashboardPanel = "min-w-0 rounded-[1.35rem] border border-[#e5e9df] bg-white shadow-[0_4px_12px_#27391508]";

export function DashboardHome({snapshot,onOpen,onNavigate,onNewOrder,onNewCustomer}:{snapshot:Snapshot;onOpen:(id:string)=>void;onNavigate:(section:"orders"|"services"|"pickups"|"customers")=>void;onNewOrder:()=>void;onNewCustomer:()=>void}) {
  const [days,setDays] = useState(30);
  const data = snapshot.dashboard;
  const current = data.daily.slice(-30);
  const previous = data.daily.slice(-60,-30);
  const sum = (rows:typeof current,key:"orders"|"customers"|"revenue")=>rows.reduce((total,row)=>total+row[key],0);
  const activePickups = data.statuses.filter((item)=>["ORDER_PLACED","PICKUP_SCHEDULED"].includes(item.status)).reduce((total,item)=>total+item.count,0);
  const cards = [
    {title:"Total Orders",value:data.orders.toLocaleString("en-IN"),icon:ShoppingBasket,key:"orders" as const},
    {title:"Total Customers",value:data.customers.toLocaleString("en-IN"),icon:Users,key:"customers" as const},
    {title:"Total Revenue",value:money(data.revenue),icon:Layers,key:"revenue" as const},
    {title:"Active Pickups",value:activePickups.toLocaleString("en-IN"),icon:Truck,key:null},
  ];
  const orders = [...snapshot.orders].sort((a,b)=>+new Date(b.createdAt)-+new Date(a.createdAt)).slice(0,5);
  const serviceTotal = data.services.reduce((total,item)=>total+item.count,0);
  return <div className="grid min-w-0 gap-5">
    <div className="grid gap-4 @min-[24rem]:grid-cols-2 @min-[62rem]:grid-cols-4">
      {cards.map(({title,value,icon:Icon,key},index)=>{
        const before = key ? sum(previous,key) : 0;
        const after = key ? sum(current,key) : 0;
        const growth = before ? Math.round((after-before)/before*100) : null;
        return <section key={title} className={cn(dashboardPanel,"flex items-start gap-3 p-4 xl:p-5",index===0 && "bg-linear-to-br from-[#f5faed] to-white")}>
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#eef7d8] text-[#2a800e]"><Icon className="size-8" strokeWidth={1.8} aria-hidden="true" /></span>
          <div className="min-w-0 flex-1"><h2 className="text-sm font-semibold text-[#1a2717]">{title}</h2><p className="mt-1 break-words text-[1.7rem] leading-tight font-extrabold tracking-tight text-[#101c0c]">{value}</p>
            <p className="mt-2 text-xs text-muted-foreground">{key ? <>{growth!==null ? <span className={cn("mr-1 inline-flex items-center font-bold",growth>=0?"text-[#26820d]":"text-[#bb521b]")}>{growth>=0?<ArrowUp className="size-3" />:<ArrowDown className="size-3" />}{Math.abs(growth)}%</span> : <span className="mr-1 font-semibold">{after ? "New activity" : "No activity"}</span>}last 30 vs. prior 30 days</> : "Awaiting pickup"}</p>
          </div>
        </section>;
      })}
    </div>
    <div className="grid items-stretch gap-5 @min-[44rem]:grid-cols-2 @min-[68rem]:grid-cols-[1.65fr_1.1fr_0.85fr]">
      <section className={cn(dashboardPanel,"@min-[44rem]:col-span-2 @min-[68rem]:col-span-1")}>
        <div className="flex flex-wrap items-center justify-between gap-3 p-5"><h2 className="text-xl font-extrabold tracking-tight text-[#14350e]">Orders Overview</h2><select aria-label="Orders chart period" value={days} onChange={(event)=>setDays(Number(event.target.value))} className="h-9 rounded-lg border border-[#dfe5d9] bg-white px-3 text-sm"><option value={7}>Last 7 Days</option><option value={30}>Last 30 Days</option><option value={90}>Last 90 Days</option></select></div>
        <OrdersChart points={data.daily.slice(-days)} />
      </section>
      <section className={dashboardPanel}><h2 className="p-5 text-xl font-extrabold tracking-tight text-[#14350e]">Orders by Status</h2><StatusChart statuses={data.statuses} /></section>
      <section className={dashboardPanel}><h2 className="p-5 text-xl font-extrabold tracking-tight text-[#14350e]">Quick Actions</h2><div className="grid gap-2.5 px-5 pb-5">{[
        {title:"New Order",icon:Plus,action:onNewOrder,permission:"orders"},
        {title:"Schedule Pickup",icon:Truck,action:()=>onNavigate("pickups"),permission:"pickups"},
        {title:"Manage Services",icon:Settings2,action:()=>onNavigate("services"),permission:"services"},
        {title:"Add Customer",icon:UserPlus,action:onNewCustomer,permission:"customers"},
      ].filter((item)=>hasPermission(snapshot.user,item.permission)).map(({title,icon:Icon,action},index)=><button key={title} type="button" onClick={action} className="flex min-h-11 items-center gap-3 rounded-xl bg-[#f0f7df] px-3 py-2 text-left text-sm font-bold text-[#1b3913] transition-colors hover:bg-[#e2f0c0]"><Icon className={cn("size-6 shrink-0 text-[#33840f]",index===0 && "rounded-full bg-[#ff7900] p-0.5 text-white")} aria-hidden="true" />{title}</button>)}</div></section>
    </div>
    <div className="grid gap-5 @min-[62rem]:grid-cols-[minmax(0,3fr)_minmax(240px,1fr)]">
      <section className={cn(dashboardPanel,"overflow-hidden")}><div className="flex flex-wrap items-center justify-between gap-3 p-5"><h2 className="text-xl font-extrabold tracking-tight text-[#14350e]">Recent Orders</h2>{hasPermission(snapshot.user,"orders") && <button type="button" onClick={()=>onNavigate("orders")} className="inline-flex items-center gap-2 text-sm font-semibold text-[#297411]">View All Orders <ArrowRight className="size-4" aria-hidden="true" /></button>}</div>
        {orders.length ? <Table headers={["Order ID","Customer","Service","Pickup Date","Delivery Date","Amount","Status","Action"]}>{orders.map((order)=><tr key={order.id}><td><strong>{shortId(order.id)}</strong></td><td>{order.user.name}</td><td>{order.items.map((item)=>item.name).join(", ")}</td><td className="whitespace-nowrap">{when(order.pickupDate)}</td><td className="whitespace-nowrap">{when(order.deliveryDate)}</td><td className="font-semibold">{money(order.total)}</td><td><Badge value={order.status} /></td><td><span className="inline-flex gap-1"><button type="button" aria-label={`View order ${shortId(order.id)}`} onClick={()=>onOpen(order.id)} className="grid size-9 place-items-center rounded-lg hover:bg-secondary"><Eye className="size-4" /></button><DropdownMenu><DropdownMenuTrigger aria-label={`Actions for ${shortId(order.id)}`} className="grid size-9 place-items-center rounded-lg hover:bg-secondary"><MoreVertical className="size-4" /></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={()=>onOpen(order.id)}>View details / update status</DropdownMenuItem></DropdownMenuContent></DropdownMenu></span></td></tr>)}</Table> : <Empty title="No orders yet" message="Create an order or wait for a customer booking. New orders appear here automatically when refreshed." />}
      </section>
      <section className={dashboardPanel}><h2 className="p-5 text-xl font-extrabold tracking-tight text-[#14350e]">Service Performance</h2>{data.services.length ? <ul className="divide-y divide-[#edf0e7] px-5 pb-4">{data.services.map((service)=><li key={service.id+service.name} className="flex items-center gap-3 py-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f0f7df] text-[#33840f]"><Shirt className="size-6" aria-hidden="true" /></span><span className="min-w-0 flex-1 text-sm">{service.name}</span><strong className="text-sm">{service.count}</strong><span className="text-xs text-muted-foreground">({Math.round(service.count/Math.max(1,serviceTotal)*100)}%)</span></li>)}</ul> : <Empty title="No service activity" message="Booked services will appear here." />}<p className="px-5 pb-4 text-xs text-muted-foreground">Bookings per service · top five</p></section>
    </div>
  </div>;
}
