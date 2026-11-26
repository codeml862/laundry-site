import type { Customer, Order } from "@/components/dashboard/types";

export interface CustomerRecord extends Customer {
  active: boolean;
  totalSpent: number;
  lastOrder: string | null;
}
export interface CustomerList {
  customers: CustomerRecord[];
  total: number;
  page: number;
  pageSize: number;
  areas: string[];
  tabs: { all: number; active: number; inactive: number };
  stats: { total: number; active: number; new: number; repeat: number };
}
export interface CustomerDetail { customer: CustomerRecord; orders: Order[]; historyLimit: number }
