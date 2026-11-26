const assert=require("node:assert/strict");
const fs=require("node:fs"),vm=require("node:vm"),ts=require("typescript"),path=require("node:path");
const root=path.resolve(__dirname,"../..");
function load(file,imports){const module={exports:{}};const code=ts.transpileModule(fs.readFileSync(path.join(root,file),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInNewContext(code,{module,exports:module.exports,require:name=>imports[name]??{},Request,Response,URL,URLSearchParams,TextDecoder,Date,Intl,Object,process,console});return module.exports;}
const http=load("src/lib/server/http.ts",{"@prisma/client":require("@prisma/client"),"next/server":{connection:async()=>{}}});
let orderReads=0,empty=false;
const orderQueries=[];
const tx={order:{findMany:async(query)=>{orderQueries.push(query);return empty?[]:++orderReads===1?[
  {status:"DELIVERED",createdAt:new Date("2026-11-25T02:00:00Z"),total:12000,payment:{status:"PAID"},items:[{serviceId:"small",name:"Wash Regular Small",quantity:1,price:5000,service:{familyKey:"wash",familyName:"Wash"}},{serviceId:"large",name:"Wash Express Large",quantity:1,price:5000,service:{familyKey:"wash",familyName:"Wash"}}]},
  {status:"ORDER_PLACED",createdAt:new Date("2026-11-25T04:00:00Z"),total:9000,payment:{status:"PENDING"},items:[]},
]:[{total:6000,payment:{status:"PAID"}},{total:8000,payment:{status:"REFUNDED"}}];}},user:{count:async()=>empty?0:2},service:{findMany:async()=>empty?[]:[{id:"small",familyKey:"wash"},{id:"large",familyKey:"wash"}]}};
const reports=load("src/lib/server/reports.ts",{"@/lib/server/http":http,"@/lib/server/db":{db:{$transaction:async(fn)=>fn(tx)}}});
async function main(){
  const range=reports.reportRange(new URLSearchParams("days=7"),new Date("2026-11-24T20:00:00Z"));
  assert.equal(range.to,"2026-11-25");assert.equal(range.from,"2026-11-19");assert.equal(range.start.toISOString(),"2026-11-18T18:30:00.000Z");
  assert.equal(range.length,7);assert.equal(+range.start-+range.previousStart,7*86400000);
  const beforeMidnight=reports.reportRange(new URLSearchParams("days=30"),new Date("2026-11-24T18:29:59Z"));
  assert.equal(beforeMidnight.to,"2026-11-24");assert.equal(beforeMidnight.length,30);
  assert.equal(reports.reportRange(new URLSearchParams("days=90"),new Date("2026-01-01T00:00:00Z")).length,90);
  for(const invalid of ["days=1000","from=2026-11-30&to=2026-11-01","from=2020-01-01&to=2026-11-25","from=2026-02-30"]){assert.throws(()=>reports.reportRange(new URLSearchParams(invalid)),http.ApiError);}
  const result=await reports.reportSummary(new URLSearchParams("from=2026-11-19&to=2026-11-25"));
  assert.equal(result.totals.orders,2);assert.equal(result.totals.revenue,12000);assert.equal(result.previous.revenue,6000);assert.equal(result.totals.services,1);
  assert.equal(result.daily.length,7);assert.equal(result.daily.at(-1).orders,2);assert.equal(result.daily.at(-1).revenue,12000);
  assert.equal(result.topServices.length,1);assert.equal(result.topServices[0].revenue,10000);assert.equal(result.topServices[0].percent,100);assert.equal(result.serviceSubtotal,10000);
  assert.equal(result.statuses.reduce((sum,row)=>sum+row.count,0),2);
  assert.equal(orderQueries[0].where.createdAt.gte.toISOString(),"2026-11-18T18:30:00.000Z");
  assert.equal(orderQueries[0].where.createdAt.lt.toISOString(),"2026-11-25T18:30:00.000Z");
  assert.equal(+orderQueries[1].where.createdAt.lt,+orderQueries[0].where.createdAt.gte);
  empty=true;
  const blank=await reports.reportSummary(new URLSearchParams("from=2026-11-25&to=2026-11-25"));
  assert.equal(blank.daily.length,1);assert.equal(blank.daily[0].orders,0);assert.equal(blank.daily[0].revenue,0);
  assert.equal(blank.totals.orders,0);assert.equal(blank.totals.services,0);assert.equal(blank.topServices.length,0);assert.equal(blank.statuses.length,0);
  let allowed=false,denied=false,summaryCalls=0;
  const route=load("src/app/api/admin/reports/route.ts",{"@/lib/server/permissions":{requirePermission:async(permission)=>{assert.equal(permission,"reports");http.expect(allowed,"Sign in",401);http.expect(!denied,"No access",403);return{id:"admin"};}},"@/lib/server/auth":{limit:async()=>{}},"@/lib/server/http":http,"@/lib/server/reports":{reportSummary:async()=>{summaryCalls++;return result;}}});
  assert.equal((await route.GET(new Request("http://localhost:3000/api/admin/reports"))).status,401);
  allowed=true;denied=true;assert.equal((await route.GET(new Request("http://localhost:3000/api/admin/reports"))).status,403);
  assert.equal(summaryCalls,0);
  denied=false;const response=await route.GET(new Request("http://localhost:3000/api/admin/reports"));assert.equal(response.status,200);assert.equal(response.headers.get("cache-control"),"no-store");
  console.log("PASS: report periods, India dates, paid-only revenue, previous-period comparison, family grouping, daily/status totals and access guard. No real records changed.");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
