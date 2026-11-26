"use client";

import { Plus, Upload } from "lucide-react";
import { useState, type ChangeEvent } from "react";
import { ActionForm, Badge, Empty, Field, Modal, Panel, SearchField, Table, label, money, when, ui } from "@/components/dashboard/ui";
import { amount, checked, read, type Coupon, type Mutate, type Service } from "@/components/dashboard/types";

function ServiceEditor({ service, categories, mutate, close }: { service: Partial<Service>; categories: string[]; mutate: Mutate; close: () => void }) {
  const [image, setImage] = useState(service.image ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file || uploading) return;
    const form = new FormData();
    form.set("action", "upload");
    form.set("file", file);
    setUploading(true);
    setError("");
    try {
      const response = await fetch("/api/admin", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok || typeof data.url !== "string") throw new Error(data.error || "Image upload failed.");
      setImage(data.url);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Image upload failed.");
    } finally {
      input.value = "";
      setUploading(false);
    }
  }
  return <Modal title={service.id ? "Edit service" : "Add service"} close={close}>
    <ActionForm button="Save service" submit={async (form) => {
      if (uploading) throw new Error("Wait for the image upload to finish.");
      await mutate("service", {
        id: service.id,
        name: read(form, "name"),
        description: read(form, "description"),
        price: amount(form, "price"),
        unit: read(form, "unit"),
        hours: Number(read(form, "hours")),
        image: image.trim() || null,
        category: read(form, "category"),
        active: checked(form, "active"),
      }, "Service saved.");
      close();
    }}>
      <Field label="Service name"><input name="name" required maxLength={80} defaultValue={service.name} /></Field>
      <Field label="Category"><input name="category" list="op-categories" maxLength={60} required defaultValue={service.category} />
        <datalist id="op-categories">{categories.map((category) => <option key={category} value={category} />)}</datalist>
      </Field>
      <Field label="Description" wide><textarea name="description" required maxLength={600} defaultValue={service.description} /></Field>
      <Field label="Price (₹)"><input type="number" name="price" min="0.01" step="0.01" required defaultValue={service.price === undefined ? undefined : service.price / 100} /></Field>
      <Field label="Pricing type"><select name="unit" defaultValue={service.unit ?? "KG"}><option value="KG">Per kilogram</option><option value="ITEM">Per item</option><option value="FIXED">Fixed price</option></select></Field>
      <Field label="Estimated turnaround (hours)"><input type="number" name="hours" min="1" max="720" step="1" required defaultValue={service.hours ?? 48} /></Field>
      <Field label="Available for booking"><input type="checkbox" name="active" defaultChecked={service.active ?? true} /></Field>
      <Field label="Service image URL" wide><input value={image} maxLength={1000} onChange={(event) => setImage(event.target.value)} placeholder="https://… or /images/…" /></Field>
      <Field label="Upload a service image" wide><input type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} disabled={uploading} /></Field>
      {uploading && <p className={ui.alert} role="status"><Upload size={15} aria-hidden="true" /> Uploading image…</p>}
      {error && <p className={ui.alertError} role="alert">{error}</p>}
    </ActionForm>
  </Modal>;
}

export function Services({ services, mutate, initialId = "" }: { services: Service[]; mutate: Mutate; initialId?: string }) {
  const [service, setService] = useState<Partial<Service> | null>(() => services.find((item)=>item.id===initialId) ?? null);
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("");
  const categories = [...new Set(services.map((item) => item.category))].sort();
  const query = search.trim().toLowerCase();
  const visible = services.filter((item) => (!group || item.category === group) && [item.name, item.description, item.category]
    .some((value) => value.toLowerCase().includes(query)));
  return <>
    <Panel title="Service catalog" description="Manage prices, categories and turnaround times."
      action={<button className={ui.button} type="button" onClick={() => setService({})}><Plus size={16} /> Add service</button>}>
      <div className={ui.toolbar}><SearchField value={search} setValue={setSearch} placeholder="Search services" />
        <select aria-label="Category filter" value={group} onChange={(event) => setGroup(event.target.value)}><option value="">All categories</option>
          {categories.map((category) => <option key={category} value={category}>{category}</option>)}
        </select>
      </div>
      {visible.length ? <Table headers={["Service", "Pricing", "Turnaround", "Status", "Manage"]}>
        {visible.map((item) => <tr key={item.id}><td><strong>{item.name}</strong><small>{item.category}</small></td>
          <td><strong>{money(item.price)}</strong><small>{label(item.unit)}</small></td>
          <td>{item.hours} h</td><td><Badge value={item.active ? "ACTIVE" : "INACTIVE"} /></td>
          <td><button className={ui.secondary} type="button" onClick={() => setService(item)}>Edit service</button></td></tr>)}
      </Table> : <Empty message={services.length ? "Try another search or category." : "Add a service to start building your catalog."} />}
    </Panel>
    {service && <ServiceEditor service={service} categories={categories} mutate={mutate} close={() => setService(null)} />}
  </>;
}

function CouponEditor({ coupon, mutate, close }: { coupon: Partial<Coupon>; mutate: Mutate; close: () => void }) {
  const [kind, setKind] = useState<Coupon["kind"]>(coupon.kind ?? "PERCENT");
  const [value, setValue] = useState(coupon.value === undefined ? "" : String(coupon.kind === "FIXED" ? coupon.value / 100 : coupon.value));
  return <Modal title={coupon.id ? "Edit coupon" : "Add coupon"} close={close}>
    <ActionForm button="Save coupon" submit={async (form) => {
      const expires = read(form, "expiresAt");
      const usageLimit = read(form, "limit");
      await mutate("coupon", {
        id: coupon.id,
        code: read(form, "code").toUpperCase(),
        kind,
        value: kind === "FIXED" ? amount(form, "value") : Number(value),
        minimum: amount(form, "minimum"),
        expiresAt: expires || null,
        limit: usageLimit ? Number(usageLimit) : null,
        active: checked(form, "active"),
      }, "Coupon saved.");
      close();
    }}>
      <Field label="Code"><input name="code" required maxLength={40} pattern="[A-Za-z0-9_\-]+" defaultValue={coupon.code} /></Field>
      <Field label="Discount type"><select value={kind} onChange={(event) => {
        setKind(event.target.value as Coupon["kind"]);
        setValue("");
      }}><option value="PERCENT">Percentage</option><option value="FIXED">Fixed amount</option></select></Field>
      <Field label={kind === "PERCENT" ? "Discount (%)" : "Discount (₹)"}><input type="number" name="value" value={value}
        onChange={(event) => setValue(event.target.value)} min={kind === "PERCENT" ? "1" : "0.01"} max={kind === "PERCENT" ? "100" : undefined}
        step={kind === "PERCENT" ? "1" : "0.01"} required /></Field>
      <Field label="Minimum order (₹)"><input type="number" name="minimum" min="0" step="0.01" required defaultValue={(coupon.minimum ?? 0) / 100} /></Field>
      <Field label="Expiry date"><input type="date" name="expiresAt" defaultValue={coupon.expiresAt?.slice(0, 10)} /></Field>
      <Field label="Usage limit"><input type="number" name="limit" min="1" step="1" placeholder="Unlimited" defaultValue={coupon.limit ?? undefined} /></Field>
      <Field label="Active"><input type="checkbox" name="active" defaultChecked={coupon.active ?? true} /></Field>
    </ActionForm>
  </Modal>;
}

export function Coupons({ coupons, mutate }: { coupons: Coupon[]; mutate: Mutate }) {
  const [coupon, setCoupon] = useState<Partial<Coupon> | null>(null);
  return <>
    <Panel title="Coupon codes" description="Set discounts, minimum orders and usage limits."
      action={<button className={ui.button} type="button" onClick={() => setCoupon({})}><Plus size={16} /> Add coupon</button>}>
      {coupons.length ? <Table headers={["Code", "Discount", "Minimum order", "Expires", "Usage", "Status", "Manage"]}>
        {coupons.map((item) => <tr key={item.id}><td><strong>{item.code}</strong></td>
          <td>{item.kind === "PERCENT" ? item.value + "%" : money(item.value)}</td><td>{money(item.minimum)}</td>
          <td>{item.expiresAt ? when(item.expiresAt) : "No expiry"}</td>
          <td>{item.used} / {item.limit ?? "Unlimited"}</td><td><Badge value={item.active ? "ACTIVE" : "INACTIVE"} /></td>
          <td><button className={ui.secondary} type="button" onClick={() => setCoupon(item)}>Edit coupon</button></td></tr>)}
      </Table> : <Empty message="Add a code customers can apply to eligible orders." />}
    </Panel>
    {coupon && <CouponEditor coupon={coupon} mutate={mutate} close={() => setCoupon(null)} />}
  </>;
}
