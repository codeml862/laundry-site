import { PaymentStatus, PaymentMethod, type Prisma } from "@prisma/client";
import { expect, indiaDate, str } from "@/lib/server/http";

export function paymentListQuery(params: URLSearchParams) {
  const status = str(params.get("status"), "status", 40, true);
  const method = str(params.get("method"), "method", 40, true);
  expect(!status || Object.values(PaymentStatus).includes(status as PaymentStatus), "Choose a valid payment status.");
  expect(!method || Object.values(PaymentMethod).includes(method as PaymentMethod), "Choose a valid payment method.");
  const page = Number(params.get("page") || 1);
  const pageSize = Number(params.get("pageSize") || 10);
  const days = Number(params.get("days") || 30);
  expect(Number.isSafeInteger(page) && page > 0 && page <= 1_000_000, "Choose a valid page.");
  expect([5,10,25,50].includes(pageSize), "Choose a valid page size.");
  expect([7,30,90].includes(days), "Choose a valid chart period.");
  const conditions: Prisma.PaymentWhereInput[] = [];
  if (status) conditions.push({status:status as PaymentStatus});
  if (method) conditions.push({method:method as PaymentMethod});
  const q = str(params.get("q"), "search", 100, true).replace(/^#/, "");
  if (q) {
    const contains = {contains:q,mode:"insensitive" as const};
    conditions.push({OR:[{orderId:contains},{externalPaymentId:contains},{externalOrderId:contains},{order:{user:{OR:[{name:contains},{email:contains}]}}}]});
  }
  const ids = str(params.get("ids"), "selection", 5000, true);
  if (ids) {
    const selected = ids.split(",");
    expect(selected.length <= 50 && selected.every((id)=>/^[\w-]{1,100}$/.test(id)), "Choose valid payments for export.");
    conditions.push({orderId:{in:selected}});
  }
  return {where:{AND:conditions} satisfies Prisma.PaymentWhereInput,page,pageSize,days};
}

export function paymentPeriod(days:number, now = new Date()) {
  const today = indiaDate(now);
  const end = new Date(today+"T00:00:00+05:30");
  end.setUTCDate(end.getUTCDate()+1);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate()-days);
  const dates = Array.from({length:days},(_,index)=>indiaDate(new Date(start.getTime()+index*86400000)));
  return {start,end,dates};
}

export function paymentCsvCell(value:unknown) {
  let text = String(value ?? "");
  if (/^\s*[=+\-@]/.test(text)) text = "'"+text;
  return '"'+text.replaceAll('"','""')+'"';
}
