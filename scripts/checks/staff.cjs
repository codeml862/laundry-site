/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS test runner matches the repository's mocked route checks. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const root = path.resolve(__dirname,"../..");
function load(file,imports) {
  const compiledModule = {exports:{}};
  const code = ts.transpileModule(fs.readFileSync(path.join(root,file),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(code,{module:compiledModule,exports:compiledModule.exports,require:name=>imports[name]??{},Request,Response,URL,URLSearchParams,TextDecoder,Date,Intl,Object,process,console});
  return compiledModule.exports;
}
const prisma = require("@prisma/client");
const http = load("src/lib/server/http.ts",{"@prisma/client":prisma,"next/server":{connection:async()=>{}}});
const permissions = load("src/lib/dashboard-permissions.ts",{});
const staff = load("src/lib/server/staff.ts",{"@/lib/dashboard-permissions":permissions,"@/lib/server/http":http});
const input = {name:"Team member",email:"team@example.com",phone:"+919999999999",role:"STAFF",active:true,permissions:["orders","customers"]};
const existing = {id:"team",...input,verified:true,createdAt:new Date(),profile:{phone:input.phone}};
let actor, record, activeAdmins, revoked, tokens, written, created, options;
const tx = {user:{findUnique:async()=>record,count:async()=>activeAdmins,update:async(value)=>{written=value;return {...record,...value.data};}},session:{deleteMany:async(value)=>{revoked=value;}},authToken:{deleteMany:async(value)=>{tokens=value;}}};
const auth = {
  requireUser:async(roles,verified)=>{assert.deepEqual(Array.from(roles),["ADMIN"]);assert.equal(verified,true);http.expect(actor,"Sign in",401);http.expect(roles.includes(actor.role),"Forbidden",403);http.expect(actor.verified,"Verify",403);return actor;},
  hashPassword:async()=>"hashed-test-credential",passwordValue:value=>{http.expect(typeof value === "string" && value.length >=8 && value.length<=128,"Invalid password");return value;},
};
const db = {$transaction:async(fn,config)=>{options=config;return fn(tx);},user:{create:async(value)=>{created=value;return {id:"created",...value.data};}}};
const route = load("src/app/api/admin/staff/route.ts",{"@/lib/server/db":{db},"@/lib/server/auth":auth,"@/lib/server/http":http,"@/lib/server/staff":staff});
const call = (method,data=input,query="")=>route[method](new Request("http://localhost:3000/api/admin/staff"+query,{method,...(method === "GET" ? {} : {headers:{"content-type":"application/json"},body:JSON.stringify(data)})}));
function reset() {actor={id:"admin",role:"ADMIN",verified:true};record={...existing,permissions:[...existing.permissions]};activeAdmins=2;revoked=tokens=written=created=options=null;}
async function main() {
  for(const value of [null,{role:"CUSTOMER",verified:true},{role:"STAFF",verified:true},{role:"RIDER",verified:true},{role:"ADMIN",verified:false}]) {
    reset();actor=value;
    for(const method of ["GET","POST","PATCH"]) {assert.equal((await call(method)).status,value ? 403 : 401,`${method} authorization`);assert.equal(written,null);assert.equal(created,null);}
  }
  reset();
  for(const change of [{role:"CUSTOMER"},{role:"OWNER"},{permissions:["settings"]},{permissions:["staff"]},{active:"yes"},{phone:"123"}]) assert.equal((await call("POST",{...input,password:"example-only-pass",...change})).status,400);
  assert.equal((await call("POST",input)).status,400);
  assert.equal((await call("POST",{...input,password:"example-only-pass"})).status,200);
  assert.equal(created.data.verified,true);assert.equal(created.data.passwordHash,"hashed-test-credential");assert(!("password" in created.data));
  reset();record={...record,role:"CUSTOMER"};assert.equal((await call("PATCH",{id:"team",...input})).status,404);assert.equal(written,null);
  reset();record=null;assert.equal((await call("PATCH",{id:"team",...input})).status,404);
  reset();record={...record,id:"admin",role:"ADMIN",permissions:[]};
  assert.equal((await call("PATCH",{id:"admin",...input,role:"ADMIN",permissions:[],active:false})).status,409);
  assert.equal((await call("PATCH",{id:"admin",...input})).status,409);assert.equal(written,null);
  reset();record={...record,role:"ADMIN",permissions:[]};activeAdmins=1;
  assert.equal((await call("PATCH",{id:"team",...input})).status,409);
  assert.equal((await call("PATCH",{id:"team",...input,role:"ADMIN",active:false})).status,409);assert.equal(written,null);
  for(const change of [{active:false},{role:"RIDER"},{permissions:["orders"]},{password:"example-only-pass"},{email:"changed@example.com"}]) {
    reset();const result=await call("PATCH",{id:"team",...input,...change});assert.equal(result.status,200,JSON.stringify(change));assert.equal(options.isolationLevel,"Serializable");assert.equal(revoked.where.userId,"team");assert.equal(tokens.where.userId,"team");
    if(change.role === "RIDER")assert.equal(written.data.permissions.length,0);
  }
  reset();assert.equal((await call("PATCH",{id:"team",...input,name:"Updated name"})).status,200);assert.equal(revoked,null);assert.equal(tokens,null);
  reset();
  for(const query of ["?role=CUSTOMER","?page=0","?page=1.2","?pageSize=100","?state=unknown"])assert.equal((await call("GET",null,query)).status,400);
  let listOptions;
  tx.user.count=async()=>11;
  tx.user.findMany=async(value)=>{listOptions=value;return [existing];};
  tx.user.groupBy=async()=>[{role:"ADMIN",_count:{_all:2}},{role:"STAFF",_count:{_all:8}},{role:"RIDER",_count:{_all:1}}];
  const response=await call("GET",null,"?page=999&pageSize=5&q=team&role=STAFF&state=active");
  assert.equal(response.status,200);const result=await response.json();assert.equal(result.page,3);assert.equal(listOptions.skip,10);assert.equal(listOptions.where.role,"STAFF");assert.equal(listOptions.where.active,true);assert.equal(result.stats.all,11);
  let loginRole="ADMIN";let sessions=0;
  const login = load("src/app/api/auth/route.ts",{"@/lib/server/db":{db:{user:{findUnique:async()=>({id:"login",name:"Login",email:"login@example.com",role:loginRole,verified:true,active:true,permissions:["orders"],passwordHash:"hashed"})}}},"@/lib/server/http":http,"@/lib/server/auth":{...auth,checkPassword:async()=>true,limit:async()=>{},startSession:async()=>{sessions++;}}});
  async function signIn(portal) {return login.POST(new Request("http://localhost:3000/api/auth",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"login",email:"login@example.com",password:"example-only-pass",portal})}));}
  for(const role of ["ADMIN","STAFF","RIDER"]) {loginRole=role;const accepted=await signIn("admin");assert.equal(accepted.status,200);assert.equal((await accepted.json()).user.permissions[0],"orders");assert.equal((await signIn("customer")).status,401);}
  loginRole="CUSTOMER";assert.equal((await signIn("admin")).status,403);assert.equal((await signIn("customer")).status,200);assert.equal(sessions,4);
  console.log("PASS: team authorization, customer isolation, validated creation, admin safeguards, serializable updates, session/token revocation, role permissions, pagination and staff/rider sign-in. No real records changed.");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
