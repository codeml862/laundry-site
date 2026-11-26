"use client";

import {
  Activity, ArrowUpRight, BadgePercent, Bell, ChevronsUpDown, CircleAlert, CircleDollarSign, Headphones, LayoutDashboard,
  LoaderCircle, LogOut, Menu, Package, PanelLeftClose, PanelLeftOpen, RefreshCw, Settings2, Shredder, Tag, Truck, UserRound, Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Coupons } from "@/components/dashboard/catalog";
import { ServicesPage } from "@/components/dashboard/services";
import { OrderDetails, OrdersPage } from "@/components/dashboard/orders";
import { PickupsPage } from "@/components/dashboard/pickups/pickups-page";
import { PaymentsPage } from "@/components/dashboard/payments";
import { ReportsPage } from "@/components/dashboard/reports";
import { StaffPage } from "@/components/dashboard/staff";
import { DashboardHome } from "@/components/dashboard/dashboard-home";
import { DashboardSearch } from "@/components/dashboard/dashboard-search";
import { CreateCustomer, CreateOrder } from "@/components/dashboard/create-dialogs";
import { CustomersPage } from "@/components/dashboard/customers";
import { BusinessSettings, Tickets } from "@/components/dashboard/settings";
import { label, ui } from "@/components/dashboard/ui";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Brand } from "@/components/site/brand";
import { hasPermission } from "@/lib/dashboard-permissions";
import { type Mutate, type Snapshot } from "@/components/dashboard/types";

const sections = [
  { id: "overview", title: "Dashboard", description: "Manage your laundry operations, orders, customers and more.", Icon: LayoutDashboard },
  { id: "orders", title: "Orders", description: "Manage each booking from pickup to delivery.", Icon: Package },
  { id: "customers", title: "Customers", description: "Every customer account with addresses and booking history.", Icon: UserRound },
  { id: "services", title: "Services", description: "Control what customers can book and what they’ll pay.", Icon: Shredder },
  { id: "pricing", title: "Pricing", description: "Manage service rates, pricing units and turnaround times.", Icon: Tag },
  { id: "pickups", title: "Pickups & Deliveries", description: "Schedule pickups and track active collections and deliveries.", Icon: Truck },
  { id: "payments", title: "Payments", description: "Review payment activity and manage refunds.", Icon: CircleDollarSign },
  { id: "analytics", title: "Reports & Analytics", description: "Track key metrics and business performance.", Icon: Activity },
  { id: "team", title: "Users & Staff", description: "Administrator accounts with access to your operations dashboard.", Icon: Users },
  { id: "coupons", title: "Coupons", description: "Manage promotions for eligible customers.", Icon: BadgePercent },
  { id: "support", title: "Support", description: "Review complaints and customer questions.", Icon: Headphones },
  { id: "settings", title: "Settings", description: "Change the settings customers use to book.", Icon: Settings2 },
] as const;

type Section = typeof sections[number]["id"];
type Failure = { status: number; message: string };

async function getSnapshot(signal?: AbortSignal) {
  const response = await fetch("/api/admin", { cache: "no-store", signal });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw { status: response.status, message: data?.error || "Unable to load the operations dashboard." } satisfies Failure;
  return data as Snapshot;
}

export function AdminAccess({ status, loading, message, retry }: {
  status?: number; loading?: boolean; message?: string; retry?: () => void;
}) {
  if (loading) return (
    <main className="grid min-h-svh place-items-center bg-[#f5f8f6] px-4" aria-busy="true">
      <LoaderCircle className="size-10 animate-spin text-primary" aria-hidden="true" />
      <span className="sr-only">Loading dashboard</span>
    </main>
  );

  return (
    <main className="grid min-h-svh place-items-center bg-[#f5f8f6] px-4">
      <section className="w-full max-w-md rounded-3xl border border-border bg-white p-8 text-center shadow-[0_24px_60px_#1d211e14]">
        <>
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#ecf6ee] text-primary"><CircleAlert className="size-7" aria-hidden="true" /></span>
          <h1 className="mt-4 text-2xl font-extrabold tracking-[-0.03em]">
            {status === 401 ? "Please sign in" : status === 403 ? "Dashboard access required" : "Dashboard unavailable"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {status === 401 ? "Sign in with an administrator, staff or rider account." : status === 403 ? message || "Your account does not have access to this dashboard. Contact your administrator." : message}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {status === 401 && <Link className={ui.button} href="/admin/login">Sign in</Link>}
            {retry && status !== 401 && status !== 403 && <button className={ui.button} type="button" onClick={retry}>Try again</button>}
            <Link className={ui.secondary} href="/">Back to website</Link>
          </div>
        </>
      </section>
    </main>
  );
}

export default function Operations({ initialSnapshot }: { initialSnapshot?: Snapshot }) {
  const router = useRouter();
  const latestLoad = useRef(0);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(initialSnapshot ?? null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [loading, setLoading] = useState(!initialSnapshot);
  const [notice, setNotice] = useState("");
  const [section, setSection] = useState<Section>("overview");
  const [selectedOrder, setSelectedOrder] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSaved, setProfileSaved] = useState(false);
  const [createOrderOpen, setCreateOrderOpen] = useState(false);
  const [createCustomerOpen, setCreateCustomerOpen] = useState(false);
  const [directorySelection, setDirectorySelection] = useState("");

  const load = useCallback((signal?: AbortSignal) => {
    const loadId = ++latestLoad.current;
    const isCurrent = () => loadId === latestLoad.current && !signal?.aborted;
    return getSnapshot(signal).then((data) => {
      if (isCurrent()) {
        setSnapshot(data);
        setFailure(null);
      }
    }).catch((cause: unknown) => {
      if (isCurrent()) {
        const error = cause as Partial<Failure>;
        const status = error.status ?? 0;
        if (status === 401 || status === 403) setSnapshot(null);
        setFailure({ status, message: error.message || "Could not connect. Try reloading the dashboard." });
      }
    }).finally(() => {
      if (isCurrent()) setLoading(false);
    });
  }, []);

  // The server page passes the first snapshot in; only fetch here when it did not.
  const hasInitial = Boolean(initialSnapshot);
  useEffect(() => {
    if (hasInitial) return;
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load, hasInitial]);

  async function refresh() {
    setLoading(true);
    setFailure(null);
    await load();
  }

  const mutate: Mutate = async (action, fields, message) => {
    setNotice("");
    const response = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...fields, action }),
    });
    if (response.status === 401 || response.status === 403) await refresh();
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.error || "The change could not be saved.");
    }
    setNotice(message);
    await refresh();
  };

  async function signOut() {
    setSigningOut(true);
    setNotice("");
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
      });
      if (!response.ok) throw new Error();
      router.replace("/admin/login");
      router.refresh();
    } catch {
      setSigningOut(false);
      setNotice("Sign out failed. Try again.");
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (profileSaving) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    setProfileSaving(true);
    setProfileError("");
    setProfileSaved(false);
    try {
      const response = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "profile", name: fields.get("name"), email: fields.get("email"), phone: fields.get("phone") ?? "", currentPassword: fields.get("currentPassword") || undefined, newPassword: fields.get("newPassword") || undefined }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Your profile could not be saved.");
      // Prevent a dashboard refresh started before this save from restoring stale identity data.
      ++latestLoad.current;
      setLoading(false);
      setSnapshot((current) => current ? { ...current, user: data.user } : current);
      setProfileSaved(true);
      form.querySelectorAll<HTMLInputElement>("input[type=password]").forEach((input) => { input.value = ""; });
      router.refresh();
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Your profile could not be saved. Please try again.");
    } finally {
      setProfileSaving(false);
    }
  }

  if (!snapshot) return <AdminAccess loading={loading} status={failure?.status} message={failure?.message} retry={() => void refresh()} />;

  const visibleSections = sections.filter((item)=>{
    if(item.id === "team" || item.id === "settings")return snapshot.user.role === "ADMIN";
    return hasPermission(snapshot.user,item.id === "overview" ? "dashboard" : item.id === "analytics" ? "reports" : item.id);
  });
  const active = visibleSections.find((item) => item.id === section) ?? visibleSections[0];
  if(!active)return <AdminAccess status={403} message="Ask your administrator to assign dashboard permissions." />;
  const orders = [...snapshot.orders].sort((first, second) => +new Date(second.createdAt) - +new Date(first.createdAt));
  const order = orders.find((item) => item.id === selectedOrder);

  function navigate(next: Section) {
    if(!visibleSections.some((item)=>item.id===next))return;
    setSection(next);
    setDirectorySelection("");
    setNotice("");
    // Start each section at the top of the scrollable content (desktop) or the page (mobile).
    document.querySelector("[data-dashboard-scroll]")?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
  }

  async function openSearchResult(kind: "orders" | "customers" | "services", id: string) {
    try {
      if (kind === "orders" || kind === "customers") {
        const key = kind === "orders" ? "orderId" : "customerId";
        const response = await fetch(`/api/admin?${key}=${encodeURIComponent(id)}`, {cache:"no-store"});
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not open this record.");
        setSnapshot((current)=>current ? {...current,
          ...(data.order ? {orders:[data.order,...current.orders.filter((item)=>item.id!==id)]} : {}),
          ...(data.customer ? {customers:[data.customer,...current.customers.filter((item)=>item.id!==id)]} : {}),
        } : current);
      }
      if (kind === "orders") setSelectedOrder(id);
      else {navigate(kind);setDirectorySelection(id);}
    } catch(error) {setNotice(error instanceof Error ? error.message : "Could not open this record.");}
  }

  const initial = snapshot.user.name.trim().charAt(0).toUpperCase();
  const heading = active.title;
  const description = active.description;

  // Settings opens from the profile menu, so it is left out of the sidebar list.
  const navItems = visibleSections.filter(({ id }) => id !== "settings").map(({ id, title, Icon }) => ({ id, title, Icon }));
  const nav = (onPick?: () => void, compact = false) => (
    <nav aria-label="Operations dashboard" className="grid gap-1">
      {navItems.map(({ id, title, Icon }) => {
        const current = active.id === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => { navigate(id); onPick?.(); }}
            aria-current={current ? "page" : undefined}
            title={compact ? title : undefined}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors",
              compact && "mx-auto size-11 justify-center p-0",
              current ? "bg-[#ff7900] text-white shadow-[0_5px_18px_#001c1030]" : "text-white/90 hover:bg-white/10 hover:text-white",
            )}
          >
            <Icon className="size-5 shrink-0" aria-hidden="true" />
            <span className={compact ? "sr-only" : ""}>{title}</span>
            {!compact && id === "orders" && snapshot.dashboard.statuses.some((item)=>item.status==="ORDER_PLACED"&&item.count>0) && <span className="ml-auto rounded-full bg-[#ff7900] px-2 py-0.5 text-xs text-white">{snapshot.dashboard.statuses.find((item)=>item.status==="ORDER_PLACED")?.count}</span>}
          </button>
        );
      })}
    </nav>
  );
  const sidebarFooter = (compact = false) => (
    <div className="grid gap-1 border-t border-white/10 pt-3">
      <Link href="/" title={compact ? "View website" : undefined} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white", compact && "mx-auto size-11 justify-center p-0")}>
        <ArrowUpRight className="size-[18px] shrink-0" aria-hidden="true" /> <span className={compact ? "sr-only" : ""}>View website</span>
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger disabled={signingOut} aria-label={`Open profile menu for ${snapshot.user.name}`} title={compact ? snapshot.user.name : undefined} className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-white transition-colors hover:bg-white/10 data-popup-open:bg-white/10 disabled:opacity-60", compact && "mx-auto size-12 justify-center p-0")}>
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#278d47] text-sm font-bold text-white ring-1 ring-white/15" aria-hidden="true">{initial}</span>
          <span className={compact ? "sr-only" : "grid min-w-0 flex-1 leading-tight"}>
            <span className="truncate text-sm font-semibold">{snapshot.user.name}</span>
            <span className="mt-1 text-xs text-white/55">{signingOut ? "Signing out…" : label(snapshot.user.role)}</span>
          </span>
          {!compact && <ChevronsUpDown className="size-4 shrink-0 text-white/50" aria-hidden="true" />}
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" sideOffset={8} className="min-w-56 rounded-2xl p-2 shadow-xl">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-bold">{snapshot.user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{snapshot.user.email}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="gap-3 rounded-lg px-3 py-2.5" onClick={() => { setMenuOpen(false); setProfileError(""); setProfileSaved(false); setProfileOpen(true); }}><UserRound aria-hidden="true" /> Profile info</DropdownMenuItem>
          {snapshot.user.role === "ADMIN" && <DropdownMenuItem className="gap-3 rounded-lg px-3 py-2.5" onClick={() => { navigate("settings"); setMenuOpen(false); }}><Settings2 aria-hidden="true" /> Settings</DropdownMenuItem>}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" disabled={signingOut} className="gap-3 rounded-lg px-3 py-2.5" onClick={() => void signOut()}><LogOut aria-hidden="true" /> {signingOut ? "Signing out…" : "Sign out"}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <div className="min-h-svh bg-[#fcfcf8] text-foreground md:flex md:h-svh md:overflow-hidden">
      {/* Sidebar (desktop): fixed full height; only the content area scrolls */}
      <aside id="dashboard-sidebar" aria-label="Dashboard sidebar" className={cn("relative isolate hidden h-full shrink-0 flex-col gap-4 overflow-hidden bg-linear-to-b from-[#0b4c06] to-[#063705] py-5 transition-[width] duration-200 motion-reduce:transition-none md:flex", sidebarCollapsed ? "w-20 px-3" : "w-56 px-3 xl:w-64")}>
        <div className={sidebarCollapsed ? "flex justify-center" : "px-2"}><Brand light compact={sidebarCollapsed} /></div>
        <div className="dashboard-sidebar-scroll dashboard-sidebar-scroll-hidden -mx-3 grid min-h-0 flex-1 content-start gap-2 overflow-y-auto px-3">
          <p className="sr-only">Manage</p>
          {nav(undefined, sidebarCollapsed)}
        </div>
        <div className="mt-auto shrink-0">{sidebarFooter(sidebarCollapsed)}</div>
      </aside>

      <div className="min-w-0 flex-1 md:h-full md:overflow-y-auto" data-dashboard-scroll>
        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b border-border bg-white/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-[1680px] flex-wrap items-center gap-3 px-4 py-4 sm:px-6 lg:px-7">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger render={<button type="button" className={cn(ui.icon, "size-11 md:hidden")} aria-label="Open dashboard menu" />}>
                <Menu className="size-5" />
              </SheetTrigger>
              <SheetContent side="left" className="dashboard-sidebar-scroll w-72 max-w-[calc(100vw-2rem)] gap-6 overflow-y-auto border-r-0 bg-[#084605] p-4 pt-6 text-white">
                <SheetTitle className="sr-only">Dashboard menu</SheetTitle>
                <div className="px-2"><Brand light /></div>
                {nav(() => setMenuOpen(false))}
                <div className="mt-auto">{sidebarFooter()}</div>
              </SheetContent>
            </Sheet>
            <button type="button" className={cn(ui.icon, "hidden size-11 md:inline-flex")} aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!sidebarCollapsed} aria-controls="dashboard-sidebar" title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}>
              {sidebarCollapsed ? <PanelLeftOpen className="size-5" aria-hidden="true" /> : <PanelLeftClose className="size-5" aria-hidden="true" />}
            </button>

            <div className="min-w-0 flex-1"><h1 className="text-xl leading-tight font-extrabold tracking-tight text-[#12340e] lg:text-2xl">{active.id === "overview" ? `${snapshot.user.role === "ADMIN" ? "Admin" : snapshot.user.role === "RIDER" ? "Rider" : "Staff"} Dashboard` : heading}</h1><p className="mt-1 hidden text-sm text-muted-foreground xl:block">{description}</p></div>

            <div className="ml-auto flex items-center gap-3">
              <DropdownMenu><DropdownMenuTrigger aria-label="Open operational alerts" className="relative grid size-10 place-items-center rounded-full bg-[#f0f4e9] text-[#193a10]"><Bell className="size-5" aria-hidden="true" />{(snapshot.tickets.some((ticket)=>ticket.status==="OPEN")||(snapshot.enquiries ?? []).some((item)=>item.status==="NEW")||snapshot.dashboard.statuses.some((item)=>item.status==="ORDER_PLACED"&&item.count>0))&&<span className="absolute top-0 right-0 size-2.5 rounded-full bg-[#ff7900] ring-2 ring-white" />}</DropdownMenuTrigger><DropdownMenuContent align="end" className="w-72 rounded-2xl p-2"><p className="px-3 py-2 text-sm font-bold">Operational alerts</p><DropdownMenuItem onClick={()=>navigate("pickups")} className="px-3 py-2">{snapshot.dashboard.statuses.filter((item)=>["ORDER_PLACED","PICKUP_SCHEDULED"].includes(item.status)).reduce((sum,item)=>sum+item.count,0)} orders awaiting pickup</DropdownMenuItem><DropdownMenuItem onClick={()=>navigate("support")} className="px-3 py-2">{snapshot.tickets.filter((ticket)=>ticket.status==="OPEN").length} open support requests</DropdownMenuItem><DropdownMenuItem onClick={()=>navigate("support")} className="px-3 py-2">{(snapshot.enquiries ?? []).filter((item)=>item.status==="NEW").length} new website enquiries</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
              <button type="button" className={ui.icon} aria-label="Refresh dashboard" disabled={loading} onClick={() => void refresh()}>
                <RefreshCw className={cn("size-4", loading && "animate-spin")} aria-hidden="true" />
              </button>
            </div>
            <div className="w-full lg:order-none lg:ml-auto lg:w-72 xl:w-80"><DashboardSearch onPick={(kind,id)=>void openSearchResult(kind,id)} /></div>
          </div>
        </header>

        <main className="@container mx-auto min-w-0 max-w-[1680px] px-4 py-5 sm:px-6 lg:px-7">
          {!["overview","orders","customers","services","pricing","pickups","payments","analytics","team"].includes(active.id) && <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-[1.9rem] leading-tight font-extrabold tracking-[-0.04em] sm:text-4xl">{heading}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground sm:text-base">{description}</p>
            </div>
            {active.id === "overview" && (
              <button type="button" className={ui.button} onClick={() => navigate("orders")}>
                <Package className="size-4" aria-hidden="true" /> View all orders
              </button>
            )}
          </div>}

          {notice && <p className={ui.alert} role="status">{notice}</p>}
          {failure && <p className={ui.alertError} role="alert">{failure.message}</p>}

          <div className="grid min-w-0 gap-5 [&>*]:min-w-0">
            {active.id === "overview" && <DashboardHome snapshot={snapshot} onOpen={setSelectedOrder} onNavigate={navigate} onNewOrder={()=>setCreateOrderOpen(true)} onNewCustomer={()=>setCreateCustomerOpen(true)} />}
            {active.id === "orders" && <OrdersPage snapshot={snapshot} mutate={mutate} onOpen={(id)=>void openSearchResult("orders",id)} onNewOrder={()=>setCreateOrderOpen(true)} />}
            {(active.id === "services" || active.id === "pricing") && <ServicesPage key={section+directorySelection} services={snapshot.services} mutate={mutate} initialId={directorySelection} onChanged={refresh} />}
            {active.id === "customers" && <CustomersPage key={directorySelection} snapshot={snapshot} mutate={mutate} onOpenOrder={(id)=>void openSearchResult("orders",id)} initialId={directorySelection} onNewCustomer={()=>setCreateCustomerOpen(true)} />}
            {active.id === "pickups" && <PickupsPage snapshot={snapshot} mutate={mutate} onChanged={refresh} onOpenOrder={(id)=>void openSearchResult("orders",id)} />}
            {active.id === "team" && <StaffPage snapshot={snapshot} onChanged={refresh} />}
            {active.id === "coupons" && <Coupons coupons={snapshot.coupons} mutate={mutate} />}
            {active.id === "payments" && <PaymentsPage snapshot={snapshot} mutate={mutate} onChanged={refresh} onOpenOrder={(id)=>void openSearchResult("orders",id)} />}
            {active.id === "analytics" && <ReportsPage />}
            {active.id === "support" && <Tickets tickets={snapshot.tickets} enquiries={snapshot.enquiries ?? []} mutate={mutate} />}
            {active.id === "settings" && <BusinessSettings settings={snapshot.settings} mutate={mutate} />}
          </div>
          {order && <OrderDetails key={order.id} order={order} mutate={mutate} close={() => setSelectedOrder("")} />}
          {createCustomerOpen && <CreateCustomer mutate={mutate} close={()=>setCreateCustomerOpen(false)} />}
          {createOrderOpen && <CreateOrder snapshot={snapshot} close={()=>setCreateOrderOpen(false)} onCreated={async(id)=>{await refresh();setNotice("Order created successfully.");setSelectedOrder(id);}} />}
        </main>
      </div>
      <Dialog open={profileOpen} onOpenChange={(open) => { if (!profileSaving) setProfileOpen(open); }}>
        <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto rounded-3xl p-6 sm:max-w-md" showCloseButton={!profileSaving}>
          <span className="grid size-14 place-items-center rounded-full bg-secondary text-xl font-bold text-primary" aria-hidden="true">{initial}</span>
          <DialogTitle className="text-xl font-bold">Profile info</DialogTitle>
          <DialogDescription>Update your contact details and password.</DialogDescription>
          <form onSubmit={saveProfile} className="grid gap-4" onChange={() => setProfileSaved(false)}>
            <fieldset disabled={profileSaving} className="grid gap-4 disabled:opacity-60">
              <label className="grid gap-1.5 text-sm font-semibold">Name<input name="name" autoComplete="name" defaultValue={snapshot.user.name} required maxLength={80} className="h-11 w-full rounded-xl border border-input bg-white px-3 font-normal" /></label>
              <label className="grid gap-1.5 text-sm font-semibold">Email<input name="email" type="email" autoComplete="email" defaultValue={snapshot.user.email} required maxLength={254} className="h-11 w-full rounded-xl border border-input bg-white px-3 font-normal" /><span className="text-xs font-normal text-muted-foreground">Use this email the next time you sign in.</span></label>
              <label className="grid gap-1.5 text-sm font-semibold">Phone<input name="phone" type="tel" autoComplete="tel" defaultValue={snapshot.user.phone ?? ""} maxLength={24} placeholder="Optional" className="h-11 w-full rounded-xl border border-input bg-white px-3 font-normal" /></label>
              <div className="grid gap-3 rounded-2xl border border-border p-3">
                <p className="text-sm font-semibold">Change password <span className="font-normal text-muted-foreground">(optional)</span></p>
                <label className="grid gap-1.5 text-sm font-medium">Current password<input name="currentPassword" type="password" autoComplete="current-password" maxLength={128} className="h-11 w-full rounded-xl border border-input bg-white px-3 font-normal" /></label>
                <label className="grid gap-1.5 text-sm font-medium">New password<input name="newPassword" type="password" autoComplete="new-password" minLength={8} maxLength={128} className="h-11 w-full rounded-xl border border-input bg-white px-3 font-normal" /></label>
              </div>
              <p className="rounded-xl bg-secondary px-3 py-2.5 text-sm text-primary">Role: <strong>{label(snapshot.user.role)}</strong></p>
            </fieldset>
            {profileError && <p role="alert" className="text-sm text-red-700">{profileError}</p>}
            {profileSaved && <p role="status" className="text-sm font-medium text-primary">Profile saved successfully.</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" disabled={profileSaving} onClick={() => setProfileOpen(false)} className={ui.secondary}>Close</button>
              <button type="submit" disabled={profileSaving} className={ui.button}>{profileSaving && <LoaderCircle className="mr-2 size-4 animate-spin" aria-hidden="true" />}{profileSaving ? "Saving…" : "Save changes"}</button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
