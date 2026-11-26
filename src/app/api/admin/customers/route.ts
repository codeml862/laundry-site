import { requirePermission } from "@/lib/server/permissions";
import { db } from "@/lib/server/db";
import { requireUser, limit } from "@/lib/server/auth";
import { orderView } from "@/lib/server/admin";
import { api, expect, indiaDate, str } from "@/lib/server/http";
import { customerCsvCell, customerListQuery } from "@/lib/server/customer-list";
import type { Prisma } from "@prisma/client";

const customerFields = { id: true, name: true, email: true, active: true, verified: true, createdAt: true, profile: { select: { phone: true } }, addresses: true, _count: { select: { orders: true } } } satisfies Prisma.UserSelect;

export const GET = api(async (request) => {
  const admin = await requirePermission("customers");
  await limit(`customer-list:${admin.id}`, 180, 5);
  const params = new URL(request.url).searchParams;
  if (params.has("id")) {
    const id = str(params.get("id"), "customer", 100);
    return db.$transaction(async (tx) => {
      const record = await tx.user.findFirst({ where: { id, role: "CUSTOMER" }, select: customerFields });
      expect(record, "Customer not found.", 404);
      const [spent, lastOrder, orders] = await Promise.all([
        tx.order.aggregate({ where: { userId: id, payment: { status: "PAID" } }, _sum: { total: true } }),
        tx.order.aggregate({ where: { userId: id }, _max: { createdAt: true } }),
        tx.order.findMany({ where: { userId: id }, include: orderView, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 20 }),
      ]);
      const { profile, _count, ...customer } = record;
      return { customer: { ...customer, phone: profile?.phone || customer.addresses[0]?.phone || "", orderCount: _count.orders, totalSpent: spent._sum.total || 0, lastOrder: lastOrder._max.createdAt }, orders, historyLimit: 20 };
    }, { isolationLevel: "RepeatableRead", timeout: 15000 });
  }

  return db.$transaction(async (tx) => {
    const repeatGroups = await tx.order.groupBy({ by: ["userId"], where: { user: { role: "CUSTOMER" } }, _count: { _all: true }, having: { userId: { _count: { gt: 1 } } } });
    const { base, where, page: requestedPage, pageSize } = customerListQuery(params, repeatGroups.map((item) => item.userId));
    const [total, totalCustomers, activeCustomers, newCustomers, activeFiltered, inactiveFiltered, areaRecords] = await Promise.all([
      tx.user.count({ where }),
      tx.user.count({ where: { role: "CUSTOMER" } }),
      tx.user.count({ where: { role: "CUSTOMER", active: true } }),
      tx.user.count({ where: { role: "CUSTOMER", createdAt: { gte: new Date(Date.now() - 30 * 86_400_000) } } }),
      tx.user.count({ where: { AND: [base, { active: true }] } }),
      tx.user.count({ where: { AND: [base, { active: false }] } }),
      tx.address.findMany({ where: { user: { role: "CUSTOMER" } }, select: { city: true }, distinct: ["city"], orderBy: { city: "asc" } }),
    ]);
    const exporting = params.get("export") === "csv";
    expect(!exporting || total <= 10_000, "Narrow your filters to 10,000 customers or fewer before exporting.");
    const page = Math.min(requestedPage, Math.max(1, Math.ceil(total / pageSize)));
    const records = await tx.user.findMany({ where, select: customerFields, orderBy: [{ createdAt: "desc" }, { id: "desc" }], ...(exporting ? {} : { skip: (page - 1) * pageSize, take: pageSize }) });
    const ids = records.map((item) => item.id);
    const [paidTotals, lastOrders] = ids.length ? await Promise.all([
      tx.order.groupBy({ by: ["userId"], where: { userId: { in: ids }, payment: { status: "PAID" } }, _sum: { total: true } }),
      tx.order.groupBy({ by: ["userId"], where: { userId: { in: ids } }, _max: { createdAt: true } }),
    ]) : [[], []];
    const spent = new Map(paidTotals.map((item) => [item.userId, item._sum.total || 0]));
    const latest = new Map(lastOrders.map((item) => [item.userId, item._max.createdAt]));
    const customers = records.map(({ profile, _count, ...customer }) => ({ ...customer, phone: profile?.phone || customer.addresses[0]?.phone || "", orderCount: _count.orders, totalSpent: spent.get(customer.id) || 0, lastOrder: latest.get(customer.id) || null }));
    if (exporting) {
      const rows: unknown[][] = [["Name", "Email", "Phone", "Area", "Total orders", "Total spent (INR)", "Last order", "Joined", "Status"]];
      customers.forEach((customer) => rows.push([customer.name, customer.email, customer.phone, [...new Set(customer.addresses.map((address) => address.city))].join("; "), customer.orderCount, (customer.totalSpent / 100).toFixed(2), customer.lastOrder?.toISOString() || "", customer.createdAt.toISOString(), customer.active ? "Active" : "Inactive"]));
      return { csv: "\ufeff" + rows.map((row) => row.map(customerCsvCell).join(",")).join("\r\n"), filename: `customers-${indiaDate()}.csv` };
    }
    return { customers, total, page, pageSize, areas: areaRecords.map((item) => item.city), tabs: { all: activeFiltered + inactiveFiltered, active: activeFiltered, inactive: inactiveFiltered }, stats: { total: totalCustomers, active: activeCustomers, new: newCustomers, repeat: repeatGroups.length } };
  }, { isolationLevel: "RepeatableRead", timeout: 20000 });
});
