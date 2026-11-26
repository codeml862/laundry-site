const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const path = require("node:path");
const root = path.resolve(__dirname,"../..");
function load(file,imports) {
  const module={exports:{}};
  const source=ts.transpileModule(fs.readFileSync(path.join(root,file),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(source,{module,exports:module.exports,require:(name)=>imports[name]??{},Request,Response,URL,TextDecoder,Date,Intl,process,console});
  return module.exports;
}
const http=load("src/lib/server/http.ts",{"@prisma/client":require("@prisma/client"),"next/server":{connection:async()=>{}}});
let rows=[{id:"legacy",name:"Wash & Fold",description:"Laundry care",category:"Laundry",image:null,unit:"KG",price:7900,hours:48,active:true,familyKey:null,familyName:null,speed:"REGULAR",size:"MEDIUM"}];
let sequence=0;
const tx={service:{
  findUnique:async({where})=>rows.find((row)=>row.id===where.id)||null,
  findMany:async({where})=>rows.filter((row)=>row.familyKey===where.familyKey),
  update:async({where,data})=>{const row=rows.find((row)=>row.id===where.id);Object.assign(row,data);return {...row};},
  create:async({data})=>{const row={id:"created-"+(++sequence),...data};rows.push(row);return {...row};},
  updateMany:async({where,data})=>{for(const row of rows)if(where.familyKey?row.familyKey===where.familyKey:row.id===where.id)Object.assign(row,data);return {count:1};},
}};
const db={$transaction:async(fn)=>fn(tx)};
const helper=load("src/lib/server/service-variants.ts",{"node:crypto":require("node:crypto"),"@prisma/client":require("@prisma/client"),"@/lib/server/db":{db},"@/lib/server/http":http});
const regular={speed:"REGULAR",size:"MEDIUM",price:7900,hours:48,active:true};
const express={speed:"EXPRESS",size:"LARGE",price:14900,hours:12,active:true};
const input={id:"legacy",name:"Wash & Fold",description:"Laundry care",category:"Laundry",unit:"KG",image:"/images/wash-fold.webp",variants:[regular,express]};
async function run(){
  assert.equal(helper.serviceFamilyInput(input).variants.length,2);
  for(const bad of [
    {...input,name:""},
    {...input,image:"javascript:alert(1)"},
    {...input,variants:[]},
    {...input,variants:[regular,regular]},
    {...input,variants:[{...regular,speed:"URGENT"}]},
    {...input,variants:[{...regular,size:"EXTRA"}]},
    {...input,variants:[{...regular,price:1.5}]},
    {...input,variants:[{...regular,hours:0}]},
    {...input,variants:[regular,{...regular,speed:"EXPRESS",hours:72}]},
  ])assert.throws(()=>helper.serviceFamilyInput(bad));
  const saved=await helper.saveServiceFamily(input);
  assert.equal(saved.familyKey,"legacy");
  assert.equal(saved.services.find((row)=>row.speed==="REGULAR").id,"legacy","Legacy bookable service ID must be preserved");
  assert.equal(saved.services.find((row)=>row.speed==="EXPRESS").name,"Wash & Fold – Large · Express");
  assert.equal(rows.length,2,"Only configured options should be created");
  assert.equal(rows.find((row)=>row.id==="legacy").price,7900);
  await helper.saveServiceFamily({...input,variants:[regular]});
  assert.equal(rows.length,2,"Removed options must preserve historical service rows");
  assert.equal(rows.find((row)=>row.speed==="EXPRESS").active,false);
  await helper.setServiceAvailability({id:"legacy",active:false,family:true});
  assert.ok(rows.every((row)=>!row.active));
  await helper.setServiceAvailability({id:"legacy",active:true,family:false});
  assert.equal(rows.find((row)=>row.id==="legacy").active,true);
  assert.equal(rows.find((row)=>row.speed==="EXPRESS").active,false,"Single-option toggle must not change other sizes/types");
  let denied=false;
  const route=load("src/app/api/admin/services/route.ts",{"@/lib/server/permissions":{requirePermission:async()=>{if(denied)throw new http.ApiError("Forbidden",403);return {id:"admin"};}},"@/lib/server/http":http,"@/lib/server/auth":{requireUser:async(roles,verified)=>{assert.equal(roles[0],"ADMIN");assert.equal(verified,true);if(denied)throw new http.ApiError("Forbidden",403);return {id:"admin"};},limit:async()=>{}},"@/lib/server/db":{db},"@/lib/server/service-variants":helper});
  denied=true;
  const response=await route.POST(new Request("http://localhost:3000/api/admin/services",{method:"POST",headers:{"content-type":"application/json",origin:"http://localhost:3000"},body:JSON.stringify({action:"save",...input})}));
  assert.equal(response.status,403);
  console.log("PASS: configured Regular/Express sizes, validation, legacy IDs, real option prices, safe deactivation, family/single availability and admin authorization. Database mocked; no real data changed.");
}
run().catch((error)=>{console.error(error);process.exitCode=1;});
