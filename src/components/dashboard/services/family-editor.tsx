"use client";

import { useState, type ChangeEvent } from "react";
import { LoaderCircle, Upload } from "lucide-react";
import { ActionForm, Field, Modal, ui } from "@/components/dashboard/ui";
import { saveServiceRequest, sizes, speeds, titleCase, variantKey, type ServiceFamily } from "./service-model";

export function FamilyEditor({family,categories,close,onSaved}:{family?:ServiceFamily;categories:string[];close:()=>void;onSaved:()=>Promise<void>}) {
  const [image,setImage]=useState(family?.image||"");
  const [uploading,setUploading]=useState(false);
  const [uploadError,setUploadError]=useState("");
  const [configured,setConfigured]=useState(()=>new Set(family ? family.variants.map((row)=>variantKey(row.speed||"REGULAR",row.size||"MEDIUM")) : speeds.flatMap((speed)=>sizes.map((size)=>variantKey(speed,size)))));
  const [speed,setSpeed]=useState("REGULAR");
  async function upload(event:ChangeEvent<HTMLInputElement>) {
    const file=event.currentTarget.files?.[0];if(!file)return;
    const form=new FormData();form.set("file",file);setUploading(true);setUploadError("");
    try {const response=await fetch("/api/admin",{method:"POST",body:form});const data=await response.json();if(!response.ok)throw new Error(data.error||"Image upload failed.");setImage(data.url);}catch(error){setUploadError(error instanceof Error?error.message:"Image upload failed.");}finally{setUploading(false);}
  }
  return <Modal title={family?`Edit ${family.name}`:"Add service"} close={close}>
    <ActionForm button="Save service & options" submit={async(form)=>{
      if(uploading)throw new Error("Wait for the image upload to finish.");
      const variants=speeds.flatMap((speed)=>sizes.map((size)=>({speed,size,key:variantKey(speed,size)}))).filter((row)=>configured.has(row.key)).map(({speed,size,key})=>({speed,size,price:Math.round(Number(form.get(`price-${key}`))*100),hours:Number(form.get(`hours-${key}`)),active:form.get(`active-${key}`)==="on"}));
      if(!variants.length)throw new Error("Configure at least one service option.");
      const incomplete=variants.find((row)=>!Number.isInteger(row.price)||row.price<1||!Number.isInteger(row.hours)||row.hours<1||row.hours>720);
      if(incomplete){setSpeed(incomplete.speed);throw new Error(`Enter a valid price and turnaround for ${titleCase(incomplete.speed)} ${titleCase(incomplete.size)}.`);}
      await saveServiceRequest({action:"save",id:family?.variants[0]?.id,name:form.get("name"),description:form.get("description"),category:form.get("category"),unit:form.get("unit"),image,variants});
      await onSaved();close();
    }}>
      <Field label="Service name"><input name="name" required maxLength={50} defaultValue={family?.name} placeholder="e.g. Wash & Fold" /></Field>
      <Field label="Category"><input name="category" required maxLength={60} defaultValue={family?.category} list="service-family-categories" /><datalist id="service-family-categories">{categories.map((category)=><option key={category}>{category}</option>)}</datalist></Field>
      <Field label="Description" wide><textarea name="description" required maxLength={600} defaultValue={family?.description} /></Field>
      <Field label="Pricing unit"><select name="unit" defaultValue={family?.unit||"KG"}><option value="KG">Per kilogram</option><option value="ITEM">Per item</option><option value="FIXED">Fixed price</option></select></Field>
      <Field label="Service image URL"><input value={image} onChange={(event)=>setImage(event.target.value)} maxLength={1000} placeholder="/images/… or https://…" /></Field>
      <Field label="Upload image" wide><input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={upload} /></Field>
      {uploading&&<p className={ui.alert}><Upload className="size-4" />Uploading image…</p>}{uploadError&&<p className={ui.alertError} role="alert">{uploadError}</p>}
      <div className="sm:col-span-2"><h3 className="font-bold text-[#173b11]">Service types &amp; sizes</h3><p className="mt-1 text-sm text-muted-foreground">Configure Regular and Express prices separately for Small, Medium and Large. Only configured options can be booked.</p><div role="group" aria-label="Service option type" className="mt-4 flex gap-2">{speeds.map((item)=><button type="button" key={item} onClick={()=>setSpeed(item)} aria-pressed={speed===item} className={`rounded-full px-4 py-2 text-sm font-semibold ${speed===item?"bg-[#267b13] text-white":"bg-[#f0f6e3] text-[#2d6a1b]"}`}>{titleCase(item)}</button>)}</div></div>
      {speeds.map((item)=><fieldset key={item} className={`grid gap-3 rounded-2xl border border-[#e4ebdb] p-4 sm:col-span-2 ${speed===item?"":"hidden"}`}><legend className="px-2 text-sm font-bold text-[#275b1b]">{titleCase(item)} options</legend>{sizes.map((size)=>{
        const key=variantKey(item,size);const previous=family?.variants.find((row)=>(row.speed||"REGULAR")===item&&(row.size||"MEDIUM")===size);const enabled=configured.has(key);
        return <div key={size} className="grid gap-3 border-b border-[#edf0e8] pb-4 last:border-b-0 last:pb-0"><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={enabled} onChange={(event)=>setConfigured((current)=>{const next=new Set(current);if(event.target.checked)next.add(key);else next.delete(key);return next;})} className="size-4 accent-[#267b13]" />{titleCase(size)}</label>{enabled&&<div className="grid grid-cols-2 gap-3"><Field label="Price (₹)"><input name={`price-${key}`} type="number" min="0.01" max="100000" step="0.01" required={speed===item} defaultValue={previous?previous.price/100:undefined} /></Field><Field label="Turnaround (hours)"><input name={`hours-${key}`} type="number" min="1" max="720" step="1" required={speed===item} defaultValue={previous?.hours} /></Field><label className="col-span-2 flex items-center gap-2 text-sm"><input name={`active-${key}`} type="checkbox" defaultChecked={previous?.active??true} className="size-4 accent-[#267b13]" />Available for booking</label></div>}</div>;
      })}</fieldset>)}
      <p className="text-xs text-muted-foreground">Removing an existing option makes it unavailable for new bookings; past orders keep their original service and price.</p>
      {uploading&&<LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
    </ActionForm>
  </Modal>;
}
