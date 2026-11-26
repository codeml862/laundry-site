import { db } from "@/lib/server/db";
import { hashPassword, passwordValue, requireUser } from "@/lib/server/auth";
import { api, body, expect, oneOf, str } from "@/lib/server/http";
import { protectAdmin, staffFields, staffRoles, staffSelect } from "@/lib/server/staff";

export const GET = api(async (request) => {
  await requireUser(["ADMIN"],true);
  const params = new URL(request.url).searchParams;
  const q = str(params.get("q") ?? "","search",100,true);
  const role = oneOf(params.get("role") || "all",["all",...staffRoles],"role filter");
  const state = oneOf(params.get("state") || "all",["all","active","inactive"],"status filter");
  const requestedPage = Number(params.get("page") || 1);
  const pageSize = Number(params.get("pageSize") || 10);
  expect(Number.isSafeInteger(requestedPage) && requestedPage >= 1,"Choose a valid page.");
  expect([5,10,25,50].includes(pageSize),"Choose a valid page size.");
  const base = {role:{in:[...staffRoles]}};
  const where = {...base, ...(role !== "all" ? {role} : {}), ...(state !== "all" ? {active:state === "active"} : {}), ...(q ? {OR:[{name:{contains:q,mode:"insensitive" as const}},{email:{contains:q,mode:"insensitive" as const}},{profile:{is:{phone:{contains:q}}}}]} : {})};
  return db.$transaction(async (tx) => {
    const total = await tx.user.count({where});
    const page = Math.min(requestedPage,Math.max(1,Math.ceil(total/pageSize)));
    const [users,groups] = await Promise.all([
      tx.user.findMany({where,select:staffSelect,orderBy:[{createdAt:"desc"},{id:"asc"}],skip:(page-1)*pageSize,take:pageSize}),
      tx.user.groupBy({by:["role"],where:base,_count:{_all:true}}),
    ]);
    const stats = {all:0,ADMIN:0,STAFF:0,RIDER:0};
    for(const group of groups) { if(group.role !== "CUSTOMER") { stats[group.role] = group._count._all; stats.all += group._count._all; } }
    return {users,total,page,pageSize,stats};
  },{isolationLevel:"RepeatableRead"});
});

export const POST = api(async (request) => {
  await requireUser(["ADMIN"],true);
  const input = await body(request);
  const {phone,...fields} = staffFields(input);
  const passwordHash = await hashPassword(passwordValue(input.password));
  const user = await db.user.create({data:{...fields,passwordHash,verified:true,profile:{create:{phone}}},select:staffSelect});
  return {user,message:"Team account created. Share the sign-in credentials securely; no email was sent."};
});

export const PATCH = api(async (request) => {
  const actor = await requireUser(["ADMIN"],true);
  const input = await body(request);
  const id = str(input.id,"team account",100);
  const {phone,...fields} = staffFields(input);
  const passwordHash = input.password === undefined || input.password === "" ? undefined : await hashPassword(passwordValue(input.password));
  const user = await db.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({where:{id},select:staffSelect});
    expect(existing && existing.role !== "CUSTOMER","Team account not found.",404);
    const activeAdmins = await tx.user.count({where:{role:"ADMIN",active:true}});
    protectAdmin(actor.id,existing,fields,activeAdmins);
    const revoke = !fields.active || fields.role !== existing.role || fields.email !== existing.email || JSON.stringify([...existing.permissions].sort()) !== JSON.stringify(fields.permissions) || Boolean(passwordHash);
    const updated = await tx.user.update({where:{id},data:{...fields,...(passwordHash ? {passwordHash} : {}),profile:{upsert:{create:{phone},update:{phone}}}},select:staffSelect});
    if(revoke) {
      await tx.session.deleteMany({where:{userId:id}});
      await tx.authToken.deleteMany({where:{userId:id}});
    }
    return updated;
  },{isolationLevel:"Serializable"});
  return {user,message:"Team account updated."};
});
