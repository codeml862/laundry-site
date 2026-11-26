import { requirePermission } from "@/lib/server/permissions";
import { requireUser, limit } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { api, body, oneOf } from "@/lib/server/http";
import { saveServiceFamily, setServiceAvailability } from "@/lib/server/service-variants";

export const GET = api(async()=>{
  await requirePermission(["services","pricing"]);
  return {services:await db.service.findMany({orderBy:[{category:"asc"},{name:"asc"}]})};
});

export const POST = api(async(request)=>{
  const user = await requirePermission(["services","pricing"]);
  await limit(`service-options:${user.id}`,80,5);
  const input = await body(request);
  const action = oneOf(input.action,["save","availability"],"service action");
  return action === "save" ? saveServiceFamily(input) : setServiceAvailability(input);
});
