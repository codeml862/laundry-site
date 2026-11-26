import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/server/db";
import { bool, expect, integer, object, oneOf, str, type Data } from "@/lib/server/http";

export const serviceSpeeds = ["REGULAR","EXPRESS"] as const;
export const serviceSizes = ["SMALL","MEDIUM","LARGE"] as const;

function imageValue(value: unknown) {
  const image = str(value,"image URL",1000,true);
  if (!image) return null;
  if (/^\/images\/[a-zA-Z0-9_./-]+$/.test(image) && !image.includes("..")) return image;
  const url = URL.canParse(image) ? new URL(image) : null;
  expect(url?.protocol === "https:" && !url.username && !url.password,"Use a local /images path or an HTTPS image URL.");
  return url.href;
}

/**
 * Customer-facing name for one option of a service family. Only the parts that differ inside the
 * family are added: "Laundry – Express", "Laundry bag – Large", "Duvet – Large · Express".
 */
export function variantName(name:string, variant:{speed:string;size:string}, all:{speed:string;size:string}[]) {
  const label = (value:string)=>value.charAt(0)+value.slice(1).toLowerCase();
  const parts = [];
  if (new Set(all.map(({size})=>size)).size > 1) parts.push(label(variant.size));
  if (new Set(all.map(({speed})=>speed)).size > 1) parts.push(label(variant.speed));
  return parts.length ? `${name} – ${parts.join(" · ")}` : name;
}

export function serviceFamilyInput(input: Data) {
  const name = str(input.name,"service name",50);
  const description = str(input.description,"description",600);
  const category = str(input.category,"category",60);
  const unit = oneOf(input.unit,["KG","ITEM","FIXED"],"pricing unit");
  const image = imageValue(input.image);
  expect(Array.isArray(input.variants) && input.variants.length > 0 && input.variants.length <= 6,"Configure between one and six service options.");
  const pairs = new Set<string>();
  const variants = input.variants.map((raw)=>{
    const row = object(raw);
    const speed = oneOf(row.speed,serviceSpeeds,"service type");
    const size = oneOf(row.size,serviceSizes,"size");
    const key = `${speed}:${size}`;
    expect(!pairs.has(key),"Each service type and size can be configured once.");
    pairs.add(key);
    return {speed,size,price:integer(row.price,"price",1,10_000_000),hours:integer(row.hours,"turnaround hours",1,720),active:bool(row.active,"option availability")};
  });
  for (const size of serviceSizes) {
    const regular = variants.find((row)=>row.size===size && row.speed==="REGULAR");
    const express = variants.find((row)=>row.size===size && row.speed==="EXPRESS");
    expect(!regular || !express || express.hours<=regular.hours,`Express ${size.toLowerCase()} turnaround must be no longer than regular turnaround.`);
  }
  return {name,description,category,unit,image,variants};
}

export async function saveServiceFamily(input: Data) {
  const parsed = serviceFamilyInput(input);
  const id = str(input.id,"service ID",100,true);
  return db.$transaction(async(tx)=>{
    const existing = id ? await tx.service.findUnique({where:{id}}) : null;
    expect(!id || existing,"Service not found.",404);
    const familyKey = existing?.familyKey || existing?.id || randomUUID();
    const members = existing?.familyKey ? await tx.service.findMany({where:{familyKey}}) : existing ? [existing] : [];
    const memberKeys = new Map(members.map((row)=>[`${row.speed}:${row.size}`,row]));
    const configured = new Set(parsed.variants.map((row)=>`${row.speed}:${row.size}`));
    // Never delete historical catalog IDs. Removed options are made unavailable.
    for (const row of members) if (!configured.has(`${row.speed}:${row.size}`)) await tx.service.update({where:{id:row.id},data:{active:false,familyKey,familyName:parsed.name}});
    const result = [];
    for (const variant of parsed.variants) {
      const member = memberKeys.get(`${variant.speed}:${variant.size}`);
      const data = {name:variantName(parsed.name,variant,parsed.variants.map(({speed,size})=>({speed,size}))),description:parsed.description,unit:parsed.unit,image:parsed.image,familyKey,familyName:parsed.name,...variant,group:{connectOrCreate:{where:{name:parsed.category},create:{name:parsed.category}}}};
      result.push(member ? await tx.service.update({where:{id:member.id},data}) : await tx.service.create({data}));
    }
    return {familyKey,services:result};
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:15000});
}

export async function setServiceAvailability(input: Data) {
  const id = str(input.id,"service ID",100);
  const active = bool(input.active,"service availability");
  const family = bool(input.family,"family availability");
  return db.$transaction(async(tx)=>{
    const service = await tx.service.findUnique({where:{id}});
    expect(service,"Service not found.",404);
    const where = family && service.familyKey ? {familyKey:service.familyKey} : {id};
    await tx.service.updateMany({where,data:{active}});
    return {ok:true};
  });
}
