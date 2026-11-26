"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { maxCartQuantity, maxCartServices, type CartItem, type User } from "@/components/customer/data";
import { post, request } from "@/components/customer/http";

const empty = "[]";
const guestKey = "quicklywash-cart:guest";
const listeners = new Set<() => void>();
const memory = new Map<string, string>();
let pendingWrite = Promise.resolve<unknown>(undefined);

function read(key: string) {
  try {
    return localStorage.getItem(key) ?? memory.get(key) ?? empty;
  } catch {
    return memory.get(key) ?? empty;
  }
}

function write(key: string, items: CartItem[]) {
  const serialized = JSON.stringify(items);
  memory.set(key, serialized);
  try { localStorage.setItem(key, serialized); } catch { /* Continue with the current tab's cart. */ }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function readItems(raw: string): CartItem[] {
  try {
    const items: unknown = JSON.parse(raw);
    if (Array.isArray(items)) {
      return items.filter((item) => typeof item?.serviceId === "string" && typeof item.quantity === "number" && Number.isInteger(item.quantity * 4) && item.quantity > 0 && item.quantity <= maxCartQuantity);
    }
  } catch { /* A stale browser draft can be replaced safely. */ }
  return [];
}

function synchronize(items: CartItem[]) {
  pendingWrite = pendingWrite.then(() => post("/api/account", { action: "cart", items })).catch(() => undefined);
}

export function useCart() {
  const [scope, setScope] = useState<{ user: User | null }>();
  const key = scope?.user ? `quicklywash-cart:${scope.user.id}` : guestKey;
  const serialized = useSyncExternalStore(subscribe, () => read(key), () => empty);
  const items = useMemo(() => readItems(serialized), [serialized]);

  useEffect(() => {
    let subscribed = true;
    async function load() {
      const { user } = await request<{ user: User | null }>("/api/auth").catch(() => ({ user: null }));
      if (!subscribed) return;
      if (user) {
        const userKey = `quicklywash-cart:${user.id}`;
        await pendingWrite;
        const current = await request<{ items: CartItem[] }>("/api/cart").catch(() => ({ items: readItems(read(userKey)) }));
        if (!subscribed) return;
        const guest = readItems(read(guestKey));
        const merged = new Map(current.items.map((item) => [item.serviceId, item]));
        for (const item of guest) {
          merged.set(item.serviceId, { ...item, quantity: Math.max(item.quantity, merged.get(item.serviceId)?.quantity ?? 0) });
        }
        const next = [...merged.values()].slice(0, maxCartServices);
        write(userKey, next);
        if (guest.length) {
          write(guestKey, []);
          synchronize(next);
        }
      }
      setScope({ user });
    }
    void load();
    return () => { subscribed = false; };
  }, []);

  function replace(next: CartItem[]) {
    write(key, next);
    if (scope?.user) synchronize(next);
  }

  function setQuantity(serviceId: string, quantity: number) {
    const current = readItems(read(key));
    const previous = current.findIndex((item) => item.serviceId === serviceId);
    if (quantity <= 0) {
      replace(current.filter((item) => item.serviceId !== serviceId));
    } else if (previous >= 0) {
      replace(current.map((item, index) => index === previous ? { serviceId, quantity: Math.min(quantity, maxCartQuantity) } : item));
    } else if (current.length < maxCartServices) {
      replace([...current, { serviceId, quantity: Math.min(quantity, maxCartQuantity) }]);
    }
  }

  return { items, setQuantity, replace, ready: Boolean(scope), user: scope?.user ?? null, settled: () => pendingWrite };
}
