import { requirePermission } from "@/lib/server/permissions";
import { limit } from "@/lib/server/auth";
import { api } from "@/lib/server/http";
import { reportSummary } from "@/lib/server/reports";

export const GET=api(async(request)=>{
  const user=await requirePermission("reports");
  await limit(`reports:${user.id}`,100,5);
  return reportSummary(new URL(request.url).searchParams);
});
