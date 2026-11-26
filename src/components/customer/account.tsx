"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import {
  ArrowLeft, ArrowRight, Bell, BadgePercent, Check, ChevronsUpDown, Clock3, CreditCard, Headphones, House, Loader2,
  LogOut, MapPin, Menu, Package, PackageCheck, PanelLeftClose, PanelLeftOpen, Pencil, Plus, RotateCcw, Settings2, Star, Trash2, UserRound,
} from "lucide-react";
import { Brand } from "@/components/site/brand";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { AddressForm } from "@/components/customer/address-form";
import { PriceBreakdown } from "@/components/customer/booking";
import { useCart } from "@/components/customer/cart";
import { maxCartQuantity, maxCartServices, orderDate, statusLabels, unitLabel, type Account as AccountData, type Address, type Catalog, type Order } from "@/components/customer/data";
import { friendlyError, post, rupees } from "@/components/customer/http";
import { openPayment, type PaymentSession } from "@/components/customer/payment";
import { Alert, Empty, btn, card as baseCard, fieldClass } from "@/components/customer/ui";

const card = cn(baseCard, "shadow-none");
import { useData } from "@/components/customer/use-data";

/* ---------- Shared look ---------- */

const flow = ["ORDER_PLACED", "PICKUP_SCHEDULED", "PICKED_UP", "RECEIVED", "WASHING", "DRYING", "IRONING", "QUALITY_CHECK", "READY", "OUT_FOR_DELIVERY", "DELIVERED"];

function StatusBadge({ status, children }: { status: string; children?: ReactNode }) {
  const tone = ["DELIVERED", "PAID", "RESOLVED"].includes(status) ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : ["CANCELLED", "REFUNDED"].includes(status) ? "bg-slate-100 text-slate-600 ring-slate-200"
    : ["PENDING", "ORDER_PLACED", "OPEN", "REFUND_PENDING"].includes(status) ? "bg-amber-50 text-amber-800 ring-amber-200"
    : "bg-secondary text-primary ring-primary/20";
  return <span className={cn("inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ring-1 ring-inset", tone)}>{children ?? statusLabels[status as keyof typeof statusLabels] ?? status}</span>;
}

/* ---------- Page ---------- */

const tabs = [
  { id: "orders", label: "Orders", icon: Package },
  { id: "addresses", label: "Addresses", icon: MapPin },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "offers", label: "Offers", icon: BadgePercent },
  { id: "updates", label: "Updates", icon: Bell },
  { id: "support", label: "Support", icon: Headphones },
  // Opened from the profile menu in the sidebar footer, not listed in the sidebar.
  { id: "profile", label: "Profile & settings", icon: UserRound },
] as const;
const navTabs = tabs.filter(({ id }) => id !== "profile");
const collapseKey = "quicklywash:account-sidebar-collapsed";

function accountHref(tab: string) {
  return tab === "orders" ? "/account" : `/account?tab=${tab}`;
}

function orderHref(id: string) {
  return `/account?order=${encodeURIComponent(id)}`;
}

function reference(id: string) {
  return id.slice(-8).toUpperCase();
}

function prettyStatus(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase().replaceAll("_", " ");
}

function isActive(order: Order) {
  return order.status !== "CANCELLED" && order.status !== "DELIVERED";
}

/* Sidebar collapse is remembered per browser. Storage can be unavailable (private mode), so it never blocks the UI. */
const collapseListeners = new Set<() => void>();
let collapsedFallback = false;
function readCollapsed() {
  try { return window.localStorage.getItem(collapseKey) === "1"; } catch { return collapsedFallback; }
}
function writeCollapsed(value: boolean) {
  collapsedFallback = value;
  try { window.localStorage.setItem(collapseKey, value ? "1" : "0"); } catch { /* keep the in-memory value */ }
  collapseListeners.forEach((listener) => listener());
}
function subscribeCollapsed(listener: () => void) {
  collapseListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => { collapseListeners.delete(listener); window.removeEventListener("storage", listener); };
}

function FullScreen({ children }: { children: ReactNode }) {
  return <div className="account-theme grid min-h-svh place-items-center bg-background p-5 text-muted-foreground">{children}</div>;
}

export function Account() {
  const data = useData<AccountData>("/api/account");
  const router = useRouter();
  const search = useSearchParams();
  const orderId = search.get("order");
  const tab = tabs.find(({ id }) => id === search.get("tab"))?.id ?? "orders";
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const collapsed = useSyncExternalStore(subscribeCollapsed, readCollapsed, () => false);
  function toggleCollapsed() {
    writeCollapsed(!collapsed);
  }

  // Each section starts at the top of the scrollable content area.
  useEffect(() => {
    document.querySelector("[data-dashboard-scroll]")?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
  }, [tab, orderId]);

  async function logout() {
    setSigningOut(true);
    setLogoutError("");
    try {
      await post("/api/auth", { action: "logout" });
      router.replace("/");
      router.refresh();
    } catch (caught) {
      setLogoutError(friendlyError(caught));
      setSigningOut(false);
    }
  }

  if (data.loading) {
    return <FullScreen><span className="inline-flex items-center gap-2" role="status"><Loader2 className="size-5 animate-spin text-primary" /> Loading your account…</span></FullScreen>;
  }
  if (data.status === 401) {
    const destination = orderId ? orderHref(orderId) : accountHref(tab);
    return <FullScreen><Empty icon={UserRound} title="Log in to continue" message="Sign in to view orders, manage your addresses, and contact support." href={`/login?next=${encodeURIComponent(destination)}`} linkText="Log in" /></FullScreen>;
  }
  if (data.error) {
    return (
      <FullScreen>
        <div className="grid justify-items-center gap-4">
          <Alert>{data.error}</Alert>
          <button className={btn.outline} onClick={data.refresh}>Try again</button>
        </div>
      </FullScreen>
    );
  }
  if (!data.data) return null;

  const account = data.data;
  const activeOrder = orderId ? account.orders.find((order) => order.id === orderId) : undefined;
  const activeCount = account.orders.filter(isActive).length;
  const unread = account.notifications.filter((notification) => !notification.read).length;
  const firstName = account.user.name.split(" ")[0];
  const initial = firstName.charAt(0).toUpperCase();
  const counts: Partial<Record<(typeof tabs)[number]["id"], number>> = { orders: activeCount, addresses: account.addresses.length, updates: unread, offers: account.coupons.length };
  const current = tabs.find(({ id }) => id === tab) ?? tabs[0];
  const pending = account.orders.filter((order) => order.payment?.status === "PENDING" && order.payment.method === "RAZORPAY" && order.status !== "CANCELLED").length;

  const stats = [
    { label: "In progress", value: activeCount, icon: Clock3, href: "/account" },
    { label: "Completed", value: account.orders.filter((order) => order.status === "DELIVERED").length, icon: PackageCheck, href: "/account" },
    { label: "Payments due", value: pending, icon: CreditCard, href: accountHref("payments") },
    { label: "Unread updates", value: unread, icon: Bell, href: accountHref("updates") },
  ];

  const sidebar = (compact: boolean, onPick?: () => void) => (
    <div className="flex h-full flex-col gap-5">
      <div className={cn("flex items-center", compact ? "justify-center" : "pl-1")}>
        <Brand compact={compact} />
      </div>

      <Link href="/book" onClick={onPick} title={compact ? "Book a pickup" : undefined}
        className={cn(btn.primary, "h-11", compact ? "mx-auto size-11 p-0" : "w-full")}>
        <Plus className="size-[18px]" aria-hidden="true" /><span className={compact ? "sr-only" : ""}>Book a pickup</span>
      </Link>

      <nav aria-label="Account sections" className="grid gap-1">
        {!compact && <p className="px-3 pb-1 text-[0.7rem] font-semibold tracking-[0.12em] text-muted-foreground/80 uppercase">Menu</p>}
        {navTabs.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <Link key={id} href={accountHref(id)} onClick={onPick} aria-current={active ? "page" : undefined} title={compact ? label : undefined}
              className={cn(
                "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-150",
                compact && "mx-auto size-11 justify-center p-0",
                active ? "bg-secondary text-primary" : "text-slate-600 hover:bg-muted hover:text-foreground",
              )}>
              <Icon className="size-[18px] shrink-0" aria-hidden="true" />
              <span className={compact ? "sr-only" : ""}>{label}</span>
              {!!counts[id] && (compact
                ? <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary ring-2 ring-white" aria-label={`${counts[id]} items`} />
                : <span className={cn("ml-auto min-w-6 rounded-full px-2 py-0.5 text-center text-xs font-semibold", active ? "bg-white text-primary" : "bg-muted text-slate-600")}>{counts[id]}</span>)}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-border pt-3">
        <DropdownMenu>
          <DropdownMenuTrigger aria-label={`Open profile menu for ${account.user.name}`} title={compact ? account.user.name : undefined}
            className={cn("flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-muted data-popup-open:bg-muted", compact && "justify-center")}>
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-white" aria-hidden="true">{initial}</span>
            <span className={compact ? "sr-only" : "grid min-w-0 flex-1 leading-tight"}>
              <span className="truncate text-sm font-semibold text-foreground">{account.user.name}</span>
              <span className="truncate text-xs text-muted-foreground">{account.user.email}</span>
            </span>
            {!compact && <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" sideOffset={8} className="account-theme min-w-60 rounded-2xl border border-border p-1.5 shadow-none">
            <div className="px-3 py-2">
              <p className="truncate text-sm font-semibold">{account.user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{account.user.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-3 rounded-lg px-3 py-2.5" onClick={() => { onPick?.(); router.push(accountHref("profile")); }}><Settings2 aria-hidden="true" /> Profile &amp; settings</DropdownMenuItem>
            <DropdownMenuItem className="gap-3 rounded-lg px-3 py-2.5" onClick={() => router.push("/")}><House aria-hidden="true" /> Back to website</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-3 rounded-lg px-3 py-2.5 text-red-600 focus:text-red-700" disabled={signingOut} onClick={() => void logout()}><LogOut aria-hidden="true" /> {signingOut ? "Signing out…" : "Log out"}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <div className="account-theme min-h-svh bg-background text-foreground lg:flex lg:h-svh lg:overflow-hidden">
      {/* Sidebar (desktop): collapsible; only the content area scrolls */}
      <aside id="account-sidebar" className={cn("hidden h-full shrink-0 overflow-x-hidden overflow-y-auto border-r border-border bg-white py-5 transition-[width] duration-200 ease-out motion-reduce:transition-none lg:block", collapsed ? "w-[76px] px-2.5" : "w-64 px-3")}>
        {sidebar(collapsed)}
      </aside>

      <div className="min-w-0 flex-1 lg:h-full lg:overflow-y-auto" data-dashboard-scroll>
        <header className="sticky top-0 z-30 border-b border-border bg-white/85 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger render={<button type="button" className="grid size-10 place-items-center rounded-xl border border-border bg-white text-foreground transition-colors hover:bg-muted lg:hidden" aria-label="Open account menu" />}>
                <Menu className="size-5" />
              </SheetTrigger>
              <SheetContent side="left" className="account-theme w-[85vw] max-w-xs overflow-y-auto border-r-0 bg-white p-4 pt-5">
                <SheetTitle className="sr-only">Account menu</SheetTitle>
                {sidebar(false, () => setMenuOpen(false))}
              </SheetContent>
            </Sheet>
            <button type="button" onClick={toggleCollapsed} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-controls="account-sidebar" aria-expanded={!collapsed} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="hidden size-10 shrink-0 place-items-center rounded-xl border border-border bg-white text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:grid">
              {collapsed ? <PanelLeftOpen className="size-[18px]" /> : <PanelLeftClose className="size-[18px]" />}
            </button>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-foreground">{orderId ? "Order details" : current.label}</p>
            </div>
            <Link href="/book" className={cn(btn.primary, "ml-auto hidden h-9 sm:inline-flex")}><Plus className="size-4" aria-hidden="true" /> Book a pickup</Link>
            <Link href="/book" className="ml-auto grid size-10 place-items-center rounded-xl bg-primary text-white sm:hidden" aria-label="Book a pickup"><Plus className="size-5" /></Link>
          </div>
        </header>

        <main className="mx-auto grid max-w-[1200px] gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {!orderId && tab === "orders" && (
            <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-[#1f2a5c] via-[#2a3f9e] to-[#3b5bdb] p-6 text-white sm:p-7">
              <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-20 size-80 rounded-full bg-white/10 blur-3xl" />
              <div className="relative flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">Hi, {firstName} 👋</h1>
                  <p className="mt-1 text-sm text-white/75">Here’s what’s happening with your laundry.</p>
                </div>
                <Link href="/book" className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-[#1f2a5c] transition-transform hover:-translate-y-0.5">Book a pickup <ArrowRight className="size-4" aria-hidden="true" /></Link>
              </div>
              <dl className="relative mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
                {stats.map(({ label, value, icon: Icon, href }) => (
                  <Link key={label} href={href} className="flex items-center gap-3 rounded-2xl bg-white/10 p-3.5 ring-1 ring-white/15 transition-colors hover:bg-white/15">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/15"><Icon className="size-5" aria-hidden="true" /></span>
                    <div className="min-w-0">
                      <dd className="text-xl leading-none font-extrabold">{value}</dd>
                      <dt className="mt-1 truncate text-xs text-white/75">{label}</dt>
                    </div>
                  </Link>
                ))}
              </dl>
            </section>
          )}

          {logoutError && <Alert>{logoutError}</Alert>}
          {!account.user.verified && (
            <Alert tone="info">
              Verify your email to book and review orders. <Link className="font-semibold underline" href="/verify-email">Resend verification email</Link>
            </Alert>
          )}

          <div key={`${tab}-${orderId ?? ""}`} className="min-w-0 animate-in duration-300 fade-in-0 slide-in-from-bottom-1 motion-reduce:animate-none">
            {tab === "orders" && (orderId ? (
              activeOrder
                ? <OrderDetails key={activeOrder.id} order={activeOrder} account={account} refresh={data.refresh} />
                : <Empty title="Order not found" message="This order is unavailable in your account." href="/account" linkText="Back to orders" />
            ) : <OrderList orders={account.orders} />)}
            {tab === "profile" && <Profile account={account} refresh={data.refresh} onLogout={() => void logout()} signingOut={signingOut} />}
            {tab === "addresses" && <Addresses addresses={account.addresses} refresh={data.refresh} />}
            {tab === "payments" && <Payments account={account} refresh={data.refresh} />}
            {tab === "offers" && <Offers coupons={account.coupons} />}
            {tab === "updates" && <Updates notifications={account.notifications} refresh={data.refresh} />}
            {tab === "support" && <Support tickets={account.tickets} refresh={data.refresh} />}
          </div>
        </main>
      </div>
    </div>
  );
}

function SectionHeading({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-xl font-extrabold tracking-[-0.02em] text-foreground sm:text-2xl">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/* ---------- Orders ---------- */

function OrderList({ orders }: { orders: Order[] }) {
  const [filter, setFilter] = useState<"active" | "past">("active");
  const activeCount = orders.filter(isActive).length;
  const visible = filter === "active" ? orders.filter(isActive) : orders.filter((order) => !isActive(order));

  if (!orders.length) return <Empty title="No orders yet" message="Choose the laundry services you need and pick a pickup time." href="/book" linkText="Book your first pickup" />;

  return (
    <div>
      <SectionHeading
        title="Your orders"
        description="Track bookings and see your order history."
        action={
          <div className="inline-flex rounded-full border border-border bg-white p-1" role="group" aria-label="Filter orders">
            {([["active", `In progress (${activeCount})`], ["past", `Past (${orders.length - activeCount})`]] as const).map(([value, text]) => (
              <button
                key={value}
                type="button"
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
                className={cn("rounded-full px-4 py-1.5 text-sm font-semibold transition-colors", filter === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-primary")}
              >
                {text}
              </button>
            ))}
          </div>
        }
      />
      {visible.length ? (
        <ul className="grid gap-4 xl:grid-cols-2">
          {visible.map((order) => {
            const step = Math.max(flow.indexOf(order.status), 0);
            const progress = order.status === "CANCELLED" ? 0 : Math.round((step / (flow.length - 1)) * 100);
            return (
              <li key={order.id}>
                <Link href={orderHref(order.id)} className={cn(card, "group block transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/40")}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Order #{reference(order.id)}</p>
                      <p className="mt-1 line-clamp-1 font-bold text-foreground">{order.items.map((item) => item.name).join(", ")}</p>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>
                  {order.status !== "CANCELLED" && (
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
                      <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${Math.max(progress, 6)}%` }} />
                    </div>
                  )}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <Clock3 className="size-4" aria-hidden="true" /> Pickup {orderDate(order.pickupDate)} · {order.pickupSlot}
                    </span>
                    <span className="flex items-center gap-3">
                      <strong className="text-base text-foreground">{rupees(order.total)}</strong>
                      <ArrowRight className="size-4 text-primary transition-transform group-hover:translate-x-1" aria-hidden="true" />
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <Empty
          title={filter === "active" ? "No orders in progress" : "No past orders"}
          message={filter === "active" ? "New bookings will appear here." : "Delivered and cancelled orders will appear here."}
        />
      )}
    </div>
  );
}

function OrderDetails({ order, account, refresh }: { order: Order; account: AccountData; refresh: () => void }) {
  const cart = useCart();
  const catalog = useData<Catalog>("/api/catalog");
  const [reorderError, setReorderError] = useState("");
  const router = useRouter();

  function reorder() {
    const services = new Map(catalog.data?.services.map((service) => [service.id, service]));
    const availableItems = order.items.filter((item) => services.has(item.serviceId));
    if (!availableItems.length) {
      setReorderError("The services in this order are no longer available.");
      return;
    }
    const merged = new Map(cart.items.map((item) => [item.serviceId, item]));
    for (const item of availableItems) {
      const unit = services.get(item.serviceId)?.unit ?? item.unit;
      const quantity = item.quantity + (merged.get(item.serviceId)?.quantity ?? 0);
      merged.set(item.serviceId, {
        serviceId: item.serviceId,
        quantity: unit === "FIXED" ? 1 : Math.min(maxCartQuantity, unit === "ITEM" ? Math.ceil(quantity) : quantity),
      });
    }
    if (merged.size > maxCartServices) {
      setReorderError("Your cart is full. Remove a service before reordering.");
      return;
    }
    cart.replace([...merged.values()]);
    router.push("/book");
  }

  return (
    <div className="grid gap-5">
      <Link className={btn.link} href="/account"><ArrowLeft className="size-4" aria-hidden="true" /> Back to orders</Link>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
        <div className="grid gap-5">
          <section className={card}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-extrabold tracking-[-0.02em]">Order #{reference(order.id)}</h2>
                <p className="mt-1 text-sm text-muted-foreground">Booked {orderDate(order.createdAt, true)}</p>
              </div>
              <StatusBadge status={order.status} />
            </div>
            <ul className="mt-5 divide-y divide-border">
              {order.items.map((item) => (
                <li className="flex items-center justify-between gap-4 py-3.5" key={item.serviceId}>
                  <div>
                    <p className="font-semibold text-foreground">{item.name}</p>
                    <p className="text-sm text-muted-foreground">{item.quantity} {unitLabel(item.unit)} × {rupees(item.price)}</p>
                  </div>
                  <strong className="text-foreground">{rupees(item.quantity * item.price)}</strong>
                </li>
              ))}
            </ul>
            {account.user.role === "CUSTOMER" && (
              <button
                className={cn(btn.outline, "mt-4")}
                type="button"
                disabled={!cart.ready || catalog.loading}
                onClick={() => {
                  if (catalog.error) { setReorderError(catalog.error); catalog.refresh(); }
                  else reorder();
                }}
              >
                <RotateCcw aria-hidden="true" /> Reorder these services
              </button>
            )}
            {reorderError && <div className="mt-3"><Alert>{reorderError}</Alert></div>}
          </section>

          <section className={card}>
            <h2 className="flex items-center gap-2 text-lg font-bold"><PackageCheck className="size-5 text-primary" aria-hidden="true" /> Order timeline</h2>
            <Tracking order={order} />
          </section>

          {order.status === "DELIVERED" && account.user.verified && <Review order={order} refresh={refresh} />}
        </div>

        <aside className="grid gap-5">
          <section className={cn(card, "grid gap-4 text-sm")}>
            <h2 className="flex items-center gap-2 text-lg font-bold"><Clock3 className="size-5 text-primary" aria-hidden="true" /> Schedule</h2>
            <div>
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Pickup</p>
              <p className="mt-0.5 font-semibold">{orderDate(order.pickupDate)} · {order.pickupSlot}</p>
            </div>
            {order.deliveryDate && (
              <div>
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Preferred delivery</p>
                <p className="mt-0.5 font-semibold">{orderDate(order.deliveryDate)}{order.deliverySlot ? ` · ${order.deliverySlot}` : ""}</p>
              </div>
            )}
            {order.address && (
              <div>
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Pickup address</p>
                <AddressText address={order.address} />
              </div>
            )}
            {order.instructions && (
              <div>
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Special instructions</p>
                <p className="mt-0.5">{order.instructions}</p>
              </div>
            )}
          </section>
          <section className={card}>
            <PriceBreakdown quote={order} />
            {order.payment && <div className="mt-4 border-t border-border pt-4"><PaymentDetails order={order} account={account} refresh={refresh} /></div>}
          </section>
        </aside>
      </div>
    </div>
  );
}

function Tracking({ order }: { order: Order }) {
  const history = order.history.length ? order.history : [{ status: order.status, createdAt: order.createdAt }];
  return (
    <ol className="mt-5 grid">
      {history.map(({ status, createdAt }, index) => {
        const latest = index === history.length - 1;
        return (
          <li key={`${status}-${index}`} aria-current={latest ? "step" : undefined} className="relative flex gap-4 pb-6 last:pb-0">
            {!latest && <span aria-hidden="true" className="absolute top-8 bottom-0 left-[15px] w-0.5 bg-primary/20" />}
            <span aria-hidden="true" className={cn("relative grid size-8 shrink-0 place-items-center rounded-full", latest ? "bg-primary text-white ring-4 ring-secondary" : "bg-secondary text-primary")}>
              <Check className="size-4" />
            </span>
            <div className="pt-1">
              <p className={cn("text-sm font-semibold", latest ? "text-primary" : "text-foreground")}>{statusLabels[status]}</p>
              <time className="text-xs text-muted-foreground" dateTime={createdAt}>{orderDate(createdAt, true)}</time>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function AddressText({ address }: { address: Omit<Address, "id"> }) {
  return (
    <address className="mt-0.5 text-sm leading-relaxed text-foreground not-italic">
      {address.line1}{address.line2 ? `, ${address.line2}` : ""}<br />{address.city} {address.postalCode}<br />{address.phone}
    </address>
  );
}

/* ---------- Actions ---------- */

function useAccountAction(path = "/api/account") {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function run(action: Record<string, unknown>, onSuccess: () => void, message = "") {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      await post(path, action);
      onSuccess();
      setNotice(message);
    } catch (caught) {
      setError(friendlyError(caught));
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, notice, run };
}

function Profile({ account, refresh, onLogout, signingOut }: { account: AccountData; refresh: () => void; onLogout: () => void; signingOut: boolean }) {
  const update = useAccountAction();
  const password = useAccountAction();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void update.run({ action: "profile", ...Object.fromEntries(new FormData(event.currentTarget)) }, refresh, "Profile updated.");
  }
  function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form));
    void password.run({ action: "password", currentPassword: fields.currentPassword, newPassword: fields.newPassword }, () => form.reset(), "Password changed.");
  }
  return (
    <div className="grid gap-5">
      <SectionHeading title="Profile & settings" description="Your details for pickups, and how you sign in." />
      <div className="grid gap-5 xl:grid-cols-2 xl:items-start">
        <form className={cn(card, "grid gap-5")} onSubmit={submit}>
          <div className="flex items-center gap-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary text-xl font-bold text-white" aria-hidden="true">{account.user.name.charAt(0).toUpperCase()}</span>
            <div className="min-w-0">
              <h3 className="truncate text-lg font-bold">{account.user.name}</h3>
              <p className="truncate text-sm text-muted-foreground">{account.user.email}</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={fieldClass}>Full name<input required name="name" autoComplete="name" maxLength={80} defaultValue={account.user.name} /></label>
            <label className={fieldClass}><span>Phone number <span className="font-normal text-muted-foreground">(optional)</span></span><input name="phone" type="tel" autoComplete="tel" maxLength={25} defaultValue={account.profile?.phone ?? ""} /></label>
            <label className={cn(fieldClass, "sm:col-span-2")}>Email address<input type="email" value={account.user.email} readOnly /></label>
          </div>
          {update.error && <Alert>{update.error}</Alert>}
          {update.notice && <Alert tone="success">{update.notice}</Alert>}
          <div>
            <button className={btn.primary} type="submit" disabled={update.busy}>
              {update.busy && <Loader2 className="animate-spin" aria-hidden="true" />}{update.busy ? "Saving…" : "Save profile"}
            </button>
          </div>
        </form>

        <div className="grid gap-5">
          <form className={cn(card, "grid gap-4")} onSubmit={changePassword}>
            <div>
              <h3 className="text-lg font-bold">Change password</h3>
              <p className="mt-1 text-sm text-muted-foreground">Signed up with Google? Use “Forgot password” on the login page to set one first.</p>
            </div>
            <label className={fieldClass}>Current password<input name="currentPassword" type="password" required autoComplete="current-password" maxLength={128} /></label>
            <label className={fieldClass}>New password<input name="newPassword" type="password" required minLength={8} maxLength={128} autoComplete="new-password" /></label>
            {password.error && <Alert>{password.error}</Alert>}
            {password.notice && <Alert tone="success">{password.notice}</Alert>}
            <div>
              <button className={btn.outline} type="submit" disabled={password.busy}>
                {password.busy && <Loader2 className="animate-spin" aria-hidden="true" />}{password.busy ? "Updating…" : "Update password"}
              </button>
            </div>
          </form>
          <section className={cn(card, "flex flex-wrap items-center justify-between gap-3")}>
            <div>
              <h3 className="font-bold">Sign out</h3>
              <p className="text-sm text-muted-foreground">End your session on this device.</p>
            </div>
            <button type="button" className={cn(btn.outline, "text-red-600 hover:text-red-700")} disabled={signingOut} onClick={onLogout}><LogOut aria-hidden="true" /> {signingOut ? "Signing out…" : "Log out"}</button>
          </section>
        </div>
      </div>
    </div>
  );
}

function Addresses({ addresses, refresh }: { addresses: Address[]; refresh: () => void }) {
  const [editing, setEditing] = useState<Address | "new">();
  const [deleting, setDeleting] = useState("");
  const remove = useAccountAction();
  return (
    <div className="grid gap-4">
      <SectionHeading
        title="Saved addresses"
        description="Pickup and delivery addresses for faster booking."
        action={!editing && <button type="button" className={btn.primary} onClick={() => setEditing("new")}><Plus aria-hidden="true" /> Add address</button>}
      />
      {editing && (
        <div className={card}>
          <AddressForm key={editing === "new" ? "new" : editing.id} address={editing === "new" ? undefined : editing} onCancel={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); refresh(); }} />
        </div>
      )}
      {remove.error && <Alert>{remove.error}</Alert>}
      {remove.notice && <Alert tone="success">{remove.notice}</Alert>}
      {!addresses.length && !editing && <Empty icon={MapPin} title="No saved addresses" message="Add your home or work address for faster booking." />}
      <ul className="grid gap-4 md:grid-cols-2">
        {addresses.map((address) => (
          <li key={address.id} className={cn(card, "flex flex-col gap-3")}>
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary"><MapPin className="size-5" aria-hidden="true" /></span>
              <h3 className="font-bold text-foreground">{address.label}</h3>
            </div>
            <AddressText address={address} />
            {deleting === address.id ? (
              <div className="mt-auto grid gap-2 rounded-2xl bg-red-50 p-3">
                <p className="text-sm text-red-800">Remove this saved address?</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={cn(btn.primary, "h-9 bg-red-600 hover:bg-red-700")} disabled={remove.busy} onClick={() => void remove.run({ action: "deleteAddress", id: address.id }, () => { setDeleting(""); refresh(); }, "Address removed.")}>Remove</button>
                  <button type="button" className={cn(btn.outline, "h-9")} disabled={remove.busy} onClick={() => setDeleting("")}>Keep</button>
                </div>
              </div>
            ) : (
              <div className="mt-auto flex gap-4 border-t border-border pt-3">
                <button className={btn.link} type="button" disabled={Boolean(editing) || remove.busy} onClick={() => setEditing(address)}><Pencil className="size-4" aria-hidden="true" /> Edit</button>
                <button type="button" className={cn(btn.link, "text-red-600")} disabled={Boolean(editing) || remove.busy} onClick={() => setDeleting(address.id)}><Trash2 className="size-4" aria-hidden="true" /> Remove</button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- Payments, offers, updates, support ---------- */

function PaymentDetails({ order, account, refresh }: { order: Order; account: AccountData; refresh: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const payment = order.payment;

  async function retry() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await post<{ razorpay: PaymentSession }>("/api/payments", { action: "retry", orderId: order.id });
      const confirmed = await openPayment(result.razorpay, order.id, account.user);
      if (confirmed) {
        setNotice("Payment verified.");
        refresh();
      } else {
        setNotice("Checkout closed. You can try again when ready.");
      }
    } catch (caught) {
      setError(friendlyError(caught));
      refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!payment) return null;
  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <strong className="text-sm">{payment.method === "COD" ? "Cash on delivery" : "Online payment"}</strong>
        <StatusBadge status={payment.status}>{prettyStatus(payment.status)}</StatusBadge>
      </div>
      {payment.status === "PENDING" && payment.method === "RAZORPAY" && order.status !== "CANCELLED" && account.user.verified && (
        <button className={btn.primary} type="button" disabled={busy} onClick={() => void retry()}>
          {busy && <Loader2 className="animate-spin" aria-hidden="true" />}{busy ? "Opening checkout…" : "Complete payment"}
        </button>
      )}
      {notice && <Alert tone="success">{notice}</Alert>}
      {error && <Alert>{error}</Alert>}
    </div>
  );
}

function Payments({ account, refresh }: { account: AccountData; refresh: () => void }) {
  const orders = account.orders.filter((order) => order.payment);
  if (!orders.length) return <Empty icon={CreditCard} title="No payments yet" message="Your payment history will appear after you place an order." />;
  return (
    <div>
      <SectionHeading title="Payments" description="Payment status for each of your orders." />
      <ul className="grid gap-4 md:grid-cols-2">
        {orders.map((order) => (
          <li key={order.id} className={cn(card, "grid gap-4")}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary"><CreditCard className="size-5" aria-hidden="true" /></span>
                <div>
                  <p className="text-lg font-extrabold">{rupees(order.payment?.amount ?? order.total)}</p>
                  <p className="text-xs text-muted-foreground">{orderDate(order.createdAt)}</p>
                </div>
              </div>
              <Link href={orderHref(order.id)} className={btn.link}>#{reference(order.id)}</Link>
            </div>
            <PaymentDetails order={order} account={account} refresh={refresh} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Offers({ coupons }: { coupons: AccountData["coupons"] }) {
  if (!coupons.length) return <Empty icon={BadgePercent} title="No current offers" message="Available coupon codes will appear here." />;
  return (
    <div>
      <SectionHeading title="Offers for you" description="Apply a code at checkout to save on your booking." />
      <ul className="grid gap-4 md:grid-cols-2">
        {coupons.map((coupon) => (
          <li key={coupon.code} className="relative overflow-hidden rounded-3xl border-2 border-dashed border-primary/30 bg-white p-5 transition-colors hover:border-primary/50 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <p className="text-2xl font-extrabold tracking-[-0.02em] text-primary">{coupon.kind === "PERCENT" ? `${coupon.value}% off` : `${rupees(coupon.value)} off`}</p>
              <span className="rounded-lg bg-white px-3 py-1.5 font-mono text-sm font-bold tracking-wider text-foreground ring-1 ring-primary/30">{coupon.code}</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{coupon.minimum ? `On service subtotals of ${rupees(coupon.minimum)} or more.` : "Apply the coupon code at checkout."}</p>
            {coupon.expiresAt && <p className="mt-1 text-xs text-muted-foreground">Valid until {orderDate(coupon.expiresAt)}</p>}
            <Link className={cn(btn.primary, "mt-4 h-9")} href="/book">Use this offer</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Updates({ notifications, refresh }: { notifications: AccountData["notifications"]; refresh: () => void }) {
  const action = useAccountAction();
  if (!notifications.length) return <Empty icon={Bell} title="You're all caught up" message="Booking and pickup updates will appear here." />;
  return (
    <div>
      <SectionHeading
        title="Updates"
        description="Booking, pickup and payment notifications."
        action={notifications.some((notification) => !notification.read) && (
          <button type="button" className={cn(btn.outline, "h-9")} disabled={action.busy} onClick={() => void action.run({ action: "readAllNotifications" }, refresh)}><Check className="size-4" aria-hidden="true" /> Mark all as read</button>
        )}
      />
      {action.error && <div className="mb-4"><Alert>{action.error}</Alert></div>}
      <ul className={cn(card, "divide-y divide-border p-0 sm:p-0")}>
        {notifications.map((notification) => (
          <li key={notification.id} className={cn("flex gap-3.5 p-4 sm:p-5", !notification.read && "bg-secondary/50")}>
            <span className={cn("relative grid size-10 shrink-0 place-items-center rounded-xl", notification.read ? "bg-muted text-muted-foreground" : "bg-secondary text-primary")}>
              <Bell className="size-5" aria-hidden="true" />
              {!notification.read && <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-primary ring-2 ring-white" aria-label="Unread" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h3 className="font-semibold text-foreground">{notification.title}</h3>
                <time className="text-xs text-muted-foreground" dateTime={notification.createdAt}>{orderDate(notification.createdAt, true)}</time>
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">{notification.body}</p>
              {!notification.read && (
                <button type="button" className={cn(btn.link, "mt-2")} disabled={action.busy} onClick={() => void action.run({ action: "readNotification", id: notification.id }, refresh)}>
                  Mark as read
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Support({ tickets, refresh }: { tickets: AccountData["tickets"]; refresh: () => void }) {
  const action = useAccountAction();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    void action.run({ action: "support", ...Object.fromEntries(new FormData(form)) }, () => { form.reset(); refresh(); }, "Support request sent. We’ll get back to you soon.");
  }
  return (
    <div>
      <SectionHeading title="Support" description="Questions about an order? Send us a message." />
      <div className="grid gap-5 xl:grid-cols-2 xl:items-start">
        <form className={cn(card, "grid gap-4")} onSubmit={submit}>
          <h3 className="text-lg font-bold">New request</h3>
          <label className={fieldClass}>Subject<input name="subject" required maxLength={120} placeholder="e.g. Question about my pickup" /></label>
          <label className={fieldClass}>Message<textarea name="message" required maxLength={2000} placeholder="Tell us how we can help" /></label>
          {action.error && <Alert>{action.error}</Alert>}
          {action.notice && <Alert tone="success">{action.notice}</Alert>}
          <div>
            <button className={btn.primary} type="submit" disabled={action.busy}>
              {action.busy && <Loader2 className="animate-spin" aria-hidden="true" />}{action.busy ? "Sending…" : "Send request"}
            </button>
          </div>
        </form>
        <section className={card}>
          <h3 className="text-lg font-bold">Previous requests</h3>
          {!tickets.length && <p className="mt-2 text-sm text-muted-foreground">Your support requests will appear here.</p>}
          <ul className="mt-3 divide-y divide-border">
            {tickets.map((ticket) => (
              <li key={ticket.id} className="grid gap-1.5 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <h4 className="font-semibold text-foreground">{ticket.subject}</h4>
                  <StatusBadge status={ticket.status}>{prettyStatus(ticket.status)}</StatusBadge>
                </div>
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">{ticket.message}</p>
                <time className="text-xs text-muted-foreground" dateTime={ticket.createdAt}>{orderDate(ticket.createdAt)}</time>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Review({ order, refresh }: { order: Order; refresh: () => void }) {
  const action = useAccountAction();
  const [rating, setRating] = useState(order.review?.rating ?? 0);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    void action.run({ action: "review", orderId: order.id, rating, comment: fields.get("comment") }, refresh, "Thanks! Your review was saved.");
  }
  return (
    <form className={cn(card, "grid gap-4")} onSubmit={submit}>
      <h2 className="text-lg font-bold">{order.review ? "Your review" : "How did we do?"}</h2>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Rating</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              aria-label={`${value} out of 5 stars`}
              aria-pressed={rating === value}
              className="rounded-lg p-1 transition-transform hover:scale-110"
            >
              <Star className={cn("size-8", value <= rating ? "fill-amber-400 text-amber-400" : "text-stone-300")} />
            </button>
          ))}
        </div>
      </fieldset>
      <label className={fieldClass}>Review<textarea name="comment" required maxLength={500} defaultValue={order.review?.comment} placeholder="Tell us about your experience" /></label>
      {action.error && <Alert>{action.error}</Alert>}
      {action.notice && <Alert tone="success">{action.notice}</Alert>}
      <div>
        <button className={btn.primary} type="submit" disabled={action.busy || !rating}>
          {action.busy && <Loader2 className="animate-spin" aria-hidden="true" />}{action.busy ? "Saving…" : "Save review"}
        </button>
      </div>
    </form>
  );
}
