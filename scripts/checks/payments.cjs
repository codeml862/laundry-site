/* CommonJS VM harness matches the existing route checks. */
/* eslint-disable @typescript-eslint/no-require-imports, @next/next/no-assign-module-variable */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const root = path.resolve(__dirname,"../..");
function load(file,imports) {
  const module = {exports:{}};
  const code = ts.transpileModule(fs.readFileSync(path.join(root,file),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(code,{module,exports:module.exports,require:(name)=>imports[name]??{},Request,Response,URL,URLSearchParams,TextDecoder,Date,Intl,Object,process,console});
  return module.exports;
}
const prisma = require("@prisma/client");
const http = load("src/lib/server/http.ts",{"@prisma/client":prisma,"next/server":{connection:async()=>{}}});
const query = load("src/lib/server/payment-list.ts",{"@prisma/client":prisma,"@/lib/server/http":http});
async function main() {
  const filter = query.paymentListQuery(new URLSearchParams("q=%23pay_1&method=RAZORPAY&status=PAID&page=3&pageSize=5&days=7"));
  assert.equal(filter.page,3);assert.equal(filter.where.AND[0].status,"PAID");assert.equal(filter.where.AND[1].method,"RAZORPAY");assert.equal(filter.where.AND[2].OR[1].externalPaymentId.contains,"pay_1");
  for(const invalid of ["status=FAILED","method=UPI","page=-1","page=1.5","pageSize=1000","days=31","ids="+Array(51).fill("order").join(",")]) assert.throws(()=>query.paymentListQuery(new URLSearchParams(invalid)),http.ApiError,invalid);
  const period = query.paymentPeriod(7,new Date("2026-11-24T20:00:00Z"));
  assert.equal(period.dates.length,7);assert.equal(period.dates[6],"2026-11-25");assert.equal(period.start.toISOString(),"2026-11-18T18:30:00.000Z");assert.equal(period.end.toISOString(),"2026-11-25T18:30:00.000Z");
  assert.equal(query.paymentCsvCell('Alice "A"'),'"Alice ""A"""');assert.equal(query.paymentCsvCell(" =1+1"),'"\' =1+1"');
  let authorized=true,total=11,captured;
  const tx={payment:{count:async()=>total,findMany:async(options)=>{captured=options;return [{orderId:"order",method:"RAZORPAY",status:"PAID",amount:7900,externalPaymentId:"pay_1",createdAt:new Date("2026-11-25T01:00:00Z"),updatedAt:new Date("2026-11-25T01:00:00Z"),order:{user:{name:"=cmd",email:"a@example.com"}}}];},groupBy:async(options)=>options.by[0] === "status" ? [{status:"PAID",_count:{_all:1111},_sum:{amount:777700}}] : [{method:"RAZORPAY",_count:{_all:1111},_sum:{amount:777700}}]},$queryRaw:async()=>[{date:http.indiaDate(),amount:7900n}]};
  const route = load("src/app/api/admin/payments/route.ts",{"@/lib/server/permissions":{requirePermission:async(key)=>{assert.equal(key,"payments");http.expect(authorized,"Not permitted",403);return{id:"staff"};}},"@/lib/server/auth":{limit:async()=>{}},"@/lib/server/db":{db:{$transaction:async(fn)=>fn(tx)}},"@/lib/server/http":http,"@/lib/server/payment-list":query});
  const call=(params)=>route.GET(new Request("http://localhost:3000/api/admin/payments?"+params));
  let response=await call("page=999&pageSize=5");assert.equal(response.status,200);let result=await response.json();assert.equal(result.page,3);assert.equal(captured.skip,10);assert.equal(captured.take,5);assert.equal(result.stats.successful,1111);assert.equal(result.stats.collected,777700);assert.equal(result.stats.failed,null);assert.equal(result.daily.length,30);assert.equal(result.daily.at(-1).amount,7900);
  response=await call("export=csv&ids=order");result=await response.json();assert.equal(response.status,200);assert(result.csv.includes("'=cmd"));assert(result.csv.includes("79.00"));assert.equal(captured.where.AND[0].orderId.in[0],"order");
  total=10001;assert.equal((await call("export=csv")).status,400);assert.equal((await call("status=FAILED")).status,400);
  authorized=false;assert.equal((await call("")).status,403);
  console.log("PASS: real payment enums, search/selection validation, India-day periods, safe CSV, database pagination, lifetime totals beyond 1000, zero-filled chart and payments authorization. Mocked route only; no mutations or refunds executed.");
}
main().catch((error)=>{console.error(error);process.exitCode=1;});
