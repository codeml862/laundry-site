const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),ts=require("typescript"),path=require("node:path");
const root=path.resolve(__dirname,"../..");
function load(file,imports={}){const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,file),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,require:name=>imports[name]??{},Request,Response,URL,URLSearchParams,TextDecoder,Date,Intl,Object,process,console});return module.exports;}
const http=load("src/lib/server/http.ts",{"@prisma/client":require("@prisma/client"),"next/server":{connection:async()=>{}}});
const shared=load("src/lib/dashboard-permissions.ts");
let user={id:"staff",role:"STAFF",permissions:["customers"],verified:true};
const auth={requireUser:async(roles,verified)=>{http.expect(user,"Sign in",401);http.expect(roles.includes(user.role),"Forbidden",403);http.expect(!verified||user.verified,"Verify email",403);return user;},limit:async()=>{}};
const guards=load("src/lib/server/permissions.ts",{"@/lib/server/auth":auth,"@/lib/server/http":http,"@/lib/dashboard-permissions":shared});
async function main(){
  for(const key of shared.allowedPermissions){assert.equal(shared.hasPermission({role:"ADMIN"},key),true);assert.equal(shared.hasPermission({role:"CUSTOMER",permissions:[key]},key),false);assert.equal(shared.hasPermission({role:"RIDER",permissions:shared.allowedPermissions},key),key==="pickups");}
  assert.equal(shared.hasPermission({role:"STAFF"},"orders"),false);
  assert.equal(shared.hasPermission({role:"STAFF",permissions:["orders"]},"orders"),true);
  assert.equal(shared.hasPermission({role:"STAFF",permissions:["team"]},"team"),false);
  await guards.requirePermission("customers");
  await guards.requirePermission(["orders","customers"]);
  await assert.rejects(()=>guards.requirePermission("orders"),error=>error.status===403);
  const denyQuery=()=>{throw new Error("Disallowed database query executed");};
  const db={settings:{findUniqueOrThrow:async()=>({businessName:"Quicklywash",slots:[]})},order:{findMany:denyQuery,findUnique:denyQuery},service:{findMany:denyQuery},user:{findMany:async()=>[]},coupon:{findMany:denyQuery},ticket:{findMany:denyQuery}};
  db.profile={findUnique:async()=>null};
  const snapshot=load("src/lib/server/admin-snapshot.ts",{"@/lib/server/admin":{orderView:{}},"@/lib/server/db":{db},"@/lib/server/dashboard":{dashboardSummary:denyQuery},"@/lib/server/permissions":guards});
  const route=load("src/app/api/admin/route.ts",{"@/lib/server/http":http,"@/lib/server/auth":auth,"@/lib/server/permissions":guards,"@/lib/server/db":{db},"@/lib/server/admin-snapshot":snapshot,"@/lib/server/dashboard":{dashboardSummary:denyQuery}});
  let response=await route.GET(new Request("http://localhost:3000/api/admin"));assert.equal(response.status,200);const data=await response.json();assert.equal(data.orders.length,0);assert.equal(data.services.length,0);assert.equal(data.staff.length,0);assert.equal(data.tickets.length,0);assert.equal(data.dashboard.revenue,0);
  assert.equal((await route.GET(new Request("http://localhost:3000/api/admin?orderId=secret"))).status,403);
  const action=(body)=>route.POST(new Request("http://localhost:3000/api/admin",{method:"POST",headers:{"content-type":"application/json",origin:"http://localhost:3000"},body:JSON.stringify(body)}));
  assert.equal((await action({action:"settings"})).status,403);
  assert.equal((await action({action:"refund",orderId:"secret"})).status,403);
  assert.equal((await action({action:"status",orderId:"secret",status:"DELIVERED"})).status,403);
  user={id:"rider",role:"RIDER",permissions:["orders"],verified:true};
  assert.equal((await action({action:"status",orderId:"secret",status:"PICKED_UP"})).status,403);
  assert.equal((await route.GET(new Request("http://localhost:3000/api/admin?orderId=secret"))).status,403);
  user={id:"customer",role:"CUSTOMER",permissions:["customers"],verified:true};assert.equal((await route.GET(new Request("http://localhost:3000/api/admin"))).status,403);
  user=null;assert.equal((await route.GET(new Request("http://localhost:3000/api/admin"))).status,401);
  console.log("PASS: role matrix, explicit staff scopes, rider limitations, scoped snapshot queries, denied order/refund/settings actions, customer and unauthenticated access. No real records changed.");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
