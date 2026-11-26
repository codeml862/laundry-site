// Contract checks for the actual route handlers, with an isolated in-memory database.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const path = require("node:path");
const root = path.resolve(__dirname, "../..");
function load(file, imports) {
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(path.join(root, file), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(source, { module, exports: module.exports, require: (name) => imports[name] ?? {}, Request, Response, URL, TextDecoder, Date, Intl, process, console });
  return module.exports;
}
const http = load("src/lib/server/http.ts", { "@prisma/client": require("@prisma/client"), "next/server": { connection: async () => {} } });
const tomorrow = http.indiaDate(new Date(Date.now() + 86_400_000));
const today = http.indiaDate();

async function checkSummary() {
  const db = {
    order: {
      count: async () => 1201,
      aggregate: async () => ({ _sum: { total: 45000 } }),
      groupBy: async () => [{ status: "DELIVERED", _count: { _all: 1200 } }, { status: "PICKUP_SCHEDULED", _count: { _all: 1 } }],
      findMany: async () => [{ createdAt: new Date(), total: 45000, payment: { status: "PAID" } }, { createdAt: new Date(), total: 5000, payment: { status: "PENDING" } }],
    },
    user: { count: async () => 1002, findMany: async () => [{ createdAt: new Date() }] },
    orderItem: { groupBy: async () => [{ serviceId: "wash", name: "Wash & Fold", _count: { _all: 1201 } }] },
  };
  const { dashboardSummary } = load("src/lib/server/dashboard.ts", { "@/lib/server/db": { db }, "@/lib/server/http": http });
  const result = await dashboardSummary();
  assert.equal(result.orders, 1201, "Lifetime totals must exceed the 1,000-row display limit");
  assert.equal(result.customers, 1002);
  assert.equal(result.revenue, 45000);
  assert.equal(result.daily.length, 90);
  const day = result.daily.find((item) => item.date === today);
  assert.equal(day.orders, 2);
  assert.equal(day.customers, 1);
  assert.equal(day.revenue, 45000, "Pending payments must not inflate collected revenue");
  assert.equal(result.services[0].count, 1201);
  assert.equal(result.statuses.reduce((sum, item) => sum + item.count, 0), result.orders);
}

async function checkBooking() {
  let role = "ADMIN";
  let captured;
  let existing = null;
  let cartDeletes = 0;
  const amounts = { subtotal: 7900, discount: 0, deliveryFee: 0, tax: 0, total: 7900 };
  const tx = {
    order: { findUnique: async () => existing, create: async ({ data }) => { captured = data; return { id: "created-order", payment: { method: "COD", status: "PENDING" } }; } },
    address: { findFirst: async ({ where }) => where.userId === "customer" && where.id === "address" ? { line1: "Test street", city: "Hyderabad", postalCode: "500001", phone: "9999999999" } : null },
    cartItem: { deleteMany: async () => { cartDeletes++; } },
  };
  const db = { user: { findFirst: async ({ where }) => where.id === "customer" ? { id: "customer" } : null }, $transaction: async (fn) => fn(tx) };
  const route = load("src/app/api/booking/route.ts", {
    "@/lib/server/permissions": { requirePermission: async (key) => { assert.equal(key,"orders"); http.expect(role === "ADMIN","Forbidden",403); return {id:"admin"}; } },
    "@/lib/server/http": http,
    "@/lib/server/auth": { requireUser: async (roles) => { http.expect(roles.includes(role), "Forbidden", 403); return { id: role === "ADMIN" ? "admin" : "customer" }; }, limit: async () => {} },
    "@/lib/server/db": { db },
    "@/lib/server/catalog": { requestedItems: (items) => items, quote: async () => ({ amounts, settings: { minimum: 0, cod: true, slots: ["10:00–12:00"], serviceAreas: [] }, items: [{ serviceId: "wash", name: "Wash", price: 7900, quantity: 1, unit: "KG", hours: 24 }] }) },
    "@/lib/server/mail": { notify: async () => null, dispatchEmail: async () => {} },
  });
  const payload = { action: "adminCreate", userId: "customer", items: [{ serviceId: "wash", quantity: 1 }], method: "COD", addressId: "address", pickupDate: tomorrow, pickupSlot: "10:00–12:00", expectedTotal: 7900, requestId: "test-reference" };
  const call = (changes = {}) => route.POST(new Request("http://localhost:3000/api/booking", { method: "POST", headers: { "content-type": "application/json", origin: "http://localhost:3000" }, body: JSON.stringify({ ...payload, ...changes }) }));
  let response = await call();
  assert.equal(response.status, 200);
  assert.equal((await response.json()).orderId, "created-order");
  assert.equal(captured.userId, "customer");
  assert.equal(captured.history.create.actorId, "admin");
  assert.equal(captured.total, 7900);
  assert.equal(cartDeletes, 0, "Staff booking must preserve the customer's cart");
  assert.equal((await call({ expectedTotal: 8000 })).status, 409);
  assert.equal((await call({ userId: "missing" })).status, 404);
  assert.equal((await call({ addressId: "someone-elses-address" })).status, 400);
  assert.equal((await call({ method: "RAZORPAY" })).status, 400);
  assert.equal((await call({ pickupDate: "2020-01-01" })).status, 400);
  existing = { id: "existing-order", payment: { method: "COD", status: "PENDING" } };
  assert.equal((await (await call()).json()).orderId, "existing-order", "Retry must return the original booking");
  role = "CUSTOMER";
  assert.equal((await call()).status, 403, "Customers cannot impersonate an admin booking");
}

(async () => {
  await checkSummary();
  await checkBooking();
  console.log("PASS: dashboard totals, daily activity, paid revenue, admin booking, ownership, pricing, payment rules, dates, idempotency and authorization. No real records changed.");
})().catch((error) => { console.error(error); process.exitCode = 1; });
