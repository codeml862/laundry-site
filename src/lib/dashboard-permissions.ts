export const allowedPermissions = ["dashboard","orders","customers","services","pricing","pickups","payments","reports","coupons","support"] as const;
export type DashboardPermission = typeof allowedPermissions[number];
export type PermissionUser = {role:string;permissions?:readonly string[]};

export function hasPermission(user:PermissionUser|null|undefined,key:string) {
  if(!user)return false;
  if(user.role === "ADMIN")return true;
  if(user.role === "RIDER")return key === "pickups";
  return user.role === "STAFF" && allowedPermissions.includes(key as DashboardPermission) && Boolean(user.permissions?.includes(key));
}
