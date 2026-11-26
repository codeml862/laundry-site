import { requireUser, limit } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { api, str } from "@/lib/server/http";
import { hasPermission, requireWorkspaceUser } from "@/lib/server/permissions";

export const GET = api(async(request)=>{
  const user = await requireWorkspaceUser();
  await limit(`admin-search:${user.id}`,120,5);
  const query = str(new URL(request.url).searchParams.get("q"),"search",100,true).replace(/^#/,"");
  if (!query) return {results:[]};
  const contains = {contains:query,mode:"insensitive" as const};
  const [orders,customers,services] = await Promise.all([
    hasPermission(user,"orders") ? db.order.findMany({where:{OR:[{id:contains},{user:{name:contains}},{user:{email:contains}}]},select:{id:true,user:{select:{name:true}}},orderBy:{createdAt:"desc"},take:5}) : Promise.resolve([]),
    hasPermission(user,"customers") ? db.user.findMany({where:{role:"CUSTOMER",OR:[{name:contains},{email:contains}]},select:{id:true,name:true,email:true},orderBy:{name:"asc"},take:4}) : Promise.resolve([]),
    ["services","pricing"].some((key)=>hasPermission(user,key)) ? db.service.findMany({where:{OR:[{name:contains},{category:contains}]},select:{id:true,name:true,category:true},orderBy:{name:"asc"},take:4}) : Promise.resolve([]),
  ]);
  return {results:[
    ...orders.map((order)=>({kind:"orders",id:order.id,label:"#"+order.id.slice(-8).toUpperCase(),detail:order.user.name})),
    ...customers.map((customer)=>({kind:"customers",id:customer.id,label:customer.name,detail:customer.email})),
    ...services.map((service)=>({kind:"services",id:service.id,label:service.name,detail:service.category})),
  ]};
});
