import { limit } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { api, body, clientIp, emailValue, expect, str } from "@/lib/server/http";
import { emailMessage } from "@/lib/server/mail";

/** Public "Contact us" form. Visitors don't need an account; messages appear under Support in the dashboard. */
export const POST = api(async (request) => {
  const input = await body(request);
  // Bots fill every field; people never see this one. Pretend it worked so they don't retry.
  if (typeof input.website === "string" && input.website.trim()) return {ok: true};

  const ip = clientIp(request);
  await limit(`contact:ip:${ip}`, 5, 60, "Too many messages");
  const name = str(input.name, "name", 80);
  const email = emailValue(input.email);
  await limit(`contact:email:${email}`, 3, 60, "Too many messages");
  const phone = str(input.phone, "phone number", 25, true);
  expect(!phone || (/^\+?[\d ()-]{10,25}$/.test(phone) && phone.replace(/\D/g, "").length >= 10), "Enter a valid phone number.");
  const message = str(input.message, "message", 2000);
  expect(message.trim().length >= 10, "Please write a little more so we can help (at least 10 characters).");

  await db.enquiry.create({data: {name, email, phone, message}});

  // Let the business know straight away when a contact email is configured. A mail failure never loses the message.
  const settings = await db.settings.findUnique({where: {id: 1}, select: {contactEmail: true, businessName: true}});
  if (settings?.contactEmail) {
    await emailMessage(settings.contactEmail, `New enquiry from ${name}`, `${name} <${email}>${phone ? ` · ${phone}` : ""}\n\n${message}\n\nReply from the dashboard: Support → Website enquiries.`);
  }
  return {ok: true};
});
