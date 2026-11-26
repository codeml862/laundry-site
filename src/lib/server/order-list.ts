import { OrderStatus, type Prisma } from "@prisma/client";
import { dateField, expect, str } from "@/lib/server/http";

export const orderGroups = {
  all: [],
  progress: ["RECEIVED","WASHING","DRYING","IRONING","QUALITY_CHECK","READY","OUT_FOR_DELIVERY"],
  picked: ["PICKED_UP"],
  completed: ["DELIVERED"],
  cancelled: ["CANCELLED"],
} satisfies Record<string, OrderStatus[]>;

export function orderListQuery(params: URLSearchParams) {
  const query = str(params.get("q"),"search",100,true).replace(/^#/,"");
  const service = str(params.get("service"),"service",100,true);
  const area = str(params.get("area"),"area",100,true);
  const status = str(params.get("status"),"status",40,true);
  const group = params.get("group") || "all";
  expect(Object.hasOwn(orderGroups,group),"Choose a valid order group.");
  expect(!status || Object.values(OrderStatus).includes(status as OrderStatus),"Choose a valid status.");
  const from = params.get("from") ? dateField(params.get("from"),"start date") : "";
  const to = params.get("to") ? dateField(params.get("to"),"end date") : "";
  expect(!from || !to || from <= to,"Start date must be before the end date.");
  const page = Number(params.get("page") || 1);
  const pageSize = Number(params.get("pageSize") || 10);
  expect(Number.isSafeInteger(page) && page > 0 && page <= 1_000_000,"Choose a valid page.");
  expect([5,10,25,50].includes(pageSize),"Choose a valid page size.");
  const conditions: Prisma.OrderWhereInput[] = [];
  const selected = str(params.get("ids"),"selected orders",5000,true);
  if (selected) {
    const ids=selected.split(",");
    expect(ids.length<=50 && ids.every((id)=>/^[\w-]{1,100}$/.test(id)),"Choose valid orders for export.");
    conditions.push({id:{in:ids}});
  }
  if (query) {
    const contains = {contains:query,mode:"insensitive" as const};
    conditions.push({OR:[{id:contains},{user:{name:contains}},{user:{email:contains}},{address:{path:["phone"],string_contains:query}}]});
  }
  if (service) conditions.push({items:{some:{serviceId:service}}});
  if (area) conditions.push({OR:[{address:{path:["city"],equals:area}},{address:{path:["postalCode"],equals:area}}]});
  if (from || to) conditions.push({pickupDate:{...(from ? {gte:from} : {}),...(to ? {lte:to} : {})}});
  const base: Prisma.OrderWhereInput = {AND:conditions};
  const statuses = orderGroups[group as keyof typeof orderGroups];
  const where: Prisma.OrderWhereInput = {AND:[base,...(status ? [{status:status as OrderStatus}] : []),...(statuses.length ? [{status:{in:statuses}}] : [])]};
  return {base,where,page,pageSize};
}

/** Quote every cell, escape quotes, and neutralize spreadsheet formulas. */
export function orderCsvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^[\s]*[=+\-@]/.test(text)) text = "'" + text;
  return '"'+text.replaceAll('"','""')+'"';
}
