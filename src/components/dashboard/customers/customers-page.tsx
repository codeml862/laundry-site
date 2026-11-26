"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Eye, LoaderCircle, MoreVertical, Plus, RefreshCw, Search, UserPlus, Users, UsersRound } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge, Empty, StatLoading, money, ui, when } from "@/components/dashboard/ui";
import type { Mutate, Snapshot } from "@/components/dashboard/types";
import { cn } from "@/lib/utils";
import { CustomerAvatar, CustomerDrawer } from "./customer-drawer";
import type { CustomerList, CustomerRecord } from "./types";

const control = "h-10 min-w-0 rounded-xl border border-[#dce2d4] bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30";
const panel = "min-w-0 rounded-[1.35rem] border border-[#e5e9df] bg-white shadow-[0_4px_12px_#27391508]";
const csvCell = (value: unknown) => { let text = String(value ?? ""); if (/^\s*[=+\-@]/.test(text)) text = "'" + text; return '"' + text.replaceAll('"', '""') + '"'; };
function selectedCsv(customers: CustomerRecord[]) {
  const rows: unknown[][] = [["Name", "Email", "Phone", "Area", "Total orders", "Total spent (INR)", "Last order", "Joined", "Status"]];
  customers.forEach((customer) => rows.push([customer.name, customer.email, customer.phone, [...new Set(customer.addresses.map((item) => item.city))].join("; "), customer.orderCount, (customer.totalSpent / 100).toFixed(2), customer.lastOrder, customer.createdAt, customer.active ? "Active" : "Inactive"]));
  return "\ufeff" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
function download(csv: string, filename: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a"); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function CustomersPage({ snapshot, mutate, onOpenOrder, onNewCustomer, initialId = "" }: { snapshot: Snapshot; mutate: Mutate; onOpenOrder: (id: string) => void; onNewCustomer: () => void; initialId?: string }) {
  const [query, setQuery] = useState("");
  const [state, setState] = useState("all");
  const [area, setArea] = useState("");
  const [type, setType] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [data, setData] = useState<CustomerList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [customerId, setCustomerId] = useState(initialId);
  const [revision, setRevision] = useState(0);
  const selectAll = useRef<HTMLInputElement>(null);
  const params = new URLSearchParams({ q: query, state, area, type, from, to, page: String(page), pageSize: String(pageSize) }).toString();

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    const timer = setTimeout(() => {
      fetch(`/api/admin/customers?${params}`, { cache: "no-store", signal: controller.signal }).then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not load customers.");
        if (!controller.signal.aborted) { setData(result); setSelected(new Set()); }
      }).catch((cause) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Could not load customers."); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [params, revision, snapshot.customers]);

  const customers = data?.customers || [];
  const allChecked = customers.length > 0 && customers.every((customer) => selected.has(customer.id));
  useEffect(() => { if (selectAll.current) selectAll.current.indeterminate = selected.size > 0 && !allChecked; }, [selected, allChecked]);
  const totalPages = Math.max(1, Math.ceil((data?.total || 0) / pageSize));
  const currentPage = data?.page || page;
  const firstPage = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, index) => firstPage + index);
  function filter(change: () => void) { change(); setPage(1); setSelected(new Set()); }
  function reset() { setQuery(""); setState("all"); setArea(""); setType("all"); setFrom(""); setTo(""); setPage(1); setSelected(new Set()); }
  async function exportCustomers() {
    setExporting(true); setError("");
    try {
      if (selected.size) download(selectedCsv(customers.filter((customer) => selected.has(customer.id))), "selected-customers.csv");
      else {
        const response = await fetch(`/api/admin/customers?${params}&export=csv`, { cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Export failed.");
        download(result.csv, result.filename);
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Export failed."); }
    finally { setExporting(false); }
  }

  const stats = data?.stats;
  return <div className="grid min-w-0 gap-6">
    <div className="grid gap-4 @min-[28rem]:grid-cols-2 @min-[61rem]:grid-cols-4">{[
      { title: "Total Customers", value: stats?.total, icon: Users, note: "Customer accounts" },
      { title: "Active Customers", value: stats?.active, icon: UsersRound, note: stats ? `${stats.total ? (stats.active / stats.total * 100).toFixed(1) : "0"}% of customers` : "Active accounts" },
      { title: "New Customers", value: stats?.new, icon: UserPlus, note: "Joined in the last 30 days" },
      { title: "Repeat Customers", value: stats?.repeat, icon: RefreshCw, note: stats ? `${stats.total ? (stats.repeat / stats.total * 100).toFixed(1) : "0"}% · two or more orders` : "Two or more orders" },
    ].map(({ title, value, icon: Icon, note }) => <section key={title} className={cn(panel, "flex items-start gap-3 p-5")}><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#eef7d8] text-[#2a800e]"><Icon className="size-8" strokeWidth={1.8} aria-hidden="true" /></span><div className="min-w-0"><h2 className="text-sm font-semibold">{title}</h2><strong className="mt-1 block text-3xl leading-tight font-extrabold tracking-tight text-[#12340e]">{value === undefined ? <StatLoading /> : value.toLocaleString("en-IN")}</strong><p className="mt-1 text-xs text-muted-foreground">{note}</p></div></section>)}</div>
    <div className="flex flex-wrap items-center justify-between gap-4"><div className="flex flex-wrap gap-2" role="group" aria-label="Customer status">{[{ key: "all", title: "All Customers" }, { key: "active", title: "Active" }, { key: "inactive", title: "Inactive" }].map(({ key, title }) => <button type="button" key={key} aria-pressed={state === key} onClick={() => filter(() => setState(key))} className={cn("min-h-10 rounded-full px-4 text-sm font-semibold transition-colors", state === key ? "bg-[#14620b] text-white" : "text-[#26351e] hover:bg-[#edf5df]")}>{title}{data ? ` (${data.tabs[key as keyof CustomerList["tabs"]]?.toLocaleString("en-IN") ?? 0})` : ""}</button>)}</div><div className="flex gap-2"><button type="button" disabled={loading || exporting || !data?.total} onClick={() => void exportCustomers()} className="inline-flex h-10 items-center gap-2 rounded-full border border-[#3b8725] bg-white px-4 text-sm font-bold text-[#246713] disabled:opacity-50">{exporting ? <LoaderCircle className="size-4 animate-spin" /> : <Download className="size-4" />}Export{selected.size ? ` (${selected.size})` : ""}</button><button type="button" onClick={onNewCustomer} className="inline-flex h-10 items-center gap-2 rounded-full bg-[#ff7900] px-4 text-sm font-bold text-white hover:bg-[#e56d00]"><Plus className="size-5" />Add Customer</button></div></div>
    <section className={cn(panel, "overflow-hidden")} aria-label="Customer directory">
      <div className="grid gap-3 p-4 @min-[45rem]:grid-cols-3 @min-[75rem]:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto]">
        <label className={cn(control, "flex items-center gap-2")}><Search className="size-4 shrink-0 text-muted-foreground" /><span className="sr-only">Search customers by name, email or phone</span><input value={query} maxLength={100} onChange={(event) => filter(() => setQuery(event.target.value))} placeholder="Search in customers…" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label>
        <select aria-label="Customer area" value={area} onChange={(event) => filter(() => setArea(event.target.value))} className={control}><option value="">All Areas</option>{data?.areas.map((entry) => <option key={entry}>{entry}</option>)}</select>
        <select aria-label="Customer type" value={type} onChange={(event) => filter(() => setType(event.target.value))} className={control}><option value="all">All Customer Types</option><option value="repeat">Repeat customers</option><option value="first">First-time customers</option><option value="unbooked">No orders yet</option></select>
        <label className="grid min-w-0 gap-1 text-xs text-muted-foreground"><span className="sr-only">Joined from</span><input aria-label="Joined from" type="date" value={from} onChange={(event) => filter(() => setFrom(event.target.value))} className={control} title="Joined from" /></label>
        <label className="grid min-w-0 gap-1 text-xs text-muted-foreground"><span className="sr-only">Joined through</span><input aria-label="Joined through" type="date" value={to} min={from || undefined} onChange={(event) => filter(() => setTo(event.target.value))} className={control} title="Joined through" /></label>
        <button type="button" onClick={reset} className="inline-flex h-10 items-center justify-center gap-2 px-2 text-sm font-semibold text-[#297511]"><RefreshCw className="size-4" />Reset</button>
      </div>
      {error && <div className="px-4"><p role="alert" className={ui.alertError}>{error}</p><button type="button" onClick={() => setRevision((value) => value + 1)} className={cn(ui.secondary, "mb-4")}>Try again</button></div>}
      {loading && <p role="status" className="flex items-center gap-2 px-5 pb-3 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />Loading customers…</p>}
      <div className={cn("overflow-x-auto px-4", loading && "opacity-50")} aria-busy={loading} tabIndex={0} role="region" aria-label="Scrollable customer table"><table className="w-full min-w-[850px] border-collapse text-left text-sm"><thead><tr className="bg-[#eef6e3] text-[#183c10]">{["Select", "Customer", "Phone", "Area", "Total Orders", "Total Spent", "Last Order", "Status", "Actions"].map((heading, index) => <th key={heading} scope="col" className={cn("px-3 py-4 font-bold whitespace-nowrap", index === 0 && "rounded-tl-xl", index === 8 && "rounded-tr-xl")}>{index === 0 ? <input ref={selectAll} type="checkbox" aria-label="Select all customers on this page" checked={allChecked} disabled={loading || !customers.length} onChange={(event) => setSelected(event.target.checked ? new Set(customers.map((customer) => customer.id)) : new Set())} className="size-4 accent-[#297a11]" /> : heading}</th>)}</tr></thead><tbody>{customers.map((customer) => <tr key={customer.id} className={cn("cursor-pointer border-b border-[#edf0e8] transition-colors hover:bg-[#f4fae9]", customerId === customer.id && "bg-[#f0f8df]")} onClick={() => setCustomerId(customer.id)}><td className="px-3 py-4" onClick={(event) => event.stopPropagation()}><input type="checkbox" checked={selected.has(customer.id)} disabled={loading} aria-label={`Select ${customer.name}`} onChange={(event) => setSelected((current) => { const next = new Set(current); if (event.target.checked) next.add(customer.id); else next.delete(customer.id); return next; })} className="size-4 accent-[#297a11]" /></td><td className="px-3 py-4"><button type="button" className="flex items-center gap-3 text-left" onClick={() => setCustomerId(customer.id)}><CustomerAvatar name={customer.name} /><span><strong className="block font-bold text-[#142b0e]">{customer.name}</strong><small className="mt-0.5 block text-xs text-muted-foreground">{customer.email}</small></span></button></td><td className="px-3 py-4 whitespace-nowrap">{customer.phone || "—"}</td><td className="max-w-36 px-3 py-4">{[...new Set(customer.addresses.map((item) => item.city))].join(", ") || "—"}</td><td className="px-3 py-4 tabular-nums">{customer.orderCount}</td><td className="px-3 py-4 font-semibold whitespace-nowrap">{money(customer.totalSpent)}</td><td className="px-3 py-4 whitespace-nowrap">{customer.lastOrder ? when(customer.lastOrder) : "—"}</td><td className="px-3 py-4"><Badge value={customer.active ? "ACTIVE" : "INACTIVE"} /></td><td className="px-3 py-4" onClick={(event) => event.stopPropagation()}><span className="inline-flex"><button type="button" aria-label={`View ${customer.name}`} onClick={() => setCustomerId(customer.id)} className="grid size-9 place-items-center rounded-lg hover:bg-secondary"><Eye className="size-4" /></button><DropdownMenu><DropdownMenuTrigger aria-label={`Actions for ${customer.name}`} className="grid size-9 place-items-center rounded-lg hover:bg-secondary"><MoreVertical className="size-4" /></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => setCustomerId(customer.id)}>View details / edit profile</DropdownMenuItem></DropdownMenuContent></DropdownMenu></span></td></tr>)}</tbody></table></div>
      {!loading && !error && !customers.length && <Empty title={query || area || type !== "all" || from || to || state !== "all" ? "No matching customers" : "No customers yet"} message="Add a customer or adjust your filters to see customer records." />}
      <footer className="flex flex-wrap items-center justify-between gap-4 p-5 text-sm"><p className="text-muted-foreground">Showing {data?.total ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, data?.total || 0)} of {(data?.total || 0).toLocaleString("en-IN")} customers</p><div className="flex flex-wrap items-center gap-2"><label className="mr-2 text-xs text-muted-foreground">Per page <select value={pageSize} onChange={(event) => filter(() => setPageSize(Number(event.target.value)))} className="ml-1 h-9 rounded-lg border border-border bg-white px-2 text-sm">{[5, 10, 25, 50].map((size) => <option key={size}>{size}</option>)}</select></label><button type="button" aria-label="Previous customer page" disabled={loading || currentPage <= 1} onClick={() => setPage(currentPage - 1)} className="grid size-9 place-items-center rounded-lg border border-border disabled:opacity-35"><ChevronLeft className="size-4" /></button>{pages.map((number) => <button key={number} type="button" disabled={loading} aria-label={`Customer page ${number}`} aria-current={number === currentPage ? "page" : undefined} onClick={() => setPage(number)} className={cn("grid size-9 place-items-center rounded-lg border", number === currentPage ? "border-[#226e0d] bg-[#226e0d] font-bold text-white" : "border-border bg-white")}>{number}</button>)}<button type="button" aria-label="Next customer page" disabled={loading || currentPage >= totalPages} onClick={() => setPage(currentPage + 1)} className="grid size-9 place-items-center rounded-lg border border-border disabled:opacity-35"><ChevronRight className="size-4" /></button></div></footer>
    </section>
    {customerId && <CustomerDrawer key={customerId} id={customerId} close={() => setCustomerId("")} mutate={mutate} onChanged={() => setRevision((value) => value + 1)} onOpenOrder={onOpenOrder} />}
  </div>;
}
