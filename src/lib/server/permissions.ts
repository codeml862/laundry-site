import { requireUser } from "@/lib/server/auth";
import { expect } from "@/lib/server/http";
import { hasPermission } from "@/lib/dashboard-permissions";
export { hasPermission, allowedPermissions } from "@/lib/dashboard-permissions";

export async function requireWorkspaceUser() {
  return requireUser(["ADMIN","STAFF","RIDER"],true);
}

export async function requirePermission(permission:string|readonly string[]) {
  const user=await requireWorkspaceUser();
  const keys=typeof permission === "string" ? [permission] : permission;
  expect(keys.some((key)=>hasPermission(user,key)),"You do not have permission to access this section.",403);
  return user;
}
