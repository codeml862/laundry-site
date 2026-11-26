"use client";

import { useState } from "react";
import { ActionForm, Badge, Empty, Field, Modal, Panel, Table, when, ui } from "@/components/dashboard/ui";
import { amount, checked, lines, read, type Enquiry, type Mutate, type Settings, type Ticket } from "@/components/dashboard/types";

export function BusinessSettings({ settings, mutate }: { settings: Settings; mutate: Mutate }) {
  return <Panel title="Booking and business settings" description="Update business details, service areas, pickup slots and checkout rules.">
    <ActionForm full button="Save settings" submit={(form) => mutate("settings", {
      businessName: read(form, "businessName"),
      logo: read(form, "logo") || null,
      contactEmail: read(form, "contactEmail"),
      contactPhone: read(form, "contactPhone"),
      operatingHours: read(form, "operatingHours"),
      serviceAreas: lines(form, "serviceAreas"),
      slots: lines(form, "slots"),
      taxBps: amount(form, "tax"),
      deliveryFee: amount(form, "deliveryFee"),
      minimum: amount(form, "minimum"),
      cod: checked(form, "cod"),
      onlinePayments: checked(form, "onlinePayments"),
    }, "Business settings saved.")}>
      <h3 className={ui.formHeading}>Business details</h3>
      <Field label="Business name"><input name="businessName" required maxLength={100} defaultValue={settings.businessName} /></Field>
      <Field label="Logo URL"><input name="logo" maxLength={1000} defaultValue={settings.logo ?? ""} /></Field>
      <Field label="Contact email"><input name="contactEmail" type="email" maxLength={254} defaultValue={settings.contactEmail ?? ""} /></Field>
      <Field label="Contact phone"><input name="contactPhone" type="tel" maxLength={24} defaultValue={settings.contactPhone ?? ""} /></Field>
      <Field label="Operating hours" wide><input name="operatingHours" required maxLength={150} defaultValue={settings.operatingHours ?? ""} /></Field>
      <h3 className={ui.formHeading}>Pickup and delivery</h3>
      <Field label="Service area cities or PIN codes (one per line)"><textarea name="serviceAreas" defaultValue={settings.serviceAreas.join("\n")} placeholder="500001" /></Field>
      <Field label="Pickup and delivery slots (one per line, 24-hour time)"><textarea name="slots" required defaultValue={settings.slots.join("\n")} placeholder="10:00–12:00" /></Field>
      <h3 className={ui.formHeading}>Checkout</h3>
      <Field label="Delivery fee (₹)"><input name="deliveryFee" type="number" min="0" step=".01" required defaultValue={settings.deliveryFee / 100} /></Field>
      <Field label="Minimum order (₹)"><input name="minimum" type="number" min="0" step=".01" required defaultValue={settings.minimum / 100} /></Field>
      <Field label="Tax (%)"><input name="tax" type="number" min="0" max="100" step=".01" required defaultValue={settings.taxBps / 100} /></Field>
      <div className={ui.checks}>
        <Field label="Accept cash on delivery"><input name="cod" type="checkbox" defaultChecked={settings.cod} /></Field>
        <Field label="Accept Razorpay payments"><input name="onlinePayments" type="checkbox" defaultChecked={settings.onlinePayments} /></Field>
      </div>
    </ActionForm>
  </Panel>;
}

export function Tickets({ tickets, enquiries, mutate }: { tickets: Ticket[]; enquiries: Enquiry[]; mutate: Mutate }) {
  const [selected, select] = useState("");
  const ticket = tickets.find((item) => item.id === selected);
  return <>
    <Panel title="Website enquiries" description="Messages sent from the Contact us form on the website. Reply by email or phone, then mark them handled.">
      {enquiries.length ? <Table headers={["From", "Message", "Received", "Status", ""]}>
        {enquiries.map((item) => <tr key={item.id}>
          <td><strong>{item.name}</strong><small><a href={`mailto:${item.email}`}>{item.email}</a></small>{item.phone && <small><a href={`tel:${item.phone.replace(/[^\d+]/g, "")}`}>{item.phone}</a></small>}</td>
          <td className="max-w-md whitespace-pre-wrap">{item.message}</td>
          <td>{when(item.createdAt)}</td>
          <td><Badge value={item.status === "NEW" ? "OPEN" : "RESOLVED"} /></td>
          <td><button type="button" className={ui.secondary} onClick={() => void mutate("enquiry", { id: item.id, status: item.status === "NEW" ? "HANDLED" : "NEW" }, item.status === "NEW" ? "Enquiry marked as handled." : "Enquiry reopened.")}>{item.status === "NEW" ? "Mark handled" : "Reopen"}</button></td>
        </tr>)}
      </Table> : <Empty message="Messages from the website contact form will appear here." />}
    </Panel>
    <Panel title="Customer requests" description="Read customer support requests and mark them resolved.">
      {tickets.length ? <Table headers={["Subject", "Customer", "Received", "Status", "Details"]}>
        {tickets.map((item) => <tr key={item.id}>
          <td><strong>{item.subject}</strong></td><td><strong>{item.user.name}</strong><small>{item.user.email}</small></td>
          <td>{when(item.createdAt)}</td><td><Badge value={item.status} /></td>
          <td><button type="button" className={ui.secondary} onClick={() => select(item.id)}>Open request</button></td>
        </tr>)}
      </Table> : <Empty message="New support requests will appear here." />}
    </Panel>
    {ticket && <Modal title={ticket.subject} close={() => select("")}>
      <div className={ui.stack}><dl className={ui.detail}>
        <div><dt>From</dt><dd>{ticket.user.name}<br />{ticket.user.email}</dd></div>
        <div><dt>Status</dt><dd><Badge value={ticket.status} /></dd></div>
      </dl><p className={ui.message}>{ticket.message}</p>
      <ActionForm button={ticket.status === "RESOLVED" ? "Reopen request" : "Mark resolved"} submit={async () => {
        await mutate("ticket", { id: ticket.id, status: ticket.status === "RESOLVED" ? "OPEN" : "RESOLVED" }, "Support request updated.");
        select("");
      }} /></div>
    </Modal>}
  </>;
}
