"use client";

import { useRef, useState } from "react";
import { ActionForm, Field, Modal, money, ui } from "@/components/dashboard/ui";
import { read, type Mutate, type Snapshot } from "@/components/dashboard/types";

export function CreateCustomer({mutate,close}:{mutate:Mutate;close:()=>void}) {
  return <Modal title="Add customer" close={close}><p className="mb-5 text-sm text-muted-foreground">Create a customer record. They can set their password using “Forgot password” and verify their email before signing in to book.</p><ActionForm button="Add customer" submit={async(form)=>{await mutate("createCustomer",{name:read(form,"name"),email:read(form,"email"),phone:read(form,"phone")},"Customer created.");close();}}>
    <Field label="Full name" wide><input name="name" required maxLength={80} autoComplete="name" /></Field><Field label="Email" wide><input name="email" type="email" required maxLength={254} autoComplete="email" /></Field><Field label="Phone" wide><input name="phone" type="tel" maxLength={25} autoComplete="tel" /></Field>
  </ActionForm></Modal>;
}

export function CreateOrder({snapshot,close,onCreated}:{snapshot:Snapshot;close:()=>void;onCreated:(id:string)=>Promise<void>}) {
  const [customerId,setCustomerId] = useState("");
  const [serviceId,setServiceId] = useState("");
  const [quantity,setQuantity] = useState(1);
  const requestId = useRef("");
  const customer = snapshot.customers.find((item)=>item.id===customerId);
  const service = snapshot.services.find((item)=>item.id===serviceId);
  const subtotal = service ? Math.round(service.price*quantity) : 0;
  const total = subtotal+snapshot.settings.deliveryFee+Math.round((subtotal+snapshot.settings.deliveryFee)*snapshot.settings.taxBps/10_000);
  const today = new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  return <Modal title="New order" close={close}>
    {!snapshot.settings.cod ? <p className={ui.alertError}>Enable cash on delivery in Settings before creating admin orders.</p> : <ActionForm button="Create order" submit={async(form)=>{
      if (!requestId.current) requestId.current=crypto.randomUUID();
      const response=await fetch("/api/booking",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"adminCreate",userId:customerId,items:[{serviceId,quantity}],addressId:read(form,"addressId"),pickupDate:read(form,"pickupDate"),pickupSlot:read(form,"pickupSlot"),instructions:read(form,"instructions"),method:"COD",requestId:requestId.current,expectedTotal:total})});
      const data=await response.json();
      if(!response.ok) throw new Error(data.error || "Could not create this order.");
      await onCreated(data.orderId);close();
    }}>
      <Field label="Customer" wide><select required value={customerId} onChange={(event)=>setCustomerId(event.target.value)}><option value="">Choose customer</option>{snapshot.customers.map((item)=><option key={item.id} value={item.id}>{item.name} · {item.email}</option>)}</select></Field>
      <Field label="Pickup address" wide><select name="addressId" key={customerId} required defaultValue=""><option value="">Choose saved address</option>{customer?.addresses.map((address)=><option key={address.id} value={address.id}>{address.line1}, {address.city} {address.postalCode}</option>)}</select></Field>
      {customer && !customer.addresses.length && <p className="text-sm text-muted-foreground">Add an address from Customers → View customer before creating this order.</p>}
      <Field label="Service"><select required value={serviceId} onChange={(event)=>{setServiceId(event.target.value);setQuantity(1);}}><option value="">Choose service</option>{snapshot.services.filter((item)=>item.active).map((item)=><option key={item.id} value={item.id}>{item.name} · {money(item.price)} / {item.unit.toLowerCase()}</option>)}</select></Field>
      <Field label={service?.unit==="KG"?"Quantity (kg)":"Quantity"}><input type="number" required min={service?.unit==="KG"?0.25:1} max={service?.unit==="FIXED"?1:200} step={service?.unit==="KG"?0.25:1} value={quantity} onChange={(event)=>setQuantity(event.target.valueAsNumber)} /></Field>
      <Field label="Pickup date"><input name="pickupDate" type="date" min={today} required /></Field><Field label="Pickup slot"><select name="pickupSlot" required defaultValue=""><option value="">Choose slot</option>{snapshot.settings.slots.map((slot)=><option key={slot}>{slot}</option>)}</select></Field>
      <Field label="Care notes" wide><textarea name="instructions" maxLength={1500} /></Field><p className="rounded-xl bg-secondary p-3 text-sm font-semibold text-primary sm:col-span-2">Total: {money(Number.isFinite(total)?total:0)} · Cash on delivery</p>
    </ActionForm>}
  </Modal>;
}
