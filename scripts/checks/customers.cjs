// Exercises customer route contracts with an isolated database; does not alter real records.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const path = require("node:path");
const root = path.resolve(__dirname, "../..");
function load(file, imports) {
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(path.join(root, file), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(source, { module, exports: module.exports, require: (name) => imports[name] ?? {}, Request, Response, URL, URLSearchParams, TextDecoder, Date, Intl, process, console });
  return module.exports;
}
const http = load("src/lib/server/http.ts", { "@prisma/client": require("@prisma/client"), "next/server": { connection: async () => {} } });
const helper = load("src/lib/server/customer-list.ts", { "@/lib/server/http": http });
const query = helper.customerListQuery(new URLSearchParams("q=Rohit&state=inactive&type=repeat&area=Hyderabad&from=2026-11-01&to=2026-11-25&page=2&pageSize=5"), ["repeat-id"]);
assert.equal(query.page, 2);
assert.equal(query.pageSize, 5);
assert.equal(query.where.AND[1].active, false);
assert.equal(query.base.AND[0].role, "CUSTOMER");
assert.equal(query.base.AND[3].id.in[0], "repeat-id");
assert.equal(query.base.AND[4].createdAt.gte.toISOString(), "2026-10-31T18:30:00.000Z");
assert.equal(query.base.AND[4].createdAt.lt.toISOString(), "2026-11-25T18:30:00.000Z");
for (const invalid of ["page=-1", "pageSize=999", "state=administrator", "type=made-up", "from=2026-11-30&to=2026-11-01", "from=2026-02-30"]) {
  assert.throws(() => helper.customerListQuery(new URLSearchParams(invalid), []), http.ApiError);
}
assert.equal(helper.customerCsvCell('=SUM(A1,A2)'), '"\'=SUM(A1,A2)"');
assert.equal(helper.customerCsvCell('a"b'), '"a""b"');

let allowed = true;
let total = 2005;
let missing = false;
let listRequest;
const joined = new Date("2026-10-01T00:00:00Z");
const record = { id: "customer", name: "=HYPERLINK(test)", email: "person@example.com", active: true, verified: true, createdAt: joined, profile: { phone: "+919999999999" }, addresses: [{ id: "address", city: "Hyderabad", line1: "Test street", postalCode: "500001", phone: "+919999999999" }], _count: { orders: 12 } };
const tx = {
  user: {
    count: async ({ where }) => where.role === "CUSTOMER" ? where.createdAt ? 56 : where.active === true ? 1600 : 2005 : total,
    findMany: async (request) => { listRequest = request; return [record]; },
    findFirst: async ({ where }) => { assert.equal(where.role, "CUSTOMER"); assert.equal(where.id, "customer"); return missing ? null : record; },
  },
  address: { findMany: async () => [{ city: "Hyderabad" }] },
  order: {
    groupBy: async ({ by, having, _sum }) => having ? [{ userId: "customer", _count: { _all: 12 } }] : _sum ? [{ userId: "customer", _sum: { total: 348000 } }] : [{ userId: "customer", _max: { createdAt: joined } }],
    aggregate: async ({ where, _sum }) => { assert.equal(where.userId, "customer"); if (_sum) assert.equal(where.payment.status, "PAID"); return _sum ? { _sum: { total: 348000 } } : { _max: { createdAt: joined } }; },
    findMany: async () => [],
  },
};
const route = load("src/app/api/admin/customers/route.ts", {
  "@/lib/server/permissions": { requirePermission: async (key) => { assert.equal(key,"customers"); http.expect(allowed,"Sign in",401); return {id:"admin"}; } },
  "@/lib/server/http": http,
  "@/lib/server/customer-list": helper,
  "@/lib/server/db": { db: { $transaction: async (handler) => handler(tx) } },
  "@/lib/server/auth": { requireUser: async (roles, verified) => { assert.equal(roles[0], "ADMIN"); assert.equal(verified, true); http.expect(allowed, "Sign in", 401); return { id: "admin" }; }, limit: async () => {} },
  "@/lib/server/admin": { orderView: {} },
});
async function get(query = "") { return route.GET(new Request(`http://localhost:3000/api/admin/customers?${query}`)); }
(async () => {
  let response = await get("page=2&pageSize=5");
  assert.equal(response.status, 200);
  let data = await response.json();
  assert.equal(data.stats.total, 2005, "Lifetime statistics cannot be capped by the loaded dashboard rows");
  assert.equal(data.stats.active, 1600);
  assert.equal(data.stats.new, 56);
  assert.equal(data.stats.repeat, 1);
  assert.equal(data.customers[0].orderCount, 12);
  assert.equal(data.customers[0].totalSpent, 348000);
  assert.equal(listRequest.skip, 5);
  response = await get("id=customer"); data = await response.json();
  assert.equal(data.customer.orderCount, 12);
  assert.equal(data.customer.totalSpent, 348000);
  assert.equal(data.historyLimit, 20);
  missing = true; assert.equal((await get("id=customer")).status, 404); missing = false;
  response = await get("export=csv"); data = await response.json();
  assert.match(data.csv, /"'=HYPERLINK\(test\)"/);
  total = 10001; assert.equal((await get("export=csv")).status, 400);
  allowed = false; assert.equal((await get()).status, 401);
  console.log("PASS: customer filters, India date boundaries, lifetime statistics, pagination, detail totals, safe CSV export, export limits and authentication. No real records changed.");
})().catch((error) => { console.error(error); process.exitCode = 1; });
