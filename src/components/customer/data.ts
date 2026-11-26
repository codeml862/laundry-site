export type Unit = "KG" | "ITEM" | "FIXED";
export type CartItem = { serviceId: string; quantity: number };
export const maxCartQuantity = 200;
export const maxCartServices = 30;
export type Service = {
  id: string;
  name: string;
  description: string;
  price: number;
  unit: Unit;
  hours: number;
  image: string | null;
  category: string;
};
export type Settings = {
  cod: boolean;
  onlinePayments: boolean;
  taxBps: number;
  deliveryFee: number;
  minimum: number;
  serviceAreas: string[];
  slots: string[];
  businessName: string;
};
export type Catalog = { services: Service[]; settings: Settings };
export type User = {
  id: string;
  email: string;
  name: string;
  role: "CUSTOMER" | "ADMIN" | "STAFF" | "RIDER";
  verified: boolean;
};
export type Address = {
  id: string;
  label: string;
  line1: string;
  line2: string | null;
  city: string;
  postalCode: string;
  phone: string;
};
export type Status = keyof typeof statusLabels;
export type Order = {
  id: string;
  status: Status;
  createdAt: string;
  pickupDate: string;
  pickupSlot: string;
  deliveryDate: string | null;
  deliverySlot: string | null;
  total: number;
  subtotal: number;
  tax: number;
  discount: number;
  deliveryFee: number;
  items: (CartItem & { name: string; unit: Unit; price: number })[];
  history: { status: Status; createdAt: string }[];
  payment: { method: string; status: string; amount: number } | null;
  address?: Omit<Address, "id">;
  instructions?: string;
  review?: { rating: number; comment: string } | null;
};
export type Account = {
  user: User;
  profile: { phone: string | null } | null;
  addresses: Address[];
  orders: Order[];
  notifications: { id: string; title: string; body: string; createdAt: string; read: boolean }[];
  tickets: { id: string; subject: string; message: string; status: string; createdAt: string }[];
  coupons: { code: string; kind: string; value: number; minimum: number; expiresAt: string | null }[];
};
export type Quote = Pick<Order, "subtotal" | "tax" | "discount" | "deliveryFee" | "total">;

export const statusLabels = {
  ORDER_PLACED: "Order placed",
  PICKUP_SCHEDULED: "Pickup scheduled",
  PICKED_UP: "Picked up",
  RECEIVED: "Received at laundry",
  WASHING: "Washing",
  DRYING: "Drying",
  IRONING: "Ironing",
  QUALITY_CHECK: "Quality check",
  READY: "Ready for delivery",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export function orderDate(date: string, time = false) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    ...(time ? { timeStyle: "short" as const } : {}),
    timeZone: "Asia/Kolkata",
  }).format(new Date(date));
}

export function dateInIndia(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  return ["year", "month", "day"].map((type) => parts.find((part) => part.type === type)?.value).join("-");
}

export function unitLabel(unit: Unit) {
  return unit === "KG" ? "kg" : unit === "ITEM" ? "item" : "service";
}

export function duration(hours: number) {
  return hours >= 24 && hours % 24 === 0 ? `${hours / 24} ${hours === 24 ? "day" : "days"}` : `${hours} hr`;
}
