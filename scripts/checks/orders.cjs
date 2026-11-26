const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const root = path.resolve(__dirname,"../..");
function load(file,imports) {
  const module={exports:{}};
  const code=ts.transpileModule(fs.readFileSync(path.join(root,file),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(code,{module,exports:module.exports,require:(name)=>imports[name]??{},Request,Response,URL,URLSearchParams,TextDecoder,Date,Intl,Object,process,console});
  return module.exports;
}
const prisma=require("@prisma/client");
const http=load("src/lib/server/http.ts",{"@prisma/client":prisma,"next/server":{connection:async()=>{}}});
const queries=load("src/lib/server/order-list.ts",{"@prisma/client":prisma,"@/lib/server/http":http});
async function main() {
  const filter=queries.orderListQuery(new URLSearchParams("q=%239999&group=progress&service=wash&area=Hyderabad&from=2026-11-01&to=2026-11-30&page=3&pageSize=5"));
  assert.equal(filter.page,3);
  assert.equal(filter.pageSize,5);
  assert.equal(filter.base.AND[0].OR[3].address.string_contains,"9999");
  assert.equal(filter.base.AND[1].items.some.serviceId,"wash");
  assert.equal(filter.base.AND[2].OR[0].address.path[0],"city");
  assert.equal(filter.base.AND[3].pickupDate.lte,"2026-11-30");
  assert(filter.where.AND[1].status.in.includes("OUT_FOR_DELIVERY"));
  assert(!filter.where.AND[1].status.in.includes("DELIVERED"));
  for(const invalid of ["page=-1","page=1.5","pageSize=1000","status=UNKNOWN","group=__proto__","from=2026-11-30&to=2026-11-01","from=2026-02-30","ids="+Array(51).fill("order").join(",")]) {
    assert.throws(()=>queries.orderListQuery(new URLSearchParams(invalid)),http.ApiError,invalid);
  }
  assert.equal(queries.orderCsvCell('Alice "A"'),'"Alice ""A"""');
  assert.equal(queries.orderCsvCell("=1+1"),'"\'=1+1"');
  assert.equal(queries.orderCsvCell(" +919999999999"),'"\' +919999999999"');
  let authorized=true;
  let count=11;
  let captured;
  const tx={order:{count:async()=>count,findMany:async(options)=>{captured=options;return [{id:"order",user:{name:"=cmd",email:"a@example.com"},address:{phone:"+919999999999"},items:[{name:"Wash",quantity:1,unit:"KG"}],pickupDate:"2026-11-25",pickupSlot:"10:00–12:00",total:7900,status:"ORDER_PLACED"}];},groupBy:async()=>[{status:"ORDER_PLACED",_count:{_all:11}}]}};
  const route=load("src/app/api/admin/orders/route.ts",{
    "@/lib/server/permissions":{requirePermission:async(key)=>{assert.equal(key,"orders");http.expect(authorized,"Sign in",401);return{id:"admin"};}},
    "@/lib/server/auth":{requireUser:async(roles,verified)=>{assert.equal(roles[0],"ADMIN");assert.equal(verified,true);http.expect(authorized,"Sign in",401);return{id:"admin"};},limit:async()=>{}},
    "@/lib/server/admin":{orderView:{}},"@/lib/server/db":{db:{$transaction:async(fn)=>fn(tx)}},"@/lib/server/http":http,"@/lib/server/order-list":queries,
  });
  const call=(query)=>route.GET(new Request("http://localhost:3000/api/admin/orders?"+query));
  let response=await call("page=999&pageSize=5");
  assert.equal(response.status,200);
  let result=await response.json();assert.equal(result.page,3);assert.equal(result.total,11);assert.equal(captured.skip,10);assert.equal(captured.take,5);
  response=await call("export=csv");result=await response.json();assert.equal(response.status,200);assert(result.csv.includes("'\u003dcmd"));assert(result.csv.includes("79.00"));assert(result.csv.includes("'+919999999999"));
  count=10001;assert.equal((await call("export=csv")).status,400);
  assert.equal((await call("status=INVALID")).status,400);
  authorized=false;assert.equal((await call("")).status,401);
  console.log("PASS: order filters, date validation, grouped status counts, safe CSV, server pagination, export cap and admin authorization. No real records changed.");
}
main().catch((error)=>{console.error(error);process.exitCode=1;});
