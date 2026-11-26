"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Eye, LoaderCircle, Pencil, Plus, Search, ShieldCheck, Truck, Users, UsersRound } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Badge, Empty, StatLoading, ui, when } from "@/components/dashboard/ui";
import { CustomerAvatar } from "@/components/dashboard/customers/customer-drawer";
import type { Snapshot } from "@/components/dashboard/types";
import { request } from "@/components/customer/http";
import { allowedPermissions } from "@/lib/dashboard-permissions";
import { cn } from "@/lib/utils";
import { permissionNames, roleNames, type StaffList, type StaffRole, type StaffUser } from "./types";

const control = "h-11 w-full rounded-xl border border-[#dce2d4] bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30";
const panel = "min-w-0 rounded-[1.35rem] border border-[#e5e9df] bg-white shadow-[0_4px_12px_#27391508]";
const failure = (error:unknown) => error instanceof Error ? error.message : "Could not save this team account.";

function StaffEditor({ user, self, onSaved, cancel }: {user?:StaffUser;self:boolean;onSaved:(user:StaffUser)=>Promise<void>;cancel:()=>void}) {
  const router = useRouter();
  const [role,setRole] = useState<StaffRole>(user?.role || "STAFF");
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true); setError("");
    try {
      const fields = {id:user?.id,name:form.get("name"),email:form.get("email"),phone:form.get("phone"),password:form.get("password"),role,active:form.has("active"),permissions:role === "STAFF" ? form.getAll("permissions") : []};
      const result = await request<{user:StaffUser}>("/api/admin/staff",{method:user ? "PATCH" : "POST",body:JSON.stringify(fields)});
      if(self && (Boolean(fields.password) || fields.email !== user?.email)) { router.replace("/admin/login"); router.refresh(); return; }
      await onSaved(result.user);
    } catch(cause) { setError(failure(cause)); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="grid gap-4">
    {error && <p role="alert" className={ui.alertError}>{error}</p>}
    <label className="grid gap-2 text-sm font-semibold">Full name<input className={control} name="name" autoComplete="name" maxLength={80} required defaultValue={user?.name} /></label>
    <label className="grid gap-2 text-sm font-semibold">Email address<input className={control} name="email" type="email" autoComplete="email" maxLength={254} required defaultValue={user?.email} /></label>
    <label className="grid gap-2 text-sm font-semibold">Phone number<input className={control} name="phone" type="tel" autoComplete="tel" maxLength={25} defaultValue={user?.profile?.phone || ""} /></label>
    <label className="grid gap-2 text-sm font-semibold">{user ? "New password (optional)" : "Initial password"}<input className={control} name="password" type="password" autoComplete="new-password" required={!user} minLength={8} maxLength={128} /><span className="text-xs font-normal text-muted-foreground">{user ? "Leave blank to keep the current password." : "Use 8–128 characters and share credentials securely."}</span></label>
    <label className="grid gap-2 text-sm font-semibold">Role<select className={control} value={role} disabled={self} onChange={(event)=>setRole(event.target.value as StaffRole)}>{(Object.keys(roleNames) as StaffRole[]).map((entry)=><option key={entry} value={entry}>{roleNames[entry]}</option>)}</select></label>
    <fieldset className="rounded-xl border border-[#e2e9d8] p-4"><legend className="px-1 text-sm font-bold">Dashboard permissions</legend>{role === "STAFF" ? <div className="grid grid-cols-2 gap-3">{allowedPermissions.map((permission)=><label key={permission} className="flex items-center gap-2 text-sm"><input type="checkbox" name="permissions" value={permission} defaultChecked={user?.permissions.includes(permission)} className="size-4 accent-primary" />{permissionNames[permission]}</label>)}</div> : <p className="text-sm text-muted-foreground">{role === "ADMIN" ? "Administrators have full access, including team accounts and settings." : "Riders have access to their assigned pickups and deliveries. Link this account to a rider from Pickups & Delivery."}</p>}</fieldset>
    {role === "STAFF" && <p className="text-xs text-muted-foreground">Choose only the sections this staff member needs. Team accounts and settings remain administrator-only.</p>}
    <label className="flex items-center gap-2 text-sm font-semibold"><input name="active" type="checkbox" defaultChecked={user?.active ?? true} disabled={self} className="size-4 accent-primary" />{self && <input name="active" type="hidden" value="on" />}Account active</label>
    <p className="rounded-xl bg-[#f4f8ed] p-3 text-xs leading-relaxed text-muted-foreground">{user ? "Disabling access or changing the role, permissions, email or password signs this account out on every device. Your own email or password change requires you to sign in again." : "Created accounts are approved by the administrator and can sign in immediately at /admin/login. No verification or invitation email is sent."}</p>
    <div className="flex flex-wrap gap-2"><button type="submit" disabled={busy} className={cn(ui.button,"h-11")}>{busy && <LoaderCircle className="size-4 animate-spin" />}{busy ? "Saving…" : user ? "Save changes" : "Create account"}</button><button type="button" disabled={busy} onClick={cancel} className={cn(ui.secondary,"h-11")}>Cancel</button></div>
  </form>;
}

export function StaffPage({snapshot,onChanged}:{snapshot:Snapshot;onChanged:()=>Promise<void>}) {
  const [query,setQuery] = useState("");
  const [role,setRole] = useState("all");
  const [state,setState] = useState("all");
  const [page,setPage] = useState(1);
  const [pageSize,setPageSize] = useState(10);
  const [data,setData] = useState<StaffList|null>(null);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const [notice,setNotice] = useState("");
  const [revision,setRevision] = useState(0);
  const [selected,setSelected] = useState<StaffUser|null>(null);
  const [adding,setAdding] = useState(false);
  const [editing,setEditing] = useState(false);
  const params = new URLSearchParams({q:query,role,state,page:String(page),pageSize:String(pageSize)}).toString();
  useEffect(()=> {
    const controller = new AbortController();
    const timer = setTimeout(()=> {
      setLoading(true); setError("");
      request<StaffList>(`/api/admin/staff?${params}`,{signal:controller.signal}).then((result)=>{if(!controller.signal.aborted)setData(result);}).catch((cause)=>{if(!controller.signal.aborted)setError(failure(cause));}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    },200);
    return ()=>{clearTimeout(timer);controller.abort();};
  },[params,revision]);
  const totalPages = Math.max(1,Math.ceil((data?.total || 0)/pageSize));
  const currentPage = data?.page || page;
  function filter(change:()=>void) {change();setPage(1);}
  function open(user:StaffUser,edit=false) {setSelected(user);setEditing(edit);setAdding(false);}
  function close() {setSelected(null);setAdding(false);setEditing(false);}
  async function saved(user:StaffUser) {
    const created = adding;
    setAdding(false);setEditing(false);setSelected(user);setRevision(value=>value+1);
    setNotice(created ? "Team account created. Share credentials securely; no email was sent." : "Team account updated.");
    try {await onChanged();} catch {setNotice("Account saved. Refresh the dashboard to update the team summary.");}
  }
  return <div className="grid min-w-0 gap-6">
    <div className="grid gap-4 @min-[28rem]:grid-cols-2 @min-[61rem]:grid-cols-4">{[
      {key:"all",title:"Total Team Members",icon:Users,note:"All dashboard accounts"},
      {key:"ADMIN",title:"Administrators",icon:ShieldCheck,note:"Full business access"},
      {key:"STAFF",title:"Staff",icon:UsersRound,note:"Assigned permissions"},
      {key:"RIDER",title:"Riders",icon:Truck,note:"Pickup and delivery access"},
    ].map(({key,title,icon:Icon,note})=><section key={key} className={cn(panel,"flex items-start gap-3 p-5")}><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#eef7d8] text-[#2a800e]"><Icon className="size-8" strokeWidth={1.8} /></span><div><h2 className="text-sm font-semibold">{title}</h2><strong className="mt-1 block text-3xl font-extrabold text-[#12340e]">{data ? data.stats[key as keyof StaffList["stats"]] ?? 0 : <StatLoading />}</strong><p className="mt-1 text-xs text-muted-foreground">{note}</p></div></section>)}</div>
    {notice && <p role="status" className={ui.alert}>{notice}</p>}
    <div className="flex flex-wrap items-center justify-between gap-3"><div role="group" aria-label="Team role" className="flex flex-wrap gap-2">{[{key:"all",name:"All Members"},...Object.entries(roleNames).map(([key,name])=>({key,name}))].map(({key,name})=><button key={key} type="button" aria-pressed={role===key} onClick={()=>filter(()=>setRole(key))} className={cn("min-h-10 rounded-full px-4 text-sm font-semibold",role===key ? "bg-[#14620b] text-white" : "text-[#26351e] hover:bg-[#edf5df]")}>{name}{data ? ` (${data.stats[key as keyof StaffList["stats"]] ?? 0})` : ""}</button>)}</div><button type="button" onClick={()=>{setSelected(null);setAdding(true);setEditing(false);}} className="inline-flex h-10 items-center gap-2 rounded-full bg-[#ff7900] px-4 text-sm font-bold text-white hover:bg-[#e56d00]"><Plus className="size-5" />Add Team Member</button></div>
    <section className={cn(panel,"overflow-hidden")} aria-label="Team directory">
      <div className="flex flex-wrap gap-3 p-4"><label className={cn(control,"flex min-w-52 flex-1 items-center gap-2")}><Search className="size-4 text-muted-foreground" /><span className="sr-only">Search team by name, email or phone</span><input value={query} onChange={(event)=>filter(()=>setQuery(event.target.value))} maxLength={100} placeholder="Search team members…" className="min-w-0 flex-1 outline-none" /></label><select className={cn(control,"w-auto")} aria-label="Team account status" value={state} onChange={(event)=>filter(()=>setState(event.target.value))}><option value="all">All Statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
      {error && <div className="px-4"><p role="alert" className={ui.alertError}>{error}</p><button type="button" className={cn(ui.secondary,"mb-4")} onClick={()=>setRevision(value=>value+1)}>Try again</button></div>}
      {loading && <p role="status" className="flex items-center gap-2 px-5 pb-3 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />Loading team members…</p>}
      <div className={cn("overflow-x-auto px-4",loading && "opacity-50")} aria-busy={loading} tabIndex={0} role="region" aria-label="Scrollable team table"><table className="w-full min-w-[800px] border-collapse text-left text-sm"><thead><tr className="bg-[#eef6e3] text-[#183c10]">{["Team Member","Phone","Role","Status","Joined","Actions"].map((heading)=><th key={heading} scope="col" className="px-3 py-4 font-bold whitespace-nowrap first:rounded-tl-xl last:rounded-tr-xl">{heading}</th>)}</tr></thead><tbody>{data?.users.map((user)=><tr key={user.id} className="border-b border-[#edf0e8] hover:bg-[#f4fae9]"><td className="px-3 py-4"><button type="button" className="flex items-center gap-3 text-left" onClick={()=>open(user)}><CustomerAvatar name={user.name} /><span><strong className="block text-[#142b0e]">{user.name}{user.id === snapshot.user.id && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}</strong><small className="mt-0.5 block text-xs text-muted-foreground">{user.email}</small></span></button></td><td className="px-3 py-4 whitespace-nowrap">{user.profile?.phone || "—"}</td><td className="px-3 py-4"><Badge value={user.role} /></td><td className="px-3 py-4"><Badge value={user.active ? "ACTIVE" : "INACTIVE"} /></td><td className="px-3 py-4 whitespace-nowrap">{when(user.createdAt)}</td><td className="px-3 py-4"><div className="flex gap-1"><button type="button" aria-label={`View ${user.name}`} className="grid size-9 place-items-center rounded-lg hover:bg-secondary" onClick={()=>open(user)}><Eye className="size-4" /></button><button type="button" aria-label={`Edit ${user.name}`} className="grid size-9 place-items-center rounded-lg hover:bg-secondary" onClick={()=>open(user,true)}><Pencil className="size-4" /></button></div></td></tr>)}</tbody></table></div>
      {!loading && !error && !data?.users.length && <Empty title="No team members found" message="Add a team account or adjust your search and filters." />}
      <footer className="flex flex-wrap items-center justify-between gap-4 p-5 text-sm"><p className="text-muted-foreground">Showing {data?.total ? (currentPage-1)*pageSize+1 : 0}–{Math.min(currentPage*pageSize,data?.total || 0)} of {data?.total || 0} members</p><div className="flex items-center gap-2"><label className="mr-2 text-xs text-muted-foreground">Per page <select className="ml-1 h-9 rounded-lg border border-border bg-white px-2 text-sm" value={pageSize} onChange={(event)=>filter(()=>setPageSize(Number(event.target.value)))}>{[5,10,25,50].map((size)=><option key={size}>{size}</option>)}</select></label><button type="button" aria-label="Previous team page" disabled={loading || currentPage<=1} onClick={()=>setPage(currentPage-1)} className="grid size-9 place-items-center rounded-lg border border-border disabled:opacity-35"><ChevronLeft className="size-4" /></button><span>{currentPage} / {totalPages}</span><button type="button" aria-label="Next team page" disabled={loading || currentPage>=totalPages} onClick={()=>setPage(currentPage+1)} className="grid size-9 place-items-center rounded-lg border border-border disabled:opacity-35"><ChevronRight className="size-4" /></button></div></footer>
    </section>
    <Sheet open={adding || Boolean(selected)} onOpenChange={(open)=>{if(!open)close();}}><SheetContent side="right" className="w-full gap-0 overflow-y-auto border-[#e1e9d8] p-0 sm:max-w-[480px]"><header className="sticky top-0 z-10 border-b border-[#e9eddf] bg-white/95 px-6 py-5 pr-12 backdrop-blur"><SheetTitle className="text-xl font-extrabold tracking-tight text-[#14350e]">{adding ? "Add Team Member" : editing ? "Edit Team Member" : "Team Member Details"}</SheetTitle><SheetDescription className="sr-only">Manage dashboard account details, role and permissions</SheetDescription></header><div className="grid gap-6 p-6">{adding || editing ? <StaffEditor key={selected?.id || "new"} user={selected || undefined} self={selected?.id === snapshot.user.id} onSaved={saved} cancel={()=>{if(adding)close();else setEditing(false);}} /> : selected && <>
      <div className="flex items-center gap-3"><CustomerAvatar name={selected.name} large /><div className="min-w-0"><h3 className="break-words text-xl font-extrabold text-[#183510]">{selected.name}</h3><p className="mt-1 break-all text-sm text-muted-foreground">{selected.email}</p><p className="mt-1 text-sm">{selected.profile?.phone || "No phone saved"}</p></div></div>
      <div className="flex gap-2"><Badge value={selected.role} /><Badge value={selected.active ? "ACTIVE" : "INACTIVE"} /></div><dl className={ui.detail}><div><dt>Joined</dt><dd>{when(selected.createdAt)}</dd></div><div><dt>Sign-in</dt><dd>{selected.verified ? "Approved" : "Email verification needed"}</dd></div></dl>
      <section className="rounded-2xl border border-[#e3e9db] p-4"><h3 className="mb-3 font-bold text-[#173c10]">Dashboard Permissions</h3>{selected.role === "ADMIN" ? <p className="text-sm text-muted-foreground">Full administrator access to all sections, team accounts and settings.</p> : selected.role === "RIDER" ? <p className="text-sm text-muted-foreground">Assigned pickups and deliveries. Link this account to its rider profile in Pickups & Delivery.</p> : selected.permissions.length ? <ul className="grid grid-cols-2 gap-2 text-sm">{selected.permissions.map((key)=><li key={key} className="flex items-center gap-2"><ShieldCheck className="size-4 shrink-0 text-primary" />{permissionNames[key] || key}</li>)}</ul> : <p className="text-sm text-muted-foreground">No dashboard permissions assigned.</p>}</section>
      <button type="button" className={cn(ui.button,"h-11")} onClick={()=>setEditing(true)}><Pencil className="size-4" />Edit account & access</button><p className="text-xs leading-relaxed text-muted-foreground">Deactivate accounts in the editor to stop sign-in and revoke all sessions. Account history is preserved.</p>
    </>}</div></SheetContent></Sheet>
  </div>;
}
