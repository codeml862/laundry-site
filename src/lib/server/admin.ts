import { createHash } from "node:crypto";
import { Prisma, type OrderStatus } from "@prisma/client";
import { db } from "@/lib/server/db";
import { addressFields, bool, dateField, emailValue, expect, integer, oneOf, str, type Data } from "@/lib/server/http";
import { dispatchEmail, notify, statusLabels } from "@/lib/server/mail";

export const orderView = {
  user:{select:{id:true,name:true,email:true}},
  items:true,history:{orderBy:{createdAt:"asc"}},
  payment:{select:{method:true,status:true,amount:true,externalPaymentId:true,refundId:true}},
} satisfies Prisma.OrderInclude;
export const nextStatuses: Record<OrderStatus,OrderStatus[]> = {
  ORDER_PLACED:["PICKUP_SCHEDULED","CANCELLED"],
  PICKUP_SCHEDULED:["PICKED_UP","CANCELLED"],
  PICKED_UP:["RECEIVED"],RECEIVED:["WASHING","IRONING","QUALITY_CHECK"],
  WASHING:["DRYING","QUALITY_CHECK"],DRYING:["IRONING","QUALITY_CHECK"],IRONING:["QUALITY_CHECK"],
  QUALITY_CHECK:["READY"],READY:["OUT_FOR_DELIVERY"],OUT_FOR_DELIVERY:["DELIVERED"],DELIVERED:[],CANCELLED:[]
};

export async function changeStatus(input: Data, user: {id:string}) {
  const id = str(input.orderId,"order",100);
  const status = oneOf(input.status,Object.keys(nextStatuses) as OrderStatus[],"order status");
  const result = await db.$transaction(async(tx)=>{
    const order = await tx.order.findUnique({where:{id},include:{payment:true}});
    expect(order,"Order not found.",404);
    if (order.status === status) return;
    expect(nextStatuses[order.status].includes(status),"This order cannot move to that status.",409);
    expect(status === "CANCELLED" || order.payment?.method !== "RAZORPAY" || order.payment.status === "PAID","Online payment must be confirmed before fulfilling the order.",409);
    const updated = await tx.order.updateMany({where:{id,status:order.status},data:{status}});
    expect(updated.count === 1,"This order changed. Refresh and try again.",409);
    await tx.orderHistory.create({data:{orderId:id,status,actorId:user.id}});
    if (status === "CANCELLED") await tx.couponUsage.deleteMany({where:{orderId:id}});
    return notify(tx,order.userId,statusLabels[status],`Order ${id}: ${statusLabels[status]}.`,id+":"+status);
  },{isolationLevel:"Serializable"});
  if (result) await dispatchEmail(result.id);
}

function imageUrl(value: unknown) {
  const path = str(value,"image URL",1000,true);
  if (!path) return null;
  if (/^\/images\/[a-zA-Z0-9_./-]+$/.test(path) && !path.includes("..")) return path;
  const url = URL.canParse(path) ? new URL(path) : null;
  expect(url?.protocol === "https:" && !url.username && !url.password, "Use an HTTPS image URL.");
  return url.href;
}
export async function saveService(input: Data) {
  const id = str(input.id,"service ID",100,true);
  const category = str(input.category,"category",60);
  const data = {
    name:str(input.name,"name",80),description:str(input.description,"description",600),
    price:integer(input.price,"price per unit",1),unit:oneOf(input.unit,["KG","ITEM","FIXED"],"pricing unit"),
    hours:integer(input.hours,"turnaround hours",1,720),image:imageUrl(input.image),
    active:bool(input.active,"service availability"),
    group:{connectOrCreate:{where:{name:category},create:{name:category}}}
  };
  if (id) return db.service.update({where:{id},data});
  return db.service.create({data});
}
export async function saveCoupon(input: Data) {
  const id = str(input.id,"coupon ID",100,true);
  const kind = oneOf(input.kind,["PERCENT","FIXED"],"coupon type");
  const code = str(input.code,"coupon code",40).toUpperCase();
  expect(/^[A-Z0-9_-]+$/.test(code),"Use only letters, numbers, hyphens, and underscores in coupon codes.");
  const expiresAt = input.expiresAt ? new Date(dateField(String(input.expiresAt).slice(0,10),"expiry date")+"T18:29:59.999Z") : null;
  const data = {code,kind,expiresAt,value:integer(input.value,"discount",1,kind === "PERCENT" ? 100 : 10_000_000),
    minimum:integer(input.minimum,"minimum amount"),limit:input.limit == null ? null : integer(input.limit,"usage limit",1,1_000_000),
    active:bool(input.active,"coupon availability")};
  if (id) return db.coupon.update({where:{id},data});
  return db.coupon.create({data});
}
function stringList(value: unknown, label: string, maxCount: number) {
  expect(Array.isArray(value) && value.length <= maxCount,`Enter a valid ${label} list.`);
  return [...new Set(value.map(item=>str(item,label,90)))];
}
export async function saveSettings(input: Data) {
  const slots = stringList(input.slots,"time slot",24);
  expect(slots.length && slots.every(slot=>{
    const match = /^([01]\d|2[0-3]):[0-5]\d[–-]([01]\d|2[0-3]):[0-5]\d$/.test(slot);
    return match && slot.slice(0,5) < slot.slice(6);
  }),"Use ordered 24-hour time ranges for slots, such as 09:00–11:00.");
  const data = {
    businessName:str(input.businessName,"business name",100),
    logo:imageUrl(input.logo) ?? "",
    contactEmail:input.contactEmail ? emailValue(input.contactEmail) : "",
    contactPhone:str(input.contactPhone,"contact phone",25,true),
    operatingHours:str(input.operatingHours,"operating hours",150),
    serviceAreas:stringList(input.serviceAreas,"service area city or PIN code",100),
    slots,cod:bool(input.cod,"cash on delivery"),onlinePayments:bool(input.onlinePayments,"online payments"),
    taxBps:integer(input.taxBps,"tax rate",0,10_000),deliveryFee:integer(input.deliveryFee,"delivery fee"),
    minimum:integer(input.minimum,"minimum order amount")
  };
  return db.settings.upsert({where:{id:1},update:data,create:data});
}
export async function changeCustomer(input: Data, address: boolean) {
  const userId = str(address ? input.userId : input.id,"customer",100);
  const customer = await db.user.findFirst({where:{id:userId,role:"CUSTOMER"},select:{id:true}});
  expect(customer,"Customer not found.",404);
  if (address) {
    const fields = addressFields(input);
    const id = str(input.id,"address ID",100,true);
    if (!id) return db.address.create({data:{...fields,userId}});
    const record = await db.address.updateMany({where:{id,userId},data:fields});
    expect(record.count,"Address not found.",404);
    return record;
  }
  const phone = str(input.phone,"phone",25,true);
  expect(!phone || /^\+?[\d ()-]{10,25}$/.test(phone),"Enter a valid phone number.");
  return db.user.update({where:{id:userId},data:{
    name:str(input.name,"name",80),profile:{upsert:{create:{phone},update:{phone}}}
  },select:{id:true}});
}
export async function uploadImage(request: Request) {
  const length = Number(request.headers.get("content-length"));
  expect(!length || length <= 3_100_000,"Images must be under 3 MB.",413);
  const data = await request.formData();
  const file = data.get("file");
  expect(file instanceof File && file.size <= 3_000_000,"Choose an image under 3 MB.");
  const buffer = Buffer.from(await file.arrayBuffer());
  const png = buffer.length >= 8 && buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const jpg = buffer.length >= 3 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255;
  const webp = buffer.length >= 12 && buffer.toString("ascii",0,4) === "RIFF" && buffer.toString("ascii",8,12) === "WEBP";
  expect((png && file.type === "image/png") || (jpg && file.type === "image/jpeg") || (webp && file.type === "image/webp"),"Upload a JPEG, PNG, or WebP image.");
  const {CLOUDINARY_CLOUD_NAME:cloud,CLOUDINARY_API_KEY:key,CLOUDINARY_API_SECRET:secret} = process.env;
  expect(cloud && /^[\w-]+$/.test(cloud) && key && secret,"Image storage is not configured. Use an HTTPS image URL.",503);
  const timestamp = String(Math.floor(Date.now()/1000));
  const folder = "quicklywash";
  const signature = createHash("sha256").update(`folder=${folder}&timestamp=${timestamp}${secret}`).digest("hex");
  const form = new FormData();
  for (const [name,value] of Object.entries({timestamp,folder,signature,api_key:key})) form.set(name,value);
  form.set("file",file);
  const result = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`,{method:"POST",body:form,signal:AbortSignal.timeout(15_000)});
  expect(result.ok,"Image upload failed.",502);
  const image = await result.json();
  expect(typeof image.secure_url === "string","Image storage did not return a URL.",502);
  return {url:image.secure_url};
}
