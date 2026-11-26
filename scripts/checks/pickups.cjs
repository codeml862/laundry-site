const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),ts=require("typescript");
const root=path.resolve(__dirname,"../..");
function load(file,imports){const module={exports:{}};const code=ts.transpileModule(fs.readFileSync(path.join(root,file),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInNewContext(code,{module,exports:module.exports,require:name=>imports[name]??{},Request,Response,URL,URLSearchParams,TextDecoder,Date,Intl,Object,process,console});return module.exports;}
const http=load("src/lib/server/http.ts",{"@prisma/client":require("@prisma/client"),"next/server":{connection:async()=>{}}});
const flow={WASHING:["DRYING","QUALITY_CHECK"],ORDER_PLACED:["PICKUP_SCHEDULED"],PICKUP_SCHEDULED:["PICKED_UP"],PICKED_UP:["RECEIVED"],READY:["OUT_FOR_DELIVERY"],OUT_FOR_DELIVERY:["DELIVERED"],DELIVERED:[]};
let actor={id:"staff",role:"STAFF",permissions:["pickups"]},captured,history=[],events=[],changedOrder=[],changedRequest=[],record,order,existing=null;
const tx={order:{findUnique:async()=>order,updateMany:async options=>{changedOrder.push(options);return{count:1};},update:async()=>({})},orderHistory:{create:async options=>history.push(options)},settings:{findUnique:async()=>({slots:["09:00–11:00"]})},dispatchRequest:{findFirst:async options=>{captured=options;return record;},findUnique:async()=>existing,updateMany:async options=>{changedRequest.push(options);return{count:1};},update:async options=>changedRequest.push(options),upsert:async options=>{captured=options;return{};},count:async()=>0},dispatchEvent:{create:async options=>events.push(options)},dispatchRider:{findFirst:async()=>({id:"rider",active:true})}};
const db={$transaction:async fn=>fn(tx)};
const api=load("src/lib/server/pickups.ts",{"@prisma/client":require("@prisma/client"),"@/lib/server/db":{db},"@/lib/server/admin":{nextStatuses:flow},"@/lib/server/http":http,"@/lib/server/permissions":{requireWorkspaceUser:async()=>actor,hasPermission:(u,p)=>u.permissions?.includes(p)}});
const staff={id:"staff",role:"STAFF"},rider={id:"rider-user",role:"RIDER"};
function reset(kind="PICKUP",status="ASSIGNED",orderStatus="PICKUP_SCHEDULED"){history=[];events=[];changedOrder=[];changedRequest=[];order={id:"order",status:orderStatus,payment:{method:"COD",status:"PENDING"}};record={id:"request",kind,status,riderId:"rider",rider:{active:true},order};existing=null;}
async function main(){
  await api.dispatchUser();actor={id:"staff",role:"STAFF",permissions:[]};await assert.rejects(api.dispatchUser(),/access/);
  reset();await assert.rejects(api.mutateDispatch({action:"assign",id:"request",riderId:"rider"},rider),/only update/);
  reset();await api.mutateDispatch({action:"progress",id:"request",status:"IN_TRANSIT"},rider);assert.equal(captured.where.rider.userId,"rider-user");assert.equal(captured.where.rider.active,true);assert.equal(changedOrder.length,0);assert.equal(changedRequest[0].where.status,"ASSIGNED");assert.equal(events.length,1);
  reset("PICKUP","IN_TRANSIT");await api.mutateDispatch({action:"progress",id:"request",status:"COMPLETED"},staff);assert.equal(changedOrder[0].data.status,"PICKED_UP");assert.equal(history[0].data.actorId,"staff");assert.equal(events[0].data.status,"COMPLETED");
  reset("DELIVERY","ASSIGNED","READY");await api.mutateDispatch({action:"progress",id:"request",status:"IN_TRANSIT"},staff);assert.equal(changedOrder[0].data.status,"OUT_FOR_DELIVERY");
  reset("DELIVERY","IN_TRANSIT","OUT_FOR_DELIVERY");await api.mutateDispatch({action:"progress",id:"request",status:"COMPLETED"},rider);assert.equal(changedOrder[0].data.status,"DELIVERED");
  reset();await assert.rejects(api.mutateDispatch({action:"progress",id:"request",status:"COMPLETED"},staff),/cannot move/);assert.equal(changedOrder.length,0);
  reset();order.payment={method:"RAZORPAY",status:"PENDING"};await assert.rejects(api.mutateDispatch({action:"progress",id:"request",status:"IN_TRANSIT"},staff),/payment/);assert.equal(events.length,0);
  reset();await api.mutateDispatch({action:"progress",id:"request",status:"CANCELLED"},staff);assert.equal(changedOrder.length,0);assert.equal(events[0].data.note,"Dispatch cancelled; order unchanged");
  reset("DELIVERY","ASSIGNED","WASHING");await assert.rejects(api.mutateDispatch({action:"progress",id:"request",status:"IN_TRANSIT"},staff),/workflow/);
  reset();record=null;await assert.rejects(api.mutateDispatch({action:"progress",id:"other-rider-request",status:"IN_TRANSIT"},rider),/not found/);
  reset("PICKUP","PENDING","ORDER_PLACED");await api.mutateDispatch({action:"schedule",orderId:"order",kind:"PICKUP",date:"2099-12-25",slot:"09:00–11:00"},staff);assert.equal(changedOrder[0].data.status,"PICKUP_SCHEDULED");assert.equal(captured.where.orderId_kind.orderId,"order");
  reset();await assert.rejects(api.mutateDispatch({action:"schedule",orderId:"order",kind:"PICKUP",date:"2099-02-30",slot:"09:00–11:00"},staff),/valid schedule date/);
  reset();await assert.rejects(api.mutateDispatch({action:"schedule",orderId:"order",kind:"PICKUP",date:"2099-12-25",slot:"00:00–01:00"},staff),/configured/);
  console.log("PASS: dispatch permission checks, rider ownership scope, pickup and delivery state transitions, optimistic writes, atomic event/history calls, online payment block, dispatch-only cancellation and schedule validation. Mock database only.");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
