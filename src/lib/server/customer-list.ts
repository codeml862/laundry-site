import type { Prisma } from "@prisma/client";
import { dateField, expect, str } from "@/lib/server/http";

export function customerListQuery(params: URLSearchParams, repeatIds: string[]) {
  const q = str(params.get("q"), "search", 100, true);
  const area = str(params.get("area"), "area", 100, true);
  const state = params.get("state") || "all";
  const type = params.get("type") || "all";
  expect(["all", "active", "inactive"].includes(state), "Choose a valid customer status.");
  expect(["all", "repeat", "first", "unbooked"].includes(type), "Choose a valid customer type.");
  const page = Number(params.get("page") || 1);
  const pageSize = Number(params.get("pageSize") || 10);
  expect(Number.isSafeInteger(page) && page > 0 && page <= 1_000_000, "Choose a valid page.");
  expect([5, 10, 25, 50].includes(pageSize), "Choose a valid page size.");
  const conditions: Prisma.UserWhereInput[] = [{ role: "CUSTOMER" }];
  if (q) {
    const contains = { contains: q, mode: "insensitive" as const };
    conditions.push({ OR: [{ name: contains }, { email: contains }, { profile: { phone: contains } }, { addresses: { some: { phone: contains } } }] });
  }
  if (area) conditions.push({ addresses: { some: { OR: [{ city: { equals: area, mode: "insensitive" } }, { postalCode: area }] } } });
  if (type === "repeat") conditions.push({ id: { in: repeatIds } });
  if (type === "first") conditions.push({ id: { notIn: repeatIds }, orders: { some: {} } });
  if (type === "unbooked") conditions.push({ orders: { none: {} } });
  const from = params.get("from") ? dateField(params.get("from"), "joined start date") : "";
  const to = params.get("to") ? dateField(params.get("to"), "joined end date") : "";
  expect(!from || !to || from <= to, "Joined start date must be before the end date.");
  if (from || to) conditions.push({ createdAt: {
    ...(from ? { gte: new Date(from + "T00:00:00+05:30") } : {}),
    ...(to ? { lt: new Date(Date.parse(to + "T00:00:00+05:30") + 86_400_000) } : {}),
  } });
  const base: Prisma.UserWhereInput = { AND: conditions };
  const where: Prisma.UserWhereInput = { AND: [base, ...(state === "all" ? [] : [{ active: state === "active" }])] };
  return { base, where, page, pageSize };
}

export function customerCsvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^\s*[=+\-@]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
