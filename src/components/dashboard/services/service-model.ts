import type { Service } from "@/components/dashboard/types";

export type Speed = "REGULAR" | "EXPRESS";
export type Size = "SMALL" | "MEDIUM" | "LARGE";
export const speeds:Speed[] = ["REGULAR","EXPRESS"];
export const sizes:Size[] = ["SMALL","MEDIUM","LARGE"];
export type ManagedService = Service & {familyKey?:string|null;familyName?:string|null;speed?:string;size?:string};
export type ServiceFamily = {key:string;name:string;description:string;category:string;image:string|null;unit:Service["unit"];variants:ManagedService[]};
export const titleCase = (value:string)=>value.charAt(0)+value.slice(1).toLowerCase();
export const variantKey = (speed:string,size:string)=>`${speed}:${size}`;

export function serviceFamilies(services:ManagedService[]):ServiceFamily[] {
  const groups = new Map<string,ServiceFamily>();
  for (const service of services) {
    const key = service.familyKey || service.id;
    const group = groups.get(key) || {key,name:service.familyName || service.name,description:service.description,category:service.category,image:service.image || null,unit:service.unit,variants:[]};
    group.variants.push(service);
    groups.set(key,group);
  }
  return [...groups.values()].map((group)=>({...group,variants:[...group.variants].sort((a,b)=>speeds.indexOf((a.speed||"REGULAR") as Speed)-speeds.indexOf((b.speed||"REGULAR") as Speed)||sizes.indexOf((a.size||"MEDIUM") as Size)-sizes.indexOf((b.size||"MEDIUM") as Size))})).sort((a,b)=>a.name.localeCompare(b.name));
}

export function serviceImage(family:ServiceFamily) {
  if (family.image) return family.image;
  const name=(family.name+" "+family.category).toLowerCase();
  if(name.includes("dry"))return "/images/dry-cleaning.webp";
  if(name.includes("iron"))return "/images/wash-and-iron.webp";
  if(name.includes("premium"))return "/images/premium-garment-care.webp";
  if(name.includes("home")||name.includes("linen"))return "/images/home-linens.webp";
  if(name.includes("shoe"))return "/images/shoe-cleaning.webp";
  return "/images/wash-fold.webp";
}

export async function saveServiceRequest(input:Record<string,unknown>) {
  const response=await fetch("/api/admin/services",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(input)});
  const data=await response.json();
  if(!response.ok)throw new Error(data.error || "The service could not be saved.");
  return data;
}

export function exportServiceCsv(rows:ManagedService[]) {
  const cell=(value:unknown)=>{let text=String(value??"");if(/^\s*[=+\-@]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';};
  const lines:unknown[][]=[["Service","Category","Type","Size","Unit","Price (INR)","Turnaround (hours)","Status"]];
  for(const row of rows)lines.push([row.familyName || row.name,row.category,row.speed||"REGULAR",row.size||"MEDIUM",row.unit,(row.price/100).toFixed(2),row.hours,row.active?"Active":"Inactive"]);
  const url=URL.createObjectURL(new Blob(["\ufeff"+lines.map((line)=>line.map(cell).join(",")).join("\r\n")],{type:"text/csv;charset=utf-8"}));
  const link=document.createElement("a");link.href=url;link.download="service-pricing.csv";link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
