"use client";

import { Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { cn } from "@/lib/utils";
import type { Address } from "@/components/customer/data";
import { friendlyError, post } from "@/components/customer/http";
import { Alert, Optional, btn, fieldClass } from "@/components/customer/ui";

export function AddressForm({ address, onSaved, onCancel }: {
  address?: Address;
  onSaved: (address?: Address) => void;
  onCancel: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true);
    setError("");
    try {
      const result = await post<{ address?: Address }>("/api/account", { action: "address", id: address?.id, ...fields });
      onSaved(result.address);
    } catch (caught) {
      setError(friendlyError(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <h3 className="text-lg font-bold text-foreground">{address ? "Edit address" : "Add an address"}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={fieldClass}>Address label<input name="label" required maxLength={45} defaultValue={address?.label} placeholder="Home, Office…" /></label>
        <label className={fieldClass}>Phone number<input name="phone" type="tel" required autoComplete="tel" maxLength={25} defaultValue={address?.phone} /></label>
        <label className={cn(fieldClass, "sm:col-span-2")}>Address line 1<input name="line1" required autoComplete="address-line1" maxLength={150} defaultValue={address?.line1} placeholder="House / flat number, street" /></label>
        <label className={cn(fieldClass, "sm:col-span-2")}><span>Address line 2 <Optional /></span><input name="line2" autoComplete="address-line2" maxLength={150} defaultValue={address?.line2 ?? ""} placeholder="Landmark, area" /></label>
        <label className={fieldClass}>City<input name="city" required autoComplete="address-level2" maxLength={90} defaultValue={address?.city} /></label>
        <label className={fieldClass}>PIN code<input name="postalCode" required inputMode="numeric" autoComplete="postal-code" pattern="[1-9][0-9]{5}" maxLength={6} defaultValue={address?.postalCode} /></label>
      </div>
      {error && <Alert>{error}</Alert>}
      <div className="flex flex-wrap gap-2">
        <button className={btn.primary} type="submit" disabled={busy}>
          {busy && <Loader2 className="animate-spin" aria-hidden="true" />}{busy ? "Saving…" : "Save address"}
        </button>
        <button className={btn.outline} type="button" onClick={onCancel} disabled={busy}>Cancel</button>
      </div>
    </form>
  );
}
