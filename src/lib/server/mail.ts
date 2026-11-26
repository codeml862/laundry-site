import nodemailer from "nodemailer";
import { db } from "@/lib/server/db";
import type { Prisma, OrderStatus } from "@prisma/client";

export const mailConfigured = () => Boolean(process.env.SMTP_URL && process.env.MAIL_FROM);
export async function emailMessage(to: string, subject: string, text: string) {
  if (!mailConfigured()) {
    if (process.env.NODE_ENV === "production") return false;
    // Development without SMTP: show the email in the terminal so links can still be opened.
    console.info(`\n--- Email (not sent: SMTP not configured) ---\nTo: ${to}\nSubject: ${subject}\n${text}\n---------------------------------------------\n`);
    return true;
  }
  try {
    const transport = nodemailer.createTransport(process.env.SMTP_URL);
    await transport.sendMail({from:process.env.MAIL_FROM,to,subject,text});
    return true;
  } catch {
    console.error("Quicklywash email could not be sent.");
    return false;
  }
}
export const statusLabels: Record<OrderStatus,string> = {
  ORDER_PLACED:"Order placed",PICKUP_SCHEDULED:"Pickup scheduled",PICKED_UP:"Picked up",
  RECEIVED:"Received at laundry",WASHING:"Washing",DRYING:"Drying",IRONING:"Ironing",
  QUALITY_CHECK:"Quality check",READY:"Ready for delivery",OUT_FOR_DELIVERY:"Out for delivery",
  DELIVERED:"Delivered",CANCELLED:"Cancelled",
};
export async function notify(tx: Prisma.TransactionClient, userId: string, title: string, body: string, dedupeKey: string) {
  return tx.notification.upsert({where:{dedupeKey},create:{userId,title,body,dedupeKey},update:{},select:{id:true}});
}
export async function dispatchEmail(notificationId: string) {
  const item = await db.notification.findUnique({where:{id:notificationId},include:{user:{select:{email:true,verified:true}}}});
  if (!item || item.emailedAt || !item.user.verified) return;
  if (await emailMessage(item.user.email, item.title, item.body)) {
    await db.notification.update({where:{id:item.id},data:{emailedAt:new Date()}});
  }
}
