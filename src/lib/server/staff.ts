import { allowedPermissions } from "@/lib/dashboard-permissions";
import { bool, emailValue, expect, oneOf, str, type Data } from "@/lib/server/http";

export const staffRoles = ["ADMIN", "STAFF", "RIDER"] as const;
export const staffSelect = { id:true, name:true, email:true, role:true, active:true, verified:true, permissions:true, createdAt:true, profile:{select:{phone:true}} } as const;

export function staffFields(input:Data) {
  const role = oneOf(input.role,staffRoles,"team role");
  expect(Array.isArray(input.permissions) && input.permissions.every((key) => typeof key === "string" && allowedPermissions.includes(key as typeof allowedPermissions[number])),"Choose valid dashboard permissions.");
  const permissions = role === "STAFF" ? [...new Set(input.permissions as string[])].sort() : [];
  expect(role !== "STAFF" || permissions.length > 0,"Choose at least one dashboard permission for this staff member.");
  const phone = str(input.phone,"phone number",25,true);
  expect(!phone || (/^\+?[\d ()-]{10,25}$/.test(phone) && phone.replace(/\D/g,"").length >= 10),"Enter a valid phone number.");
  return {name:str(input.name,"name",80),email:emailValue(input.email),role,active:bool(input.active,"account status"),permissions,phone};
}

export function protectAdmin(actorId:string, existing:{id:string;role:string;active:boolean}, next:{role:string;active:boolean}, activeAdmins:number) {
  expect(existing.id !== actorId || next.active,"You cannot deactivate your own account.",409);
  expect(existing.id !== actorId || next.role === "ADMIN","You cannot change your own administrator role.",409);
  expect(!(existing.role === "ADMIN" && existing.active && (!next.active || next.role !== "ADMIN")) || activeAdmins > 1,"Keep at least one active administrator.",409);
}
