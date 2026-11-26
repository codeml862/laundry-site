export type StaffRole = "ADMIN" | "STAFF" | "RIDER";
export interface StaffUser {
  id:string; name:string; email:string; role:StaffRole; active:boolean; verified:boolean;
  permissions:string[]; createdAt:string; profile:{phone:string}|null;
}
export interface StaffList { users:StaffUser[]; total:number; page:number; pageSize:number; stats:Record<"all"|StaffRole,number> }
export const roleNames = {ADMIN:"Administrator",STAFF:"Staff",RIDER:"Rider"};
export const permissionNames:Record<string,string> = {dashboard:"Dashboard",orders:"Orders",customers:"Customers",services:"Services",pricing:"Pricing",pickups:"Pickups & Delivery",payments:"Payments",reports:"Reports",coupons:"Coupons",support:"Support"};
