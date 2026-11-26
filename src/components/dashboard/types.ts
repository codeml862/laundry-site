export type Role = "CUSTOMER" | "ADMIN" | "STAFF" | "RIDER";

export interface Address {
  id?: string;
  label?: string;
  line1: string;
  line2?: string | null;
  city: string;
  postalCode: string;
  phone: string;
}

export interface Order {
  id: string;
  status: string;
  createdAt: string;
  pickupDate: string;
  pickupSlot: string;
  deliveryDate?: string | null;
  deliverySlot?: string | null;
  subtotal: number;
  tax: number;
  discount: number;
  deliveryFee: number;
  total: number;
  instructions?: string | null;
  user: { id: string; name: string; email: string };
  address: Address;
  items: { serviceId: string; name: string; quantity: number; unit: string; price: number }[];
  history: { status: string; createdAt: string }[];
  payment?: { method: string; status: string; externalPaymentId?: string | null; refundId?: string | null } | null;
}

export interface Service {
  familyKey?: string | null;
  familyName?: string | null;
  speed?: string;
  size?: string;
  id: string;
  name: string;
  description: string;
  price: number;
  unit: "KG" | "ITEM" | "FIXED";
  hours: number;
  image?: string | null;
  category: string;
  active: boolean;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  verified: boolean;
  createdAt: string;
  orderCount: number;
  addresses: Address[];
}

export interface Coupon {
  id: string;
  code: string;
  kind: "PERCENT" | "FIXED";
  value: number;
  minimum: number;
  expiresAt?: string | null;
  limit?: number | null;
  used: number;
  active: boolean;
}

export interface Settings {
  businessName: string;
  logo?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  operatingHours?: string | null;
  cod: boolean;
  onlinePayments: boolean;
  taxBps: number;
  deliveryFee: number;
  minimum: number;
  serviceAreas: string[];
  slots: string[];
}

export interface Ticket {
  id: string;
  user: { name: string; email: string };
  subject: string;
  message: string;
  status: string;
  createdAt: string;
}

export interface Snapshot {
  staff: {id:string;name:string;email:string;role:Role;active:boolean;createdAt:string}[];
  dashboard: {
    orders: number; customers: number; revenue: number;
    statuses: {status:string;count:number}[];
    daily: {date:string;orders:number;revenue:number;customers:number}[];
    services: {id:string;name:string;count:number}[];
  };
  user: { id: string; name: string; email: string; role: Role; permissions?: string[]; phone?: string };
  orders: Order[];
  services: Service[];
  customers: Customer[];
  coupons: Coupon[];
  settings: Settings;
  tickets: Ticket[];
  enquiries?: Enquiry[];
}

export type Action = "createCustomer" | "status" | "service" | "coupon" | "settings" | "customer" | "customerAddress" | "ticket" | "enquiry" | "refund" | "payment";
export type Mutate = (action: Action, fields: Record<string, unknown>, message: string) => Promise<void>;

export const statusFlow = [
  "ORDER_PLACED", "PICKUP_SCHEDULED", "PICKED_UP", "RECEIVED", "WASHING", "DRYING",
  "IRONING", "QUALITY_CHECK", "READY", "OUT_FOR_DELIVERY", "DELIVERED",
];

export function nextStatuses(status: string) {
  const index = statusFlow.indexOf(status);
  if (index < 0 || index >= statusFlow.length - 1) return [];
  const next = [statusFlow[index + 1]];
  if (status === "RECEIVED") next.push("IRONING", "QUALITY_CHECK");
  if (status === "WASHING" || status === "DRYING") next.push("QUALITY_CHECK");
  if (index < 2) next.push("CANCELLED");
  return next;
}

export const shortId = (id: string) => "#" + id.slice(-8).toUpperCase();

export const read = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
export const checked = (form: FormData, key: string) => form.has(key);
export const amount = (form: FormData, key: string) => Math.round(Number(read(form, key)) * 100);
export const lines = (form: FormData, key: string) => read(form, key).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

export type Enquiry = { id: string; name: string; email: string; phone: string; message: string; status: "NEW" | "HANDLED"; createdAt: string };
