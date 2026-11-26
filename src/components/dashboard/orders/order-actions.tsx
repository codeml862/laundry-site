"use client";

import { useState } from "react";
import { ActionForm, Badge, Empty, Field, Modal, Panel, SearchField, Table, label, money, when, ui } from "@/components/dashboard/ui";
import { nextStatuses, read, shortId, statusFlow, type Mutate, type Order } from "@/components/dashboard/types";

export function Orders({ orders, recent, title, onOpen, viewAll }: {
  orders: Order[];
  recent?: boolean;
  title?: string;
  onOpen: (id: string) => void;
  viewAll?: () => void;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const query = search.trim().toLowerCase().replace(/^#/, "");
  const filtered = recent ? orders.slice(0, 6) : orders.filter((order) => (!filter || order.status === filter)
    && [order.id, order.user.name, order.user.email, order.address.postalCode].some((value) => value.toLowerCase().includes(query)));
  return <Panel title={title ?? (recent ? "Recent orders" : "Orders")} description={recent ? "Latest bookings on Quicklywash" : "Search bookings, check pickup details and update order progress."}
    action={viewAll && <button type="button" className={ui.secondary} onClick={viewAll}>View all orders</button>}>
    {!recent && <div className={ui.toolbar}>
      <SearchField value={search} setValue={setSearch} placeholder="Search orders or customers" />
      <select aria-label="Status filter" value={filter} onChange={(event) => setFilter(event.target.value)}>
        <option value="">All statuses</option>
        {[...statusFlow, "CANCELLED"].map((status) => <option key={status} value={status}>{label(status)}</option>)}
      </select>
    </div>}
    {!filtered.length ? <Empty message={orders.length ? "Try another search or status." : "New orders will appear here after a customer books a pickup."} />
      : <Table headers={["Order", "Customer", "Pickup", "Status", "Total", "Details"]}>
        {filtered.map((order) => <tr key={order.id}>
          <td><strong>{shortId(order.id)}</strong><small>{when(order.createdAt)}</small></td>
          <td><strong>{order.user.name}</strong><small>{order.user.email}</small></td>
          <td><strong>{when(order.pickupDate)}</strong><small>{order.pickupSlot}</small></td>
          <td><Badge value={order.status} /></td>
          <td>{money(order.total)}</td>
          <td><button className={ui.secondary} type="button" onClick={() => onOpen(order.id)}>View order</button></td>
        </tr>)}
      </Table>}
  </Panel>;
}

export function OrderDetails({ order, mutate, close }: {
  order: Order;
  mutate: Mutate;
  close: () => void;
}) {
  const address = [order.address.line1, order.address.line2, order.address.city, order.address.postalCode].filter(Boolean).join(", ");
  const payment = order.payment;
  const waitingForPayment = payment?.method === "RAZORPAY" && payment.status === "PENDING" && order.status !== "CANCELLED";
  const statuses = nextStatuses(order.status).filter((status) => !waitingForPayment || status === "CANCELLED");
  const refund = payment?.method === "RAZORPAY" && ["PAID","REFUND_PENDING"].includes(payment.status) && order.status === "CANCELLED";
  const cod = payment?.method === "COD" && payment.status === "PENDING" && ["OUT_FOR_DELIVERY", "DELIVERED"].includes(order.status);
  return <Modal title={"Order " + shortId(order.id)} close={close}>
    <div className={ui.stack}>
      <dl className={ui.detail}>
        <div><dt>Status</dt><dd><Badge value={order.status} /></dd></div>
        <div><dt>Placed</dt><dd>{when(order.createdAt)}</dd></div>
        <div><dt>Customer</dt><dd>{order.user.name}<br />{order.user.email}</dd></div>
        <div><dt>Pickup address</dt><dd>{address}<br />{order.address.phone}</dd></div>
        <div><dt>Pickup slot</dt><dd>{when(order.pickupDate)} · {order.pickupSlot}</dd></div>
        <div><dt>Delivery slot</dt><dd>{order.deliveryDate ? [when(order.deliveryDate), order.deliverySlot].filter(Boolean).join(" · ") : "No preference"}</dd></div>
        {order.instructions && <div className={ui.wide}><dt>Special instructions</dt><dd>{order.instructions}</dd></div>}
      </dl>
      <section><h3>Services and charges</h3>
        <ul className={ui.lineList}>
          {order.items.map((item) => <li key={item.serviceId}><span>{item.name} · {item.quantity} × {money(item.price)}</span><strong>{money(item.quantity * item.price)}</strong></li>)}
          <li><span>Subtotal</span><strong>{money(order.subtotal)}</strong></li>
          <li><span>Tax and delivery</span><strong>{money(order.tax + order.deliveryFee)}</strong></li>
          {order.discount > 0 && <li><span>Discount</span><strong>−{money(order.discount)}</strong></li>}
          <li><strong>Total</strong><strong>{money(order.total)}</strong></li>
        </ul>
      </section>
      {payment && <section className={ui.stack}><h3>Payment</h3><dl className={ui.detail}>
        <div><dt>Method</dt><dd>{label(payment.method)}</dd></div><div><dt>Status</dt><dd><Badge value={payment.status} /></dd></div>
        {payment.externalPaymentId && <div><dt>Transaction ID</dt><dd>{payment.externalPaymentId}</dd></div>}
        {payment.refundId && <div><dt>Refund ID</dt><dd>{payment.refundId}</dd></div>}
      </dl>
        {cod && <ActionForm button="Mark cash collected" submit={async () => {
          if (window.confirm("Mark this cash payment as collected?")) await mutate("payment", { orderId: order.id }, "Payment marked as collected.");
        }} />}
        {refund && <ActionForm button={payment?.refundId ? "Refresh refund status" : payment?.status === "REFUND_PENDING" ? "Retry Razorpay refund" : "Request Razorpay refund"} submit={async () => {
          if (payment?.refundId || window.confirm("Request a full refund for this cancelled booking?")) await mutate("refund", { orderId: order.id }, "Refund status updated.");
        }} />}
      </section>}
      {waitingForPayment && <p className={ui.alert}>Awaiting payment confirmation before fulfilment can begin.</p>}
      {statuses.length > 0 && <section>
        <h3>Update progress</h3>
        <ActionForm key={order.status} button="Update status" submit={async (form) => {
          const status = read(form, "status");
          if (status !== "CANCELLED" || window.confirm("Cancel this booking?")) {
            await mutate("status", { orderId: order.id, status }, "Order status updated.");
          }
        }}>
          <Field label="Next status" wide><select name="status" required defaultValue=""><option value="" disabled>Select next status</option>{statuses.map((status) => <option key={status} value={status}>{label(status)}</option>)}</select></Field>
        </ActionForm>
      </section>}
      <section><h3>Status history</h3><ul className={ui.lineList}>{[...order.history].sort((first, second) => +new Date(second.createdAt) - +new Date(first.createdAt)).map((event, index) =>
        <li key={event.status + event.createdAt + index}><span>{label(event.status)}</span><strong>{new Date(event.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</strong></li>)}</ul></section>
    </div>
  </Modal>;
}

export function Payments({ orders, onOpen }: { orders: Order[]; onOpen: (id: string) => void }) {
  const [status, setStatus] = useState("");
  const states = [...new Set(orders.flatMap((order) => order.payment ? [order.payment.status] : []))];
  const payments = orders.filter((order) => order.payment && (!status || order.payment.status === status));
  return <Panel title="Transaction history" description="Track collections, Razorpay transactions and refunds.">
    <div className={ui.toolbar}><select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Payment status filter">
      <option value="">All payment statuses</option>{states.map((state) => <option key={state} value={state}>{label(state)}</option>)}
    </select></div>
    {!payments.length ? <Empty message="Payment activity for confirmed bookings appears here." /> : <Table headers={["Order", "Method", "Amount", "Status", "Reference", "Details"]}>
      {payments.map((order) => <tr key={order.id}>
        <td><strong>{shortId(order.id)}</strong><small>{when(order.createdAt)}</small></td>
        <td>{label(order.payment!.method)}</td>
        <td>{money(order.total)}</td>
        <td><Badge value={order.payment!.status} /></td>
        <td>{order.payment!.refundId ?? order.payment!.externalPaymentId ?? "—"}</td>
        <td><button type="button" className={ui.secondary} onClick={() => onOpen(order.id)}>View payment</button></td>
      </tr>)}
    </Table>}
  </Panel>;
}
